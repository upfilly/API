const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addTracking = async (req, res, next) => {

    const schema = Joi.object({
        campaign_unique_id: Joi.string().required(),
        event_type: Joi.string().required(),
        ip_address: Joi.string().required()
    });
    return await Validate(schema, req, res);
}
