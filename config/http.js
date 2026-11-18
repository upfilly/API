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
    * Universal CORS preflight & headers handler                               *
    * Resolves HeaderDisallowedByPreflightResponse for all frontend origins    *
    *                                                                          *
    ***************************************************************************/
    corsHandler: function (req, res, next) {
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');

      const requestedHeaders = req.headers['access-control-request-headers'];
      if (requestedHeaders) {
        res.setHeader('Access-Control-Allow-Headers', requestedHeaders);
      } else {
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, access-control-allow-origin, Access-Control-Allow-Credentials, authorization, x-tenant-subdomain, x-tenant-id, subdomain, token, x-access-token, Cache-Control, Pragma, sentry-trace, baggage, *');
      }

      res.setHeader('Access-Control-Expose-Headers', '*');

      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      return next();
    },

    /***************************************************************************
    *                                                                          *
    * Custom Multi-Tenant Resolution Middleware                                *
    *                                                                          *
    ***************************************************************************/
    tenantResolver: require('../api/middlewares/tenantResolver'),

    /***************************************************************************
    *                                                                          *
    * The order in which middleware should be run for HTTP requests.           *
    * (This Sails app's routes are handled by the "router" middleware below.)  *
    *                                                                          *
    ***************************************************************************/

    order: [
      'corsHandler',
      'cookieParser',
      'session',
      'bodyParser',
      'compress',
      'poweredBy',
      'tenantResolver',
      'router',
      'www',
      'favicon',
    ],


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
