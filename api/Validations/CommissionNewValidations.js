const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addCommission = async (req, res, next) => {
    const schema = Joi.object({
        upload_method: Joi.string().optional().valid("single", "batch"),
        commission_type: Joi.string().optional().valid("sales", "lead"),
        publisher_id: Joi.number().optional(),
        amount_of_sale: Joi.number().optional(),
        amount_of_commission: Joi.number().optional(),
        order_reference: Joi.string().optional(),
        click_ref: Joi.string().optional(),
        affiliate_id: Joi.string().optional().allow(null),
        is_send_email_to_publisher: Joi.boolean().optional(),
        batch_file: Joi.string().optional(),
        date:Joi.string().optional().allow(""),
        campaign:Joi.string().required(),
        locality: Joi.string().optional(),
        isContain_headers: Joi.string().optional()
    });
    return await Validate(schema, req, res);

}
exports.editCommission = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        title: Joi.string().optional(),
        seo_attributes: Joi.string().optional(),
        destination_url: Joi.string().optional(),
        description: Joi.string().optional(),
        image: Joi.string().optional(),
        activation_date: Joi.date().optional().allow(""),
        availability_date: Joi.date().optional().allow(""),
        date:Joi.string.optional().allow(""),
        campaign:Joi.string().required(),
        expiration_date: Joi.date().optional().allow(""),
        is_animation: Joi.boolean().optional(),
        is_deep_linking: Joi.boolean().optional(),
        mobile_creative: Joi.boolean().optional(),
        category_id: Joi.string().optional().allow(null)

    });
    return await Validate(schema, req, res);

}


