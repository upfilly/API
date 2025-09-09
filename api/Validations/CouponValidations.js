const Joi = require("joi");
const Validate = require("./Validate").validate;

exports.addCoupon = async (req, res, next) => {
  const schema = Joi.object({
    // media: Joi.string()
    //   .when('visibility', {
    //     is: "Exclusive to specific affiliate",
    //     then: Joi.required(),
    //     otherwise: Joi.optional()
    //   }),
    media: Joi.array().optional().items(Joi.string()), 
  //   media: Joi.alternatives().conditional('visibility', {
  //   is: 'Exclusive to specific affiliate',
  //   then: Joi.array().items(Joi.string().required()).min(1).required(),
  //   otherwise: Joi.array().items(Joi.string()).optional()
  // }),
    

    couponCode: Joi.string().alphanum().required(),

    couponType: Joi.string().required(),

    startDate: Joi.date().required(),

    expirationDate: Joi.date().optional(),

    commissionType: Joi.string()
      .valid("Percentage Commission", "Fixed amount")
      .optional(),

    applicable: Joi.array().items(Joi.string()), // Adjust the type of items if necessary

    campaign_id: Joi.array().optional().items(Joi.string()),

    visibility: Joi.string()
      .valid(
        "Public",
        "Exclusive to specific affiliate",
        "Exclusive to group of affiliates",
        "Excluded from a specific affiliate",
        "Excluded from a group of affiliates"
      )
      .required(),

    status: Joi.string().valid("Enabled", "Disabled","Pending").required(),

    url: Joi.string().uri().required(),

    couponCommission: Joi.string().optional().allow(""),
    couponAmount: Joi.number().optional(),
    title: Joi.string().optional().allow(""),
    description: Joi.string().optional().allow(""),
    expireCheck: Joi.boolean().optional().allow(""),
    
  });
  return await Validate(schema, req, res);
};
exports.editCoupon = async (req, res, next) => {
  const schema = Joi.object({
    id:Joi.string().required(),
    // media: Joi.string()
    //   .when('visibility', {
    //     is: "Exclusive to specific affiliate",
    //     then: Joi.required(),
    //     otherwise: Joi.optional()
    //   }),
    media: Joi.array().optional().items(Joi.string()), 
  //   media: Joi.alternatives().conditional('visibility', {
  //   is: 'Exclusive to specific affiliate',
  //   then: Joi.array().items(Joi.string().required()).min(1).required(),
  //   otherwise: Joi.array().items(Joi.string()).optional()
  // }),


    couponCode: Joi.string().alphanum().required(),

    campaign_id: Joi.array().optional().items(Joi.string()),

    couponType: Joi.string().required(),

    startDate: Joi.date().required(),

    expirationDate: Joi.date().optional(),

    commissionType: Joi.string()
      .valid("Percentage Commission", "Fixed amount")
      .optional(),

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

    couponCommission: Joi.string().optional(),
    couponAmount: Joi.number(),
    title: Joi.string().optional().allow(""),
    description: Joi.string().optional().allow(""),
    expireCheck: Joi.boolean().optional().allow(""),

  });
  return await Validate(schema, req, res);
};
