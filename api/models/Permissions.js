module.exports = {
  schema: true,
  attributes: {
    user_id: { model: "users" },
    role: { type: "string", },

    affiliate_disabled: { type: "Boolean", defaultsTo: true },
    affiliate_read: { type: "Boolean", defaultsTo: false },
    affiliate_write: { type: "Boolean", defaultsTo: false },

    brand_disabled: { type: "Boolean", defaultsTo: true },
    brand_read: { type: "Boolean", defaultsTo: false },
    brand_write: { type: "Boolean", defaultsTo: false },

    is_admin_access: { type: "Boolean", defaultsTo: false },

    addedBy: { model: "Users", },
    updatedBy: { model: "Users", },
    createdAt: { type: "ref", autoCreatedAt: true },
    updatedAt: { type: "ref", autoUpdatedAt: true },
  },
};