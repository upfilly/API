const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addScript = async (req, res, next) => {
    const schema = Joi.object({
        script_content: Joi.string().required(),
        script_type: Joi.string().optional()
    });
    return await Validate(schema, req, res);

}

exports.editScript = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.string().required(),
        script_content: Joi.string().optional(),
        script_type: Joi.string().optional()
    });
    return await Validate(schema, req, res);

}
