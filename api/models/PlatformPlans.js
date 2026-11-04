/**
 * PlatformPlans.js
 *
 * @description :: SaaS subscription plans available for registered businesses to purchase.
 *                 Controls feature quotas such as max brands, affiliates, and custom domain access.
 */

module.exports = {
  schema: true,
  migrate: 'safe',
  attributes: {
    name: {
      type: 'string',
      required: true
    },
    slug: {
      type: 'string',
      required: true,
      unique: true
    },
    description: {
      type: 'string'
    },
    price: {
      type: 'number',
      required: true
    },
    currency: {
      type: 'string',
      defaultsTo: 'usd'
    },
    billing_interval: {
      type: 'string',
      isIn: ['month', 'year'],
      defaultsTo: 'month'
    },
    stripe_product_id: {
      type: 'string',
      allowNull: true
    },
    stripe_price_id: {
      type: 'string',
      allowNull: true
    },
    features: {
      type: 'json'
    },
    status: {
      type: 'string',
      isIn: ['active', 'deactive'],
      defaultsTo: 'active'
    },
    isDeleted: {
      type: 'boolean',
      defaultsTo: false
    }
  }
};
