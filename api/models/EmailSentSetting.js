/**
 * EmailSent.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    name: { type: "string" }, 
    emailSent: { type: "Boolean", defaultsTo: true },
    isDeleted: { type: "Boolean", defaultsTo: false },
    createdAt: { type: "ref", autoCreatedAt: true },
    updatedAt: { type: "ref", autoUpdatedAt: true },
    addedBy: { model: 'users' },
    deletedBy: { model: 'users' },
    updatedBy: { model: 'users' },
  },
};


