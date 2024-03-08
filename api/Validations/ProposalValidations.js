const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addProposal = async (req, res, next) => {

    const schema = Joi.object({
        description: Joi.string().required(),
        brand_id: Joi.string().required()
    });
    return await Validate(schema, req, res);
}

exports.editProposal = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        description: Joi.string().required()
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
