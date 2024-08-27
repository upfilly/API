/**
 * EmailMessageTemplate.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    title: { type: "string" },
    description: { type: "string" },
    affiliate_id: { model: "users" },
    description: { type: "string" },
    status: {
      type: "string",
      isIn: ["active", "deactive"],
      defaultsTo: "active",
    },
    isAllJoined: { type: "Boolean", defaultsTo: false },
    timeInterval: { type: "string", isIn: ["before", "after"], defaultsTo: "" },

    // Common Keys
    addedBy: { model: "users" },
    isDeleted: { type: "Boolean", defaultsTo: false },
    createdAt: { type: 'ref', autoCreatedAt: true, },
    updatedAt: { type: 'ref', autoUpdatedAt: true },
  },
};
