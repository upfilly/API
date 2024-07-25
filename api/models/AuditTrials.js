/**
 * AuditTrials.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    module: {
      type: "string",
    },
    type: { type: "string", isIn: ['created', 'updated', 'deleted'] },
    user_id: { model: "users" },
    changed_id: { type: "string" },
    old_data: { type: "json", },
    data: { type: "json", },
    isDeleted: { type: 'Boolean', defaultsTo: false },
    createdAt: { type: "ref", autoCreatedAt: true },
    updatedAt: { type: "ref", autoUpdatedAt: true },
  },
};
