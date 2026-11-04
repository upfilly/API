/**
 * PlatformSubscriptions.js
 *
 * @description :: Records active and historical Stripe subscription records for tenant businesses.
 */

module.exports = {
  schema: true,
  migrate: 'safe',
  attributes: {
    tenant_id: {
      model: 'tenants'
    },
    plan_id: {
      model: 'platformplans'
    },
    stripe_subscription_id: {
      type: 'string',
      required: true
    },
    stripe_customer_id: {
      type: 'string'
    },
    status: {
      type: 'string',
      isIn: ['active', 'past_due', 'canceled', 'incomplete', 'trialing'],
      defaultsTo: 'active'
    },
    current_period_start: {
      type: 'ref',
      columnType: 'datetime'
    },
    current_period_end: {
      type: 'ref',
      columnType: 'datetime'
    },
    amount: {
      type: 'number'
    },
    currency: {
      type: 'string',
      defaultsTo: 'usd'
    },
    metadata: {
      type: 'json'
    }
  }
};
