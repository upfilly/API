const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.updatePointsTemplate = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        // profile_completion: Joi.number().optional().min(0),
        // subscription: Joi.number().optional().min(0),
        like: Joi.number().optional().min(0),
        contract: Joi.number().optional().min(0),
        // referral: Joi.number().optional().min(0),
        login_streak: Joi.number().optional().min(0),
        invite: Joi.number().optional().min(0),
        messaging: Joi.number().optional().min(0),
    });
    return await Validate(schema, req, res);
}

exports.redeemPoints = async (req, res, next) => {

    const schema = Joi.object({
        user_id: Joi.string().required(),
        points: Joi.number().optional().min(100),
    }).custom((obj, helpers) => {
        const { points } = obj;
        if (points % 100 != 0) {
            throw new Error('Points should be multiple of 100');
        }
        return obj;
    });
    return await Validate(schema, req, res);
}
