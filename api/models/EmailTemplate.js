/**
 * EmailTemplate.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    textJSONContent:{
      type:"json",
      defaultsTo:[]
    },
    templateName: {
      type: "string",
      required: true,
    },
    emailName: {
      type: "string",
      required: true,
    },
    purpose: {
      type: "string",
      required: true,
    },
    audience: {
      type: "string",
    },
    country: {
      type: "string",
    },
    language: {
      type: "string",
    },
    format: {
      type: "string",
      isIn: ["HTML", "Text"],
      defaultsTo: "HTML",
    },
    subject: {
      type: "string",
      required: true,
    },
    from: {
      type: "string",
      required: true,
    },
    htmlContent: {
      type: "string",
    },
    textContent: {
      type: "string",
    },
    imagesAndLinks: {
      type: "json",
    },
    personalizationTags: {
      type: "json",
    },

    addedBy: { model: "users" },
    updatedBy: { model: "users" },
    isDeleted: { type: "Boolean", defaultsTo: false },
    createdAt: { type: "ref", autoCreatedAt: true },
    updatedAt: { type: "ref", autoUpdatedAt: true },
  },
};
