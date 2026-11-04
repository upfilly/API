/**
 * api/hooks/multiTenantHook.js
 *
 * @description :: Custom Sails hook that initializes the dynamic multi-tenant database proxy.
 *                 Wraps sails.getDatastore().manager with an ES6 Proxy after the ORM hook loads,
 *                 enabling existing controllers to query dedicated tenant databases automatically.
 */

const multiTenant = require('../utils/multiTenant');

module.exports = function multiTenantHook(sails) {
  return {
    initialize: function (cb) {
      sails.log.info('Initializing multiTenantHook...');

      // Hook into ORM loaded event to attach dynamic database proxy
      sails.on('hook:orm:loaded', function () {
        try {
          if (sails.getDatastore) {
            const ds = sails.getDatastore();
            if (ds && ds.manager) {
              const originalManager = ds.manager;
              ds.manager = multiTenant.createDatabaseProxy(originalManager);
              sails.log.info('multiTenantHook: Datastore manager wrapped with dynamic Multi-Tenant Proxy');
            }
          }
        } catch (err) {
          sails.log.error('multiTenantHook: Error setting up datastore proxy:', err.message);
        }
      });

      return cb();
    }
  };
};

