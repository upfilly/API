/**
 * resolveTenant policy
 *
 * @description :: Resolves the active white-label tenant from the request headers/host
 *                 and attaches `req.tenant` and `req.tenantDb` dynamically.
 */

const TenantManagerService = require('../services/TenantManagerService');

module.exports = async function (req, res, next) {
  try {
    let tenantDomain = req.headers['x-tenant-domain'] || req.headers['x-tenant-subdomain'] || req.query.tenant_domain;

    // If no explicit header, attempt to parse from Host header
    if (!tenantDomain && req.headers && req.headers.host) {
      const host = req.headers.host.split(':')[0].toLowerCase();
      const parts = host.split('.');
      if (parts.length > 2 && !['www', 'api', 'admin', 'app', 'localhost'].includes(parts[0])) {
        tenantDomain = parts[0];
      }
    }

    // Fallback: If user is authenticated and has a sub_domain assigned
    if (!tenantDomain && req.identity && req.identity.sub_domain) {
      tenantDomain = req.identity.sub_domain;
    }

    if (tenantDomain) {
      const cleanDomain = tenantDomain.toLowerCase().trim();

      const tenant = await Users.findOne({
        or: [
          { sub_domain: cleanDomain },
          { tracking_hostname: cleanDomain }
        ],
        isDeleted: false
      });

      if (tenant) {
        req.tenant = tenant;
        req.tenantDb = await TenantManagerService.getTenantDb(tenant.sub_domain || cleanDomain);
      }
    }
  } catch (err) {
    console.error('[resolveTenant Policy] Error resolving tenant database:', err);
  }

  return next();
};
