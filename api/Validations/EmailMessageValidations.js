const Joi = require("joi");
const Validate = require("./Validate").validate;

exports.sendEmailMessage = async (req, res, next) => {
  const schema = Joi.object({
    title:Joi.string().required(),
    user_id:Joi.string().required(),
    description:Joi.string().optional(),
  });
  return await Validate(schema, req, res);
};