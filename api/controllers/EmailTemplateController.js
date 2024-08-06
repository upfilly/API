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
      // console.log(affiliate);
      let findUser = await Users.findOne({
        id: affiliate.affiliate_id,
        isDeleted: false,
      });
      let emailPayload = {
        brandFullName: req.identity.fullName,
        affiliateFullName: findUser.fullName,
        affiliateEmail: findUser.email,
      };

      await Emails.EmailTemplate.sendEmailTemplate(emailPayload);

      await EmailTemplateAffiliate.create({
        affiliate_id: affiliate.affiliate_id,
        email_template_id: newTemplate.id,
        addedBy: req.identity.id,
        updatedBy: req.identity.id,
      });
    }
    return response.success(newTemplate, constants.EMAILTEMPLATE.CREATED, req, res);
  } catch (err) {
    console.log(err);
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

    let templates = await EmailTemplate.updateOne({ id: id }, {isDeleted:true});
    await EmailTemplateAffiliate.update({email_template_id:id},{isDeleted:true});
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

      await Emails.EmailTemplate.sendEmailTemplate(emailPayload);

      await EmailTemplateAffiliate.create({
        affiliate_id: affiliate.id,
        email_template_id: newTemplate.id,
        addedBy: req.identity.id,
        updatedBy: req.identity.id
      });
    }
    return response.success(newTemplate, constants.EMAILTEMPLATE.UPDATED, req, res);
  } catch (err) {
    console.log(err);
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
    let { search, sortBy, status, isDeleted, format, addedBy } = req.query;
    let sortquery = {};

    if (search) {
      search = await Services.Utils.remove_special_char_except_underscores(search);
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

   let totalresult = await  db.collection('emailtemplate').aggregate(pipeline).toArray();
      if (err) {
        return response.failed(null, `${err}`, req, res);
      }

      pipeline.push({
        $skip: Number(skipNo)
      });
      pipeline.push({
        $limit: Number(count)
      });

      let result = await db.collection('emailtemplate').aggregate(pipeline).toArray();
        if (err) {
          return response.failed(null, `${err}`, req, res);
        }

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
      search = await Services.Utils.remove_special_char_except_underscores(search);
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
        brand_details:"$brand_details",
        affiliate_id:"$affiliate_id",
        isDeleted: '$isDeleted',
        textJSONContent:"$textJSONContent",
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

    db.collection('emailtemplateaffiliate').aggregate(pipeline).toArray((err, totalresult) => {
      if (err) {
        return response.failed(null, `${err}`, req, res);
      }

      pipeline.push({
        $skip: Number(skipNo)
      });
      pipeline.push({
        $limit: Number(count)
      });

      db.collection('emailtemplateaffiliate').aggregate(pipeline).toArray((err, result) => {
        if (err) {
          return response.failed(null, `${err}`, req, res);
        }

        let resData = {
          total_count: totalresult ? totalresult.length : 0,
          data: result ? result : []
        };

        if (!req.param('page') && !req.param('count')) {
          resData.data = totalresult ? totalresult : [];
        }

        return response.success(resData, constants.EMAILTEMPLATE.FETCHED, req, res);
      });
    });
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
}