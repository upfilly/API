const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addReviews = async (req, res) => {
    const schema = Joi.object({
        rating: Joi.number().required().min(1).max(5),
        review: Joi.string().optional().allow(""),
        type: Joi.string().required().valid("contract"),
        contract_id: Joi.string().when('type', {
            is: "contract",
            then: Joi.string().required(),
            otherwise: Joi.string().optional().allow(null),
        }),

    });
    return await Validate(schema, req, res);

}
exports.editReviews = async (req, res) => {
    const schema = Joi.object({
        id: Joi.string().required(),
        review: Joi.string().optional(),
    });
    return await Validate(schema, req, res);

}
