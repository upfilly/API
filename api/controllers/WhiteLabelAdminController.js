/**
 * api/controllers/WhiteLabelAdminController.js
 *
 * @description :: Super Admin Controller for the "White-Label" tab in the Main Admin Dashboard.
 *                 Provides complete management of:
 *                 1. Dashboard (KPIs, active tenants, revenue, statistics)
 *                 2. Tenants (Registry, provisioning, status toggle, custom domain)
 *                 3. Plans (White-label subscription tiers from SubscriptionPlans where category: 'white_label')
 *                 4. Subscriptions (Active tenant subscriptions from Subscriptions collection)
 *                 5. Transactions (Payment history from Transactions collection)
 */

const multiTenant = require('../utils/multiTenant');
const tenantProvision = require('../services/tenantProvision.service');
const tenantHost = require('../services/tenantHost.service');
const response = require('../services/Response');

module.exports = {
  /**
   * 1. Dashboard: Overall KPIs and summary stats for White-Label operations
   * GET /admin/whitelabel/dashboard
   */
  getDashboardStats: async function (req, res) {
    try {
      const masterDb = await multiTenant.getMasterDb();

      // Tenant metrics
      let totalTenants = 0;
      let activeTenants = 0;
      let suspendedTenants = 0;
      let pendingPaymentTenants = 0;
      let recentTenants = [];

      if (masterDb) {
        totalTenants = await masterDb.collection('tenants').countDocuments({ isDeleted: { $ne: true } });
        activeTenants = await masterDb.collection('tenants').countDocuments({ status: 'active', isDeleted: { $ne: true } });
        suspendedTenants = await masterDb.collection('tenants').countDocuments({ status: 'suspended', isDeleted: { $ne: true } });
        pendingPaymentTenants = await masterDb.collection('tenants').countDocuments({ plan_status: 'pending_payment', isDeleted: { $ne: true } });
        recentTenants = await masterDb.collection('tenants')
          .find({ isDeleted: { $ne: true } })
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray();
      } else if (typeof Tenants !== 'undefined') {
        totalTenants = await Tenants.count({ isDeleted: false });
        activeTenants = await Tenants.count({ status: 'active', isDeleted: false });
        suspendedTenants = await Tenants.count({ status: 'suspended', isDeleted: false });
        pendingPaymentTenants = await Tenants.count({ plan_status: 'pending_payment', isDeleted: false });
        recentTenants = await Tenants.find({ isDeleted: false }).sort('createdAt DESC').limit(5);
      }

      // Plans metrics (from existing SubscriptionPlans where category: 'white_label')
      let whiteLabelPlansCount = 0;
      let whiteLabelPlans = [];
      if (typeof SubscriptionPlans !== 'undefined') {
        whiteLabelPlans = await SubscriptionPlans.find({
          category: 'white_label',
          isDeleted: false
        });
        whiteLabelPlansCount = whiteLabelPlans.length;
      }

      const planIds = whiteLabelPlans.map(p => p.id || p._id);

      // Subscriptions metrics (from existing Subscriptions)
      let activeSubscriptionsCount = 0;
      if (typeof Subscriptions !== 'undefined' && planIds.length > 0) {
        activeSubscriptionsCount = await Subscriptions.count({
          subscription_plan_id: { in: planIds },
          status: 'active'
        });
      }

      // Transactions metrics (from existing Transactions)
      let totalRevenue = 0;
      let recentTransactions = [];
      if (typeof Transactions !== 'undefined' && planIds.length > 0) {
        recentTransactions = await Transactions.find({
          subscription_plan_id: { in: planIds },
          transaction_status: 'successful'
        })
        .populate('user_id')
        .sort('createdAt DESC')
        .limit(5);

        const allTransactions = await Transactions.find({
          subscription_plan_id: { in: planIds },
          transaction_status: 'successful'
        });

        totalRevenue = allTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
      }

      return res.status(200).json({
        success: true,
        code: 200,
        message: 'White-Label dashboard statistics fetched successfully',
        data: {
          tenants: {
            total: totalTenants,
            active: activeTenants,
            suspended: suspendedTenants,
            pending_payment: pendingPaymentTenants,
            recent: recentTenants.map(t => ({
              id: t.id || t._id,
              business_name: t.business_name,
              subdomain: t.subdomain,
              domain: `${t.subdomain}.${process.env.APP_BASE_DOMAIN || 'upfilly.com'}`,
              admin_email: t.admin_email,
              plan_status: t.plan_status,
              status: t.status,
              createdAt: t.createdAt
            }))
          },
          subscriptions: {
            active_count: activeSubscriptionsCount,
            plans_count: whiteLabelPlansCount
          },
          revenue: {
            total_revenue: totalRevenue,
            currency: 'USD',
            recent_transactions: recentTransactions.map(t => ({
              id: t.id || t._id,
              transaction_id: t.transaction_id || t.stripe_charge_id,
              amount: t.amount,
              currency: t.currency || 'USD',
              status: t.transaction_status,
              user_email: t.user_id ? t.user_id.email : null,
              user_name: t.user_id ? (t.user_id.fullName || t.user_id.firstName) : null,
              createdAt: t.createdAt
            }))
          }
        }
      });
    } catch (err) {
      sails.log.error('WhiteLabelAdminController.getDashboardStats:', err);
      return res.status(500).json({ success: false, code: 500, message: err.message });
    }
  },

  /**
   * 2. Tenants: List all white-label tenants with pagination, search, and status filter
   * GET /admin/whitelabel/tenants
   */
  listTenants: async function (req, res) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
      const skip = (page - 1) * limit;
      const search = (req.query.search || '').trim();
      const statusFilter = req.query.status;
      const planStatusFilter = req.query.plan_status;

      const masterDb = await multiTenant.getMasterDb();

      let query = { isDeleted: { $ne: true } };

      if (statusFilter) {
        query.status = statusFilter;
      }
      if (planStatusFilter) {
        query.plan_status = planStatusFilter;
      }
      if (search) {
        query.$or = [
          { business_name: { $regex: search, $options: 'i' } },
          { subdomain: { $regex: search, $options: 'i' } },
          { admin_email: { $regex: search, $options: 'i' } }
        ];
      }

      let total = 0;
      let tenants = [];

      if (masterDb) {
        total = await masterDb.collection('tenants').countDocuments(query);
        tenants = await masterDb.collection('tenants')
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();
      } else if (typeof Tenants !== 'undefined') {
        const waterlineQuery = { isDeleted: false };
        if (statusFilter) waterlineQuery.status = statusFilter;
        if (planStatusFilter) waterlineQuery.plan_status = planStatusFilter;
        total = await Tenants.count(waterlineQuery);
        tenants = await Tenants.find(waterlineQuery).skip(skip).limit(limit).sort('createdAt DESC');
      }

      const formatted = tenants.map(t => ({
        id: t.id || t._id,
        business_name: t.business_name,
        subdomain: t.subdomain,
        portal_url: `https://${t.subdomain}.${process.env.APP_BASE_DOMAIN || 'upfilly.com'}`,
        custom_domain: t.custom_domain || null,
        cname_status: t.cname_status || 'pending',
        admin_email: t.admin_email,
        admin_name: t.admin_name,
        dedicated_database: t.db_name,
        plan_status: t.plan_status,
        status: t.status,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      }));

      return res.status(200).json({
        success: true,
        code: 200,
        message: 'Tenants fetched successfully',
        data:formatted,
        total:total
      });
    } catch (err) {
      sails.log.error('WhiteLabelAdminController.listTenants:', err);
      return res.status(500).json({ success: false, code: 500, message: err.message });
    }
  },

  /**
   * 2b. Tenant Details: Get specific tenant info + live counts from their dedicated database
   * GET /admin/whitelabel/tenant/:id
   */
  getTenantDetails: async function (req, res) {
    try {
      const tenantId = req.params.id;
      const masterDb = await multiTenant.getMasterDb();

      let tenant = null;
      if (masterDb) {
        const { ObjectId } = require('mongodb');
        try {
          tenant = await masterDb.collection('tenants').findOne({ _id: new ObjectId(tenantId) });
        } catch (e) {
          tenant = await masterDb.collection('tenants').findOne({ id: tenantId });
        }
      }

      if (!tenant && typeof Tenants !== 'undefined') {
        tenant = await Tenants.findOne({ id: tenantId });
      }

      if (!tenant) {
        return res.status(404).json({ success: false, code: 404, message: 'Tenant not found' });
      }

      // Query tenant's dedicated database for operational stats
      let operationalStats = {
        brands_count: 0,
        affiliates_count: 0,
        campaigns_count: 0
      };

      if (tenant.db_name) {
        try {
          const tenantDb = await multiTenant.ensureTenantConnection(tenant.db_name, tenant.db_connection_uri);
          if (tenantDb) {
            operationalStats.brands_count = await tenantDb.collection('users').countDocuments({ role: 'brand', isDeleted: { $ne: true } });
            operationalStats.affiliates_count = await tenantDb.collection('users').countDocuments({ role: 'affiliate', isDeleted: { $ne: true } });
            operationalStats.campaigns_count = await tenantDb.collection('campaign').countDocuments({ isDeleted: { $ne: true } });
          }
        } catch (dbErr) {
          sails.log.warn(`Could not connect to tenant DB '${tenant.db_name}' for operational stats:`, dbErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        code: 200,
        data: {
          tenant: {
            id: tenant.id || tenant._id,
            business_name: tenant.business_name,
            subdomain: tenant.subdomain,
            portal_url: `https://${tenant.subdomain}.${process.env.APP_BASE_DOMAIN || 'upfilly.com'}`,
            custom_domain: tenant.custom_domain,
            cname_status: tenant.cname_status,
            ssl_status: tenant.ssl_status,
            admin_email: tenant.admin_email,
            admin_name: tenant.admin_name,
            dedicated_database: tenant.db_name,
            plan_status: tenant.plan_status,
            status: tenant.status,
            branding: tenant.branding,
            createdAt: tenant.createdAt,
            updatedAt: tenant.updatedAt
          },
          operational_stats: operationalStats
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, code: 500, message: err.message });
    }
  },

  /**
   * 2b-2. Update Complete Tenant Profile (Business, Identity, Domains & Branding Information)
   * PUT /admin/whitelabel/tenant/:id
   */
  updateTenant: async function (req, res) {
    try {
      const tenantId = req.params.id;
      const masterDb = await multiTenant.getMasterDb();

      let tenant = null;
      const { ObjectId } = require('mongodb');
      if (masterDb) {
        try {
          tenant = await masterDb.collection('tenants').findOne({ _id: new ObjectId(tenantId) });
        } catch (e) {
          tenant = await masterDb.collection('tenants').findOne({ id: tenantId });
        }
      }
      if (!tenant && typeof Tenants !== 'undefined') {
        tenant = await Tenants.findOne({ id: tenantId });
      }

      if (!tenant) {
        return res.status(404).json({ success: false, code: 404, message: 'Tenant not found' });
      }

      const allowedFields = [
        'business_name',
        'first_name',
        'last_name',
        'admin_name',
        'admin_email',
        'phone',
        'job_title',
        'legal_company_name',
        'trading_name',
        'company_registration_number',
        'vat_tax_id',
        'registered_address',
        'billing_email',
        'company_website',
        'industry',
        'custom_domain',
        'tracking_domain',
        'statement_descriptor',
        'branding',
        'status',
        'plan_status',
        'whitelabel_type'
      ];

      const updatePayload = { updatedAt: new Date() };

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updatePayload[field] = req.body[field];
        }
      }

      // If first_name or last_name updated and admin_name not explicitly provided, update admin_name
      if ((req.body.first_name || req.body.last_name) && !req.body.admin_name) {
        const fn = req.body.first_name || tenant.first_name || '';
        const ln = req.body.last_name || tenant.last_name || '';
        updatePayload.admin_name = `${fn} ${ln}`.trim();
      }

      // If custom_domain is being updated
      if (req.body.custom_domain !== undefined) {
        if (req.body.custom_domain) {
          const cleanCustomDomain = req.body.custom_domain.toLowerCase().trim().replace(/^https?:\/\//, '');
          updatePayload.custom_domain = cleanCustomDomain;
          updatePayload.cname_status = 'pending';
        } else {
          updatePayload.custom_domain = null;
          updatePayload.cname_status = 'pending';
        }
      }

      // If tracking_domain is being updated
      if (req.body.tracking_domain !== undefined) {
        if (req.body.tracking_domain) {
          const cleanTrackingDomain = req.body.tracking_domain.toLowerCase().trim().replace(/^https?:\/\//, '');
          updatePayload.tracking_domain = cleanTrackingDomain;
          updatePayload.tracking_domain_status = 'pending_dns';
          updatePayload.dns_last_checked_at = new Date();
        } else {
          updatePayload.tracking_domain = null;
          updatePayload.tracking_domain_status = 'not_started';
        }
      }

      // If subdomain is being updated, validate uniqueness & reserved words
      if (req.body.subdomain && req.body.subdomain !== tenant.subdomain) {
        const cleanSlug = req.body.subdomain.toLowerCase().trim();
        const slugRegex = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
        if (!slugRegex.test(cleanSlug)) {
          return res.status(400).json({
            success: false,
            code: 400,
            message: 'Subdomain must be 3-30 alphanumeric characters and cannot start or end with a hyphen.'
          });
        }
        if (tenantHost.isReservedSubdomain(cleanSlug)) {
          return res.status(400).json({
            success: false,
            code: 400,
            message: `The subdomain '${cleanSlug}' is reserved and cannot be registered.`
          });
        }
        if (masterDb) {
          const existingSub = await masterDb.collection('tenants').findOne({
            subdomain: cleanSlug,
            _id: { $ne: tenant._id || new ObjectId(tenantId) },
            isDeleted: { $ne: true }
          });
          if (existingSub) {
            return res.status(409).json({
              success: false,
              code: 409,
              message: `The subdomain '${cleanSlug}' is already claimed by another organization.`
            });
          }
        }
        updatePayload.subdomain = cleanSlug;
      }

      if (masterDb) {
        try {
          await masterDb.collection('tenants').updateOne({ _id: new ObjectId(tenantId) }, { $set: updatePayload });
        } catch (e) {
          await masterDb.collection('tenants').updateOne({ id: tenantId }, { $set: updatePayload });
        }
      }

      if (typeof Tenants !== 'undefined') {
        try {
          await Tenants.updateOne({ id: tenantId }).set(updatePayload);
        } catch (e) {}
      }

      // Fetch refreshed tenant
      let updatedTenant = null;
      if (masterDb) {
        try {
          updatedTenant = await masterDb.collection('tenants').findOne({ _id: new ObjectId(tenantId) });
        } catch (e) {
          updatedTenant = await masterDb.collection('tenants').findOne({ id: tenantId });
        }
      }

      return res.status(200).json({
        success: true,
        code: 200,
        message: 'Tenant details successfully updated',
        data: updatedTenant || { tenant_id: tenantId, ...updatePayload }
      });
    } catch (err) {
      return res.status(500).json({ success: false, code: 500, message: err.message });
    }
  },

  /**
   * 2c. Update Tenant Status (Suspend / Activate / Cancel Plan)
   * PUT /admin/whitelabel/tenant/:id/status
   */
  updateTenantStatus: async function (req, res) {
    try {
      const tenantId = req.params.id;
      const { status, plan_status } = req.body;

      if (!status && !plan_status) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: 'Provide at least status or plan_status to update.'
        });
      }

      const updatePayload = { updatedAt: new Date() };
      if (status) updatePayload.status = status;
      if (plan_status) updatePayload.plan_status = plan_status;

      const masterDb = await multiTenant.getMasterDb();
      if (masterDb) {
        const { ObjectId } = require('mongodb');
        try {
          await masterDb.collection('tenants').updateOne({ _id: new ObjectId(tenantId) }, { $set: updatePayload });
        } catch (e) {
          await masterDb.collection('tenants').updateOne({ id: tenantId }, { $set: updatePayload });
        }
      }

      if (typeof Tenants !== 'undefined') {
        try {
          await Tenants.updateOne({ id: tenantId }).set(updatePayload);
        } catch (e) {}
      }

      return res.status(200).json({
        success: true,
        code: 200,
        message: 'Tenant status successfully updated',
        data: { tenant_id: tenantId, ...updatePayload }
      });
    } catch (err) {
      return res.status(500).json({ success: false, code: 500, message: err.message });
    }
  },

  /**
   * 2c-2. Soft Delete Tenant (Marks isDeleted: true, status: 'deleted', deletedAt)
   * DELETE /admin/whitelabel/tenant/:id
   */
  softDeleteTenant: async function (req, res) {
    try {
      const tenantId = req.params.id;
      const masterDb = await multiTenant.getMasterDb();

      let tenant = null;
      const { ObjectId } = require('mongodb');
      if (masterDb) {
        try {
          tenant = await masterDb.collection('tenants').findOne({ _id: new ObjectId(tenantId), isDeleted: { $ne: true } });
        } catch (e) {
          tenant = await masterDb.collection('tenants').findOne({ id: tenantId, isDeleted: { $ne: true } });
        }
      }
      if (!tenant && typeof Tenants !== 'undefined') {
        tenant = await Tenants.findOne({ id: tenantId, isDeleted: false });
      }

      if (!tenant) {
        return res.status(404).json({ success: false, code: 404, message: 'Tenant not found or already deleted' });
      }

      const updatePayload = {
        isDeleted: true,
        status: 'deleted',
        deletedAt: new Date(),
        updatedAt: new Date()
      };

      if (masterDb) {
        try {
          await masterDb.collection('tenants').updateOne({ _id: new ObjectId(tenantId) }, { $set: updatePayload });
        } catch (e) {
          await masterDb.collection('tenants').updateOne({ id: tenantId }, { $set: updatePayload });
        }
      }

      if (typeof Tenants !== 'undefined') {
        try {
          await Tenants.updateOne({ id: tenantId }).set(updatePayload);
        } catch (e) {}
      }

      return res.status(200).json({
        success: true,
        code: 200,
        message: 'Tenant soft deleted successfully',
        data: {
          tenant_id: tenantId,
          business_name: tenant.business_name,
          subdomain: tenant.subdomain,
          isDeleted: true,
          status: 'deleted',
          deletedAt: updatePayload.deletedAt
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, code: 500, message: err.message });
    }
  },

  /**
   * 2d. Super Admin Manual Provisioning: Provision dedicated database for a tenant on demand
   * POST /admin/whitelabel/tenant/provision
   */
  provisionTenant: async function (req, res) {
    try {
      const { tenant_id, subdomain, password } = req.body;

      let tenant = null;
      const masterDb = await multiTenant.getMasterDb();

      if (tenant_id && masterDb) {
        const { ObjectId } = require('mongodb');
        try {
          tenant = await masterDb.collection('tenants').findOne({ _id: new ObjectId(tenant_id) });
        } catch (e) {
          tenant = await masterDb.collection('tenants').findOne({ id: tenant_id });
        }
      } else if (subdomain && masterDb) {
        tenant = await masterDb.collection('tenants').findOne({ subdomain: subdomain.toLowerCase().trim() });
      }

      if (!tenant) {
        return res.status(404).json({ success: false, code: 404, message: 'Tenant record not found in master catalog' });
      }

      const provisionResult = await tenantProvision.provisionTenantDatabase(tenant, {
        password: password || 'Upfilly@2026!'
      });

      return res.status(200).json({
        success: true,
        code: 200,
        message: `Dedicated database '${provisionResult.dbName}' successfully provisioned.`,
        data: {
          tenant_id: tenant.id || tenant._id,
          subdomain: tenant.subdomain,
          dedicated_database: provisionResult.dbName
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, code: 500, message: err.message });
    }
  },

  /**
   * 3. Plans: List existing white-label plans (from SubscriptionPlans where category: 'white_label')
   * GET /admin/whitelabel/plans
   */
  listWhiteLabelPlans: async function (req, res) {
    try {
      const plans = await SubscriptionPlans.find({
        category: 'white_label',
        isDeleted: false
      }).sort('amount ASC');

      return res.status(200).json({
        success: true,
        code: 200,
        message: 'White-Label subscription plans fetched successfully',
        data: plans
      });
    } catch (err) {
      return res.status(500).json({ success: false, code: 500, message: err.message });
    }
  },

  /**
   * 3b. Create new White-Label plan in SubscriptionPlans
   * POST /admin/whitelabel/plans
   */
  createWhiteLabelPlan: async function (req, res) {
    try {
      const {
        name,
        amount,
        plan_type,
        payment_type,
        interval,
        interval_count,
        trial_period_days,
        whitelabelType,
        features,
        currency
      } = req.body;

      if (!name || amount === undefined) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: 'name and amount are required'
        });
      }

      const planDoc = {
        name: name.trim(),
        amount: Number(amount) || 0,
        plan_type: plan_type || 'paid',
        payment_type: payment_type || 'recurring',
        category: 'white_label',
        whitelabelType: whitelabelType || 'network',
        interval: interval || 'month',
        interval_count: interval_count || 1,
        trial_period_days: trial_period_days || 0,
        features: features || [],
        currency: currency || 'USD',
        status: 'active',
        isDeleted: false,
        addedBy: req.user ? req.user.id : null
      };

      const newPlan = await SubscriptionPlans.create(planDoc).fetch();

      return res.status(201).json({
        success: true,
        code: 201,
        message: 'White-Label plan created successfully',
        data: newPlan
      });
    } catch (err) {
      return res.status(500).json({ success: false, code: 500, message: err.message });
    }
  },

  /**
   * 3c. Update White-Label plan
   * PUT /admin/whitelabel/plans/:id
   */
  updateWhiteLabelPlan: async function (req, res) {
    try {
      const planId = req.params.id;
      const updateData = { ...req.body, updatedAt: new Date() };
      delete updateData.id;
      delete updateData._id;

      const updated = await SubscriptionPlans.updateOne({ id: planId }).set(updateData);
      if (!updated) {
        return res.status(404).json({ success: false, code: 404, message: 'Plan not found' });
      }

      return res.status(200).json({
        success: true,
        code: 200,
        message: 'White-Label plan updated successfully',
        data: updated
      });
    } catch (err) {
      return res.status(500).json({ success: false, code: 500, message: err.message });
    }
  },

  /**
   * 4. Subscriptions: List all white-label subscriptions
   * GET /admin/whitelabel/subscriptions
   */
  listWhiteLabelSubscriptions: async function (req, res) {
    try {
      // Find all white-label plan IDs
      const wlPlans = await SubscriptionPlans.find({
        category: 'white_label',
        isDeleted: false
      });
      const planIds = wlPlans.map(p => p.id || p._id);

      if (planIds.length === 0) {
        return res.status(200).json({
          success: true,
          code: 200,
          data: { total: 0, list: [] }
        });
      }

      const subscriptions = await Subscriptions.find({
        subscription_plan_id: { in: planIds }
      })
      .populate('user_id')
      .populate('subscription_plan_id')
      .sort('createdAt DESC');

      const formatted = subscriptions.map(s => ({
        id: s.id,
        user: s.user_id ? {
          id: s.user_id.id,
          name: s.user_id.fullName || s.user_id.firstName,
          email: s.user_id.email,
          brand_name: s.user_id.brand_name,
          sub_domain: s.user_id.sub_domain
        } : null,
        plan: s.subscription_plan_id ? {
          id: s.subscription_plan_id.id,
          name: s.subscription_plan_id.name,
          amount: s.subscription_plan_id.amount,
          interval: s.subscription_plan_id.interval
        } : null,
        status: s.status,
        valid_upto: s.valid_upto,
        stripe_subscription_id: s.stripe_subscription_id,
        createdAt: s.createdAt
      }));

      return res.status(200).json({
        success: true,
        code: 200,
        message: 'White-Label subscriptions fetched successfully',
        data: formatted,
        total : formatted.length  
      });
    } catch (err) {
      return res.status(500).json({ success: false, code: 500, message: err.message });
    }
  },

  /**
   * 5. Transactions: List all payment transactions for white-label subscriptions
   * GET /admin/whitelabel/transactions
   */
  listWhiteLabelTransactions: async function (req, res) {
    try {
      const wlPlans = await SubscriptionPlans.find({
        category: 'white_label',
        isDeleted: false
      });
      const planIds = wlPlans.map(p => p.id || p._id);

      let query = {};
      if (planIds.length > 0) {
        query.subscription_plan_id = { in: planIds };
      }

      const transactions = await Transactions.find(query)
        .populate('user_id')
        .populate('subscription_plan_id')
        .sort('createdAt DESC')
        .limit(100);

      const formatted = transactions.map(t => ({
        id: t.id,
        transaction_id: t.transaction_id || t.stripe_charge_id,
        amount: t.amount,
        currency: t.currency || 'USD',
        status: t.transaction_status,
        plan: t.subscription_plan_id ? {
          id: t.subscription_plan_id.id,
          name: t.subscription_plan_id.name
        } : null,
        user: t.user_id ? {
          id: t.user_id.id,
          name: t.user_id.fullName || t.user_id.firstName,
          email: t.user_id.email,
          brand_name: t.user_id.brand_name
        } : null,
        createdAt: t.createdAt
      }));

      return res.status(200).json({
        success: true,
        code: 200,
        message: 'White-Label transactions fetched successfully',
        total: formatted.length,
        data: formatted
      });
    } catch (err) {
      return res.status(500).json({ success: false, code: 500, message: err.message });
    }
  },

  /**
   * 6. Assisted Onboarding Call Sign-Off (for Network branch)
   * PUT /admin/whitelabel/tenant/:id/complete-call
   */
  completeAssistedCall: async function (req, res) {
    try {
      const tenantId = req.params.id;
      const { notes } = req.body;

      const masterDb = await multiTenant.getMasterDb();
      const updateData = {
        onboarding_call_booked: true,
        onboarding_completed: true,
        onboarding_call_completed_at: new Date(),
        onboarding_call_notes: notes || '',
        updatedAt: new Date()
      };

      if (masterDb) {
        const { ObjectId } = require('mongodb');
        try {
          await masterDb.collection('tenants').updateOne({ _id: new ObjectId(tenantId) }, { $set: updateData });
        } catch (e) {
          await masterDb.collection('tenants').updateOne({ id: tenantId }, { $set: updateData });
        }
      }

      if (typeof Tenants !== 'undefined') {
        try { await Tenants.updateOne({ id: tenantId }).set(updateData); } catch (e) {}
      }

      return res.status(200).json({
        success: true,
        code: 200,
        message: 'Assisted onboarding call marked as complete for tenant.',
        data: { tenant_id: tenantId, ...updateData }
      });
    } catch (err) {
      return res.status(500).json({ success: false, code: 500, message: err.message });
    }
  }
};

