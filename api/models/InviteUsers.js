/**
 * InviteUser.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */


module.exports = {
  attributes: {
    firstName: {
      type: 'string',
    },
    lastName: {
      type: 'string',
    },
    email: {
      type: 'string',
    },
    role: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
    language: {
      type: 'string',
    },
    invitationAccepted:{
      type:"boolean",
      defaultsTo:false
    },
      // Common Keys
      addedBy: { model: 'users' },
      updatedBy: { model: 'users' },
      isDeleted: { type: 'Boolean', defaultsTo: false },
      createdAt: { type: 'ref', autoCreatedAt: true },
      updatedAt: { type: 'ref', autoCreatedAt: true },
  }
};
