const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addPlanWithBraintree = async (req, res, next) => {

    const schema = Joi.object({
        name: Joi.string().required().max(30).min(3),
        recommended: Joi.string().optional().valid('Y', 'N'),
        isUpcoming: Joi.boolean().optional(),
        upcoming_date: Joi.string().when('isUpcoming', {
            is: true,
            then: Joi.string().required(),
            otherwise: Joi.string().optional(),
        }),
        features: Joi.array().required().items(Joi.object({
            id: Joi.string().required(),
            isChecked: Joi.boolean().required()
        }).required()),

        discount_id: Joi.string().optional().allow(null),
        number_of_affiliate: Joi.number().required(),
        plan_type: Joi.string().required().valid("paid", "free"),
        payment_type: Joi.string().required().valid('trial', 'recurring'),
        trial_period_days: Joi.number().when('payment_type', {
            is: "trial",
            then: Joi.number().required(),
            otherwise: Joi.number().optional(),
        }),
        status: Joi.string().optional(),
        price: Joi.string().optional(),
        billing_frequency: Joi.number().optional(),
        make_recommend: Joi.boolean().optional(),
        currency_iso_code: Joi.string().required().valid("usd"),
    });

    return await Validate(schema, req, res);

}

exports.editPlanBraintree = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        name: Joi.string().optional().max(30).min(3),
        recommended: Joi.string().optional().valid('Y', 'N'),
        plan_type: Joi.string().optional().valid("paid", "free"),
        payment_type: Joi.string().optional().valid('trial', 'recurring'),
        trial_period_days: Joi.number().when('payment_type', {
            is: "trial",
            then: Joi.number().optional(),
            otherwise: Joi.number().optional(),
        }),
        features: Joi.array().required().items(Joi.object({
            id: Joi.string().required(),
            isChecked: Joi.boolean().required()
        }).required()),

        numberOfDays: Joi.number().optional().min(1).max(7),
        discount_id: Joi.string().optional().allow(null),
        number_of_affiliate: Joi.number().optional(),
        status: Joi.string().optional(),
        isUpcoming: Joi.boolean().optional(),
        upcoming_date: Joi.string().optional(),
        make_recommend: Joi.boolean().optional()
    });

    return await Validate(schema, req, res);

}

exports.subscribe = async (req, res, next) => {

    const schema = Joi.object({
        // id: Joi.string().required(),
        // firstName: Joi.string().required(),
        // lastName: Joi.string().required(),
        // paypal_email: Joi.string().required(),
        // card_number: Joi.string().required(),
        // exp_month: Joi.number().required(),
        // exp_year: Joi.number().required(),
        user_id: Joi.string().required(),
        card_token: Joi.string().required(),
        plan_id: Joi.string().required()
    });
    return await Validate(schema, req, res);

}
exports.addCard = async (req, res, next) => {

    const schema = Joi.object({
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        paypal_email: Joi.string().optional().allow(""),
        card_number: Joi.string().required().max(19).min(8),
        exp_month: Joi.number().required(),
        exp_year: Joi.number().required(),
        cvv: Joi.number().required(),
        user_id: Joi.string().required(),
    });

    return await Validate(schema, req, res);

}