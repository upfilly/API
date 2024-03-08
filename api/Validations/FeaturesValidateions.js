const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addFeatures = async (req, res, next) => {
    const scheme = Joi.object({
        name: Joi.array().required().items(Joi.object({
            name: Joi.string().required()
        }))
    });
    return await Validate(scheme, req, res);
}

exports.editFeatures = async (req, res, next) => {
    const scheme = Joi.object({
        id: Joi.string().required(),
        name: Joi.string().optional().allow("")
    });
    return await Validate(scheme, req, res);
}
