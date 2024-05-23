const Joi = require('joi');
const Validate = require('./Validate').validate;
exports.addInvite = async (req, res, next) => {

    const schema = Joi.object({
        email: Joi.string().required(),
        firstName: Joi.string().required(),
        lastName:Joi.string().required(),
        email:Joi.string().required(),
        role:Joi.string().valid("users"),
        description:Joi.string().optional(),
        language:Joi.string().optional(),
    });

    return await Validate(schema, req, res);

}