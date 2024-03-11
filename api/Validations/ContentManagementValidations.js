const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addContent = async (req, res, next) => {
    const schema = Joi.object({
        title: Joi.string().required(),
        image: Joi.string().optional().max(400).allow(""),
        description: Joi.string().optional().min(3).max(4000),
        meta_title: Joi.string().required().min(3).max(400).allow(""),
        meta_description: Joi.string().optional().min(3).max(2000).allow(""),
        meta_key: Joi.string().optional().min(3).max(400).allow(""),

    });
    return await Validate(schema, req, res);
}

exports.editContent = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.string().required(),
        title: Joi.string().optional().allow(""),
        image: Joi.string().optional().max(400).allow(""),
        description: Joi.string().required().min(3).max(4000),
        meta_title: Joi.string().optional().min(3).max(400).allow(""),
        meta_description: Joi.string().optional().min(3).max(2000).allow(""),
        meta_key: Joi.string().optional().min(3).max(400).allow(""),

    });
    return await Validate(schema, req, res);
}