/**
 * FirstPromoterData.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

    module.exports = {
      schema: true,
      attributes: {
        lead_email:{type:"string"},
        lead_id:{type:"string"},
        sub_id:{type:"string"},
        earnings:{type:"string"},
        addedBy: { model: "users" },
        updatedBy: { model: "users" },
        status: {
          type: "string",
          isIn: ["active", "inactive"]
        },
        isDeleted: { type: "Boolean", defaultsTo: false },
        createdAt: { type: "ref", autoCreatedAt: true },
        updatedAt: { type: "ref", autoUpdatedAt: true },
      },
    
    };
  