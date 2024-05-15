const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addSubChildCategory = async (req, res, next) => {

    const schema = Joi.object({
        category_id: Joi.string().optional().allow(null),
        sub_category_id: Joi.string().optional().allow(null),
        name: Joi.string().required(),

    });
    return await Validate(schema, req, res);

}
exports.editSubChildCategory = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        category_id: Joi.string().optional().allow(null),
        sub_category_id: Joi.string().optional().allow(null),
        name: Joi.string().optional(),

    });
    return await Validate(schema, req, res);

}

exports.addMultipleCommonCategories = async (req, res, next) => {

    const schema = Joi.object({
        type: Joi.string().required().valid("sub", "main"),
        region_id: Joi.string().when('type', {
            is: "sub",
            then: Joi.string().required(),
            otherwise: Joi.string().optional().allow(null),
        }),
        name: Joi.string().required(),

    });
    return await Validate(schema, req, res);

}

exports.updateToggleKeys = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        model: Joi.string().required().valid("commoncategories", 'users'),
        key: Joi.string().required().valid("isPopular", "isTrusted", "isFeatured"),
    });
    return await Validate(schema, req, res);

}

