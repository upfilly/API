/**
 * CardBraintree.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    // card_id: { type: "string" },
    card_token: { type: "string" },
    isPrimary: { type: "Boolean", defaultsTo: false },
    user_id: { model: "users" },
    last4: { type: "string" },
    addedBy: { model: 'users' },
    updatedBy: { model: 'users' },
    isDeleted: { type: 'Boolean', defaultsTo: false },
    createdAt: { type: 'ref', autoCreatedAt: true },
    updatedAt: { type: 'ref', autoUpdatedAt: true },
  }
};

