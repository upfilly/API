/**
 * FirstPromoter.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    
    email: { type: "string" },
    password: { type: "string" },
    url: { type: "string" },
    filePath: { type: "string" },
    campaignName: { type: "string" },
    brand_id: { model: "users" },
    campaign_id: { model: "campaign" },

    status: {
      type: "string",
      isIn: ["active", "deactive"],
      defaultsTo: "active",
    },
    // Common Keys
    addedBy: { model: "users" },
    updatedBy: { model: "users" },
    isDeleted: { type: "Boolean", defaultsTo: false },
    createdAt: { type: "ref", columnType: "datetime" },
    updatedAt: { type: "ref", columnType: "datetime" },
  },
};
