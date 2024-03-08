const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addLanguage = async (req, res, next) => {

    const schema = Joi.object({
        name: Joi.string().required().lowercase(),
    });
    return await Validate(schema, req, res);
}

exports.editLanguage = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required().lowercase(),
    });
    return await Validate(schema, req, res);
}
