const Joi = require("joi");
const Validate = require("./Validate").validate;

exports.addCoupon = async (req, res, next) => {
  const schema = Joi.object({
    media: Joi.string()
      .when('visibility', {
        is: "Exclusive to specific affiliate",
        then: Joi.required(),
        otherwise: Joi.optional()
      }),

    couponCode: Joi.string().alphanum().required(),

    couponType: Joi.string().required(),

    startDate: Joi.date().required(),

    expirationDate: Joi.date().required(),

    commissionType: Joi.string()
      .valid("Percentage Commission", "Fixed amount")
      .required(),

    applicable: Joi.array().items(Joi.string()), // Adjust the type of items if necessary

    visibility: Joi.string()
      .valid(
        "Public",
        "Exclusive to specific affiliate",
        "Exclusive to group of affiliates",
        "Excluded from a specific affiliate",
        "Excluded from a group of affiliates"
      )
      .required(),

    status: Joi.string().valid("Enabled", "Disabled").required(),

    url: Joi.string().uri().required(),

    couponCommission: Joi.number().required(),
  });
  return await Validate(schema, req, res);
};
exports.editCoupon = async (req, res, next) => {
  const schema = Joi.object({
    media: Joi.string()
      .when('visibility', {
        is: "Exclusive to specific affiliate",
        then: Joi.required(),
        otherwise: Joi.optional()
      }),

    couponCode: Joi.string().alphanum().required(),

    couponType: Joi.string().required(),

    startDate: Joi.date().required(),

    expirationDate: Joi.date().required(),

    commissionType: Joi.string()
      .valid("Percentage Commission", "Fixed amount")
      .required(),

    applicable: Joi.array().items(Joi.string()), // Adjust the type of items if necessary

    visibility: Joi.string()
      .valid(
        "Public",
        "Exclusive to specific affiliate",
        "Exclusive to group of affiliates",
        "Excluded from a specific affiliate",
        "Excluded from a group of affiliates"
      )
      .required(),

    status: Joi.string().valid("Enabled", "Disabled").required(),

    url: Joi.string().uri().required(),

    couponCommission: Joi.number().required(),
  });
  return await Validate(schema, req, res);
};
