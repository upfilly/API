module.exports = {
  schema: true,
  attributes: {
    // user_id: { model: "users" },
    role: { type: 'string', isIn: ['affiliate', 'operator', 'analyzer', 'publisher', 'customer', 'users'], },

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

    addedBy: { model: "Users", },
    updatedBy: { model: "Users", },
    createdAt: { type: "ref", autoCreatedAt: true },
    updatedAt: { type: "ref", autoUpdatedAt: true },
  },
};