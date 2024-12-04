/**
 * PublicPrivateCampaigns.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    affiliate_id:{
      model: 'users'
    },
    campaign_id:{
      model: 'campaign'
    },
    brand_id: {
      model: 'users'
    },
    isDeleted: {
      type: 'Boolean',
      defaultsTo: false
    },
    status: { 
      type: 'string', 
      isIn: ['pending', 'accepted', "rejected"], 
      defaultsTo: 'pending' 
    },
    reason: {
      type: 'string',
      defaultsTo: ""
    },
    deletedBy: {
      model: 'users'
    },
    deletedAt: {
      type: 'ref',
      columnType: 'datetime'
    },
    updatedBy: {
      model: 'users'
    },
    addedBy: {
      model: 'Users'
    },
    createdAt: {
      type: 'ref',
      autoCreatedAt: true
    },
    accepted_at: { 
      type: 'ref', 
      columnType: 'datetime' 
    },
    updatedAt: {
      type: 'ref',
      autoUpdatedAt: true
    },
    isActive: {
      type: 'Boolean',
      defaultsTo: false
    },
    source: {
      type: "string",
      defaultsTo: "campaign"
    },
    campaign_link: { type: "json", defaultsTo: [] }
  },

};

