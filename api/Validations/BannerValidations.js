const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addBanner = async (req, res, next) => {

    const schema = Joi.object({
      title: Joi.string().required(),
      seo_attributes: Joi.string().optional().allow(""),
      destination_url: Joi.string().optional().allow(""),
      description: Joi.string().optional().allow(""),
      image: Joi.string().optional().allow(""),
      access_type: Joi.string().optional().valid("public", "private"),
      activation_date: Joi.date().optional().allow(""),
      affiliate_id: Joi.string().optional().allow(""),
      availability_date: Joi.date().optional().allow(""),
      expiration_date: Joi.date().optional().allow(""),
      is_animation: Joi.boolean().optional().allow(""),
      is_deep_linking: Joi.boolean().optional().allow(""),

      mobile_creative: Joi.boolean().optional().allow(""),
      category_id: Joi.array().optional().allow(null),
      subCategory: Joi.array().optional().allow(null),
      subChildCategory: Joi.array().optional().allow(null),
      expireCheck: Joi.boolean().optional(),
    });
    return await Validate(schema, req, res);

}
exports.editBanner = async (req, res, next) => {

    const schema = Joi.object({
      id: Joi.string().required(),
      title: Joi.string().optional(),
      seo_attributes: Joi.string().optional().allow(""),
      destination_url: Joi.string().optional().allow(""),
      description: Joi.string().optional().allow(""),
      image: Joi.string().optional().allow(""),
      access_type: Joi.string().optional().valid("public", "private"),
      affiliate_id: Joi.string().optional().allow(""),
      activation_date: Joi.date().optional().allow(""),
      availability_date: Joi.date().optional().allow(""),
      expiration_date: Joi.date().optional().allow(""),
      is_animation: Joi.boolean().optional().allow(""),
      is_deep_linking: Joi.boolean().optional().allow(""),
      mobile_creative: Joi.boolean().optional().allow(""),
      category_id: Joi.array().optional().allow(null),
      subCategory: Joi.array().optional().allow(null),
      subChildCategory: Joi.array().optional().allow(null),
      expireCheck: Joi.boolean().optional().allow(""),
    });
    return await Validate(schema, req, res);

}

