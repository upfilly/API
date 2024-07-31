/**
 * AuditTrials.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    model: { type: 'string', required: true },
    action: { type: 'string', required: true },
    previousState: { type: 'json', defaultsTo: {} },
    currentState: { type: 'json', defaultsTo: {} },
    performedBy: { type: 'string', required: true },
    isDeleted: { type: 'Boolean', defaultsTo: false },
    createdAt: { type: "ref", autoCreatedAt: true },
    updatedAt: { type: "ref", autoUpdatedAt: true },
  },
};
