/**
 * Invite.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  schema: true,

  attributes: {

    fullName: { type: "string" },
    email: { type: "string" },
    addedBy: { model: 'users' },
    invite_status: { type: 'string', isIn: ['onboard', 'invited'], defaultsTo: 'invited', },
    
    updatedBy: { model: 'users' },
    isDeleted: { type: 'Boolean', defaultsTo: false },
    createdAt: { type: 'ref', autoCreatedAt: true },
    updatedAt: { type: 'ref', autoUpdatedAt: true },
  },
};

