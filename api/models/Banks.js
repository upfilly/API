/**
 * Banks.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {

    account_id: { type: 'string' },
    external_account_id: { type: 'string' },
    last4: { type: 'string' },
    bank_name: { type: 'string' },
    isDefault: { type: "Boolean", defaultsTo: false },
    type: { type: 'string' },
    account_holder_name: { type: 'string', },
    userId: { model: "users" },
    
    // common feilds
    addedBy: { model: 'users' },
    updatedBy: { model: 'users' },
    isDeleted: { type: 'Boolean', defaultsTo: false },
    createdAt: { type: 'ref', autoCreatedAt: true },
    updatedAt: { type: 'ref', autoUpdatedAt: true },

  },

};

