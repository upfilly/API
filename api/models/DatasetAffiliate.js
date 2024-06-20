/**
 * DatasetAffiliate.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    user_id:{model:"users"},
    filePath:{type:"string"},
  addedBy: { model: 'users' },
  updatedBy: { model: 'users' },
  isDeleted: { type: 'Boolean', defaultsTo: false },
  createdAt: { type: 'ref', autoCreatedAt: true },
  updatedAt: { type: 'ref', autoUpdatedAt: true },
   
  },

};

