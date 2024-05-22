const Joi = require('joi');
const { title_case } = require('../services/Utils');
const Validate = require('./Validate').validate;

exports.addaffiliateinvite = async (req, res) => {
    const schema = Joi.object({
        affiliate_id: Joi.array().required(),
        message: Joi.string().optional().allow(""),
        commission: Joi.string().optional(),
        tags: Joi.array().default([]),
        campaign_id: Joi.string().optional().allow(null)

    })
    return await Validate(schema, req, res);

},
    exports.getaffiliateinvite = async (req, res) => {
        const schema = Joi.object({
            id: Joi.string().required()
        })
        return await Validate(schema, req, res);

    },

    exports.updateaffiliateinvite = async (req, res) => {
        const schema = Joi.object({
            id: Joi.array().required(),
            message: Joi.string().optional(),
            commission: Joi.string().optional(),
            tags: Joi.string().optional(),
            campaign_id: Joi.string().optional().allow(null)

        })
        return await Validate(schema, req, res);

    }