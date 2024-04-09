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
    description: { type: "string" },
    title: { type: "string" },
    email: {type: "string" },
    brand_id: { model: 'users' },
    status: { type: 'string', isIn: ['accepted', 'rejected'], defaultsTo: 'pending', },

    addedBy: { model: 'users' },
    updatedBy: { model: 'users' },
    isDeleted: { type: 'Boolean', defaultsTo: false },
    createdAt: { type: 'ref', autoCreatedAt: true },
    updatedAt: { type: 'ref', autoUpdatedAt: true },
    status: {type: 'string', isIn: ['accepted', 'rejected'], defaultsTo: "pending",}
},

};

