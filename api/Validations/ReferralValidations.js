const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.sendReferralCode = async (req, res, next) => {

    const schema = Joi.object({
        email: Joi.string().required(),
        description: Joi.string().optional().allow(""),
        name: Joi.string().optional(),
    });
    return await Validate(schema, req, res);
}

exports.changeInviteStatus = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        status: Joi.string().required().valid('accepted', 'cancelled'),
        cancel_reason: Joi.string().optional().allow("")
    });
    return await Validate(schema, req, res);
}

exports.resendReferralEmail = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
    });
    return await Validate(schema, req, res);
}
