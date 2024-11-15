const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addCampaign = async (req, res, next) => {

    const schema = Joi.object({
        name: Joi.string().required(),
        brand_id:Joi.string().required(),
        parent_role:Joi.string().optional(),
        affiliate_id: Joi.string().optional(),
        event_type: Joi.array().optional().items(Joi.string().optional()),
        description: Joi.string().optional().allow(""),
        amount: Joi.number().required().min(0),
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
        access_type: Joi.string().required().valid('public', 'private')
    });
    return await Validate(schema, req, res);
}

exports.editCampaign = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        affiliate_id: Joi.string().optional(),
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
        access_type: Joi.string().required().valid('public', 'private')
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
