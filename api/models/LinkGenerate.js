/**
 * LinkGenrate.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,

  attributes: {
    linkName: { type: "string" },
    destinationUrl: { type: "string" },
    description: { type: "string" },
    startDate: { type: 'ref', columnType: 'datetime' },
    endDate: { type: 'ref', columnType: 'datetime' },
    seo: { type: "boolean", defaultsTo: false },
    deepLink: { type: "boolean", defaultsTo: false },
    category:{ type: 'json' },

    //Common Fields
    status: {
      type: "string",
      isIn: ["active", "deactive"],
      defaultsTo: "active",
    },
    addedBy: { model: "users" },
    updatedBy: { model: "users" },
    createdAt: { type: "ref", autoCreatedAt: true },
    updatedAt: { type: "ref", autoUpdatedAt: true },
    isDeleted: { type: "boolean", defaultsTo: false },
  },
};
