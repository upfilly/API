const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.editPermission = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),

        affiliate_disabled: Joi.boolean().optional(),
        affiliate_read: Joi.boolean().optional(),
        affiliate_write: Joi.boolean().optional(),

        brand_disabled: Joi.boolean().optional(),
        brand_read: Joi.boolean().optional(),
        brand_write: Joi.boolean().optional(),
        is_admin_access: Joi.boolean().optional(),
    });
    return await Validate(schema, req, res);

}
