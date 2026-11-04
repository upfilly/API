/**
 * TenantContext.js
 *
 * @description :: Manages request-scoped tenant execution context using Node.js AsyncLocalStorage.
 *                 Allows controllers, models, and services to access the current tenant's database
 *                 without threading database connection parameters through every function call.
 */

const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

module.exports = {
  /**
   * Run a callback within a scoped tenant context
   * @param {Object} context - { tenant, db, subdomain, isMaster }
   * @param {Function} callback - Function to execute inside context
   */
  run: function (context, callback) {
    return storage.run(context, callback);
  },

  /**
   * Get the entire active context store
   * @returns {Object|null}
   */
  getStore: function () {
    return storage.getStore() || null;
  },

  /**
   * Get the active tenant record
   * @returns {Object|null}
   */
  getTenant: function () {
    const store = storage.getStore();
    return store ? store.tenant : null;
  },

  /**
   * Get the active tenant ID
   * @returns {string|null}
   */
  getTenantId: function () {
    const store = storage.getStore();
    if (!store || !store.tenant) return null;
    return store.tenant.id || store.tenant._id || null;
  },

  /**
   * Get the active tenant subdomain
   * @returns {string|null}
   */
  getSubdomain: function () {
    const store = storage.getStore();
    return store ? store.subdomain : null;
  },

  /**
   * Get the active MongoDB database (Db instance) for the current tenant.
   * If running in tenant scope, returns the dedicated tenant database.
   * If running in master scope or fallback, returns master database.
   * @returns {Object} native MongoDB Db instance
   */
  getDb: function () {
    const store = storage.getStore();
    if (store && store.db) {
      return store.db;
    }

    // Fallback to default Sails datastore manager if outside request context
    if (typeof sails !== 'undefined' && sails.getDatastore) {
      const ds = sails.getDatastore();
      if (ds && ds.manager) {
        return ds.manager;
      }
    }

    throw new Error('TenantContext: No active database connection available in current execution frame');
  },

  /**
   * Helper to check if current context is the master platform
   * @returns {boolean}
   */
  isMaster: function () {
    const store = storage.getStore();
    return store ? !!store.isMaster : false;
  }
};
