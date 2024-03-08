/**
 * News.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    title: { type: "string" },
    sub_title: { type: "string" },
    image: { type: "json" },
    blog_type_id: { model: "commoncategories" },
    // slug: { type: "string" },
    description: { type: "string" },
    meta_title: { type: "string" },
    meta_name: { type: "string" },
    meta_description: { type: "string" },
    meta_keywords: { type: "string" },
    alt_tag: { type: "string" },
    updatedBy: { model: 'users' },
    addedBy: { model: 'users' },
    deletedBy: { model: 'users' },
    isTrending: { type: 'Boolean', defaultsTo: false },
    isPublished: { type: 'Boolean', defaultsTo: false },
    trendingAt: { type: 'ref', columnType: "datetime" },
    publishAt: { type: 'ref', columnType: "datetime" }, 
    createdAt: { type: 'ref', autoCreatedAt: true },
    updatedAt: { type: 'ref', autoUpdatedAt: true },
    isDeleted: { type: 'Boolean', defaultsTo: false },
  },

};

