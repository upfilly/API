const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.assign = async (req, res, next) => {

    const schema = Joi.object({
        name: Joi.string().optional().allow(""),
        affiliate_id: Joi.string().optional(),
        product_id: Joi.string().required().allow(null),
        description: Joi.string().optional().allow(""),
        comments: Joi.string().optional().allow(""),
        brand_id: Joi.string().required(),
        sent_from: Joi.string().optional().allow(""),
        sent_to: Joi.string().optional().allow("")

        // amount: Joi.number().required().min(0),
    });
    return await Validate(schema, req, res);
}

exports.editCampaign = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        affiliate_id: Joi.string().required(),
        name: Joi.string().required(),
        description: Joi.string().optional().allow(""),
        images: Joi.array().optional().items(
            Joi.object({
                name: Joi.string().optional().allow(""),
                url: Joi.string().required(),
            }).optional()
        ),
        documents: Joi.array().optional().items(
            Joi.object({
                name: Joi.string().optional().allow(""),
                url: Joi.string().required(),
            }).optional()
        ),
        videos: Joi.array().optional().items(
            Joi.object({
                name: Joi.string().optional().allow(""),
                url: Joi.string().required(),
            }).optional()
        )
    });
    return await Validate(schema, req, res);
}

exports.changeCampaignStatus = async (req, res) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        status: Joi.string().required().valid('accepted', 'rejected'),
        reason: Joi.string().when('status', {
            is: "rejected",
            then: Joi.string().required(),
            otherwise: Joi.string().optional(),
        })
    });
    return await Validate(schema, req, res);
}
