const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addCommssion = async (req, res, next) => {
    const schema = Joi.object({
        plan_id: Joi.string().optional().allow(null),
        affiliate_group: Joi.string().optional().allow(null),
        affiliate_id: Joi.string().optional().allow(null),
        event_type: Joi.string().required().valid("lead", "visitor", "purchase", "line-item"),
        amount_type: Joi.string().required().valid("percentage", "amount"),
        amount: Joi.number().required(),
        time_frame_type: Joi.string().required().valid("day", "month"),
        time_frame: Joi.number().required(),
    });
    return await Validate(schema, req, res);
}

exports.editCommission = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.string().required(),
    });
    return await Validate(schema, req, res);
}