const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addFeatures = async (req, res, next) => {
    const scheme = Joi.object({
        name: Joi.array().required().items(Joi.object({
            name: Joi.string().required(),
            type: Joi.string().optional().valid('normal', 'white_label')
        }))
    });
    return await Validate(scheme, req, res);
}

exports.editFeatures = async (req, res, next) => {
    const scheme = Joi.object({
        id: Joi.string().required(),
        name: Joi.string().optional().allow(""),
        type: Joi.string().optional().valid('normal', 'white_label')
    });
    return await Validate(scheme, req, res);
}
