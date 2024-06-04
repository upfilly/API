const Joi = require('joi');
const Validate = require('./Validate').validate;
exports.addInvite = async (req, res, next) => {

    const schema = Joi.object({
        email: Joi.string().required(),
        brand_id:Joi.string().optional(),  
        firstName: Joi.string().required(),
        lastName:Joi.string().optional(),
        email:Joi.string().required(),
        role:Joi.string().valid("users","operator","analyzer"),
        description:Joi.string().optional(),
        language:Joi.string().optional(),
    });

    return await Validate(schema, req, res);

}