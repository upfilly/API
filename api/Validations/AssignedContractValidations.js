const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.assignContract = async (req, res, next) => {

    const schema = Joi.object({
        influencer_id: Joi.string().required(),
        contract_id: Joi.string().required(),
    });
    return await Validate(schema, req, res);
}


exports.changeAssignedContractStatus = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        status: Joi.string().required().valid('accepted', 'cancelled_by_brand', 'cancelled_by_influencer', 'completed'),
        cancel_reason: Joi.string().optional().allow("")
    });
    return await Validate(schema, req, res);
}
