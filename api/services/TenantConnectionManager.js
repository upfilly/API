/**
 * TenantConnectionManager.js
 *
 * @description :: Manages dynamic MongoDB database connections for multi-tenancy.
 *                 Maintains connection pooling across dedicated tenant databases,
 *                 handles tenant database provisioning, index creation, and seeding.
 */

const { MongoClient } = require('mongodb');

class TenantConnectionManager {
  constructor() {
    this.client = null;
    this.masterDb = null;
    this.dbCache = new Map();
    this.customClients = new Map();
    this.isInitialized = false;
  }

  /**
   * Build MongoDB connection URI from configuration or environment
   * @private
   */
  _getConnectionUri() {
    let localConfig = {};
    try {
      localConfig = require('../../config/local.js');
    } catch (e) {
      localConfig = {};
    }

    if (process.env.MONGODB_URI) {
      return process.env.MONGODB_URI;
    }

    const user = process.env.DB_USER || localConfig.DB_USER;
    const pass = process.env.DB_PASSWORD || localConfig.DB_PASSWORD;
    const host = process.env.DB_HOST || localConfig.DB_HOST || '127.0.0.1';
    const port = process.env.DB_PORT || localConfig.DB_PORT || 27017;
    const dbName = process.env.MASTER_DB_NAME || 'upfilly_master';

    if (user && pass) {
      return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${dbName}?authSource=admin`;
    }
    return `mongodb://${host}:${port}/${dbName}`;
  }

  /**
   * Initialize primary MongoDB client and Master database
   */
  async initialize() {
    if (this.isInitialized && this.client) {
      return;
    }

    const uri = this._getConnectionUri();
    const masterDbName = process.env.MASTER_DB_NAME || 'upfilly_master';

    try {
      this.client = new MongoClient(uri, {
        maxPoolSize: 100,
        minPoolSize: 5,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();
      this.masterDb = this.client.db(masterDbName);
      this.isInitialized = true;

      if (typeof sails !== 'undefined' && sails.log) {
        sails.log.info(`TenantConnectionManager: Connected to MongoDB cluster. Master DB: ${masterDbName}`);
      }
    } catch (err) {
      if (typeof sails !== 'undefined' && sails.log) {
        sails.log.error('TenantConnectionManager: Failed to initialize MongoDB client:', err.message);
      }
      throw err;
    }
  }

  /**
   * Get the Master platform database instance
   * @returns {Object} MongoDB Db instance
   */
  getMasterDb() {
    if (!this.masterDb && this.client) {
      const masterDbName = process.env.MASTER_DB_NAME || 'upfilly_master';
      this.masterDb = this.client.db(masterDbName);
    }
    return this.masterDb;
  }

  /**
   * Get or instantiate a dedicated MongoDB database for a tenant
   * @param {string} dbName - Dedicated database name (e.g. upfilly_tenant_acme)
   * @param {string} [customUri] - Optional custom MongoDB URI for enterprise tenants
   * @returns {Promise<Object>} MongoDB Db instance
   */
  async getTenantDb(dbName, customUri) {
    if (!dbName) {
      throw new Error('TenantConnectionManager.getTenantDb: dbName is required');
    }

    // Return cached Db instance if already open
    if (this.dbCache.has(dbName)) {
      return this.dbCache.get(dbName);
    }

    // Ensure master client is initialized
    if (!this.client) {
      await this.initialize();
    }

    let tenantDb;

    // Handle custom external MongoDB cluster for enterprise tenants
    if (customUri) {
      if (!this.customClients.has(customUri)) {
        const customClient = new MongoClient(customUri, {
          maxPoolSize: 50,
          minPoolSize: 2,
          connectTimeoutMS: 10000,
        });
        await customClient.connect();
        this.customClients.set(customUri, customClient);
      }
      const client = this.customClients.get(customUri);
      tenantDb = client.db(dbName);
    } else {
      // Re-use connection pool from primary client for standard tenant databases
      tenantDb = this.client.db(dbName);
    }

    this.dbCache.set(dbName, tenantDb);
    return tenantDb;
  }

  /**
   * Provision a brand-new dedicated database for a newly registered tenant business
   * Builds baseline indexes and seeds initial admin account
   * @param {string} dbName - Tenant database name
   * @param {Object} [initialData] - { adminUser, branding, currency }
   * @returns {Promise<Object>} The provisioned Db instance
   */
  async provisionTenantDatabase(dbName, initialData = {}) {
    const db = await this.getTenantDb(dbName);

    try {
      // Build critical indexes for performance and constraints
      await Promise.all([
        db.collection('users').createIndex({ email: 1 }, { unique: true, background: true }),
        db.collection('users').createIndex({ role: 1, status: 1 }, { background: true }),
        db.collection('campaign').createIndex({ brand_id: 1 }, { background: true }),
        db.collection('affiliatelink').createIndex({ affilaite_unique_id: 1 }, { background: true }),
        db.collection('affiliatelink').createIndex({ brand_id: 1, affiliate_id: 1 }, { background: true }),
        db.collection('commission').createIndex({ brand_id: 1, affiliate_id: 1 }, { background: true }),
        db.collection('commission').createIndex({ status: 1 }, { background: true }),
        db.collection('cookies').createIndex({ click_id: 1 }, { background: true }),
        db.collection('banner').createIndex({ brand_id: 1 }, { background: true }),
        db.collection('coupon').createIndex({ brand_id: 1, coupon_code: 1 }, { background: true }),
      ]);

      // Seed initial admin user if provided
      if (initialData.adminUser) {
        const userExists = await db.collection('users').findOne({ email: initialData.adminUser.email.toLowerCase() });
        if (!userExists) {
          await db.collection('users').insertOne({
            ...initialData.adminUser,
            email: initialData.adminUser.email.toLowerCase(),
            status: 'active',
            isVerified: 'Y',
            role: 'brand',
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }

      if (typeof sails !== 'undefined' && sails.log) {
        sails.log.info(`TenantConnectionManager: Successfully provisioned tenant database '${dbName}'`);
      }

      return db;
    } catch (err) {
      if (typeof sails !== 'undefined' && sails.log) {
        sails.log.error(`TenantConnectionManager: Error provisioning database '${dbName}':`, err.message);
      }
      throw err;
    }
  }

  /**
   * Close all active MongoDB client connections gracefully
   */
  async closeAll() {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    for (const [, customClient] of this.customClients) {
      await customClient.close();
    }
    this.customClients.clear();
    this.dbCache.clear();
    this.isInitialized = false;
  }
}

module.exports = new TenantConnectionManager();
