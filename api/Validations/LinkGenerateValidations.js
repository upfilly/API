const Joi = require("joi");
const Validate = require("./Validate").validate;

exports.addLinkGenerate = async (req, res, next) => {
  const schema = Joi.object({
    linkName: Joi.string().required().lowercase(),
    destinationUrl: Joi.string().required(),
    description: Joi.string().optional(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    seo: Joi.boolean().required(),
    deepLink: Joi.boolean().optional(),
    category: Joi.array().items(Joi.string()).optional(),
  });
  return await Validate(schema, req, res);
};

exports.editLinkGenerate = async (req, res, next) => {
  const schema = Joi.object({
    id: Joi.string().required(),
    linkName: Joi.string().optional().lowercase().allow(""),
    destinationUrl: Joi.string().optional().allow(""),
    description: Joi.string().optional().allow(""),
    startDate: Joi.date().optional().allow(""),
    endDate: Joi.date().optional().allow(""),
    seo: Joi.boolean().optional().allow(""),
    deepLink: Joi.boolean().optional().allow(""),
    category: Joi.array().items(Joi.string()).optional().allow(""),
    status: Joi.string().optional().valid("active", "deactive").allow(""),
  });
  return await Validate(schema, req, res);
};

// exports.changeRequestStatus = async (req, res) => {
//   const schema = Joi.object({
//     id: Joi.string().required(),
//     status: Joi.string().required().valid("accepted", "rejected"),
//     reason: Joi.string().when("status", {
//       is: "rejected",
//       then: Joi.string().required(),
//       otherwise: Joi.string().optional(),
//     }),
//     affiliate_id: Joi.string().optional(),
//   });
//   return await Validate(schema, req, res);
// };
