const Joi = require("joi");
const Validate = require("./Validate").validate;

exports.addDataSet = async (req, res, next) => {
  const schema = Joi.object({
    // user_id:Joi.string().required(),
    filePath:Joi.string().required()
  });
  return await Validate(schema, req, res);
};