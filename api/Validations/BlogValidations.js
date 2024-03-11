const Joi = require('joi');
const Validate = require('./Validate').validate;
exports.addBlog = async (req, res, next) => {

    const schema = Joi.object({
        blog_type_id: Joi.string().required(),
        title: Joi.string().required(),
        sub_title: Joi.string().optional().allow(""),
        image: Joi.array().optional().items(Joi.string().optional()),
        description: Joi.string().optional().allow(""),
        meta_title: Joi.string().optional().allow(""),
        meta_name: Joi.string().optional().allow(""),
        meta_description: Joi.string().optional().allow(""),
        meta_keywords: Joi.string().optional().allow(""),
        alt_tag: Joi.string().optional().allow(""),
        isTrending: Joi.boolean().optional(),
        isPublished: Joi.boolean().optional(),
    });

    return await Validate(schema, req, res);

}
exports.editBlog = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        blog_type_id: Joi.string().required(),
        title: Joi.string().required(),
        sub_title: Joi.string().optional().allow(""),
        image: Joi.array().optional().items(Joi.string().optional()),
        description: Joi.string().optional().allow(""),
        meta_title: Joi.string().optional().allow(""),
        meta_name: Joi.string().optional().allow(""),
        meta_description: Joi.string().optional().allow(""),
        meta_keywords: Joi.string().optional().allow(""),
        alt_tag: Joi.string().optional().allow(""),
        isTrending: Joi.boolean().optional(),
        isPublished: Joi.boolean().optional(),
    });

    return await Validate(schema, req, res);

}
exports.publishBlog = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        type: Joi.string().required().valid("trending", "publish"),
    });

    return await Validate(schema, req, res);
}
