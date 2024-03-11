const Joi = require('joi');
const Validate = require('./Validate').validate;
exports.claimProfile = async (req, res, next) => {

    const schema = Joi.object({
        email: Joi.string().required(),
        user_id: Joi.string().required(),
    });
    return await Validate(schema, req, res);

}
exports.verifyProfileClaim = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        code: Joi.string().required(),
    });
    return await Validate(schema, req, res);

}