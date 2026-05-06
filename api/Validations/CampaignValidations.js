const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addCampaign = async (req, res, next) => {

    const schema = Joi.object({
        name: Joi.string().required(),
        brand_id:Joi.string().required(),
        parent_role:Joi.string().optional(),
        affiliate_id: Joi.array().optional(),
        event_type: Joi.array().optional().items(Joi.string().optional()),
        description: Joi.string().optional().allow(""),
        amount: Joi.number().optional().min(0),
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
        access_type: Joi.string().required().valid('public', 'private'),
        commission_type : Joi.string().optional(),
        commission : Joi.number().optional().min(0),
        category : Joi.array().optional(),
        sub_category : Joi.array().optional(),
        category_type : Joi.string().optional(),
        sub_child_category : Joi.array().optional(),
        region : Joi.array().optional(),
        region_continents : Joi.array().optional(),
        lead_amount : Joi.number().optional(),
        campaign_type : Joi.string().required().valid("manual","automatic"),
        currencies : Joi.string().optional().allow(""),

        deDuplicate : Joi.object().optional(),
        publisher : Joi.object().optional(""),
        ppc : Joi.object().optional(),
        transaction : Joi.object().optional(),
        legalTerm : Joi.string().optional(),
        islegal : Joi.boolean().optional(),
        status : Joi.string().optional().valid("active","deactive"),
        customparameter : Joi.string().optional().allow(""),
        tier_calculation_type :Joi.string().optional(),
        tiers :Joi.array().optional(),
        lead_tiers :Joi.array().optional(),
        tiered_commission_enabled: Joi.boolean().optional(),
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
        campaign_type : Joi.string().valid("manual","automatic"),
        currencies : Joi.string().allow("").optional(),
        
        deDuplicate : Joi.object().optional(),
        publisher : Joi.object().optional(""),
        ppc : Joi.object().optional(),
        transaction : Joi.object().optional(),
        legalTerm : Joi.string().optional(),
        islegal : Joi.boolean().optional(),
        status : Joi.string().optional().valid("active","deactive"),
        isArchive : Joi.boolean().optional(),
        customparameter : Joi.string().optional().allow(""),
        tiers :Joi.array().optional(),
        lead_tiers :Joi.array().optional(),
        tier_calculation_type :Joi.string().optional(),
        tiered_commission_enabled: Joi.boolean().optional(),
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
        }),
        affiliate_id: Joi.string().required()
    });
    return await Validate(schema, req, res);
}
