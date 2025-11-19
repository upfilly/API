/**
 * EmailTemplateController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const constants = require("../../config/constants").constants;
const db = sails.getDatastore().manager;
const ObjectId = require('mongodb').ObjectId;
const Services = require("../services/index");
const Joi = require("joi");
const Validations = require("../Validations");
const response = require("../services/Response");
const Emails = require("../Emails/index");

// const EmailTemplateAffiliate = require("../models/EmailTemplateAffiliate");
//check emailtemplate
exports.create = async (req, res) => {
  try {
    let validation_result = await Validations.EmailTemplateValidation.addEmailTemplate(
      req,
      res
    );

    if (validation_result && !validation_result.success) {
      throw validation_result.message;
    }

    let data = req.body;

    let isEmailTemplateExists = await EmailTemplate.findOne({ templateName: data.templateName, addedBy: req.identity.id });

    if (isEmailTemplateExists) {
      throw constants.EMAILTEMPLATE.ALREADY_EXISTS;
    }

    if (data.campaign_id) {
      let get_campaign = await Campaign.findOne({ id: data.campaign_id, isDeleted: false });
      if (!get_campaign) {
        throw constants.EMAILTEMPLATE.INVALID_CAMPAIGN_ID;
      }
    }


    query1 = {
      addedBy: req.identity.id,
      status: "accepted",
      isDeleted: false,
    };
    query2 = {
      brand_id: req.identity.id,
      status: "accepted",
      isDeleted: false,
    };

    // console.log(query1);
    // let listOfAcceptedInvites = await AffiliateInvite.find(query1);
    // let listOfBrandInvite = await AffiliateBrandInvite.find(query2);
    // console.log(listOfAcceptedInvites,'listOfAcceptedInvites')
    // console.log(listOfBrandInvite,'listOfBrandInvite')

    let BrandAffiliateAssociations = await BrandAffiliateAssociation.find({
      brand_id: req.identity.id,
      status: "accepted",
      isDeleted: false,
      isActive: true,
      campaign_id: data.campaign_id
    });
    // console.log("brandaffiliateassocation",BrandAffiliateAssociations)
    let listOfAcceptedInvites = BrandAffiliateAssociations;

    function removeDuplicates(array, key) {
      const seen = new Set();
      return array.filter((item) => {
        const keyValue = item[key];
        if (seen.has(keyValue)) {
          return false;
        }
        seen.add(keyValue);
        return true;
      });
    }

    // let combinedList = [...listOfBrandInvite, ...listOfAcceptedInvites];
    // console.log(combinedList);
    // Remove duplicates based on the 'id' key
    // listOfAcceptedInvites = removeDuplicates(combinedList, "affiliate_id");

    req.body.addedBy = req.identity.id;
    req.body.updatedBy = req.identity.id;
    let newTemplate = await EmailTemplate.create(req.body).fetch();

    for (let affiliate of listOfAcceptedInvites) {
      let findUser = await Users.findOne({
        id: affiliate.affiliate_id,
        isDeleted: false,
      });

      if (findUser) {
        const brandId = req.identity.id;
        const affiliateId = findUser.id;

        // const personalizedText = data.textContent
        //   .replace(/{affiliateLink}/g, "")
        //   .replace(/{affiliateName}/g, findUser.fullName)
        //   .replace(/{brandName}/g, req.identity.fullName);
        // Detect if affiliateLink placeholder was in the content
        const hasAffiliateLink = data.textContent.includes("{affiliateLink}");

        const personalizedText = data.textContent
          .replace(/{affiliateLink}/g, "")
          .replace(/{affiliateName}/g, findUser.fullName)
          .replace(/{brandName}/g, req.identity.fullName)
          .replace(/\s{2,}/g, " ")
          .trim();

        const emailPayload = {
          brandFullName: req.identity.fullName,
          affiliateFullName: findUser.fullName,
          affiliateEmail: findUser.email,
          affiliateLink: hasAffiliateLink
            ? `${req.identity.website}?brand_id=${req.identity.id}&affiliate_id=${affiliateId}`
            : "",
          customMessage: personalizedText,
        };

        let emailSentCheck = await EmailSentSetting.findOne({
          name: "email template",
          isDeleted: false,
        });

        if (emailSentCheck.emailSent == true) {
          await Emails.EmailTemplate.sendEmailTemplate(emailPayload);
        } else {
          console.log("emailSent is false in emailTemplate");
        }

        await EmailTemplateAffiliate.create({
          affiliate_id: affiliate.affiliate_id,
          email_template_id: newTemplate.id,
          addedBy: req.identity.id,
          updatedBy: req.identity.id,
        });
      }
    }
    return response.success(newTemplate, constants.EMAILTEMPLATE.CREATED, req, res);

  } catch (err) {
    console.log(err, 'err')
    return response.failed(null, `${err}`, req, res);
  }
};
exports.read = async (req, res) => {
  try {
    if (!req.query.id) {
      throw constants.COMMON.ID_REQUIRED;
    }
    let templates = await EmailTemplate.findOne({ id: req.query.id, isDeleted: false }).populate("campaign_id").populate("addedBy");
    if (!templates) {
      throw constants.EMAILTEMPLATE.TEMPLATE_NOT_FOUND;
    }
    return response.success(templates, constants.EMAILTEMPLATE.FETCHED, req, res);
  } catch (err) {
    return res.serverError(err);
  }
};
exports.update = async (req, res) => {
  try {
    let validation_result = await Validations.EmailTemplateValidation.editEmailTemplate(
      req,
      res
    );

    if (validation_result && !validation_result.success) {
      throw validation_result.message;
    }
    let data = req.body;
    let id = req.body.id;
    // let query = {
    //   templateName: data.templateName,
    //   isDeleted: false,
    //   addedBy: req.identity.id,
    //   id: { "!=": req.body.id },
    // };
    // let isEmailTemplateExists = await EmailTemplate.findOne(query);

    // if (isEmailTemplateExists) {
    //   throw constants.EMAILTEMPLATE.ALREADY_EXISTS;
    // }

    delete data.id;

    data.updatedBy = req.identity.id;

    let templates = await EmailTemplate.updateOne({ id: id }, { isDeleted: true });
    await EmailTemplateAffiliate.update({ email_template_id: id }, { isDeleted: true });
    // return response.success(templates, constants.EMAILTEMPLATE.DELETED, req, res);
    let query1 = {
      addedBy: req.identity.id,
      status: "accepted",
      isDeleted: false,
    };
    let query2 = {
      brand_id: req.identity.id,
      status: "accepted",
      isDeleted: false,
    };

    // console.log(query1);
    let listOfAcceptedInvites = await AffiliateInvite.find(query1);
    let listOfBrandInvite = await AffiliateBrandInvite.find(query2);

    function removeDuplicates(array, key) {
      const seen = new Set();
      return array.filter((item) => {
        const keyValue = item[key];
        if (seen.has(keyValue)) {
          return false;
        }
        seen.add(keyValue);
        return true;
      });
    }

    let combinedList = [...listOfBrandInvite, ...listOfAcceptedInvites];
    // console.log(combinedList);
    // Remove duplicates based on the 'id' key
    listOfAcceptedInvites = removeDuplicates(combinedList, "affiliate_id");

    req.body.addedBy = req.identity.id;
    req.body.updatedBy = req.identity.id;
    if (req.body.campaign_id) {
      let get_campaign = await Campaign.findOne({ id: req.body.campaign_id, isDeleted: false });
      if (!get_campaign) {
        throw constants.EMAILTEMPLATE.INVALID_CAMPAIGN_ID;
      }
    }

    let newTemplate = await EmailTemplate.create(req.body).fetch();
    for (let affiliate of listOfAcceptedInvites) {
      let findUser = await Users.findOne({
        id: affiliate.affiliate_id,
        isDeleted: false,
      });
      let emailPayload = {
        brandFullName: req.identity.fullName,
        affiliateFullName: findUser.fullName,
        affiliateEmail: findUser.email,
      };

      let emailSentCheck = await EmailSentSetting.findOne({
        name: "email template",
        isDeleted: false,
      });

      if (emailSentCheck.emailSent == true) {
        await Emails.EmailTemplate.sendEmailTemplate(emailPayload);
      } else {
        console.log("emailSent setting is false in emailTemplate")
      }

      await EmailTemplateAffiliate.create({
        affiliate_id: affiliate.id,
        email_template_id: newTemplate.id,
        addedBy: req.identity.id,
        updatedBy: req.identity.id
      });
    }
    return response.success(newTemplate, constants.EMAILTEMPLATE.UPDATED, req, res);
  } catch (err) {
    return response.failed(null, `${err}`, req, res);
  }
};
exports.delete = async (req, res) => {
  try {
    if (!req.query.id) {
      throw constants.COMMON.ID_REQUIRED;
    }
    let templates = await EmailTemplate.findOne({ id: req.query.id, isDeleted: false });
    if (!templates) {
      throw constants.EMAILTEMPLATE.TEMPLATE_NOT_FOUND;
    }
    await EmailTemplate.updateOne({ id: req.query.id, isDeleted: false }, { isDeleted: true, updatedBy: req.identity.id });
    return response.success(null, constants.EMAILTEMPLATE.DELETED, req, res);
  } catch (err) {
    console.log(err);
    return response.failed(null, `${err}`, req, res);
  }
};

exports.getAll = async (req, res) => {
  try {
    let query = {};
    let count = req.param('count') || 10;
    let page = req.param('page') || 1;
    let skipNo = (Number(page) - 1) * Number(count);
    let { search, sortBy, status, isDeleted, format, addedBy, startDate, endDate } = req.query;

    if (startDate && endDate) {

      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);

      query.createdAt = { $gte: start, $lte: end };
    }

    if (search) {
      search = await Services.Utils.remove_special_char_exept_underscores(search);
      query.$or = [
        { templateName: { $regex: search, '$options': 'i' } },
        { emailName: { $regex: search, '$options': 'i' } }
      ];
    }

    if (isDeleted) {
      query.isDeleted = isDeleted === 'true';
    } else {
      query.isDeleted = false;
    }

   
    let sortquery = {};
    if (sortBy && typeof sortBy === "string") {
      const [rawField, rawOrder] = sortBy.trim().split(/\s+/);
      const field = rawField || "createdAt";
      const sortType = rawOrder?.toLowerCase() === "asc" ? 1 : -1;
      sortquery[field] = sortType;
    } else {
      sortquery = { updatedAt: -1 };
    }

    if (status) {
      query.status = status;
    }
    if (addedBy) {
      query.addedBy = new ObjectId(addedBy);
    }

    if (format) {
      query.format = format;
    }

    let pipeline = [];

    let projection = {
      $project: {
        templateName: {$toLower: "$templateName"},
        emailName: "$emailName",
        purpose: "$purpose",
        audience: "$audience",
        country: "$country",
        language: "$language",
        format: "$format",
        subject: "$subject",
        from: "$from",
        htmlContent: "$htmlContent",
        textContent: "$textContent",
        imagesAndLinks: "$imagesAndLinks",
        personalizationTags: "$personalizationTags",
        isDeleted: "$isDeleted",
        status: "$status",
        addedBy: "$addedBy",
        updatedBy: "$updatedBy",
        updatedAt: "$updatedAt",
        createdAt: "$createdAt",
        campaign_id: {
          $cond: {
            if: { $gt: [{ $size: "$associatedCampaign" }, 0] },
            then: "$campaign_id",
            else: null,
          },
        },
        campaign_details: {
          $cond: {
            if: { $gt: [{ $size: "$associatedCampaign" }, 0] },
            then: "$campaign_details",
            else: null,
          },
        },
      },
    };
    pipeline.push({
      $lookup: {
        from: "campaign",
        localField: "campaign_id",
        foreignField: "_id",
        as: "campaign_details",
      },
    });
    pipeline.push({
      $unwind: {
        path: "$campaign_details",
        preserveNullAndEmptyArrays: true,
      },
    });

    pipeline.push({
      $lookup: {
        from: "brandaffiliateassociation",
        let: {
          campaignId: "$campaign_id",
          brandId: new ObjectId(req.identity.id),
          isDeleted: false,
          status: "accepted",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$campaign_id", "$$campaignId"] },
                  { $eq: ["$brand_id", "$$brandId"] },
                  { $eq: ["$isDeleted", "$$isDeleted"] },
                  { $eq: ["$status", "$$status"] },
                ],
              },
            },
          },
        ],
        as: "associatedCampaign",
      },
    });

    pipeline.push(projection);
    pipeline.push({
      $match: query,
    });
    pipeline.push({
      $sort: sortquery,
    });

    let totalresult = await db
      .collection("emailtemplate")
      .aggregate(pipeline)
      .toArray();

    pipeline.push({
      $skip: Number(skipNo),
    });
    pipeline.push({
      $limit: Number(count),
    });

    let result = await db
      .collection("emailtemplate")
      .aggregate(pipeline)
      .toArray();


    let resData = {
      total_count: totalresult ? totalresult.length : 0,
      data: result ? result : []
    };

    if (!req.param('page') && !req.param('count')) {
      resData.data = totalresult ? totalresult : [];
    }

    return response.success(resData, constants.EMAILTEMPLATE.FETCHED, req, res);

  } catch (error) {
    console.log(error, "error in emailTemplate controller")
    return response.failed(null, `${error}`, req, res);
  }
}




// exports.getUserEmailTemplate = async (req, res) => {
//   try {
//     let query = {};
//     let count = req.param('count') || 10;
//     let page = req.param('page') || 1;
//     let skipNo = (Number(page) - 1) * Number(count);
//     let { search, sortBy, status, isDeleted, affiliate_id, addedBy } = req.query;
//     let sortquery = {};

//     if (search) {
//       search = await Services.Utils.remove_special_char_exept_underscores(search);
//       query.$or = [
//         { templateName: { $regex: search, '$options': 'i' } },
//         { emailName: { $regex: search, '$options': 'i' } }
//       ];
//     }

//     if (isDeleted) {
//       query.isDeleted = isDeleted === 'true';
//     } else {
//       query.isDeleted = false;
//     }

//     if (sortBy) {
//       let typeArr = sortBy.split(" ");
//       let sortType = typeArr[1];
//       let field = typeArr[0];
//       sortquery[field ? field : 'createdAt'] = sortType === 'desc' ? -1 : 1;
//     } else {
//       sortquery = { createdAt: -1 };
//     }

//     if (status) {
//       query.status = status;
//     }
//     if (addedBy) {
//       query.addedBy = new ObjectId(addedBy);
//     }

//     if (affiliate_id) {
//       query.affiliate_id = new ObjectId(affiliate_id);
//     }

//     let pipeline = [
//       {
//         $lookup: {
//           from: "emailtemplate",
//           localField: "email_template_id",
//           foreignField: "_id",
//           as: "emailtemplate_details"
//         }
//       },
//       {
//         $unwind: {
//           path: '$emailtemplate_details',
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "addedBy",
//           foreignField: "_id",
//           as: "brand_details"
//         }
//       },
//       {
//         $unwind: {
//           path: '$brand_details',
//           preserveNullAndEmptyArrays: true
//         }
//       },
//     ];

//     let projection = {
//       $project: {
//         emailtemplate_details: "$emailtemplate_details",
//         brand_details: "$brand_details",
//         affiliate_id: "$affiliate_id",
//         isDeleted: '$isDeleted',
//         textJSONContent: "$textJSONContent",
//         status: '$status',
//         addedBy: '$addedBy',
//         updatedBy: '$updatedBy',
//         updatedAt: '$updatedAt',
//         createdAt: '$createdAt'
//       }
//     };

//     pipeline.push(projection);
//     pipeline.push({
//       $match: query
//     });
//     pipeline.push({
//       $sort: sortquery
//     });

//     let totalresult = await db.collection('emailtemplateaffiliate').aggregate(pipeline).toArray();


//     pipeline.push({
//       $skip: Number(skipNo)
//     });
//     pipeline.push({
//       $limit: Number(count)
//     });

//     let result = await db.collection('emailtemplateaffiliate').aggregate(pipeline).toArray();


//     let resData = {
//       total_count: totalresult ? totalresult.length : 0,
//       data: result ? result : []
//     };

//     if (!req.param('page') && !req.param('count')) {
//       resData.data = totalresult ? totalresult : [];
//     }

//     return response.success(resData, constants.EMAILTEMPLATE.FETCHED, req, res);

//   } catch (error) {
//     return response.failed(null, `${error}`, req, res);
//   }
// }


// alpha

exports.getUserEmailTemplate = async (req, res) => {
  try {
    let query = {};
    let count = parseInt(req.param("count")) || 10;
    let page = parseInt(req.param("page")) || 1;
    let skipNo = (page - 1) * count;

    const {
      search,
      sortBy,
      status,
      isDeleted,
      affiliate_id,
      addedBy,
      startDate,
      endDate,
    } = req.query;


    if (search) {
      const cleanSearch = await Services.Utils.remove_special_char_exept_underscores(search);
      query.$or = [
        { templateName: { $regex: cleanSearch, $options: "i" } },
        { emailName: { $regex: cleanSearch, $options: "i" } },
      ];
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);

      query.createdAt = { $gte: start, $lte: end };
    }

    if (status) query.status = status;
    if (addedBy) query.addedBy = new ObjectId(addedBy);
    if (affiliate_id) query.affiliate_id = new ObjectId(affiliate_id);
    query.isDeleted = isDeleted === "true";


    let sortquery = {};
    if (sortBy && typeof sortBy === "string") {
      const [rawField, rawOrder] = sortBy.trim().split(/\s+/);
      const field = rawField || "createdAt";
      const sortType = rawOrder?.toLowerCase() === "asc" ? 1 : -1;
      sortquery[field] = sortType;
    } else {
      sortquery = { updatedAt: -1 };
    }
    

    const pipeline = [
      {
        $lookup: {
          from: "emailtemplate",
          localField: "email_template_id",
          foreignField: "_id",
          as: "emailtemplate_details",
        },
      },
      { $unwind: { path: "$emailtemplate_details", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "users",
          localField: "addedBy",
          foreignField: "_id",
          as: "brand_details",
        },
      },
      { $unwind: { path: "$brand_details", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "brandaffiliateassociation",
          let: { affiliateId: "$affiliate_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$affiliate_id", "$$affiliateId"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$status", "accepted"] },
                    { $ne: ["$campaign_id", null] }
                  ],
                },
              },
            },
          ],
          as: "affiliate_campaign_links",
        },
      },

      {
        $lookup: {
          from: "campaign",
          let: {
            campaignId: {
              $cond: {
                if: {
                  $and: [
                    { $gt: [{ $size: "$affiliate_campaign_links" }, 0] },
                    {
                      $eq: [
                        { $type: { $arrayElemAt: ["$affiliate_campaign_links.campaign_id", 0] } },
                        "string",
                      ],
                    },
                  ],
                },
                then: {
                  $toObjectId: { $arrayElemAt: ["$affiliate_campaign_links.campaign_id", 0] },
                },
                else: "$$REMOVE",
              },
            },
          },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$campaignId"] },
              },
            },
          ],
          as: "campaign_details",
        },
      },

      {
        $project: {
          emailtemplate_details: 1,
          brand_details: 1,
          affiliate_id: 1,
          isDeleted: 1,
          status: 1,
          addedBy: 1,
          updatedBy: 1,
          updatedAt: 1,
          createdAt: 1,
          campaign_id: {
            $cond: {
              if: { $gt: [{ $size: "$affiliate_campaign_links" }, 0] },
              then: { $arrayElemAt: ["$affiliate_campaign_links.campaign_id", 0] },
              else: null,
            },
          },
          campaign_details: {
            $cond: {
              if: { $gt: [{ $size: "$campaign_details" }, 0] },
              then: { $arrayElemAt: ["$campaign_details", 0] },
              else: null,
            },
          },
          campaign_status_shown: {
            $cond: {
              if: { $gt: [{ $size: "$affiliate_campaign_links" }, 0] },
              then: true,
              else: false,
            },
          },
          templateName: {$toLower : "$emailtemplate_details.templateName"},
        },
      },

      { $match: query },
      { $sort: sortquery },
    ];

    const totalResult = await db
      .collection("emailtemplateaffiliate")
      .aggregate([...pipeline])
      .toArray();

    pipeline.push({ $skip: skipNo });
    pipeline.push({ $limit: count });

    const result = await db
      .collection("emailtemplateaffiliate")
      .aggregate(pipeline)
      .toArray();

    const resData = {
      total_count: totalResult.length || 0,
      data: result || [],
    };

    if (!req.param("page") && !req.param("count")) {
      resData.data = totalResult || [];
    }

    return response.success(resData, constants.EMAILTEMPLATE.FETCHED, req, res);
  } catch (error) {
    console.log("Error in getUserEmailTemplate:", error);
    return response.failed(null, `${error}`, req, res);
  }
};









// exports.getUserEmailTemplate = async (req, res) => {
//   console.log("alpha")
//   try {
//     let query = {};
//     let count = parseInt(req.param('count')) || 10;
//     let page = parseInt(req.param('page')) || 1;
//     let skipNo = (page - 1) * count;
//     let { search, sortBy, status, isDeleted, affiliate_id, addedBy } = req.query;
//     let sortquery = {};

//     if (search) {
//       search = await Services.Utils.remove_special_char_exept_underscores(search);
//       query.$or = [
//         { templateName: { $regex: search, $options: 'i' } },
//         { emailName: { $regex: search, $options: 'i' } }
//       ];
//     }

//     query.isDeleted = isDeleted === 'true' ? true : false;

//     if (sortBy) {
//       let typeArr = sortBy.split(" ");
//       let sortType = typeArr[1];
//       let field = typeArr[0];
//       sortquery[field || 'createdAt'] = sortType === 'desc' ? -1 : 1;
//     } else {
//       sortquery = { createdAt: -1 };
//     }

//     if (status) query.status = status;
//     if (addedBy) query.addedBy = new ObjectId(addedBy);
//     if (affiliate_id) query.affiliate_id = new ObjectId(affiliate_id);

//     let pipeline = [
//       {
//         $lookup: {
//           from: "emailtemplate",
//           localField: "email_template_id",
//           foreignField: "_id",
//           as: "emailtemplate_details"
//         }
//       },
//       {
//         $unwind: {
//           path: "$emailtemplate_details",
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "addedBy",
//           foreignField: "_id",
//           as: "brand_details"
//         }
//       },
//       {
//         $unwind: {
//           path: "$brand_details",
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       {
//         $lookup: {
//           from: "campaigns",
//           localField: "affiliate_id",
//           foreignField: "affiliate_id", 
//           as: "campaign_details"
//         }
//       },
//       {
//         $unwind: {
//           path: "$campaign_details",
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       {
//         $project: {
//           emailtemplate_details: "$emailtemplate_details",
//           brand_details: "$brand_details",
//           campaign_details: "$campaign_details", 
//           affiliate_id: "$affiliate_id",
//           isDeleted: "$isDeleted",
//           textJSONContent: "$textJSONContent",
//           status: "$status",
//           addedBy: "$addedBy",
//           updatedBy: "$updatedBy",
//           updatedAt: "$updatedAt",
//           createdAt: "$createdAt"
//         }
//       },
//       {
//         $match: query
//       },
//       {
//         $sort: sortquery
//       }
//     ];

//     let totalresult = await db.collection('emailtemplateaffiliate').aggregate([...pipeline]).toArray();

//     pipeline.push({ $skip: skipNo });
//     pipeline.push({ $limit: count });

//     let result = await db.collection('emailtemplateaffiliate').aggregate(pipeline).toArray();

//     let resData = {
//       total_count: totalresult ? totalresult.length : 0,
//       data: result || []
//     };

//     if (!req.param('page') && !req.param('count')) {
//       resData.data = totalresult || [];
//     }

//     return response.success(resData, constants.EMAILTEMPLATE.FETCHED, req, res);

//   } catch (error) {
//     return response.failed(null, `${error}`, req, res);
//   }
// };

exports.affiliateCount = async (req, res) => {
  try {
    const brandId = req.identity.id;
    const { before, after } = req.query;

    // Helper for date filters
    const withDateFilter = (baseQuery, dateField = "createdAt") => {
      const query = { ...baseQuery };
      if (before && after) {
        query[dateField] = { ">=": new Date(after), "<=": new Date(before) };
      } else if (before) {
        query[dateField] = { "<=": new Date(before) };
      } else if (after) {
        query[dateField] = { ">=": new Date(after) };
      }
      return query;
    };

    // Total campaigns (all brands)
    const get_total_campaigns = await Campaign.count(
      withDateFilter({ isDeleted: false })
    );

    let get_my_total_campaigns = 0;
    let associated_affiliates_count = 0;
    let affiliates_active_count = 0;
    let affiliates_pending_count = 0; //  new field

    if (brandId) {
      // Campaigns of this brand
      get_my_total_campaigns = await Campaign.count(
        withDateFilter({ isDeleted: false, brand_id: brandId, isArchive: false })
      );

      // Accepted affiliates for this brand
      const records = await BrandAffiliateAssociation.find(
        withDateFilter({
          status: "accepted",
          isDeleted: false,
          brand_id: brandId,
        })
      );

      const uniqueAffiliates = _.uniq(records.map((r) => r.affiliate_id));

      // Pending affiliates (brand needs to accept/decline)
      // const pendingRecords = await BrandAffiliateAssociation.find(
      //   withDateFilter({
      //     status: "pending",
      //     isDeleted: false,
      //     brand_id: brandId,
      //   })
      // );
      

      //this is old code 
      // affiliates_pending_count = pendingRecords.length;
      // console.log("affiliates_pending_coun",affiliates_pending_count)

      //  uniqueAffiliatesPending = _.uniq(pendingRecords.map((r) => r.affiliate_id));
      //  affiliates_pending_count = uniqueAffiliatesPending.length

        const get_total_pending_campaign =  await CampaignRequestByAffiliate.find(
      withDateFilter({
        status:"pending",
        isDeleted: false,
        brand_id : brandId
       })
    );

       affiliates_pending_count = get_total_pending_campaign.length

      // console.log("affiliates_pending_coun1",affiliates_pending_count)

      // Find affiliates who interacted (cookies + links)
      const cookies = await Cookies.find(withDateFilter({ brand_id: brandId }));
      const affiliateLinks = await AffiliateLink.find(
        withDateFilter({ brand_id: brandId })
      );

      const affiliateIds = [
        ...new Set(
          [
            ...cookies.map((c) => c.affiliate_id),
            ...affiliateLinks.map((a) => a.affiliate_id),
          ].filter((id) => id != null)
        ),
      ];

      // Get active affiliates from Users
      const activeAffiliates = await Users.find({
        id: affiliateIds,
        status: "active",
      }).select(["id"]);

      const activeAffiliateIds = activeAffiliates.map((a) => a.id);

      // Joined affiliates = accepted affiliates excluding actives
      const joinedAffiliates = uniqueAffiliates.filter(
        (id) => !activeAffiliateIds.includes(id)
      ); 
      

      associated_affiliates_count = joinedAffiliates.length;
      affiliates_active_count = activeAffiliateIds.length;
    }

    // Final response
    return res.status(200).json({
      success: true,
      totalCampaigns: get_total_campaigns || 0,
      myTotalCampaigns: get_my_total_campaigns || 0,
      totalJoined: associated_affiliates_count || 0,
      totalActive: affiliates_active_count || 0,
      totalPending: affiliates_pending_count || 0, // added here
    });
  } catch (error) {
    console.log("error", error);
    return response.failed(null, `${error}`, req, res);
  }
};

// exports.affiliateCount = async (req, res) => {
//   try {
//     const brandId = req.identity.id;
//     const { before, after } = req.query;

//     // Helper for date filters
//     const withDateFilter = (baseQuery, dateField = "createdAt") => {
//       const query = { ...baseQuery };
//       if (before && after) {
//         query[dateField] = { ">=": new Date(after), "<=": new Date(before) };
//       } else if (before) {
//         query[dateField] = { "<=": new Date(before) };
//       } else if (after) {
//         query[dateField] = { ">=": new Date(after) };
//       }
//       return query;
//     };

//     // Total campaigns (all brands)
//     const get_total_campaigns = await Campaign.count(
//       withDateFilter({ isDeleted: false })
//     );

//     let get_my_total_campaigns = 0;
//     let associated_affiliates_count = 0;
//     let affiliates_active_count = 0;

//     if (brandId) {
//       // Campaigns of this brand
//       get_my_total_campaigns = await Campaign.count(
//         withDateFilter({ isDeleted: false, brand_id: brandId, isArchive: false })
//       );

//       // Accepted affiliates for this brand
//       const records = await BrandAffiliateAssociation.find(
//         withDateFilter({
//           status: "accepted",
//           isDeleted: false,
//           brand_id: brandId,
//         })
//       );

//       const uniqueAffiliates = _.uniq(records.map((r) => r.affiliate_id));

//       // Find affiliates who interacted (cookies + links)
//       const cookies = await Cookies.find(withDateFilter({ brand_id: brandId }));
//       const affiliateLinks = await AffiliateLink.find(
//         withDateFilter({ brand_id: brandId })
//       );

//       const affiliateIds = [
//         ...new Set(
//           [
//             ...cookies.map((c) => c.affiliate_id),
//             ...affiliateLinks.map((a) => a.affiliate_id),
//           ].filter((id) => id != null)
//         ),
//       ];

//       // Get active affiliates from Users
//       const activeAffiliates = await Users.find({
//         id: affiliateIds,
//         status: "active",
//       }).select(["id"]);

//       const activeAffiliateIds = activeAffiliates.map((a) => a.id);

//       // ✅ Joined affiliates = accepted affiliates excluding actives
//       const joinedAffiliates = uniqueAffiliates.filter(
//         (id) => !activeAffiliateIds.includes(id)
//       );

//       associated_affiliates_count = joinedAffiliates.length;
//       affiliates_active_count = activeAffiliateIds.length;
//     }

//     // Final response
//     return res.status(200).json({
//       success: true,
//       totalCampaigns: get_total_campaigns || 0,
//       myTotalCampaigns: get_my_total_campaigns || 0,
//       totalJoined: associated_affiliates_count || 0,
//       totalActive: affiliates_active_count || 0,
//     });
//   } catch (error) {
//     console.log("error", error);
//     return response.failed(null, `${error}`, req, res);
//   }
// };

