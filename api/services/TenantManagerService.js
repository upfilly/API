const { MongoClient } = require('mongodb');
const safeCred = require('../../config/local');

let mongoClientInstance = null;

const RESERVED_SUBDOMAINS = [
  'admin',
  'administrator',
  'api',
  'app',
  'assets',
  'billing',
  'cdn',
  'cname',
  'dashboard',
  'dev',
  'developer',
  'docs',
  'ftp',
  'help',
  'internal',
  'localhost',
  'mail',
  'ns1',
  'ns2',
  'portal',
  'root',
  'smtp',
  'staging',
  'status',
  'support',
  'test',
  'web',
  'whitelabel',
  'www'
];

async function getClient() {
  if (!mongoClientInstance) {
    const mongoUrl = `mongodb://${safeCred.DB_USER}:${safeCred.DB_PASSWORD}@${safeCred.DB_HOST}:${safeCred.DB_PORT}`;
    mongoClientInstance = new MongoClient(mongoUrl, {
      maxPoolSize: 50,
      minPoolSize: 5,
    });
    await mongoClientInstance.connect();
    console.log('[TenantManagerService] Initialized connection to MongoDB cluster');
  }
  return mongoClientInstance;
}

module.exports = {
  RESERVED_SUBDOMAINS,

  /**
   * Check if a subdomain is valid and available
   */
  isSubdomainAvailable: async function (subdomain, currentUserId = null) {
    if (!subdomain || typeof subdomain !== 'string') {
      return { available: false, message: 'Subdomain is required.' };
    }

    const clean = subdomain.toLowerCase().trim();

    if (!/^[a-z0-9-]+$/.test(clean)) {
      return { available: false, message: 'Subdomain can only contain lowercase letters, numbers, and hyphens.' };
    }

    if (clean.length < 3 || clean.length > 30) {
      return { available: false, message: 'Subdomain must be between 3 and 30 characters.' };
    }

    if (clean.startsWith('-') || clean.endsWith('-')) {
      return { available: false, message: 'Subdomain cannot start or end with a hyphen.' };
    }

    if (RESERVED_SUBDOMAINS.includes(clean)) {
      return { available: false, message: `"${clean}" is a reserved subdomain and cannot be used.` };
    }

    const query = {
      sub_domain: clean,
      isDeleted: false,
    };
    if (currentUserId) {
      query.id = { '!=': currentUserId };
    }

    const existingUser = await Users.findOne(query);
    if (existingUser) {
      return { available: false, message: `Subdomain "${clean}" is already in use by another brand.` };
    }

    return { available: true, message: 'Subdomain is available.', subdomain: clean };
  },

  /**
   * Dynamically get a tenant's isolated MongoDB database instance
   */
  getTenantDb: async function (subdomain) {
    if (!subdomain) {
      throw new Error('Tenant subdomain is required to access tenant database.');
    }
    const clean = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-/g, '_');
    const dbName = `db_tenant_${clean}`;
    const client = await getClient();
    return client.db(dbName);
  },

  /**
   * Automatically provision a new isolated database for a white-label tenant
   */
  provisionTenantDatabase: async function (subdomain, tenantDetails = {}) {
    const clean = subdomain.toLowerCase().trim();
    const cleanDbSuffix = clean.replace(/[^a-z0-9-]/g, '').replace(/-/g, '_');
    const dbName = `db_tenant_${cleanDbSuffix}`;

    console.log(`[TenantManagerService] Provisioning database: ${dbName} for tenant: ${clean}`);

    try {
      const client = await getClient();
      const tenantDb = client.db(dbName);

      // 1. Create essential collections & indexes
      await tenantDb.collection('campaigns').createIndex({ status: 1 });
      await tenantDb.collection('campaigns').createIndex({ createdAt: -1 });

      await tenantDb.collection('affiliateLinks').createIndex({ shortUrl: 1 }, { unique: true, sparse: true });
      await tenantDb.collection('affiliateLinks').createIndex({ campaign_id: 1 });

      await tenantDb.collection('commissions').createIndex({ affiliate_id: 1 });
      await tenantDb.collection('commissions').createIndex({ status: 1 });

      await tenantDb.collection('tracking').createIndex({ clickId: 1 });
      await tenantDb.collection('tracking').createIndex({ createdAt: -1 });

      await tenantDb.collection('products').createIndex({ status: 1 });

      // 2. Initialize / seed tenant settings document if empty
      const existingSettings = await tenantDb.collection('settings').findOne({ subdomain: clean });
      if (!existingSettings) {
        await tenantDb.collection('settings').insertOne({
          subdomain: clean,
          brandName: tenantDetails.brand_name || tenantDetails.company_name || clean,
          legalCompanyName: tenantDetails.company_name || '',
          billingEmail: tenantDetails.billing_email || tenantDetails.email || '',
          trackingHostname: tenantDetails.tracking_hostname || '',
          currency: tenantDetails.stripe_currency || 'USD',
          provisionedAt: new Date(),
          status: 'active',
          version: '1.0.0'
        });
      }

      console.log(`[TenantManagerService] Successfully provisioned tenant database: ${dbName}`);
      return { success: true, dbName, status: 'ready' };
    } catch (err) {
      console.error(`[TenantManagerService] Failed to provision tenant database ${dbName}:`, err);
      return { success: false, error: err.message, status: 'error' };
    }
  }
};
