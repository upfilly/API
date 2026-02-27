const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addTax = async (req, res, next) => {
    const schema = Joi.object({
        user_id: Joi.string().required(),
        social_security_number: Joi.string().optional(),
        tax_classification: Joi.string().optional(),
        federal_text_classification: Joi.string().optional(),
        tax_name: Joi.string().optional(),
        is_us_citizen: Joi.boolean().optional(),
        trade_name: Joi.string().optional().allow(""),
        ein: Joi.string().optional().allow(""),
        consent_agreed: Joi.boolean().optional(),
        signature: Joi.string().optional().allow(""),
        signature_date: Joi.date().optional().allow(""),
        address : Joi.string().optional().allow(""),

        country : Joi.string().optional().allow(""),
        city : Joi.string().optional().allow(""),
        state : Joi.string().optional().allow(""),
        tax : Joi.string().optional().allow(""),


    });
    return await Validate(schema, req, res);
}