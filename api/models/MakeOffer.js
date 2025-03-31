/**
 * MakeOffer.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    product_id: { model: 'product' },
    brand_id: { model: "users" },
    affiliate_id: { model: "users" },

    name: { type: "string" },
    description: { type: "string" },
    association: { model: 'brandaffiliateassociation' },
    // sent_from: { type: "string" },
    // sent_to: { type: "string" },
    comments: { type: "string" },

    status: { type: 'string', isIn: ['pending', 'accepted', "rejected"], defaultsTo: 'pending' },
    reason: { type: "string" },
    accepted_at: { type: 'ref', columnType: 'datetime' },

    // amount: { type: 'number', defaultsTo: 0 },

    addedBy: { model: "users", },
    updatedBy: { model: "users", },
    createdAt: { type: "ref", autoCreatedAt: true, },
    updatedAt: { type: "ref", autoUpdatedAt: true, },
    isDeleted: { type: 'Boolean', defaultsTo: false }
  },

};

