/**
 * api/middlewares/tenantResolver.js
 *
 * @description :: Multi-tenant request resolution middleware.
 *                 Executes before routes are dispatched:
 *                 - Drops spoofed x-tenant headers
 *                 - Bypasses tenant-agnostic/platform paths
 *                 - Resolves tenant from hostname (subdomain or custom CNAME domain)
 *                 - Enforces subscription plan billing gating (allowing only billing paths if unpaid)
 *                 - Connects to dedicated tenant database and binds to AsyncLocalStorage (ALS)
 */

const multiTenant = require('../utils/multiTenant');
const tenantHost = require('../services/tenantHost.service');

// Paths that are globally agnostic of tenant context (master platform operations)
const TENANT_AGNOSTIC_PATH_PREFIXES = [
  '/platform/',
  '/admin/whitelabel/',
  '/health',
  '/favicon.ico',
  '/assets/',
  '/homepage'
];

// Billing & authentication allowlist accessible even when plan status is pending_payment/suspended
const BILLING_ALLOWLIST_PATH_PREFIXES = [
  '/platform/checkout',
  '/platform/subscribe',
  '/billing',
  '/user/signin',
  '/admin/signin',
  '/logout',
  '/change/password',
  '/reset/password',
  '/forgot/password'
];

module.exports = async function tenantResolver(req, res, next) {
  // 1. Drop internal sensitive override headers (db name / internal IDs)
  if (process.env.NODE_ENV === 'production') {
    delete req.headers['x-tenant-id'];
    delete req.headers['x-tenant-db'];
  }

  const reqPath = req.path || req.url || '/';

  // 2. Check if request path is tenant-agnostic (platform admin / master signup / health)
  const isAgnostic = TENANT_AGNOSTIC_PATH_PREFIXES.some(prefix => reqPath.startsWith(prefix));
  if (isAgnostic) {
    req.tenant = null;
    req.isMaster = true;
    return multiTenant.runWithTenant({ tenant: null, isMaster: true }, next);
  }

  // 3. Parse Host header
  let rawHost = req.headers['x-forwarded-host'] || req.headers.host || '';
  let hostInfo = tenantHost.parseTenantHost(rawHost);

  // If host is API root / platform root / dev host, check Origin/Referer (from SPA frontends) or custom tenant header
  if (hostInfo.kind === 'root' || hostInfo.kind === 'platform-admin') {
    const originHeader = req.headers.origin || req.headers.referer || '';
    if (originHeader) {
      const originHost = originHeader.replace(/^https?:\/\//, '').split('/')[0];
      const originInfo = tenantHost.parseTenantHost(originHost);
      if (originInfo.kind === 'tenant' || originInfo.kind === 'custom_domain') {
        hostInfo = originInfo;
        rawHost = originHost;
      }
    }

    // Support explicit tenant header or query param (for Mobile Apps, Postman, or local testing)
    const explicitSubdomain = req.headers['x-tenant-subdomain'] || req.query.subdomain;
    if (explicitSubdomain && (hostInfo.kind === 'root' || hostInfo.kind === 'platform-admin')) {
      hostInfo = {
        kind: 'tenant',
        subdomain: String(explicitSubdomain).toLowerCase().trim(),
        host: rawHost
      };
    }
  }

  // 4. If platform root or admin portal without tenant origin/header, execute in master platform context
  if (hostInfo.kind === 'root' || hostInfo.kind === 'platform-admin') {
    req.tenant = null;
    req.isMaster = true;
    return multiTenant.runWithTenant({ tenant: null, isMaster: true }, next);
  }

  // 5. Lookup Tenant record from Master Database (upfilly_master)
  let tenant = null;
  try {
    const queryObj = hostInfo.kind === 'tenant'
      ? { subdomain: hostInfo.subdomain, isDeleted: false }
      : { custom_domain: hostInfo.customDomain, isDeleted: false };

    if (typeof Tenants !== 'undefined' && Tenants.findOne) {
      tenant = await Tenants.findOne(queryObj);
    }

    if (!tenant) {
      const masterDb = await multiTenant.getMasterDb();
      if (masterDb) {
        const mongoQuery = hostInfo.kind === 'tenant'
          ? { subdomain: hostInfo.subdomain, isDeleted: { $ne: true } }
          : { custom_domain: hostInfo.customDomain, isDeleted: { $ne: true } };
        tenant = await masterDb.collection('tenants').findOne(mongoQuery);

        // Fallback: Check if an existing brand user registered this sub_domain in users collection
        if (!tenant && hostInfo.kind === 'tenant') {
          const legacyUser = await masterDb.collection('users').findOne({
            sub_domain: hostInfo.subdomain,
            isDeleted: { $ne: true }
          });
          if (legacyUser) {
            const tenantSlug = hostInfo.subdomain;
            const dedicatedDbName = multiTenant.buildTenantDbName(tenantSlug);
            const newTenantDoc = {
              business_name: legacyUser.company_name || legacyUser.brand_name || `${legacyUser.firstName || 'Brand'} Organization`,
              subdomain: tenantSlug,
              db_name: dedicatedDbName,
              admin_email: (legacyUser.email || '').toLowerCase().trim(),
              admin_name: legacyUser.fullName || `${legacyUser.firstName || ''} ${legacyUser.lastName || ''}`.trim(),
              whitelabel_type: 'merchant',
              onboarding_step: 'completed',
              plan_status: 'active',
              status: 'active',
              master_user_id: String(legacyUser._id || legacyUser.id),
              is_existing_brand_upgrade: true,
              isDeleted: false,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            const ins = await masterDb.collection('tenants').insertOne(newTenantDoc);
            newTenantDoc._id = ins.insertedId;
            newTenantDoc.id = ins.insertedId.toString();
            tenant = newTenantDoc;
          }
        }
      }
    }
  } catch (err) {
    if (typeof sails !== 'undefined' && sails.log) {
      sails.log.error('tenantResolver: Error querying tenant:', err.message);
    }
  }

  // 6. Tenant not found -> Return 404 Site Not Found
  if (!tenant) {
    return res.status(404).json({
      success: false,
      code: 404,
      message: 'Site not found. No tenant business registered for this domain.',
      domain: rawHost
    });
  }

  // 7. Status & Plan Billing Gating
  const planStatus = tenant.plan_status || 'pending_payment';
  const isInactivePlan = (planStatus === 'pending_payment' || planStatus === 'suspended' || planStatus === 'canceled' || planStatus === 'past_due');

  if (isInactivePlan) {
    // Check if current route is in the billing/auth allowlist
    const isAllowed = BILLING_ALLOWLIST_PATH_PREFIXES.some(prefix => reqPath.startsWith(prefix));

    if (!isAllowed) {
      return res.status(402).json({
        success: false,
        code: 402,
        message: 'Subscription plan is inactive. Please complete your subscription plan payment to unlock platform features.',
        plan_status: planStatus,
        checkout_url: `https://${process.env.APP_BASE_DOMAIN || 'upfilly.com'}/billing/checkout?tenant_id=${tenant.id || tenant._id}`
      });
    }
  }

  // 8. Attach tenant to request and resolve dedicated database connection
  req.tenant = tenant;

  // Coexistence rule: If tenant has a dedicated db_name, route through dedicated DB connection
  if (tenant.db_name) {
    try {
      const tenantDb = await multiTenant.ensureTenantConnection(tenant.db_name, tenant.db_connection_uri);
      req.tenantDb = tenantDb;
      req.tenantDbName = tenant.db_name;

      // Run entire request lifecycle inside ALS tenant context
      return multiTenant.runWithTenant({
        tenant,
        dbName: tenant.db_name,
        db: tenantDb
      }, next);
    } catch (dbErr) {
      if (typeof sails !== 'undefined' && sails.log) {
        sails.log.error(`tenantResolver: Failed to connect to tenant database '${tenant.db_name}':`, dbErr.message);
      }
      return res.status(503).json({
        success: false,
        code: 503,
        message: 'Tenant database service is temporarily unavailable. Please try again shortly.'
      });
    }
  }

  // Legacy fallback: Tenant without dedicated db_name operates on master/default DB
  return multiTenant.runWithTenant({ tenant, dbName: null, db: null }, next);
};

