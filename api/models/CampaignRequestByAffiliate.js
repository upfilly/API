/**
 * AffiliateInvite.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    affiliate_id: { model: "users" },
    message: { type: "string" },
    campaign_id: { model: "campaign" },
    association: {model: "brandaffiliateassociation"},
    status: { type: 'string', isIn: ['accepted', 'rejected'], defaultsTo: 'pending', },
    affiliate_comment: {type: 'string', defaultsTo: ''},
    brand_comment: {type: 'string', defaultsTo: ''},
    brand_id: {model: "users"},
    addedBy: { model: "users" },
    updatedBy: { model: "users" },
    createdAt: { type: "ref", autoCreatedAt: true },
    updatedAt: { type: "ref", autoUpdatedAt: true },
    isDeleted: { type: 'Boolean', defaultsTo: false }
  },

};

