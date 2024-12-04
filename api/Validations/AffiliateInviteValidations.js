const Joi = require('joi');
const { title_case } = require('../services/Utils');
const Validate = require('./Validate').validate;

exports.addinvite = async (req, res) => {
    const schema = Joi.object({
        affiliate_id: Joi.array().required(),
        message: Joi.string().optional().allow(""),
        tags: Joi.array().default([]),
        campaign_id: Joi.string().required()

    })
    return await Validate(schema, req, res);

},
    exports.getinvite = async (req, res) => {
        const schema = Joi.object({
            id: Joi.string().required()
        })
        return await Validate(schema, req, res);

    },

    exports.updateinvite = async (req, res) => {
        const schema = Joi.object({
            id: Joi.array().required(),
            message: Joi.string().optional(),
            commission: Joi.string().optional(),
            tags: Joi.string().optional(),
            campaign_id: Joi.string().optional().allow(null)

        })
        return await Validate(schema, req, res);

    },

    exports.changeStatus = async (req, res) => {

        const schema = Joi.object({
            id: Joi.string().required(),
            status: Joi.string().required().valid('accepted', 'rejected'),
            reason: Joi.string().when('status', {
                is: "rejected",
                then: Joi.string().required(),
                otherwise: Joi.string().optional(),
            })
        });
        return await Validate(schema, req, res);
    }