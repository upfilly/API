module.exports = {
  schema: true,
  attributes: {
    // user_id: { model: "users" },
    role: { type: 'string', isIn: ['affiliate', 'operator', 'analyzer', 'publisher', 'customer', 'users'], },
    account_manager: { type: 'string', isIn: ['brand', 'affiliate'] },
    offer_add: { type: "Boolean", defaultsTo: false },
    offer_edit: { type: "Boolean", defaultsTo: false },
    offer_get: { type: "Boolean", defaultsTo: false },
    offer_delete: { type: "Boolean", defaultsTo: false },
    offer_complete_access: { type: "Boolean", defaultsTo: false },

    user_add: { type: "Boolean", defaultsTo: false },
    user_edit: { type: "Boolean", defaultsTo: false },
    user_get: { type: "Boolean", defaultsTo: false },
    user_delete: { type: "Boolean", defaultsTo: false },
    user_complete_access: { type: "Boolean", defaultsTo: false },

    campaign_add: { type: "Boolean", defaultsTo: false },
    campaign_edit: { type: "Boolean", defaultsTo: false },
    campaign_get: { type: "Boolean", defaultsTo: false },
    campaign_delete: { type: "Boolean", defaultsTo: false },
    campaign_complete_access: { type: "Boolean", defaultsTo: false },

    untrack_sales_add: { type: "Boolean", defaultsTo: false },
    untrack_sales_get: { type: "Boolean", defaultsTo: false },

    generate_link_add: { type: "Boolean", defaultsTo: false },
    generate_link_get: { type: "Boolean", defaultsTo: false },

    transactions_get: { type: "Boolean", defaultsTo: false },
    affiliate_invite: {
      type: 'boolean',
      defaultsTo: false
    },

    affiliate_group: {
      type: 'boolean',
      defaultsTo: false
    },

    group_add: {
      type: 'boolean',
      defaultsTo: false
    },

    group_edit: {
      type: 'boolean',
      defaultsTo: false
    },

    group_get: {
      type: 'boolean',
      defaultsTo: false
    },

    group_delete: {
      type: 'boolean',
      defaultsTo: false
    },

    banner_add: {
      type: 'boolean',
      defaultsTo: false
    },

    banner_edit: {
      type: 'boolean',
      defaultsTo: false
    },

    banner_get: {
      type: 'boolean',
      defaultsTo: false
    },

    banner_delete: {
      type: 'boolean',
      defaultsTo: false
    },

    offer_invite: {
      type: 'boolean',
      defaultsTo: false
    },

    commission_add: {
      type: 'boolean',
      defaultsTo: false
    },

    commission_edit: {
      type: 'boolean',
      defaultsTo: false
    },

    commission_get: {
      type: 'boolean',
      defaultsTo: false
    },

    commission_delete: {
      type: 'boolean',
      defaultsTo: false
    },

    coupon_add: { type: "Boolean", defaultsTo: false },
    coupon_edit: { type: "Boolean", defaultsTo: false },
    coupon_get: { type: "Boolean", defaultsTo: false },
    coupon_delete: { type: "Boolean", defaultsTo: false },
    coupon_complete_access: { type: "Boolean", defaultsTo: false },

    marketplace_product_add: { type: "Boolean", defaultsTo: false },
    marketplace_product_edit: { type: "Boolean", defaultsTo: false },
    marketplace_product_get: { type: "Boolean", defaultsTo: false },
    marketplace_product_delete: { type: "Boolean", defaultsTo: false },
    marketplace_product_complete_access: { type: "Boolean", defaultsTo: false },

    make_offer_add: { type: "Boolean", defaultsTo: false },
    make_offer_get: { type: "Boolean", defaultsTo: false },
    make_offer_edit: { type: "Boolean", defaultsTo: false },


    addedBy: { model: "Users", },
    updatedBy: { model: "Users", },
    createdAt: { type: "ref", autoCreatedAt: true },
    updatedAt: { type: "ref", autoUpdatedAt: true },
  },
};
