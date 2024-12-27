const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addSubscriptionPlan = async (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().required().max(30).min(3),
        amount: Joi.number().required().min(0),
        recommended: Joi.string().optional().valid('Y', 'N'),
        category: Joi.string().optional().valid('Network','Managed Services').default('Network'),
        interval: Joi.string().required().valid("month"),
        interval_count: Joi.number().required().min(0),
        currency: Joi.string().required(),
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
        // number_of_affiliate: Joi.number().required().min(0),
        plan_type: Joi.string().required().valid("paid", "free"),
        payment_type: Joi.string().required().valid('trial', 'recurring'),
        trial_period_days: Joi.number().when('payment_type', {
            is: "trial",
            then: Joi.number().required(),
            otherwise: Joi.number().optional(),
        }),
        status: Joi.string().optional(),
        make_recommend: Joi.boolean().optional()
    });

    return await Validate(schema, req, res);

}
exports.editSubscriptionPlan = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        name: Joi.string().optional().max(30).min(3),
        recommended: Joi.string().optional().valid('Y', 'N'),
        // plan_type: Joi.string().optional().valid("paid", "free"),
        // payment_type: Joi.string().optional().valid('trial', 'recurring'),
        // trial_period_days: Joi.number().when('payment_type', {
        //     is: "trial",
        //     then: Joi.number().optional(),
        //     otherwise: Joi.number().optional(),
        // }),
        features: Joi.array().required().items(Joi.object({
            id: Joi.string().required(),
            isChecked: Joi.boolean().required()
        }).required()),

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
        id: Joi.string().required(),    //plan id
        card_id: Joi.string().required(),
        user_id: Joi.string().required()
    });
    return await Validate(schema, req, res);

}

exports.cancelSubscription = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
    });
    return await Validate(schema, req, res);

}