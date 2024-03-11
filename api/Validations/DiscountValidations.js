const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addDiscount = async (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().required().lowercase(),
        discount_type: Joi.string().required().valid('percentage', 'flat'),
        duration: Joi.string().required().valid("once", "repeating", "forever"),
        duration_in_months: Joi.number().when('duration', {
            is: "repeating",
            then: Joi.number().required(),
            otherwise: Joi.number().optional(),
        }),
       
        amount_value: Joi.number().required(),
        // amount_off: Joi.number().required(),
        // total_amount: Joi.number().required(),
        // max_redemptions: Joi.number().required(),
    });
    return await Validate(schema, req, res);
}

exports.editDiscount = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required().lowercase()
    });
    return await Validate(schema, req, res);
}