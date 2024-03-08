const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.getInstagramPaths = async (req, res, next) => {

    const schema = Joi.object({
        url: Joi.array().required().items(Joi.string().required()),
    });
    return await Validate(schema, req, res);
}


exports.getInstagramStreamableReelsPaths = async (req, res, next) => {
    const schema = Joi.object({
        url: Joi.array().required().items(Joi.string().required()),
    });
    return await Validate(schema, req, res);
}

exports.getSocialMediaDataWithInfluencersId = async (req, res, next) => {
    const schema = Joi.object({
        ids: Joi.array().required().items(Joi.string().required()).min(1).max(100),
    });
    return await Validate(schema, req, res);
}
