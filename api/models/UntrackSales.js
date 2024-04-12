/**
 * SalesTracking.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    image: { type: "string" },
    type: {type: "string"},
    click_ref:{type: "string"},
    brand_id: { model: 'users' },
    order_date:{  type: "ref", columnType: "datetime"},
    amount:{type: "number"},
    commission:{type: "number"},
    order_reference:{type: "string"},
    customer_reference:{type: "string"},
    description: { type: "string" },
    currency:{type: "string"},
    timeZone:{type: "string"},
    title: { type: "string" },
    
    status: { type: 'string', isIn: ['accepted', 'rejected'], defaultsTo: 'pending', },
    addedBy: { model: 'users' },
    updatedBy: { model: 'users' },
    isDeleted: { type: 'Boolean', defaultsTo: false },
    createdAt: { type: 'ref', autoCreatedAt: true },
    updatedAt: { type: 'ref', autoUpdatedAt: true },
    status: {type: 'string', isIn: ['accepted', 'rejected'], defaultsTo: "pending",}
},

};

