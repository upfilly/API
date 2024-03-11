const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addCampaignResult = async (req, res) => {
    const schema = Joi.object({
        campaign_id: Joi.string().required(),
        date: Joi.date().required(),
        peoples_reached: Joi.number().optional().min(0),
        peoples_engaged: Joi.number().optional().min(0),
        images: Joi.array().optional().items(
            Joi.object({
                name: Joi.string().optional().allow(""),
                url: Joi.string().required(),
            }).optional()
        ),
    });
    return await Validate(schema, req, res);

}
exports.editReviews = async (req, res) => {
    const schema = Joi.object({
        id: Joi.string().required(),
        review: Joi.string().optional(),
    });
    return await Validate(schema, req, res);

}
