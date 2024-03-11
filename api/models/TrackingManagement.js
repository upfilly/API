/**
 * TrackingManagement.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    campaign_unique_id: {
      type: 'String'
    },
    event_type: {
      type: 'String'
    },
    ip_address: {
      type: "String"
    },
    clicks: {
      type: 'number',
      defaultsTo: 1
    },
    status: {
      type: "string",
      isIn: [
        "active",
        "deactive"
      ],
      defaultsTo: "active",
    },
    isDeleted: {
      type: 'Boolean',
      defaultsTo: false
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
    },
  },
};

