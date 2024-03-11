const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addProfileViewCount = async (req, res, next) => {

    const schema = Joi.object({
        visited_to: Joi.string().required(),
    });
    return await Validate(schema, req, res);
}
