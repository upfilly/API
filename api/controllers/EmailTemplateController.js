/**
 * EmailTemplateController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const constants = require("../../config/constants").constants;
const db = sails.getDatastore().manager;
const ObjectId = require("mongodb").ObjectId;
const Services = require("../services/index");
const Joi = require("joi");
const Validations = require("../Validations");
const response = require("../services/Response");
const Emails = require("../Emails/index");

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
    
    let isEmailTemplateExists = await EmailTemplate.findOne({templateName:data.templateName,addedBy:req.identity.id});
    
    if(isEmailTemplateExists){
      throw constants.EMAILTEMPLATE.ALREADY_EXISTS;
    }
    req.body.addedBy = req.identity.id;
    req.body.updatedBy = req.identity.id;
    let newTemplate = await EmailTemplate.create(req.body).fetch();
    return response.success(newTemplate,constants.EMAILTEMPLATE.CREATED , req, res);
  } catch (err) {
    console.log(err);
    return response.failed(null,`${err}` , req, res);
  }
};
exports.read = async (req, res) => {
  try {
    if(!req.query.id){
      throw constants.COMMON.ID_REQUIRED;
    }
    let templates = await EmailTemplate.findOne({id:req.query.id,isDeleted:false});
    if(!templates){
      throw constants.EMAILTEMPLATE.TEMPLATE_NOT_FOUND;
    }
    return response.success(templates,constants.EMAILTEMPLATE.FETCHED , req, res);
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
    let query = {
      templateName: data.templateName,
      isDeleted: false,
      addedBy:req.identity.id,
      id: { "!=": req.body.id },
    };
    let isEmailTemplateExists = await EmailTemplate.findOne(query);
    
    if(isEmailTemplateExists){
      throw constants.EMAILTEMPLATE.ALREADY_EXISTS;
    }

    delete data.id;
    
    data.updatedBy = req.identity.id;
    
    let templates =  await EmailTemplate.updateOne({id:id},data);

    return response.success(templates,constants.EMAILTEMPLATE.DELETED, req, res);
  } catch (err) {
    console.log(err);
    return response.failed(null,`${err}` , req, res);
  }
};
exports.delete = async (req, res) => {
  try {
    if(!req.query.id){
      throw constants.COMMON.ID_REQUIRED;
    }
    let templates = await EmailTemplate.findOne({id:req.query.id,isDeleted:false});
    if(!templates){
      throw constants.EMAILTEMPLATE.TEMPLATE_NOT_FOUND;
    }
    await EmailTemplate.updateOne({id:req.query.id,isDeleted:false},{isDeleted:true,updatedBy:req.identity.id});
    return response.success(null,constants.EMAILTEMPLATE.DELETED, req, res);
  } catch (err) {
    console.log(err);
    return response.failed(null,`${err}` , req, res);
  }
};

exports.getAll = async (req, res) => {
  try {
    let query = {};
    let count = req.param('count') || 10;
    let page = req.param('page') || 1;
    let skipNo = (Number(page) - 1) * Number(count);
    let { search, sortBy, status, isDeleted, format,addedBy } = req.query;
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
      query.addedBy = ObjectId(addedBy);
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

    db.collection('emailtemplate').aggregate(pipeline).toArray((err, totalresult) => {
      if (err) {
        return response.failed(null, `${err}`, req, res);
      }

      pipeline.push({
        $skip: Number(skipNo)
      });
      pipeline.push({
        $limit: Number(count)
      });

      db.collection('emailtemplate').aggregate(pipeline).toArray((err, result) => {
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