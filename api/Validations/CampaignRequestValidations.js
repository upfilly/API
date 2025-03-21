const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.sendCampaignRequestToBrand = async (req, res, next) => {

    const schema = Joi.object({
        campaign_id: Joi.string().required(),
        brand_id:Joi.string().required(),
        affiliate_id:Joi.string().required(),
        id : Joi.string().required(),
        association : Joi.string().required()
    });
    return await Validate(schema, req, res);
}

exports.editCampaign = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        affiliate_id: Joi.array().optional(),
        event_type: Joi.array().optional().items(Joi.string().optional()),
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
        ),
        isDefault: Joi.boolean().optional(),
        access_type: Joi.string().optional().valid('public', 'private'),
        category : Joi.array().optional(),
        sub_category : Joi.array().optional(),
        category_type : Joi.string().optional(),
        sub_child_category : Joi.array().optional(),
        region : Joi.array().optional(),
        campaign_type : Joi.string().valid("manual","automatic")
    });
    return await Validate(schema, req, res);
}

exports.changeRequestStatus = async (req, res) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        status: Joi.string().required().valid('accepted', 'rejected'),
        reason: Joi.string().when('status', {
            is: "rejected",
            then: Joi.string().required(),
            otherwise: Joi.string().optional(),
        }),
        affiliate_id: Joi.string().optional()
    });
    return await Validate(schema, req, res);
}
