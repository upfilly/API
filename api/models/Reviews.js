/**
 * Reviews.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    rating: { type: "number" },
    review: { type: "string" },
    // contract_id: { model: "contracts" },       
    user_id: { model: "users" },        // Rated by
    rate_to: { model: "users" },        // Rated to
    type: { type: "string", isIn: ["contract"] },
    updatedBy: { model: 'users' },
    isDeleted: { type: 'Boolean', defaultsTo: false },
    createdAt: { type: 'ref', autoCreatedAt: true },
    updatedAt: { type: 'ref', autoUpdatedAt: true },
  },

};

