const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addEmailSentSetting = async (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().required(),
    });
    return await Validate(schema, req, res);
}

exports.editEmailSentSetting = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.string().required(),
        name: Joi.string().optional().allow(""),
        emailSent: Joi.boolean().optional(),
        isDeleted: Joi.boolean().optional()
    });
    return await Validate(schema, req, res);
}