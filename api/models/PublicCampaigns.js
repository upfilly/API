/**
 * Publiccampaigns.js
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
    updatedAt: {
      type: 'ref',
      autoUpdatedAt: true
    }
  },

};

