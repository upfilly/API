const Joi = require("joi");
const Validate = require("./Validate").validate;

// exports.addBanner = async (req, res, next) => {
//   const schema = Joi.object({
//     title: Joi.string().optional().allow("",null),
//     seo_attributes: Joi.string().optional().allow(""),
//     destination_url: Joi.string().optional().allow(""),
//     description: Joi.string().optional().allow(""),
//     image: Joi.string().optional().allow(""),
//     access_type: Joi.string().optional().valid("public", "private").allow("",null),
//     activation_date: Joi.date().optional().allow(""),
//     affiliate_id: Joi.string().optional().allow(""),
//     availability_date: Joi.date().optional().allow(""),
//     expiration_date: Joi.date().optional().allow(""),
//     is_animation: Joi.boolean().optional().allow(""),
//     is_deep_linking: Joi.boolean().optional().allow(""),

//     mobile_creative: Joi.boolean().optional().allow(""),
//     category_id: Joi.array().optional().allow(null),
//     subCategory: Joi.array().optional().allow(null),
//     subChildCategory: Joi.array().optional().allow(null),
//     expireCheck: Joi.boolean().optional().allow("",null),

//     // link generate key's
//     addType: Joi.string().required().valid("banner", "link"),
//     linkName: Joi.string().optional().lowercase().allow("",null),
//     linkDestinationUrl: Joi.string().optional().allow("",null),
//     linkDescription: Joi.string().optional().allow("",null),
//     linkStartDate: Joi.date().optional().allow("",null),
//     linkEndDate: Joi.date().optional().allow("",null),
//     linkSeo: Joi.boolean().optional().allow("",null),
//     linkDeepLink: Joi.boolean().optional().allow("",null),
//     linkCategory: Joi.array().items(Joi.string()).optional().allow("",null),
//   });
//   return await Validate(schema, req, res);
// };

exports.addBanner = async (req, res, next) => {
  const schema = Joi.object({
    addType: Joi.string().required().valid("banner", "link"),

    // Common fields
    access_type: Joi.string()
      .optional()
      .valid("public", "private")
      .allow("", null),
    activation_date: Joi.date().optional().allow(""),
    availability_date: Joi.date().optional().allow(""),
    expiration_date: Joi.date().optional().allow(""),
    expireCheck: Joi.boolean().optional().allow("", null),

    // Conditional for banner type
    title: Joi.when("addType", {
      is: "banner",
      then: Joi.string().required(),
      otherwise: Joi.forbidden(),
    }),
    seo_attributes: Joi.when("addType", {
      is: "banner",
      then: Joi.string().optional().allow(""),
      otherwise: Joi.forbidden(),
    }),
    destination_url: Joi.when("addType", {
      is: "banner",
      then: Joi.string().optional().allow(""),
      otherwise: Joi.forbidden(),
    }),
    description: Joi.when("addType", {
      is: Joi.valid("banner", "link"),
      then: Joi.string().optional().allow(""),
      otherwise: Joi.forbidden(),
    }),
    image: Joi.when("addType", {
      is: "banner",
      then: Joi.string().optional().allow(""),
      otherwise: Joi.forbidden(),
    }),
    is_animation: Joi.when("addType", {
      is: "banner",
      then: Joi.boolean().optional(),
      otherwise: Joi.forbidden(),
    }),
    is_deep_linking: Joi.when("addType", {
      is: "banner",
      then: Joi.boolean().optional(),
      otherwise: Joi.forbidden(),
    }),
    mobile_creative: Joi.when("addType", {
      is: "banner",
      then: Joi.boolean().optional(),
      otherwise: Joi.forbidden(),
    }),
    category_id: Joi.when("addType", {
      is: "banner",
      then: Joi.array().optional().allow(null),
      otherwise: Joi.forbidden(),
    }),
    subCategory: Joi.when("addType", {
      is: "banner",
      then: Joi.array().optional().allow(null),
      otherwise: Joi.forbidden(),
    }),
    subChildCategory: Joi.when("addType", {
      is: "banner",
      then: Joi.array().optional().allow(null),
      otherwise: Joi.forbidden(),
    }),

    // Conditional for link type
    linkName: Joi.when("addType", {
      is: "link",
      then: Joi.string().required().lowercase(),
      otherwise: Joi.forbidden(),
    }),
    linkDestinationUrl: Joi.when("addType", {
      is: "link",
      then: Joi.string().required(),
      otherwise: Joi.forbidden(),
    }),
    linkDescription: Joi.when("addType", {
      is: "link",
      then: Joi.string().optional().allow("", null),
      otherwise: Joi.forbidden(),
    }),
    linkStartDate: Joi.when("addType", {
      is: "link",
      then: Joi.date().optional().allow("", null),
      otherwise: Joi.forbidden(),
    }),
    linkEndDate: Joi.when("addType", {
      is: "link",
      then: Joi.date().optional().allow("", null),
      otherwise: Joi.forbidden(),
    }),
    linkSeo: Joi.when("addType", {
      is: "link",
      then: Joi.boolean().optional().allow("", null),
      otherwise: Joi.forbidden(),
    }),
    linkDeepLink: Joi.when("addType", {
      is: "link",
      then: Joi.boolean().optional().allow("", null),
      otherwise: Joi.forbidden(),
    }),
    linkCategory: Joi.when("addType", {
      is: "link",
      then: Joi.array().items(Joi.string()).optional().allow("", null),
      otherwise: Joi.forbidden(),
    }),
  });

  return await Validate(schema, req, res);
};

exports.editBanner = async (req, res, next) => {
  const schema = Joi.object({
    id: Joi.string().required(),
    addType: Joi.string().required().valid("banner", "link"),

    // Common fields
    access_type: Joi.string()
      .optional()
      .valid("public", "private")
      .allow("", null),
    activation_date: Joi.date().optional().allow(""),
    availability_date: Joi.date().optional().allow(""),
    expiration_date: Joi.date().optional().allow(""),
    expireCheck: Joi.boolean().optional().allow("", null),
    affiliate_id: Joi.string().optional().allow(""),

    // Banner fields (only allowed if addType = "banner")
    title: Joi.when("addType", {
      is: "banner",
      then: Joi.string().optional().allow("", null),
      otherwise: Joi.forbidden(),
    }),
    seo_attributes: Joi.when("addType", {
      is: "banner",
      then: Joi.string().optional().allow(""),
      otherwise: Joi.forbidden(),
    }),
    destination_url: Joi.when("addType", {
      is: "banner",
      then: Joi.string().optional().allow(""),
      otherwise: Joi.forbidden(),
    }),
    // description: Joi.when("addType", {
    //   is: "banner",
    //   then: Joi.string().optional().allow(""),
    //   otherwise: Joi.forbidden(),
    // }),
    description: Joi.when("addType", {
      is: Joi.valid("banner", "link"),
      then: Joi.string().optional().allow(""),
      otherwise: Joi.forbidden(),
    }),
    image: Joi.when("addType", {
      is: "banner",
      then: Joi.string().optional().allow(""),
      otherwise: Joi.forbidden(),
    }),
    is_animation: Joi.when("addType", {
      is: "banner",
      then: Joi.boolean().optional().allow(""),
      otherwise: Joi.forbidden(),
    }),
    is_deep_linking: Joi.when("addType", {
      is: "banner",
      then: Joi.boolean().optional().allow(""),
      otherwise: Joi.forbidden(),
    }),
    mobile_creative: Joi.when("addType", {
      is: "banner",
      then: Joi.boolean().optional().allow(""),
      otherwise: Joi.forbidden(),
    }),
    category_id: Joi.when("addType", {
      is: "banner",
      then: Joi.array().optional().allow(null),
      otherwise: Joi.forbidden(),
    }),
    subCategory: Joi.when("addType", {
      is: "banner",
      then: Joi.array().optional().allow(null),
      otherwise: Joi.forbidden(),
    }),
    subChildCategory: Joi.when("addType", {
      is: "banner",
      then: Joi.array().optional().allow(null),
      otherwise: Joi.forbidden(),
    }),

    // Link fields (only allowed if addType = "link")
    linkName: Joi.when("addType", {
      is: "link",
      then: Joi.string().optional().lowercase().allow("", null),
      otherwise: Joi.forbidden(),
    }),
    linkDestinationUrl: Joi.when("addType", {
      is: "link",
      then: Joi.string().optional().allow("", null),
      otherwise: Joi.forbidden(),
    }),
    linkDescription: Joi.when("addType", {
      is: "link",
      then: Joi.string().optional().allow("", null),
      otherwise: Joi.forbidden(),
    }),
    linkStartDate: Joi.when("addType", {
      is: "link",
      then: Joi.date().optional().allow("", null),
      otherwise: Joi.forbidden(),
    }),
    linkEndDate: Joi.when("addType", {
      is: "link",
      then: Joi.date().optional().allow("", null),
      otherwise: Joi.forbidden(),
    }),
    linkSeo: Joi.when("addType", {
      is: "link",
      then: Joi.boolean().optional().allow("", null),
      otherwise: Joi.forbidden(),
    }),
    linkDeepLink: Joi.when("addType", {
      is: "link",
      then: Joi.boolean().optional().allow("", null),
      otherwise: Joi.forbidden(),
    }),
    linkCategory: Joi.when("addType", {
      is: "link",
      then: Joi.array().items(Joi.string()).optional().allow("", null),
      otherwise: Joi.forbidden(),
    }),
  });

  return await Validate(schema, req, res);
};

// exports.editBanner = async (req, res, next) => {
//   const schema = Joi.object({
//     id: Joi.string().required(),
//     title: Joi.string().optional(),
//     seo_attributes: Joi.string().optional().allow(""),
//     destination_url: Joi.string().optional().allow(""),
//     description: Joi.string().optional().allow(""),
//     image: Joi.string().optional().allow(""),
//     access_type: Joi.string().optional().valid("public", "private"),
//     affiliate_id: Joi.string().optional().allow(""),
//     activation_date: Joi.date().optional().allow(""),
//     availability_date: Joi.date().optional().allow(""),
//     expiration_date: Joi.date().optional().allow(""),
//     is_animation: Joi.boolean().optional().allow(""),
//     is_deep_linking: Joi.boolean().optional().allow(""),
//     mobile_creative: Joi.boolean().optional().allow(""),
//     category_id: Joi.array().optional().allow(null),
//     subCategory: Joi.array().optional().allow(null),
//     subChildCategory: Joi.array().optional().allow(null),
//     expireCheck: Joi.boolean().optional().allow(""),
//   });
//   return await Validate(schema, req, res);
// };
