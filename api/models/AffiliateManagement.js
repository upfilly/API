/**
 * AffiliateManagement.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,

  attributes: {
    group_name: { type: "string" },
    group_code: { type: "string" },
    isDefaultAffiliateGroup: { type: 'Boolean', defaultsTo: false },
    isArchive: { type: 'Boolean', defaultsTo: false },
    isPreRegisterLeads: { type: 'Boolean', defaultsTo: false },
    commision: { type: "string" },
    status: { type: 'string', isIn: ['active', 'deactive'], defaultsTo: 'active', },

    //Common Fields
    addedBy: { model: "users", },
    updatedBy: { model: "users", },
    createdAt: { type: "ref", autoCreatedAt: true, },
    updatedAt: { type: "ref", autoUpdatedAt: true, },
    isDeleted: { type: 'Boolean', defaultsTo: false }
  },

};

