/**
 * Tenants.js
 *
 * @description :: Master registry of registered businesses (white-label tenants).
 *                 Stores domain information, dedicated database names, and platform plan subscription state.
 */

module.exports = {
  schema: true,
  migrate: 'safe',
  attributes: {
    business_name: {
      type: 'string',
      required: true
    },
    subdomain: {
      type: 'string',
      required: true,
      unique: true
    },
    custom_domain: {
      type: 'string',
      allowNull: true
    },
    cname_status: {
      type: 'string',
      isIn: ['pending', 'verified', 'failed'],
      defaultsTo: 'pending'
    },
    ssl_status: {
      type: 'string',
      isIn: ['pending', 'active', 'failed'],
      defaultsTo: 'pending'
    },
    db_name: {
      type: 'string',
      required: true
    },
    db_connection_uri: {
      type: 'string',
      allowNull: true
    },
    admin_email: {
      type: 'string',
      required: true,
      unique: true
    },
    admin_name: {
      type: 'string'
    },
    plan_status: {
      type: 'string',
      isIn: ['pending_payment', 'trialing', 'active', 'past_due', 'canceled'],
      defaultsTo: 'pending_payment'
    },
    plan_id: {
      model: 'platformplans'
    },
    stripe_customer_id: {
      type: 'string',
      allowNull: true
    },
    stripe_subscription_id: {
      type: 'string',
      allowNull: true
    },
    current_period_end: {
      type: 'ref',
      columnType: 'datetime'
    },
    branding: {
      type: 'json'
    },
    status: {
      type: 'string',
      isIn: ['active', 'deactive', 'suspended', 'deleted'],
      defaultsTo: 'active'
    },
    isDeleted: {
      type: 'boolean',
      defaultsTo: false
    }
  }
};
