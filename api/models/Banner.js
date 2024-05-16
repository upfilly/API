/**
 * Banner.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    title: { type: "string" },
    destination_url: { type: "string" },
    description: { type: "string" },
    seo_attributes: { type: "string" },
    activation_date: { type: 'ref', columnType: "datetime" },
    availability_date: { type: 'ref', columnType: "datetime" },
    expiration_date: { type: 'ref', columnType: "datetime" },
    image: { type: "string" },
    is_animation: { type: 'Boolean', defaultsTo: false },
    is_deep_linking: { type: 'Boolean', defaultsTo: false },
    mobile_creative: { type: 'Boolean', defaultsTo: false },
    category_id: { model: "commoncategories" },
    //Common keys
    isDeleted: { type: 'Boolean', defaultsTo: false },
    status: { type: 'string', isIn: ['active', 'deactive'], defaultsTo: 'active', },
    updatedBy: { model: 'users' },
    addedBy: { model: 'users' },
    createdAt: { type: 'ref', autoCreatedAt: true },
    updatedAt: { type: 'ref', autoUpdatedAt: true },
  },

};
