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
    shortUrl: { type: 'string', unique: true, required: true },
    updatedBy: { model: "users" },
    createdAt: { type: "ref", autoCreatedAt: true, },
    updatedAt: { type: "ref", autoUpdatedAt: true, },
    isDeleted: { type: 'Boolean', defaultsTo: false }
  }
};

