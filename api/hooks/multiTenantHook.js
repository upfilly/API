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
          // 1. Wrap sails.getDatastore().manager (for native mongo db.collection(...) calls)
          if (sails.getDatastore) {
            const ds = sails.getDatastore();
            if (ds && ds.manager) {
              ds.manager = multiTenant.createDatabaseProxy(ds.manager);
              sails.log.info('multiTenantHook: Datastore manager wrapped with dynamic Multi-Tenant Proxy');
            }
          }

          // 2. Wrap sails-mongo internal registered adapter datastores (for Waterline ORM calls: Users.findOne, etc.)
          try {
            const sailsMongo = require('sails-mongo');
            if (sailsMongo && sailsMongo.datastores) {
              for (const dsKey of Object.keys(sailsMongo.datastores)) {
                if (sailsMongo.datastores[dsKey] && sailsMongo.datastores[dsKey].manager) {
                  sailsMongo.datastores[dsKey].manager = multiTenant.createDatabaseProxy(sailsMongo.datastores[dsKey].manager);
                  sails.log.info(`multiTenantHook: sails-mongo datastore '${dsKey}' manager wrapped with dynamic Multi-Tenant Proxy`);
                }
              }
            }
          } catch (smErr) {
            sails.log.warn('multiTenantHook: Could not wrap sails-mongo registered datastores:', smErr.message);
          }
        } catch (err) {
          sails.log.error('multiTenantHook: Error setting up datastore proxy:', err.message);
        }
      });

      return cb();
    }
  };
};

