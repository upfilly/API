const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addDiscountBraintree = async (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().required().lowercase(),
        amount: Joi.number().required()
    });
    return await Validate(schema, req, res);
}

exports.editDiscountBraintree = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required().lowercase()
    });
    return await Validate(schema, req, res);
}