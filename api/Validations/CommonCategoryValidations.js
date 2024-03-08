const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addCommonCategory = async (req, res, next) => {

    const schema = Joi.object({
        type: Joi.string().required().valid("sub", "main"),
        cat_type: Joi.string().optional().valid("faq", "blog", "product"),
        parent_id: Joi.string().when('type', {
            is: "sub",
            then: Joi.string().required(),
            otherwise: Joi.string().optional().allow(null),
        }),
        name: Joi.string().required(),

    });
    return await Validate(schema, req, res);

}
exports.editCommonCategory = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        type: Joi.string().required().valid("sub", "main", "product"),
        // cat_type: Joi.string().required().valid("faq"),
        parent_id: Joi.string().when('type', {
            is: "sub",
            then: Joi.string().required(),
            otherwise: Joi.string().optional().allow(null),
        }),
        name: Joi.string().required(),

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

