/**
 * Smtp.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */


 module.exports = {
    attributes: {

        service: {
            type: 'string',
            required: true
        },

        host: {
            type: 'string',
            required: true
        },

        port: {
            type: 'number',  
            defaultsTo: 587     
            
        },

        domains:{
            type: 'json',
        },

        user:{
            type: 'string',
            required: true
        },

        pass:{
            type: 'string',
            required: true
        },       
        updatedBy:{
            model:'users'
        },


  }
  };
  