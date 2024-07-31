/**
 * DataFeeds.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

// const { schema } = require("./DataSet");

module.exports = {
  schema:true,
  attributes: {
    ID:{type:"string"},
    type:{type:"string"},
    SKU:{type:"string"},
    Name:{type:"string"},
    Published:{type:"boolean"},
    isFeatured:{type:"boolean"},
    isVisible:{type:"boolean"},
    shortDescription:{type:"boolean"},
    longDescription:{type:"boolean"},
    brand_name:{type:"string"},
    brand_id:{model:"users"},
    url:{type:"string"},
    
  addedBy: { model: 'users' },
  updatedBy: { model: 'users' },
  isDeleted: { type: 'Boolean', defaultsTo: false },
  createdAt: { type: 'ref', autoCreatedAt: true },
  updatedAt: { type: 'ref', autoUpdatedAt: true },
  },

};

