/**
 * AffiliateLink.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */
// api/models/AffiliateProgram.js

module.exports = {
  schema: true,
  attributes: {
    affiliate_id: { model: "users" },
    brand_id: { model: "users" },

    link: { type: "string" },
    order_id: { type: "string" },
    currency: { type: "string" },
    price: { type: "number" },

    event: {
      type: 'string',
    },
    timestamp: {
      type: 'string',
    },
    urlParams: {
      type: 'json',

    },
    data: {
      type: 'json',
    },
    addedBy: { model: "users" },
    updatedBy: { model: "users" },
    createdAt: { type: "ref", autoCreatedAt: true, },
    updatedAt: { type: "ref", autoUpdatedAt: true, },
    isDeleted: { type: 'Boolean', defaultsTo: false }
  }
};

