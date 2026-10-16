/**
 * HTTP Server Settings
 * (sails.config.http)
 *
 * Configuration for the underlying HTTP server in Sails.
 * (for additional recommended settings, see `config/env/production.js`)
 *
 * For more information on configuration, check out:
 * https://sailsjs.com/config/http
 */

module.exports.http = {

  /****************************************************************************
  *                                                                           *
  * Sails/Express middleware to run for every HTTP request.                   *
  * (Only applies to HTTP requests -- not virtual WebSocket requests.)        *
  *                                                                           *
  * https://sailsjs.com/documentation/concepts/middleware                     *
  *                                                                           *
  ****************************************************************************/

  middleware: {

    /***************************************************************************
    *                                                                          *
    * The order in which middleware should be run for HTTP requests.           *
    * (This Sails app's routes are handled by the "router" middleware below.)  *
    *                                                                          *
    ***************************************************************************/

    order: [
      'cookieParser',
      'session',
      'tenantInjector', // <--- Add our dynamic DB middleware here
      'bodyParser',
      'compress',
      'poweredBy',
      'router',
      'www',
      'favicon',
    ],

    /**
     * Tenant DB Injector Middleware
     * Intercepts the request, extracts the subdomain, and attaches the specific 
     * Native MongoDB database instance to `req.tenantDb`.
     */
    tenantInjector: (function() {
      return async function(req, res, next) {
        try {
          const host = req.headers.host; // e.g. "brand.upfilly.io"
          
          // Basic extraction logic: if host has 3 parts (brand.upfilly.io)
          // You may need to adapt this logic depending on your actual hostnames.
          const parts = host ? host.split('.') : [];
          if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'api') {
            const subdomain = parts[0];
            
            // Check if tenant exists in Master DB
            const tenant = await sails.models.users.findOne({ sub_domain: subdomain, role: 'white_lable' });
            
            if (tenant) {
              // Get native mongo connection for this tenant's physical DB
              // If we saved tenant_db_name in the DB, use it. Otherwise fallback to calculating it.
              const tenantDb = await sails.services.tenantmongoservice.getTenantDb(subdomain);
              req.tenantDb = tenantDb;
              req.tenant = tenant; // Store tenant info too for convenience
            }
          }
        } catch (e) {
          sails.log.error('TenantInjector Middleware Error:', e);
        }
        
        return next();
      };
    })(),


    /***************************************************************************
    *                                                                          *
    * The body parser that will handle incoming multipart HTTP requests.       *
    *                                                                          *
    * https://sailsjs.com/config/http#?customizing-the-body-parser             *
    *                                                                          *
    ***************************************************************************/

    // bodyParser: (function _configureBodyParser(){
    //   var skipper = require('skipper');
    //   var middlewareFn = skipper({ strict: true });
    //   return middlewareFn;
    // })(),

  },

};
