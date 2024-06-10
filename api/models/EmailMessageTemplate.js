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
    user_id: { model: "users" },
    description: { type: "string" },
    status: {
      type: "string",
      isIn: ["active", "deactive"],
      defaultsTo: "active",
    },

    // Common Keys
    addedBy: { model: "users" },
    isDeleted: { type: "Boolean", defaultsTo: false },
    createdAt: { type: "ref", columnType: "datetime" },
    updatedAt: { type: "ref", columnType: "datetime" },
  },
};
