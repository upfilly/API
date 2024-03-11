const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.ReadUnread = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.string().required(),
        status: Joi.string().required().valid('read', 'unread'),
    });

    return await Validate(schema, req, res);

}
exports.ReadUnreadAll = async (req, res, next) => {
    const schema = Joi.object({
        status: Joi.string().required().valid('read', 'unread'),
    });

    return await Validate(schema, req, res);

}
