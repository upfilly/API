/**
 * DataFeeds.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

// const { schema } = require("./DataSet");

module.exports = {
  schema:true,
  // attributes: {
  //   ID:{type:"string"},
  //   type:{type:"string"},
  //   SKU:{type:"string"},
  //   Name:{type:"string"},
  //   Published:{type:"boolean"},
  //   isFeatured:{type:"boolean"},
  //   isVisible:{type:"boolean"},
  //   shortDescription:{type:"boolean"},
  //   longDescription:{type:"boolean"},
  //   brand_name:{type:"string"},
  //   brand_id:{model:"users"},
  //   url:{type:"string"},
    
  // addedBy: { model: 'users' },
  // updatedBy: { model: 'users' },
  // isDeleted: { type: 'Boolean', defaultsTo: false },
  // createdAt: { type: 'ref', autoCreatedAt: true },
  // updatedAt: { type: 'ref', autoUpdatedAt: true },
  // },

  attributes: {
    ID: {type: "string"},
    type: {type:"string"},
    SKU: {type:"string"},
    Name: {type:"string"},
    productURL: {type:"string"},
    price: {type:"number"},
    retailPrice: {type:"number"},
    thumbnailURL: {type:"string"},
    searchKeywords: {type:"string"},
    description: {type:"string"},
    category: {type:"string"},
    categoryId: {type:"string"},
    brand: {type:"string"},
    childSKU: {type:"string"},
    childPrice: {type:"string"},
    color: {type:"string"},
    colorFamily: {type:"string"},
    colorSwatches: {type:"string"},
    size: {type:"string"},
    shoeSize: {type:"string"},
    pantSize: {type:"string"},
    occasion: {type:"string"},
    season: {type:"string"},
    badges: {type:"string"},
    ratingAvg: {type:"string"},
    ratingCount: {type:"string"},
    inventoryCount: {type:"string"},
    dateCreated: {type: 'ref', columnType: 'datetime'},
    brand_name: {type: "string"},
    brand_id: {model: "users"},
    url :{type:'string'}, // when brand share url
    filePath : {type:'string'}, // when brand share csv file and that file path store in this

  }

};

