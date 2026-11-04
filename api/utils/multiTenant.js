/**
 * api/utils/multiTenant.js
 *
 * @description :: Core multi-tenancy utilities matching the enterprise architecture specification:
 *                 - AsyncLocalStorage (ALS) request context
 *                 - Tenant database naming conventions (prefix + sanitized subdomain + tenantId)
 *                 - Cached MongoDB client and tenant connections
 *                 - Dynamic ES6 Proxy for zero-modification controller database queries
 */

const { AsyncLocalStorage } = require('async_hooks');
const { MongoClient } = require('mongodb');

const als = new AsyncLocalStorage();
const connectionCache = new Map();
let masterClient = null;
let masterDbInstance = null;

let localConfigCache = null;
function getLocalConfig() {
  if (localConfigCache) return localConfigCache;
  try {
    localConfigCache = require('../../config/local.js');
  } catch (e) {
    localConfigCache = {};
  }
  return localConfigCache;
}

function getTenantDbPrefix() {
  const conf = getLocalConfig();
  return process.env.TENANT_DB_PREFIX || conf.TENANT_DB_PREFIX || 'upfilly_tenant_';
}

function getMasterDbName() {
  const conf = getLocalConfig();
  return process.env.MASTER_DB_NAME || conf.MASTER_DB_NAME || 'upfilly_master';
}

/**
 * Build connection URI from local config or environment
 */
function getMongoConnectionUri() {
  const localConfig = getLocalConfig();

  if (process.env.MONGODB_ROOT_URI) {
    return process.env.MONGODB_ROOT_URI;
  }
  if (localConfig.MONGODB_ROOT_URI) {
    return localConfig.MONGODB_ROOT_URI;
  }
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  const user = process.env.DB_USER || localConfig.DB_USER;
  const pass = process.env.DB_PASSWORD || localConfig.DB_PASSWORD;
  const host = process.env.DB_HOST || localConfig.DB_HOST || '127.0.0.1';
  const port = process.env.DB_PORT || localConfig.DB_PORT || 27017;
  const dbName = getMasterDbName();

  if (user && pass) {
    return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${dbName}?authSource=admin`;
  }
  return `mongodb://${host}:${port}/${dbName}`;
}

/**
 * Initialize root/master Mongo client
 */
async function getMasterClient() {
  if (masterClient) return masterClient;

  const uri = getMongoConnectionUri();
  masterClient = new MongoClient(uri, {
    maxPoolSize: 100,
    minPoolSize: 5,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  await masterClient.connect();
  const masterDbName = getMasterDbName();
  masterDbInstance = masterClient.db(masterDbName);
  return masterClient;
}

/**
 * Sanitize subdomain for database naming compliance (RFC 1123 / MongoDB naming)
 */
function sanitizeSubdomain(subdomain) {
  if (!subdomain) return 'tenant';
  return String(subdomain)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 30);
}

/**
 * Generate normalized dedicated tenant database name
 * Formula: TENANT_DB_PREFIX + sanitized(subdomain) + "_" + tenantId (max 63 chars)
 */
function buildTenantDbName(subdomain, tenantId) {
  const prefix = getTenantDbPrefix();
  const safeSub = sanitizeSubdomain(subdomain);
  const safeId = String(tenantId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-12);
  const fullName = `${prefix}${safeSub}${safeId ? '_' + safeId : ''}`.slice(0, 63);
  return fullName;
}

/**
 * Get or establish cached tenant database connection
 */
async function ensureTenantConnection(dbName, customUri) {
  if (!dbName) {
    throw new Error('multiTenant.ensureTenantConnection: dbName is required');
  }

  if (connectionCache.has(dbName)) {
    return connectionCache.get(dbName);
  }

  const client = await getMasterClient();
  let tenantDb;

  if (customUri) {
    const customClient = new MongoClient(customUri, {
      maxPoolSize: 50,
      minPoolSize: 2,
      connectTimeoutMS: 10000,
    });
    await customClient.connect();
    tenantDb = customClient.db(dbName);
  } else {
    // Reuses root client connection pool
    tenantDb = client.db(dbName);
  }

  connectionCache.set(dbName, tenantDb);
  return tenantDb;
}

/**
 * Retrieve cached tenant connection
 */
function getTenantConnection(dbName) {
  return connectionCache.get(dbName) || null;
}

/**
 * Run callback within ALS tenant context
 */
function runWithTenant(context, callback) {
  return als.run(context, callback);
}

/**
 * Retrieve active tenant from ALS context
 */
function getActiveTenant() {
  const store = als.getStore();
  return store ? store.tenant : null;
}

/**
 * Retrieve active dbName from ALS context
 */
function getActiveDbName() {
  const store = als.getStore();
  return store ? store.dbName : null;
}

/**
 * Retrieve active MongoDB Db instance from ALS context, or master if none
 */
function getActiveDb() {
  const store = als.getStore();
  if (store && store.db) {
    return store.db;
  }
  return masterDbInstance;
}

/**
 * Retrieve master database instance
 */
async function getMasterDb() {
  if (!masterDbInstance) {
    await getMasterClient();
  }
  return masterDbInstance;
}

/**
 * Creates an ES6 dynamic proxy for a MongoDB Db instance.
 * When controllers invoke db.collection(...), the proxy routes to the tenant Db if ALS active,
 * or defaultDb if outside ALS or in legacy mode.
 */
function createDatabaseProxy(defaultDb) {
  return new Proxy(defaultDb || {}, {
    get(target, prop, receiver) {
      const store = als.getStore();
      const currentTarget = (store && store.db) ? store.db : (defaultDb || masterDbInstance || target);

      const value = Reflect.get(currentTarget, prop, currentTarget);
      if (typeof value === 'function') {
        return value.bind(currentTarget);
      }
      return value;
    }
  });
}

/**
 * Close all connections
 */
async function closeAllConnections() {
  if (masterClient) {
    await masterClient.close();
    masterClient = null;
    masterDbInstance = null;
  }
  connectionCache.clear();
}

module.exports = {
  als,
  runWithTenant,
  getActiveTenant,
  getActiveDbName,
  getActiveDb,
  getMasterDb,
  ensureTenantConnection,
  getTenantConnection,
  buildTenantDbName,
  sanitizeSubdomain,
  createDatabaseProxy,
  closeAllConnections
};

