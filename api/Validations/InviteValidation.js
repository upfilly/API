const Joi = require('joi');
const Validate = require('./Validate').validate;
exports.addInvite = async (req, res, next) => {

    const schema = Joi.object({
        email: Joi.string().required()
    });

    return await Validate(schema, req, res);

}