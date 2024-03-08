const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.deleteCommonData = async (req, res, next) => {
    const schema = Joi.object({
        type: Joi.string().required().valid("contract"),
        contract_id: Joi.string().when('type', {
            is: "contract",
            then: Joi.string().required(),
            otherwise: Joi.string().optional().allow(null),
        }),
    });
    return await Validate(schema, req, res);

}
