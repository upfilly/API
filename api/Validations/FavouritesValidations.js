const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addFavourite = async (req, res, next) => {
    const schema = Joi.object({
        type: Joi.string().required().valid("user"),
        fav_user_id: Joi.string().when('type', {
            is: "user",
            then: Joi.string().required(),
            otherwise: Joi.string().optional().allow(null),
        }),
        // store_id: Joi.string().when('type', {
        //     is: "product",
        //     then: Joi.string().optional().allow(null),
        //     otherwise: Joi.string().required(),
        // }),
    });
    return await Validate(schema, req, res);

}
