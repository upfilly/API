/**
 * NewTaxController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const constants = require('../../config/constants').constants
const db = sails.getDatastore().manager;
const ObjectId = require('mongodb').ObjectId;
const Services = require('../services/index');
const Joi = require('joi');
const Validations = require("../Validations/index");
const response = require("../services/Response")

module.exports = {
    addTax :async(req,res)=>{
        try {
            let validation_result = await Validations.tax.addTax(req, res);
    
            if (validation_result && !validation_result.success) {
                throw validation_result.message;
            }
           
            req.body.addedBy = req.identity.id;
            let result = await Tax.findOne({user_id : req.body.user_id, isDeleted: false })
            if (result) {
                throw constants.NEWTAX.ALREADY_EXIST;
            }
    
            let data = await Tax.create(req.body).fetch();
            if (data) {
                return response.success(null, constants.NEWTAX.ADDED, req, res);
    
            }
            throw constants.COMMON.SERVER_ERROR
    
        } catch (error) {
            console.log(error);
            return response.failed(null, `${error}`, req, res)
        }
    }
  

};

