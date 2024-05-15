const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addAffiliateGroup = async (req, res, next) => {

    const schema = Joi.object({
        group_name: Joi.string().required(),
        commision: Joi.string().optional(),
        // isDefaultAffiliateGroup: Joi.boolean().optional(),
        isArchive: Joi.boolean().optional(),
        isPreRegisterLeads: Joi.boolean().optional(),


    });
    return await Validate(schema, req, res);
}

exports.editAffiliateGroup = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        group_name: Joi.string().optional(),
        // isDefaultAffiliateGroup: Joi.boolean().optional(),
        isArchive: Joi.boolean().optional(),
        isPreRegisterLeads: Joi.boolean().optional(),
        commision: Joi.string().optional(),

    });
    return await Validate(schema, req, res);
}
