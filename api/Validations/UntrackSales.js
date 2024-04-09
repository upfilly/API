const Joi = require('joi');
const { title_case } = require('../services/Utils');
const Validate = require('./Validate').validate;

exports.addsales= async (req, res) => {
    const schema = Joi.object({
        title: Joi.string().required(),
        description: Joi.string().optional(),
        brand_id: Joi.string().required().allow(null),
        image: Joi.string().optional().allow(""),

    })
    return await Validate(schema, req, res);
    
},
exports.getsales= async (req, res) => {
    const schema = Joi.object({
        id: Joi.string().required()
    })
    return await Validate(schema, req, res);
    
},

exports.updatesales = async (req, res) => {
    const schema = Joi.object({
        id: Joi.string().required(),
        title: Joi.string().optional(),
        image: Joi.string().optional(),
        description: Joi.string().optional(),
        brand_id: Joi.string().required().allow(null)

    })
    return await Validate(schema, req, res);
    
}
exports.changeStatus = async (req, res) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        status: Joi.string().required().valid('accepted', 'rejected'),
        reason: Joi.string().when('status', {
            is: "rejected",
            then: Joi.string().required(),
            otherwise: Joi.string().optional(),
        })
    });
    return await Validate(schema, req, res);
}
