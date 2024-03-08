const Joi = require('joi');
const Validate = require('./Validate').validate;
exports.addFaq = async (req, res, next) => {

    const schema = Joi.object({
        question: Joi.string().required(),
        answer: Joi.string().optional(),
        category_id: Joi.string().optional().allow(null),
        sub_category_id: Joi.string().optional().allow(null),
        content_id: Joi.string().optional().allow(null),
        video: Joi.string().optional().allow(""),
    });
    return await Validate(schema, req, res);

}
exports.editFaq = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        question: Joi.string().required(),
        answer: Joi.string().optional(),
        video: Joi.string().optional().allow(""),
        category_id: Joi.string().optional().allow(null),
        sub_category_id: Joi.string().optional().allow(null),
        content_id: Joi.string().optional().allow(null),
    });
    return await Validate(schema, req, res);

}