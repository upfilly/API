const Joi = require('joi');
const { title_case } = require('../services/Utils');
const Validate = require('./Validate').validate;

exports.addsales= async (req, res) => {
    const schema = Joi.object({
        title: Joi.string().required(),
        description: Joi.string().optional(),
        brand_id:Joi.string().optional().allow(null),
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
    })
    return await Validate(schema, req, res);
    
}

// exports.deletesales= async (req, res) => {
//     const schema = Joi.object({
//         id: Joi.string().required()
//     })
//     return await Validate(schema, req, res);
    
// }

// exports.getallsales= async (req, res) => {
//     const schema = Joi.object({
//         title: Joi.string().required(),
//         description: Joi.string().required(),
//     })
//     return await Validate(schema, req, res);
    
// }
