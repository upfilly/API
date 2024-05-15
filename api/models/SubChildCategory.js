/**
 * SubChildCategory.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    name: { type: 'string' },
    category_id: { model: "commoncategories" },
    sub_category_id: { model: "commoncategories" },
    status: { type: 'string', isIn: ['active', 'deactive'], defaultsTo: "active", },
    isDeleted: { type: 'Boolean', defaultsTo: false },
    addedBy: { model: 'users' },
    updatedBy: { model: 'users' },
    createdAt: { type: "ref", autoCreatedAt: true },
    updatedAt: { type: "ref", autoUpdatedAt: true },

  },

};


