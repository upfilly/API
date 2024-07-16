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
    link: { type: "string" },

    event: {
      type: 'string',
      required: true
    },
    timestamp: {
      type: 'string',
      required: true
    },
    urlParams: {
      type: 'json',
      required: true
    },
    data: {
      type: 'json',
      required: true
    },
    addedBy:{ model: "users" },
    updatedBy: { model: "users" },
    createdAt: { type: "ref", autoCreatedAt: true, },
    updatedAt: { type: "ref", autoUpdatedAt: true, },
    isDeleted: { type: 'Boolean', defaultsTo: false }
  }
};

