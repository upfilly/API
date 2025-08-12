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
      isActive: true
    });
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
      // console.log(affiliate);
      let findUser = await Users.findOne({
        id: affiliate.affiliate_id,
        isDeleted: false,
      });

      if (findUser) {
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
        }else{
          console.log("emailSent is false in emailTemplate")
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
    let templates = await EmailTemplate.findOne({ id: req.query.id, isDeleted: false });
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
        }else{
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
    let sortquery = {};

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

    if (sortBy) {
      let typeArr = sortBy.split(" ");
      let sortType = typeArr[1];
      let field = typeArr[0];
      sortquery[field ? field : 'createdAt'] = sortType === 'desc' ? -1 : 1;
    } else {
      sortquery = { createdAt: -1 };
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
        templateName: '$templateName',
        emailName: '$emailName',
        purpose: '$purpose',
        audience: '$audience',
        country: '$country',
        language: '$language',
        format: '$format',
        subject: '$subject',
        from: '$from',
        htmlContent: '$htmlContent',
        textContent: '$textContent',
        imagesAndLinks: '$imagesAndLinks',
        personalizationTags: '$personalizationTags',
        isDeleted: '$isDeleted',
        status: '$status',
        addedBy: '$addedBy',
        updatedBy: '$updatedBy',
        updatedAt: '$updatedAt',
        createdAt: '$createdAt'
      }
    };

    pipeline.push(projection);
    pipeline.push({
      $match: query
    });
    pipeline.push({
      $sort: sortquery
    });

    let totalresult = await db.collection('emailtemplate').aggregate(pipeline).toArray();


    pipeline.push({
      $skip: Number(skipNo)
    });
    pipeline.push({
      $limit: Number(count)
    });

    let result = await db.collection('emailtemplate').aggregate(pipeline).toArray();


    let resData = {
      total_count: totalresult ? totalresult.length : 0,
      data: result ? result : []
    };

    if (!req.param('page') && !req.param('count')) {
      resData.data = totalresult ? totalresult : [];
    }

    return response.success(resData, constants.EMAILTEMPLATE.FETCHED, req, res);

  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
}

exports.getUserEmailTemplate = async (req, res) => {
  try {
    let query = {};
    let count = req.param('count') || 10;
    let page = req.param('page') || 1;
    let skipNo = (Number(page) - 1) * Number(count);
    let { search, sortBy, status, isDeleted, affiliate_id, addedBy } = req.query;
    let sortquery = {};

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

    if (sortBy) {
      let typeArr = sortBy.split(" ");
      let sortType = typeArr[1];
      let field = typeArr[0];
      sortquery[field ? field : 'createdAt'] = sortType === 'desc' ? -1 : 1;
    } else {
      sortquery = { createdAt: -1 };
    }

    if (status) {
      query.status = status;
    }
    if (addedBy) {
      query.addedBy = new ObjectId(addedBy);
    }

    if (affiliate_id) {
      query.affiliate_id = new ObjectId(affiliate_id);
    }

    let pipeline = [
      {
        $lookup: {
          from: "emailtemplate",
          localField: "email_template_id",
          foreignField: "_id",
          as: "emailtemplate_details"
        }
      },
      {
        $unwind: {
          path: '$emailtemplate_details',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "addedBy",
          foreignField: "_id",
          as: "brand_details"
        }
      },
      {
        $unwind: {
          path: '$brand_details',
          preserveNullAndEmptyArrays: true
        }
      },
    ];

    let projection = {
      $project: {
        emailtemplate_details: "$emailtemplate_details",
        brand_details: "$brand_details",
        affiliate_id: "$affiliate_id",
        isDeleted: '$isDeleted',
        textJSONContent: "$textJSONContent",
        status: '$status',
        addedBy: '$addedBy',
        updatedBy: '$updatedBy',
        updatedAt: '$updatedAt',
        createdAt: '$createdAt'
      }
    };

    pipeline.push(projection);
    pipeline.push({
      $match: query
    });
    pipeline.push({
      $sort: sortquery
    });

    let totalresult = await db.collection('emailtemplateaffiliate').aggregate(pipeline).toArray();


    pipeline.push({
      $skip: Number(skipNo)
    });
    pipeline.push({
      $limit: Number(count)
    });

    let result = await db.collection('emailtemplateaffiliate').aggregate(pipeline).toArray();


    let resData = {
      total_count: totalresult ? totalresult.length : 0,
      data: result ? result : []
    };

    if (!req.param('page') && !req.param('count')) {
      resData.data = totalresult ? totalresult : [];
    }

    return response.success(resData, constants.EMAILTEMPLATE.FETCHED, req, res);

  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
}
exports.affiliateCount = async (req, res) => {
  // console.log("alpha")
  // try {
  //   const brandId = req.identity.id;

  //   // Count accepted associations
  //   const totalJoined = await BrandAffiliateAssociation.count({
  //     brand_id: brandId,
  //     status: "accepted",
  //   });

  //   // Get only needed associations with affiliate populated
  //   // const acceptedAffiliates = await BrandAffiliateAssociation.find({
  //   //   brand_id: brandId,
  //   //   status: "accepted",
  //   //   isActive: true,
  //   //   isDeleted: false,
  //   // }).populate("affiliate_id");

  //   // // Count active affiliates
  //   // const totalActive = acceptedAffiliates.filter(
  //   //   item => item.affiliate_id && item.affiliate_id.status === "active"
  //   // ).length;

  //   /**
  //         * @active affiliates
  //         */
  //   let totalActive = await db
  //     .collection("brandaffiliateassociation")
  //     .aggregate([
  //       {
  //         $match: {
  //           status: "accepted",
  //           isDeleted: false,
  //           brand_id: new ObjectId(req.param("brand_id")),
  //           source: "campaign"
  //         }
  //       },
  //       {
  //         $group: {
  //           _id: "$affiliate_id", // group by affiliate_id
  //           doc: { $first: "$$ROOT" }
  //         }
  //       },
  //       {
  //         $replaceRoot: { newRoot: "$doc" }
  //       },
  //       {
  //         $lookup: {
  //           from: "users", // make sure this is the correct collection name
  //           localField: "affiliate_id",
  //           foreignField: "_id",
  //           as: "affiliateDetails"
  //         }
  //       },
  //       {
  //         $unwind: "$affiliateDetails"
  //       },
  //       {
  //         $match: {
  //           "affiliateDetails.status": "active"
  //         }
  //       }
  //     ])
  //     .toArray(); 
  //  console.log(brandId, 'brandId`')
  //     totalActive = totalActive.length
  //   // const affiliates_active_count = activeAffiliates.length

  //   return response.success({
  //     totalJoined,
  //     totalActive,
  //   }, "Affiliate count fetched successfully", req, res);

  // }
  //  catch (error) {
  //   console.error(error,'====')
  //   return response.failed(null, `${error}`, req, res);












//old code not show 
  // try {
  //   const brandId = req.identity.id;
  //   const { before, after } = req.query;

  //   // Build the date filter if any
  //   // const dateFilter = {};
  //   // if (before) dateFilter["$lte"] = new Date(before);
  //   // if (after) dateFilter["$gte"] = new Date(after);

  //   // // Helper function to conditionally attach date filter
  //   // const withDate = (baseQuery, dateField = "createdAt") => {
  //   //   if (Object.keys(dateFilter).length > 0) {
  //   //     baseQuery[dateField] = dateFilter;
  //   //   }
  //   //   return baseQuery;
  //   // };

  //   const dateFilter = {};
  //   if (before) dateFilter["<="] = new Date(before);
  //   if (after) dateFilter[">="] = new Date(after);

  //   const withDate = (baseQuery, dateField = "createdAt") => {
  //     if (Object.keys(dateFilter).length > 0) {
  //       baseQuery[dateField] = dateFilter;
  //     }
  //     return baseQuery;
  //   };

  //   // Apply date filter to Campaign count
  //   const get_total_campaigns = await Campaign.count(
  //     withDate({ isDeleted: false })
  //   );

  //   let get_my_total_campaigns = 0;
  //   let associated_affiliates_count = 0;
  //   let affiliates_active_count = 0;

  //   if (brandId) {
  //     // My total campaigns (with date filter)
  //     get_my_total_campaigns = await Campaign.count(
  //       withDate({ isDeleted: false, brand_id: brandId, isArchive: false })
  //     );

  //     // Associated affiliates (invited)
  //     associated_affiliates_count = await BrandAffiliateAssociation.count(
  //       withDate({
  //         status: "accepted",
  //         isDeleted: false,
  //         brand_id: brandId,
  //         // source: "invite"
  //       })
  //     );

  //     // Active affiliates (via campaign)
  //     // const activeAffiliates = await db
  //     //   .collection("brandaffiliateassociation")
  //     //   .aggregate([
  //     //     {
  //     //       $match: withDate({
  //     //         status: "accepted",
  //     //         isDeleted: false,
  //     //         brand_id: new ObjectId(brandId),
  //     //         source: "campaign"
  //     //       })
  //     //     },
  //     //     {
  //     //       $group: {
  //     //         _id: "$affiliate_id",
  //     //         doc: { $first: "$$ROOT" }
  //     //       }
  //     //     },
  //     //     { $replaceRoot: { newRoot: "$doc" } },
  //     //     {
  //     //       $lookup: {
  //     //         from: "users",
  //     //         localField: "affiliate_id",
  //     //         foreignField: "_id",
  //     //         as: "affiliateDetails"
  //     //       }
  //     //     },
  //     //     { $unwind: "$affiliateDetails" },
  //     //     {
  //     //       $match: {
  //     //         "affiliateDetails.status": "active"
  //     //       }
  //     //     }
  //     //   ])
  //     //   .toArray();
  //     // const affiliateIds = await Cookies.find({ brandId: new ObjectId(brandId) });
  //     // const affiliates_active_count = affiliateIds.length;

  //     affiliates_active_count = await Cookies.find({ brand_id: brandId });
  //     let affiliatLinkCount = await AffiliateLink.find({ brand_id: brandId });
  //     if (affiliatLinkCount.length > 0) {
  //       affiliates_active_count = [
  //         ...affiliates_active_count,
  //         ...affiliatLinkCount,
  //       ];
  //     }
  //     affiliates_active_count = [
  //       ...new Set(
  //         affiliates_active_count
  //           .map((cookie) => cookie.affiliate_id)
  //           .filter((id) => id != null)
  //       ),
  //     ];
  //   }

  //   return res.status(200).json({
  //     sucess: true,
  //     totalCampaigns: get_total_campaigns || 0,
  //     myTotalCampaigns: get_my_total_campaigns || 0,
  //     totalJoined: associated_affiliates_count || 0,
  //     totalActive: affiliates_active_count.length || 0,
  //   });
  // } catch (error) {
  //   console.log("erro",error)
  //   return response.failed(null, `${error}`, req, res);
  // }
  try {
  const brandId = req.identity.id;
  const { before, after } = req.query;

  const withDateFilter = (baseQuery, dateField = 'createdAt') => {
    const query = { ...baseQuery };
    if (before && after) {
      query[dateField] = { '>=': new Date(after), '<=': new Date(before) };
    } else if (before) {
      query[dateField] = { '<=': new Date(before) };
    } else if (after) {
      query[dateField] = { '>=': new Date(after) };
    }
    return query;
  };

  const get_total_campaigns = await Campaign.count(
    withDateFilter({ isDeleted: false })
  );

  let get_my_total_campaigns = 0;
  let associated_affiliates_count = 0;
  let affiliates_active_count = 0;

  if (brandId) {
    get_my_total_campaigns = await Campaign.count(
      withDateFilter({ isDeleted: false, brand_id: brandId, isArchive: false })
    );

    associated_affiliates_count = await BrandAffiliateAssociation.count(
      withDateFilter({
        status: "accepted",
        isDeleted: false,
        brand_id: brandId,
        // source: "invite"
      })
    );

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

    affiliates_active_count = await Users.count({
      id: affiliateIds,
      status: "active",
    });
  }

  return res.status(200).json({
    success: true,
    totalCampaigns: get_total_campaigns || 0,
    myTotalCampaigns: get_my_total_campaigns || 0,
    totalJoined: associated_affiliates_count || 0,
    totalActive: affiliates_active_count || 0,
  });
} catch (error) {
  console.log("error", error);
  return response.failed(null, `${error}`, req, res);
}

};
