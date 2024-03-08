const utils = require('../services/Utils');
const Joi = require('joi');

exports.validate = async (schema, req, res) => {
    const { error } = schema.validate(req.body);
    const valid = error == null;

    if (valid) {
        return {
            success: true,
            message: ""
        }
    } else {
        const { details } = error;
        const message = await utils.remove_double_quotes(details.map(i => i.message).join(', '));
        return {
            success: false,
            message: message
        }
    }
}
