const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.stripeAccountTransfer = async (req, res, next) => {
    const schema = Joi.object({
        user_id: Joi.array().required().items(Joi.object({
            commission_id: Joi.string().required(),
            user_id: Joi.string().optional().allow(null),
            group_id: Joi.string().optional().allow(null),
            amount: Joi.number().required().min(0),
            amount_type: Joi.string().required().valid("percentage", "amount"),
            event_type: Joi.string().required().valid("lead", "visitor", "purchase", "line-item"),
        }))
    });

    return await Validate(schema, req, res);

}

exports.addBankOnStripe = async (req, res, next) => {
    const schema = Joi.object({
        user_id: Joi.string().required(),
        email: Joi.string().required(),
        accountholder_name: Joi.string().required(),
        routing_number: Joi.string().required().min(9),
        account_number: Joi.string().required(),
        first_name: Joi.string().required(),
        last_name: Joi.string().required(),
        mobile: Joi.string().required(),
        ssn_number: Joi.string().required().min(9),

        dob: Joi.object({
            day: Joi.number().required(),
            month: Joi.number().required(),
            year: Joi.number().required(),
        }).required(),

        address: Joi.object({
            line1: Joi.string().required(),
            city: Joi.string().required(),
            state: Joi.string().required(),
            postal_code: Joi.string().required()
        }).required(),

        frontdoc: Joi.string().required(),
        backdoc: Joi.string().required(),
        company_name: Joi.string().required(),
    });

    return await Validate(schema, req, res);

}
