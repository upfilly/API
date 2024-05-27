/**
 * ActivityLogs.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    user_id:{model:"users"},
    message:{type:"string"},
    method:{type:"string"},
    url:{type:"string"},
    status:{type:"string"},
    parentUserId:{model:"users"},
    data:{type:"json"},
    createdAt: { type: "ref", autoCreatedAt: true },
    updatedAt: { type: "ref", autoUpdatedAt: true },
    isDeleted: { type: 'Boolean', defaultsTo: false }
  },

};

