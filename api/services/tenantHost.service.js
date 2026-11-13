/**
 * api/services/tenantHost.service.js
 *
 * @description :: Host parsing and domain resolution matching the reference architecture:
 *                 - Distinguishes platform/root domains from tenant subdomains and custom CNAME domains
 *                 - Drops invalid or reserved hostnames
 *                 - Builds white-label portal URLs
 */

const PLATFORM_BASE_DOMAIN = process.env.APP_BASE_DOMAIN || 'upfilly.com';
const RESERVED_SUBDOMAINS = new Set([
  'admin', 'api', 'app', 'www', 'mail', 'smtp', 'ftp', 'status', 'support',
  'help', 'docs', 'blog', 'cdn', 'static', 'track', 'click', 'dashboard',
  'login', 'billing', 'upfilly', 'master', 'root', 'dev', 'staging'
]);

module.exports = {
  /**
   * Parse incoming HTTP Host header
   * @param {string} rawHost - e.g. "acme.upfilly.com:6043", "partners.acmecorp.com", "upfilly.com"
   * @returns {Object} { kind: 'root'|'platform-admin'|'tenant'|'custom_domain', subdomain?: string, customDomain?: string, host: string }
   */
  parseTenantHost: function (rawHost) {
    if (!rawHost) {
      return { kind: 'root', host: '' };
    }

    // Strip port if present
    const host = String(rawHost).split(':')[0].toLowerCase().trim();

    // Check localhost, IP, or standard local dev hostnames
    if (host === 'localhost' || host === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
      return { kind: 'root', host, isDev: true };
    }

    // Exact match on base domain
    if (host === PLATFORM_BASE_DOMAIN || host === `www.${PLATFORM_BASE_DOMAIN}`) {
      return { kind: 'root', host };
    }

    // Platform admin or API root hostnames
    if (host === `admin.${PLATFORM_BASE_DOMAIN}` || host === `api.${PLATFORM_BASE_DOMAIN}`) {
      return { kind: 'platform-admin', host };
    }

    // Check if host is a subdomain of the platform base domain
    const baseSuffix = `.${PLATFORM_BASE_DOMAIN}`;
    if (host.endsWith(baseSuffix)) {
      const sub = host.slice(0, -baseSuffix.length).toLowerCase().trim();

      // Check for nested subdomains (e.g. foo.bar.upfilly.com -> take leftmost)
      const parts = sub.split('.');
      const candidateSub = parts[parts.length - 1];

      if (RESERVED_SUBDOMAINS.has(candidateSub)) {
        return { kind: 'platform-admin', host, subdomain: candidateSub };
      }

      return {
        kind: 'tenant',
        subdomain: candidateSub,
        host
      };
    }

    // If host doesn't end with PLATFORM_BASE_DOMAIN, it is a custom white-label domain
    return {
      kind: 'custom_domain',
      customDomain: host,
      host
    };
  },

  /**
   * Helper to check if a subdomain is reserved
   */
  isReservedSubdomain: function (subdomain) {
    if (!subdomain) return true;
    return RESERVED_SUBDOMAINS.has(String(subdomain).toLowerCase().trim());
  },

  /**
   * Construct full tenant portal URL
   */
  buildPortalUrl: function (tenant, path = '') {
    if (!tenant) return `https://${PLATFORM_BASE_DOMAIN}`;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    if (tenant.custom_domain && tenant.cname_status === 'verified') {
      return `https://${tenant.custom_domain}${cleanPath}`;
    }
    return `https://${tenant.subdomain}.${PLATFORM_BASE_DOMAIN}${cleanPath}`;
  }
};

