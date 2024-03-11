/**
 * Product.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    name: { type: 'string' },
    description: { type: "string" },
    price: { type: 'number' },
    image: { type: 'json' },
    // quantity: { type: 'number' },
    category_id: { model: 'CommonCategories' },
    sub_category_id: { model: 'CommonCategories' },
    // opportunity_type: { type: 'string', isIn: ['single_placement', 'package', 'full_ratecard'], defaultsTo: '' },
    // placement: { type: 'string', isIn: ['single_placement', 'package', 'full_ratecard'], defaultsTo: '' },

    price_type: { type: 'string' },
    opportunity_type: { type: "json", columnType: "array", defaultsTo: [] },
    placement: { type: "json", columnType: "array", defaultsTo: [] },

    start_date: { type: 'ref', columnType: 'datetime' },
    end_date: { type: 'ref', columnType: 'datetime' },


    status: { type: 'string', isIn: ['active', 'deactive'], defaultsTo: 'active' },
    isDeleted: { type: 'boolean', defaultsTo: false },
    addedBy: { model: 'users' },
    updatedBy: { model: 'users' },
    createdAt: { type: "ref", autoCreatedAt: true, },
    updatedAt: { type: "ref", autoUpdatedAt: true, },
  }

};

