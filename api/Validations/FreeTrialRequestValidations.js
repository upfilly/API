const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.startFreeTrial = async (req, res, next) => {

    const schema = Joi.object({
        email: Joi.string().required(),
    });
    return await Validate(schema, req, res);
}
