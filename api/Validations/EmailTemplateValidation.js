const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.addEmailTemplate = async (req, res, next) => {
  const schema = Joi.object({
    affiliates:Joi.array().required(),
    templateName: Joi.string().required(),
    emailName: Joi.string().required(),
    purpose: Joi.string().required(),
    audience: Joi.string().optional(),
    country: Joi.string().optional(),
    language: Joi.string().optional(),
    format: Joi.string().valid("HTML", "Text").default("HTML"),
    subject: Joi.string().required(),
    from: Joi.string().required(),
    htmlContent: Joi.string().optional().allow(""),
    textContent: Joi.string().optional().allow(""),
    imagesAndLinks: Joi.array()
      .items(
        Joi.object({
          image: Joi.string().uri().optional(),
          link: Joi.string().uri().optional(),
        })
      )
      .optional(),
    personalizationTags: Joi.array().items(Joi.string()).optional(),
  });
  return await Validate(schema, req, res);
};


exports.editEmailTemplate = async (req, res, next) => {
  const schema = Joi.object({
    id: Joi.string().required(),
    templateName: Joi.string().required(),
    emailName: Joi.string().required(),
    purpose: Joi.string().required(),
    audience: Joi.string().optional(),
    country: Joi.string().optional(),
    language: Joi.string().optional(),
    format: Joi.string().valid("HTML", "Text").default("HTML"),
    subject: Joi.string().required(),
    from: Joi.string().required(),
    htmlContent: Joi.string().optional().allow(""),
    textContent: Joi.string().optional().allow(""),
    imagesAndLinks: Joi.array()
      .items(
        Joi.object({
          image: Joi.string().uri().optional(),
          link: Joi.string().uri().optional(),
        })
      )
      .optional(),
    personalizationTags: Joi.array().items(Joi.string()).optional(),
  });
  return await Validate(schema, req, res);
};
