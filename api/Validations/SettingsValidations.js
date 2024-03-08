const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.editSettings = async (req, res) => {
    const schema = Joi.object({
        id: Joi.string().required().allow(""),
        logo: Joi.string().required().allow(""),
        fav_icon: Joi.string().required().allow(""),
        company_name: Joi.string().required().allow(""),
        website_email: Joi.string().required().allow(""),
        company_email: Joi.string().required().allow(""),
        company_address: Joi.string().required().allow(""),
        company_country_code: Joi.string().required().allow(""),
        company_dial_code: Joi.string().required().allow(""),
        company_mobile_no: Joi.string().required().allow(""),
        support_email: Joi.string().required().allow(""),
        sales_tax: Joi.number().min(0).required(),
        brand_fee: Joi.number().min(0).required(),
        earning_fee: Joi.number().min(0).required(),
        site_name: Joi.string().required().allow(""),
        meta_title: Joi.string().required().allow(""),
        meta_description: Joi.string().required().allow(""),
        google_api_key: Joi.string().required().allow(""),
        copy_right: Joi.string().optional().allow("")

    });
    return await Validate(schema, req, res);
}

