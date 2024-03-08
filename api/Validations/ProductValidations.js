const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addProduct = async (req, res, next) => {

    const schema = Joi.object({
        name: Joi.string().required().min(3),
        image: Joi.array().optional().items(Joi.string().optional()),
        price: Joi.number().required().min(0),
        price_type: Joi.string().optional(),
        quantity: Joi.number().required().min(0),
        description: Joi.string().optional().allow(""),
        category_id: Joi.string().optional().allow(null),
        sub_category_id: Joi.string().optional().allow(null),
        opportunity_type: Joi.array().optional().items(Joi.string().optional()),
        placement: Joi.array().optional().items(Joi.string().optional()),
        start_date: Joi.date().optional().allow(""),
        end_date: Joi.date().optional().allow(""),

    });
    return await Validate(schema, req, res);

}

exports.editProduct = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required().min(3),
        image: Joi.array().optional().items(Joi.string().optional()),
        price: Joi.number().required().min(0),
        price_type: Joi.string().optional(),
        quantity: Joi.number().required().min(0),
        description: Joi.string().optional().allow(""),
        category_id: Joi.string().optional().allow(null),
        sub_category_id: Joi.string().optional().allow(null),
        opportunity_type: Joi.array().optional().items(Joi.string().optional()),
        placement: Joi.array().optional().items(Joi.string().optional()),
        start_date: Joi.date().optional().allow(""),
        end_date: Joi.date().optional().allow(""),
    });
    return await Validate(schema, req, res);
}



