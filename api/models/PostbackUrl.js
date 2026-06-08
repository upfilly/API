/**
 * PostbackUrl.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    postback_url: { type: 'string' },
    method: { type: "string" },
    format: { type: 'string' },
 
    selected_keys: { type: "json", columnType: "array", defaultsTo: [] },
    include_sub_ids: { type: "boolean", defaultsTo: false },
    custom_keys: { type: "json", columnType: "array", defaultsTo: [] },
    all_keys: { type: "json", columnType: "array", defaultsTo: [] },

    status: { type: 'string', isIn: ['active', 'deactive'], defaultsTo: 'active' },
    isDeleted: { type: 'boolean', defaultsTo: false },
    addedBy: { model: 'users' },
    updatedBy: { model: 'users' },
    createdAt: { type: "ref", autoCreatedAt: true, },
    updatedAt: { type: "ref", autoUpdatedAt: true, },
  }

};

