/**
 * api/services/tenantProvision.service.js
 *
 * @description :: Provisions a brand-new dedicated database for a newly registered tenant business.
 *                 Follows the reference architecture:
 *                 - Creates dedicated database connection
 *                 - Sets up collections and performance indexes
 *                 - Seeds initial admin account, default email templates, and roles
 *                 - Updates Master Tenant record with db_name and provisioned_at
 *                 - Idempotent: safe to run multiple times without duplicating data
 */

const bcrypt = require('bcrypt-nodejs');
const multiTenant = require('../utils/multiTenant');

function logInfo(...args) {
  if (typeof sails !== 'undefined' && sails.log && sails.log.info) {
    sails.log.info(...args);
  } else {
    console.log(...args);
  }
}

function logError(...args) {
  if (typeof sails !== 'undefined' && sails.log && sails.log.error) {
    sails.log.error(...args);
  } else {
    console.error(...args);
  }
}

module.exports = {
  /**
   * Provision dedicated MongoDB database for a tenant business
   * @param {Object} tenant - Tenant master record from Tenants collection
   * @param {Object} [options] - Initial setup options (initial admin password, branding, etc.)
   * @returns {Promise<Object>} { success: true, dbName: string }
   */
  provisionTenantDatabase: async function (tenant, options = {}) {
    if (!tenant || !tenant.subdomain) {
      throw new Error('tenantProvision.provisionTenantDatabase: Invalid tenant record');
    }

    const tenantId = tenant.id || tenant._id;
    const dbName = tenant.db_name || multiTenant.buildTenantDbName(tenant.subdomain, tenantId);

    logInfo(`tenantProvision: Starting provisioning for tenant '${tenant.subdomain}' -> DB: '${dbName}'`);

    // Ensure connection to the new dedicated tenant database
    const tenantDb = await multiTenant.ensureTenantConnection(dbName, tenant.db_connection_uri);

    try {
      // 1. Build performance and constraint indexes in dedicated database
      await Promise.all([
        tenantDb.collection('users').createIndex({ email: 1 }, { unique: true, background: true }),
        tenantDb.collection('users').createIndex({ role: 1, status: 1 }, { background: true }),
        tenantDb.collection('users').createIndex({ brand_name: 1 }, { background: true }),
        tenantDb.collection('campaign').createIndex({ brand_id: 1, status: 1 }, { background: true }),
        tenantDb.collection('affiliatelink').createIndex({ affilaite_unique_id: 1 }, { unique: true, background: true }),
        tenantDb.collection('affiliatelink').createIndex({ brand_id: 1, affiliate_id: 1 }, { background: true }),
        tenantDb.collection('commission').createIndex({ brand_id: 1, affiliate_id: 1 }, { background: true }),
        tenantDb.collection('commission').createIndex({ status: 1 }, { background: true }),
        tenantDb.collection('cookies').createIndex({ click_id: 1 }, { background: true }),
        tenantDb.collection('banner').createIndex({ brand_id: 1 }, { background: true }),
        tenantDb.collection('coupon').createIndex({ brand_id: 1, coupon_code: 1 }, { background: true }),
        tenantDb.collection('transactions').createIndex({ user_id: 1 }, { background: true }),
      ]);

      // 2. Seed initial Business Admin user in dedicated database (Idempotent)
      const adminEmail = (tenant.admin_email || '').toLowerCase().trim();
      const existingUser = await tenantDb.collection('users').findOne({ email: adminEmail });

      const resolvedFirstName = tenant.first_name || (tenant.admin_name ? tenant.admin_name.split(' ')[0] : 'Admin');
      const resolvedLastName = tenant.last_name || (tenant.admin_name ? tenant.admin_name.split(' ').slice(1).join(' ') : 'Manager') || 'Manager';
      const resolvedFullName = tenant.admin_name || `${resolvedFirstName} ${resolvedLastName}`.trim();

      if (!existingUser && adminEmail) {
        const rawPassword = options.password || 'Upfilly@2026!';
        const hashedPassword = bcrypt.hashSync(rawPassword, bcrypt.genSaltSync(10));

        await tenantDb.collection('users').insertOne({
          firstName: resolvedFirstName,
          lastName: resolvedLastName,
          fullName: resolvedFullName,
          brand_name: tenant.business_name,
          email: adminEmail,
          password: hashedPassword,
          encryptedPassword: hashedPassword,
          role: 'admin',
          isVerified: 'Y',
          status: 'active',
          terms_and_conditions: true,
          sub_domain: tenant.subdomain,
          createdAt: new Date(),
          updatedAt: new Date(),
          isDeleted: false
        });
        logInfo(`tenantProvision: Created initial brand admin for '${adminEmail}' in '${dbName}'`);
      }

      // 2b. Seed Stripe BYOK Gateway Settings if provided
      if (tenant.tenant_stripe_publishable_key || options.stripe_publishable_key) {
        const pubKey = tenant.tenant_stripe_publishable_key || options.stripe_publishable_key;
        const secKey = tenant.tenant_stripe_secret_key || options.stripe_secret_key;
        const env = tenant.tenant_stripe_environment || options.environment || 'test';
        const cur = tenant.tenant_stripe_currency || options.currency || 'USD';
        const descriptor = tenant.statement_descriptor || options.statement_descriptor || tenant.business_name;

        await tenantDb.collection('settings').updateOne(
          { type: 'payment_gateway' },
          {
            $set: {
              type: 'payment_gateway',
              gateway: 'stripe',
              environment: env,
              publishable_key: pubKey,
              secret_key: secKey,
              currency: cur,
              statement_descriptor: descriptor,
              updatedAt: new Date()
            }
          },
          { upsert: true }
        );
        logInfo(`tenantProvision: Configured payment_gateway settings in '${dbName}'`);
      }

      // 3. Seed default Email Templates for the tenant
      const templateCount = await tenantDb.collection('emailtemplate').countDocuments();
      if (templateCount === 0) {
        await tenantDb.collection('emailtemplate').insertMany([
          {
            template_name: 'Affiliate Welcome Email',
            subject: `Welcome to ${tenant.business_name} Affiliate Program!`,
            body: '<p>Hi {{affiliate_name}},</p><p>Welcome to our partner program! Access your referral links and assets inside your partner dashboard.</p>',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            template_name: 'Commission Earned Notification',
            subject: `New Commission Earned with ${tenant.business_name}!`,
            body: '<p>Congratulations {{affiliate_name}},</p><p>You just earned a new commission of {{commission_amount}} for order #{{order_id}}.</p>',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]);
      }

      // 4. Seed default Brand Subscription Plans for this tenant
      const planCount = await tenantDb.collection('subscriptionplans').countDocuments();
      if (planCount === 0) {
        await tenantDb.collection('subscriptionplans').insertMany([
          {
            name: 'Free Trial',
            amount: 0,
            plan_type: 'free',
            payment_type: 'trial',
            status: 'active',
            interval: 'month',
            interval_count: 1,
            trial_period_days: 14,
            category: 'normal',
            currency: 'USD',
            features: ['Up to 5 Campaigns', 'Unlimited Referral Links', 'Real-time Analytics'],
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            name: 'Starter Plan',
            amount: 29,
            plan_type: 'paid',
            payment_type: 'recurring',
            status: 'active',
            interval: 'month',
            interval_count: 1,
            trial_period_days: 0,
            category: 'normal',
            currency: 'USD',
            features: ['Up to 20 Campaigns', 'Custom Commission Rules', 'Email Automation'],
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            name: 'Growth Plan',
            amount: 79,
            plan_type: 'paid',
            payment_type: 'recurring',
            status: 'active',
            interval: 'month',
            interval_count: 1,
            trial_period_days: 0,
            category: 'normal',
            currency: 'USD',
            features: ['Unlimited Campaigns', 'Multi-tier Affiliates', 'Priority Support'],
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]);
        logInfo(`tenantProvision: Seeded default Brand Subscription Plans in '${dbName}'`);
      }

      // 5. Update Master Tenant record with db_name and provisioned timestamp
      const masterDb = await multiTenant.getMasterDb();
      if (masterDb) {
        const { ObjectId } = require('mongodb');
        try {
          await masterDb.collection('tenants').updateOne(
            { _id: new ObjectId(String(tenantId)) },
            { $set: { db_name: dbName, provisioned_at: new Date() } }
          );
        } catch (e) {
          await masterDb.collection('tenants').updateOne(
            { id: String(tenantId) },
            { $set: { db_name: dbName, provisioned_at: new Date() } }
          );
        }
      }

      if (typeof Tenants !== 'undefined' && Tenants.updateOne) {
        try {
          await Tenants.updateOne({ id: tenantId }).set({
            db_name: dbName,
            provisioned_at: new Date()
          });
        } catch (e) {}
      }

      logInfo(`tenantProvision: Provisioning complete for '${tenant.subdomain}' -> '${dbName}'`);
      return { success: true, dbName };
    } catch (err) {
      logError(`tenantProvision: Error provisioning database '${dbName}':`, err.message);
      throw err;
    }
  }
};

