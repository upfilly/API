const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addContract = async (req, res, next) => {

    const schema = Joi.object({
        name: Joi.string().required(),
        influencer_id: Joi.string().required(),
        description: Joi.string().optional().allow(""),
        amount: Joi.number().optional().min(0),
        start_date: Joi.date().optional().allow(""),
        end_date: Joi.date().optional().allow(""),
        social_media_platforms: Joi.array().optional().items(
            Joi.string().optional().allow("").valid("youtube", "tiktok", "twitter", "facebook", "instagram", "snapchat","linkedin","pinterest")
        ),
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
    });
    return await Validate(schema, req, res);
}

exports.editContract = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        description: Joi.string().optional().allow(""),
        amount: Joi.number().optional().min(0),
        start_date: Joi.date().optional().allow(""),
        end_date: Joi.date().optional().allow(""),
        social_media_platforms: Joi.array().optional().items(
            Joi.string().optional().allow("").valid("youtube", "tiktok", "twitter", "facebook", "instagram", "snapchat","linkedin","pinterest")
        ),
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
        influencer_id: Joi.string().required(),
    });
    return await Validate(schema, req, res);
}

exports.changeContractStatus = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        status: Joi.string().required().valid('accepted', 'cancelled_by_brand', 'cancelled_by_influencer', 'completed', 'mark_as_complete'),
        cancel_reason: Joi.string().optional().allow("")
    });
    return await Validate(schema, req, res);
}
