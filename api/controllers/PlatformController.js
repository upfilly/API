/**
 * PlatformController.js
 *
 * @description :: Platform Control Plane for Multi-Tenant SaaS (White-Labeling):
 *                 - Business onboarding & registration
 *                 - Dedicated database provisioning
 *                 - SaaS platform subscription plans & Stripe Checkout
 *                 - Stripe subscription lifecycle webhooks
 *                 - Custom CNAME domain configuration
 */

const multiTenant = require('../utils/multiTenant');
const tenantHost = require('../services/tenantHost.service');
const tenantProvision = require('../services/tenantProvision.service');

module.exports = {
  /**
   * Register a new business organization (white-label tenant)
   * POST /platform/register
   */
  registerBusiness: async function (req, res) {
    try {
      const {
        business_name,
        subdomain,
        admin_email,
        admin_name,
        password,
        currency,
        company_phone
      } = req.body;

      // 1. Validation
      if (!business_name || !subdomain || !admin_email || !password) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: 'Required fields missing: business_name, subdomain, admin_email, password'
        });
      }

      const cleanEmail = String(admin_email).toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: 'Please provide a valid email address.'
        });
      }

      const cleanSubdomain = tenantHost.parseTenantHost(`${subdomain}.upfilly.com`).subdomain;

      if (!cleanSubdomain || cleanSubdomain.length < 3) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: 'Subdomain must be at least 3 alphanumeric characters'
        });
      }

      if (tenantHost.isReservedSubdomain(cleanSubdomain)) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: `The subdomain '${cleanSubdomain}' is reserved and cannot be registered.`
        });
      }

      // 2. Check if subdomain already exists
      let existingSubdomain = null;
      if (typeof Tenants !== 'undefined' && Tenants.findOne) {
        existingSubdomain = await Tenants.findOne({
          subdomain: cleanSubdomain,
          isDeleted: false
        });
      }

      if (!existingSubdomain) {
        const masterDb = await multiTenant.getMasterDb();
        if (masterDb) {
          existingSubdomain = await masterDb.collection('tenants').findOne({
            subdomain: cleanSubdomain,
            isDeleted: { $ne: true }
          });
        }
      }

      if (existingSubdomain) {
        return res.status(409).json({
          success: false,
          code: 409,
          message: `The subdomain '${cleanSubdomain}' is already taken. Please choose another.`
        });
      }

      // 3. Check if admin email is already registered with another business
      let existingEmail = null;
      if (typeof Tenants !== 'undefined' && Tenants.findOne) {
        existingEmail = await Tenants.findOne({
          admin_email: cleanEmail,
          isDeleted: false
        });
      }

      if (!existingEmail) {
        const masterDb = await multiTenant.getMasterDb();
        if (masterDb) {
          existingEmail = await masterDb.collection('tenants').findOne({
            admin_email: cleanEmail,
            isDeleted: { $ne: true }
          });
        }
      }

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          code: 409,
          message: `An account with email '${cleanEmail}' is already registered with business '${existingEmail.business_name || existingEmail.subdomain}'. Each business account requires a unique administrator email address.`
        });
      }

      // 4. Create Master Tenant Record in Master DB (upfilly_master)
      const dbName = multiTenant.buildTenantDbName(cleanSubdomain);
      const masterDb = await multiTenant.getMasterDb();

      let newTenant;
      if (typeof Tenants !== 'undefined' && Tenants.create) {
        newTenant = await Tenants.create({
          business_name: business_name.trim(),
          subdomain: cleanSubdomain,
          admin_email: admin_email.toLowerCase().trim(),
          admin_name: admin_name || business_name,
          db_name: dbName,
          plan_status: 'pending_payment',
          status: 'active',
          branding: {
            brand_name: business_name,
            currency: currency || 'USD',
            phone: company_phone || ''
          }
        }).fetch();
      }

      // Ensure tenant record exists in upfilly_master collection
      if (masterDb) {
        const tenantDoc = {
          business_name: business_name.trim(),
          subdomain: cleanSubdomain,
          admin_email: admin_email.toLowerCase().trim(),
          admin_name: admin_name || business_name,
          db_name: dbName,
          plan_status: 'pending_payment',
          status: 'active',
          branding: {
            brand_name: business_name,
            currency: currency || 'USD',
            phone: company_phone || ''
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isDeleted: false
        };
        const existingDoc = await masterDb.collection('tenants').findOne({ subdomain: cleanSubdomain });
        if (!existingDoc) {
          const insertRes = await masterDb.collection('tenants').insertOne(tenantDoc);
          if (!newTenant) {
            newTenant = { id: insertRes.insertedId.toString(), ...tenantDoc };
          }
        }
      }

      // 4. Provision dedicated database, indexes, and initial admin user
      await tenantProvision.provisionTenantDatabase(newTenant, {
        password: password
      });

      // 5. Register subdomain in DomainMappings
      const mappingDoc = {
        hostname: `${cleanSubdomain}.${process.env.APP_BASE_DOMAIN || 'upfilly.com'}`,
        subdomain: cleanSubdomain,
        tenant_id: newTenant ? (newTenant.id || newTenant._id) : null,
        type: 'subdomain',
        is_verified: true,
        ssl_active: true,
        createdAt: new Date()
      };
      if (typeof DomainMappings !== 'undefined' && DomainMappings.create) {
        try { await DomainMappings.create(mappingDoc); } catch (e) {}
      }
      if (masterDb) {
        try { await masterDb.collection('domainmappings').insertOne(mappingDoc); } catch (e) {}
      }

      return res.status(201).json({
        success: true,
        code: 201,
        message: 'Business successfully registered. Dedicated database provisioned. Please complete your subscription plan to activate your platform.',
        data: {
          tenant_id: newTenant.id,
          business_name: newTenant.business_name,
          subdomain: newTenant.subdomain,
          domain: `${newTenant.subdomain}.${process.env.APP_BASE_DOMAIN || 'upfilly.com'}`,
          dedicated_database: newTenant.db_name,
          plan_status: newTenant.plan_status
        }
      });
    } catch (err) {
      sails.log.error('PlatformController.registerBusiness: Error:', err);
      return res.status(500).json({
        success: false,
        code: 500,
        message: 'Internal server error while registering business.',
        error: err.message
      });
    }
  },

  /**
   * Retrieve platform SaaS subscription plans
   * GET /platform/plans
   */
  getPlans: async function (req, res) {
    try {
      let plans = [];
      if (typeof SubscriptionPlans !== 'undefined') {
        plans = await SubscriptionPlans.find({
          category: 'white_label',
          isDeleted: false
        }).sort('amount ASC');
      }

      if (!plans || plans.length === 0) {
        const masterDb = await multiTenant.getMasterDb();
        if (masterDb) {
          plans = await masterDb.collection('subscriptionplans').find({
            category: 'white_label',
            isDeleted: { $ne: true }
          }).sort({ amount: 1 }).toArray();
        }
      }

      if (!plans || plans.length === 0) {
        if (typeof PlatformPlans !== 'undefined') {
          plans = await PlatformPlans.find({ status: 'active', isDeleted: false });
        }
      }

      // Fallback default plans if none seeded yet
      if (!plans || plans.length === 0) {
        plans = [
          {
            id: 'starter',
            name: 'Starter White-Label',
            slug: 'starter',
            price: 99,
            billing_interval: 'month',
            description: 'For growing businesses starting their own affiliate network',
            features: {
              max_brands: 3,
              max_affiliates: 500,
              max_monthly_clicks: 50000,
              custom_domain_enabled: false,
              dedicated_database: true
            }
          },
          {
            id: 'growth',
            name: 'Growth Network',
            slug: 'growth',
            price: 199,
            billing_interval: 'month',
            description: 'For expanding businesses requiring custom CNAME domains and higher limits',
            features: {
              max_brands: 10,
              max_affiliates: 2500,
              max_monthly_clicks: 250000,
              custom_domain_enabled: true,
              custom_smtp_enabled: true,
              dedicated_database: true
            }
          },
          {
            id: 'enterprise',
            name: 'Enterprise Scale',
            slug: 'enterprise',
            price: 499,
            billing_interval: 'month',
            description: 'Unlimited brands, custom database clustering, and dedicated IP routing',
            features: {
              max_brands: 50,
              max_affiliates: 20000,
              max_monthly_clicks: 2000000,
              custom_domain_enabled: true,
              custom_smtp_enabled: true,
              api_access: true,
              dedicated_database: true
            }
          }
        ];
      }

      return res.status(200).json({
        success: true,
        code: 200,
        message: 'Platform subscription plans fetched successfully',
        data: plans
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        code: 500,
        message: err.message
      });
    }
  },

  /**
   * Create Stripe Checkout session for a tenant to purchase a platform plan
   * POST /platform/checkout-session
   */
  createCheckoutSession: async function (req, res) {
    try {
      const { tenant_id, session_token, plan_id, success_url, cancel_url } = req.body;

      if (!tenant_id && !session_token) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: 'tenant_id or session_token is required'
        });
      }

      const masterDb = await multiTenant.getMasterDb();
      let tenant = null;

      if (tenant_id) {
        if (typeof Tenants !== 'undefined') {
          tenant = await Tenants.findOne({ id: tenant_id });
        }
        if (!tenant && masterDb) {
          const { ObjectId } = require('mongodb');
          try { tenant = await masterDb.collection('tenants').findOne({ _id: new ObjectId(tenant_id) }); } catch(e) {}
          if (!tenant) tenant = await masterDb.collection('tenants').findOne({ id: tenant_id });
        }
      } else if (session_token && masterDb) {
        tenant = await masterDb.collection('tenants').findOne({ onboarding_session_token: session_token });
      }

      if (!tenant) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: 'Tenant business not found'
        });
      }

      const currentTenantId = String(tenant.id || tenant._id);

      // Retrieve selected Plan from SubscriptionPlans
      const targetPlanId = plan_id || tenant.plan_id;
      let selectedPlan = null;
      if (targetPlanId) {
        if (typeof SubscriptionPlans !== 'undefined') {
          selectedPlan = await SubscriptionPlans.findOne({ id: targetPlanId });
        }
        if (!selectedPlan && masterDb) {
          const { ObjectId } = require('mongodb');
          try { selectedPlan = await masterDb.collection('subscriptionplans').findOne({ _id: new ObjectId(targetPlanId) }); } catch (e) {}
          if (!selectedPlan) selectedPlan = await masterDb.collection('subscriptionplans').findOne({ id: targetPlanId });
        }
      }

      const baseDomain = process.env.APP_BASE_DOMAIN || 'upfilly.com';
      const redirectSuccess = success_url || `https://${tenant.subdomain || 'app'}.${baseDomain}/dashboard?payment=success`;
      const redirectCancel = cancel_url || `https://${tenant.subdomain || 'app'}.${baseDomain}/billing?payment=canceled`;

      const planName = selectedPlan ? selectedPlan.name : 'White-Label Subscription';
      const planAmount = selectedPlan && typeof selectedPlan.amount === 'number' ? selectedPlan.amount : 199;
      const planCurrency = selectedPlan && selectedPlan.currency ? selectedPlan.currency.toLowerCase() : 'usd';
      const planInterval = selectedPlan && selectedPlan.interval ? selectedPlan.interval : 'month';

      // If plan is free trial ($0), activate immediately without Stripe checkout
      if (planAmount === 0) {
        const updateData = { plan_status: 'active', plan_id: targetPlanId, status: 'active', updatedAt: new Date() };
        if (masterDb) {
          const { ObjectId } = require('mongodb');
          try { await masterDb.collection('tenants').updateOne({ _id: new ObjectId(currentTenantId) }, { $set: updateData }); } catch(e) {
            await masterDb.collection('tenants').updateOne({ id: currentTenantId }, { $set: updateData });
          }
        }
        if (typeof Tenants !== 'undefined') {
          try { await Tenants.updateOne({ id: currentTenantId }).set(updateData); } catch (e) {}
        }

        return res.status(200).json({
          success: true,
          code: 200,
          message: 'Free trial plan activated successfully. Proceed to onboarding.',
          data: {
            free_plan: true,
            plan_name: planName,
            tenant_id: currentTenantId,
            next_url: redirectSuccess
          }
        });
      }

      const stripeKey = sails.config.local ? sails.config.local.PAYMENT_INFO.SECREATKEY : process.env.STRIPE_SECRET_KEY;
      const stripe = require('stripe')(stripeKey);

      // Create or retrieve Stripe customer for this tenant business
      let customerId = tenant.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: tenant.admin_email,
          name: tenant.business_name || tenant.admin_name,
          metadata: {
            tenant_id: currentTenantId,
            subdomain: tenant.subdomain || ''
          }
        });
        customerId = customer.id;
        if (masterDb) {
          const { ObjectId } = require('mongodb');
          try { await masterDb.collection('tenants').updateOne({ _id: new ObjectId(currentTenantId) }, { $set: { stripe_customer_id: customerId } }); } catch(e) {
            await masterDb.collection('tenants').updateOne({ id: currentTenantId }, { $set: { stripe_customer_id: customerId } });
          }
        }
        if (typeof Tenants !== 'undefined') {
          try { await Tenants.updateOne({ id: currentTenantId }).set({ stripe_customer_id: customerId }); } catch(e) {}
        }
      }

      // Configure Line Items based on selected plan
      let lineItems = [];
      if (selectedPlan && selectedPlan.stripe_plan_id) {
        lineItems.push({
          price: selectedPlan.stripe_plan_id,
          quantity: 1
        });
      } else {
        lineItems.push({
          price_data: {
            currency: planCurrency,
            product_data: {
              name: `Upfilly Platform - ${planName}`,
              description: `Dedicated White-Label Platform for ${tenant.business_name || 'Organization'}`
            },
            unit_amount: Math.round(planAmount * 100),
            recurring: { interval: planInterval }
          },
          quantity: 1
        });
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: lineItems,
        metadata: {
          tenant_id: currentTenantId,
          subdomain: tenant.subdomain || '',
          plan_id: String(targetPlanId || '')
        },
        success_url: redirectSuccess,
        cancel_url: redirectCancel
      });

      return res.status(200).json({
        success: true,
        code: 200,
        message: 'Checkout session created successfully',
        data: {
          session_id: session.id,
          checkout_url: session.url
        }
      });
    } catch (err) {
      sails.log.error('PlatformController.createCheckoutSession: Error:', err);
      return res.status(500).json({
        success: false,
        code: 500,
        message: err.message
      });
    }
  },

  /**
   * Handle incoming Stripe webhook events for tenant platform subscriptions
   * POST /platform/webhook
   */
  stripeWebhook: async function (req, res) {
    try {
      const event = req.body;
      sails.log.info(`PlatformController.stripeWebhook: Received event '${event.type}'`);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const tenantId = session.metadata ? session.metadata.tenant_id : null;
        const planId = session.metadata ? session.metadata.plan_id : null;

        if (tenantId) {
          const masterDb = await multiTenant.getMasterDb();
          const updateData = {
            plan_status: 'active',
            stripe_subscription_id: session.subscription,
            stripe_customer_id: session.customer,
            status: 'active',
            updatedAt: new Date()
          };
          if (planId) updateData.plan_id = planId;

          if (masterDb) {
            const { ObjectId } = require('mongodb');
            try { await masterDb.collection('tenants').updateOne({ _id: new ObjectId(tenantId) }, { $set: updateData }); } catch(e) {
              await masterDb.collection('tenants').updateOne({ id: tenantId }, { $set: updateData });
            }

            // Record in Subscriptions and Transactions in db_upfilly
            try {
              await masterDb.collection('subscriptions').insertOne({
                tenant_id: tenantId,
                stripe_subscription_id: session.subscription,
                stripe_customer_id: session.customer,
                subscription_plan_id: planId,
                status: 'active',
                amount: (session.amount_total || 0) / 100,
                createdAt: new Date(),
                updatedAt: new Date()
              });
              await masterDb.collection('transactions').insertOne({
                tenant_id: tenantId,
                stripe_customer_id: session.customer,
                subscription_plan_id: planId,
                amount: (session.amount_total || 0) / 100,
                currency: session.currency || 'usd',
                status: 'succeeded',
                payment_gateway: 'stripe',
                stripe_checkout_session_id: session.id,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            } catch (histErr) {}
          }

          if (typeof Tenants !== 'undefined') {
            try { await Tenants.updateOne({ id: tenantId }).set(updateData); } catch (e) {}
          }

          if (typeof PlatformSubscriptions !== 'undefined') {
            try {
              await PlatformSubscriptions.create({
                tenant_id: tenantId,
                stripe_subscription_id: session.subscription,
                stripe_customer_id: session.customer,
                status: 'active',
                amount: (session.amount_total || 0) / 100,
                metadata: session.metadata
              });
            } catch (e) {}
          }

          sails.log.info(`PlatformController: Activated tenant '${tenantId}' via Stripe checkout session`);
        }
      } else if (event.type === 'customer.subscription.deleted') {
        const sub = event.data.object;
        await Tenants.updateOne({ stripe_subscription_id: sub.id }).set({
          plan_status: 'canceled'
        });
        sails.log.info(`PlatformController: Canceled subscription for sub ID '${sub.id}'`);
      } else if (event.type === 'invoice.payment_failed') {
        const invoice = event.data.object;
        await Tenants.updateOne({ stripe_subscription_id: invoice.subscription }).set({
          plan_status: 'past_due'
        });
        sails.log.info(`PlatformController: Marked plan past_due for sub ID '${invoice.subscription}'`);
      }

      return res.status(200).json({ received: true });
    } catch (err) {
      sails.log.error('PlatformController.stripeWebhook: Error:', err);
      return res.status(400).json({ error: err.message });
    }
  },

  /**
   * Configure custom CNAME domain for a tenant
   * PUT /platform/tenant/custom-domain
   */
  configureCustomDomain: async function (req, res) {
    try {
      const { tenant_id, custom_domain } = req.body;

      if (!tenant_id || !custom_domain) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: 'tenant_id and custom_domain are required'
        });
      }

      const cleanDomain = custom_domain.toLowerCase().trim().replace(/^https?:\/\//, '');

      // Check for domain conflicts
      const existing = await Tenants.findOne({
        custom_domain: cleanDomain,
        id: { '!=': tenant_id },
        isDeleted: false
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          code: 409,
          message: `The domain '${cleanDomain}' is already connected to another organization.`
        });
      }

      await Tenants.updateOne({ id: tenant_id }).set({
        custom_domain: cleanDomain,
        cname_status: 'pending',
        ssl_status: 'pending'
      });

      await DomainMappings.updateOrCreate(
        { hostname: cleanDomain },
        {
          hostname: cleanDomain,
          tenant_id: tenant_id,
          type: 'custom_domain',
          is_verified: false,
          ssl_active: false
        }
      );

      return res.status(200).json({
        success: true,
        code: 200,
        message: 'Custom domain registered. Please configure your DNS settings.',
        data: {
          custom_domain: cleanDomain,
          cname_target: `cname.${process.env.APP_BASE_DOMAIN || 'upfilly.com'}`,
          instruction: `Add a CNAME record in your DNS provider pointing '${cleanDomain}' to 'cname.${process.env.APP_BASE_DOMAIN || 'upfilly.com'}'`
        }
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        code: 500,
        message: err.message
      });
    }
  },

  /**
   * Retrieve tenant registration and subscription status
   * GET /platform/tenant/status
   */
  getTenantStatus: async function (req, res) {
    try {
      const tenantId = req.query.tenant_id;
      const subdomain = req.query.subdomain;

      let tenant = null;
      if (tenantId) {
        tenant = await Tenants.findOne({ id: tenantId, isDeleted: false });
      } else if (subdomain) {
        tenant = await Tenants.findOne({ subdomain: subdomain.toLowerCase(), isDeleted: false });
      }

      if (!tenant) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: 'Tenant not found'
        });
      }

      const portalUrl = tenantHost.buildPortalUrl(tenant);

      return res.status(200).json({
        success: true,
        code: 200,
        data: {
          tenant_id: tenant.id,
          business_name: tenant.business_name,
          subdomain: tenant.subdomain,
          portal_url: portalUrl,
          custom_domain: tenant.custom_domain,
          cname_status: tenant.cname_status,
          plan_status: tenant.plan_status,
          dedicated_database: tenant.db_name,
          status: tenant.status
        }
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        code: 500,
        message: err.message
      });
    }
  }
};

