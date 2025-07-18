const Joi = require("joi");
const Validate = require("./Validate").validate;

exports.addDataSet = async (req, res, next) => {
  const schema = Joi.object({
    // user_id:Joi.string().required(),
    filePath:Joi.string().optional(),
    brand_id: Joi.string().required(),
    type : Joi.string().optional(),
    url : Joi.string().optional(),
    doc_name : Joi.string().optional(),
  });
  return await Validate(schema, req, res);
};