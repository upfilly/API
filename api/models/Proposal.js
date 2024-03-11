/**
 * Proposal.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    description: {
      type: 'String'
    },
    pdfUpload: {
      type: 'String'
    },
    status: {
      type: "string",
      isIn: [
        "accepted",
        "rejected",
        "pending",
      ],
      defaultsTo: "pending",
    },
    reason: {
      type: 'string'
    },
    brand_id: {
      model: 'users'
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

