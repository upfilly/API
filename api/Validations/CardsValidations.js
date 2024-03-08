const Joi = require('joi');
const Validate = require('./Validate').validate;
exports.addCard = async (req, res, next) => {

    const schema = Joi.object({
        card_number: Joi.string().required().max(19).min(8),
        exp_month: Joi.string().required(),
        exp_year: Joi.string().optional(),
        cvc: Joi.string().optional().min(3).max(4),
        country: Joi.string().optional(),
        postal_code: Joi.string().optional(),
        user_id: Joi.string().required()
    });

    return await Validate(schema, req, res);

}
