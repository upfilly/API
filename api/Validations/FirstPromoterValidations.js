const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addFirstPromoter = async (req, res, next) => {

    const schema = Joi.object({
        email: Joi.string().required(),
        password: Joi.string().optional().allow('', null),
        url: Joi.string().optional().allow('', null),
        campaignName: Joi.string().optional().allow('', null),
    });
    return await Validate(schema, req, res);
}

exports.editFirstPromoter = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        email: Joi.string().required(),
        password: Joi.string().optional().allow('', null),
        url: Joi.string().optional().allow('', null),
        campaignName: Joi.string().optional().allow('', null),
    });
    return await Validate(schema, req, res);
}
