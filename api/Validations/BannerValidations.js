const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addBanner = async (req, res, next) => {

    const schema = Joi.object({
        title: Joi.string().required(),
        seo_attributes: Joi.string().optional(),
        destination_url: Joi.string().optional(),
        description: Joi.string().optional(),
        image: Joi.string().optional(),
        access_type: Joi.string().optional().valid("public", "private"),
        activation_date: Joi.date().optional().allow(""),
        affiliate_id: Joi.string().optional(),
        availability_date: Joi.date().optional().allow(""),
        expiration_date: Joi.date().optional().allow(""),
        is_animation: Joi.boolean().optional(),
        is_deep_linking: Joi.boolean().optional(),
        
        mobile_creative: Joi.boolean().optional(),
        category_id: Joi.string().optional().allow(null),

    });
    return await Validate(schema, req, res);

}
exports.editBanner = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        title: Joi.string().optional(),
        seo_attributes: Joi.string().optional(),
        destination_url: Joi.string().optional(),
        description: Joi.string().optional(),
        image: Joi.string().optional(),
        access_type: Joi.string().optional().valid("public", "private"),
        affiliate_id: Joi.string().optional(),
        activation_date: Joi.date().optional().allow(""),
        availability_date: Joi.date().optional().allow(""),
        expiration_date: Joi.date().optional().allow(""),
        is_animation: Joi.boolean().optional(),
        is_deep_linking: Joi.boolean().optional(),
        mobile_creative: Joi.boolean().optional(),
        category_id: Joi.string().optional().allow(null)

    });
    return await Validate(schema, req, res);

}

