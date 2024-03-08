const Joi = require('joi');
const Validate = require('./Validate').validate;


exports.edit = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        service: Joi.string().required(),
        host: Joi.string().required(),
        port: Joi.number().required().valid(25,587, 465),
        domains: Joi.array().required().items(Joi.string().required()),
        user: Joi.string().required(),
        pass: Joi.string().required(),
    });

    return await Validate(schema, req, res);

}