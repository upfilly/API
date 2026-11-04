/**
 * DomainMappings.js
 *
 * @description :: High-performance domain routing table mapping subdomains and custom CNAME hostnames
 *                 to tenant business IDs and tracking SSL certificate state.
 */

module.exports = {
  schema: true,
  migrate: 'safe',
  attributes: {
    hostname: {
      type: 'string',
      required: true,
      unique: true
    },
    subdomain: {
      type: 'string'
    },
    tenant_id: {
      model: 'tenants'
    },
    type: {
      type: 'string',
      isIn: ['subdomain', 'custom_domain'],
      defaultsTo: 'subdomain'
    },
    is_verified: {
      type: 'boolean',
      defaultsTo: false
    },
    ssl_active: {
      type: 'boolean',
      defaultsTo: false
    }
  }
};
