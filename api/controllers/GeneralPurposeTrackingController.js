/**
 * General Purpose Tracking (GPT)
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const constants = require("../../config/constants").constants;
const response = require("../services/Response");
const Validations = require("../Validations/index");
const db = sails.getDatastore().manager;
const Services = require("../services/index");
const ObjectId = require('mongodb').ObjectId;
const Emails = require("../Emails/index");

exports.addGPT = async (req, res) => {
  try {
        let created = await GeneralPurposeTracking.create(req.body).fetch();
        if(created) {
            return response.success(null, constants.GENERAL_PURPOSE_TRACKING.ADDED, req, res);
        } else {
            return response.failed(null, constants.GENERAL_PURPOSE_TRACKING.FAILED_ADDING, req, res);
        }

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
  }
};

exports.getGPTById = async (req, res) => {
  try {
    let id = req.param("id");
    if (!id) {
      throw constants.GENERAL_PURPOSE_TRACKING.ID_REQUIRED;
    }

    let get_gpt = await GeneralPurposeTracking.findOne({ _id: id, isDeleted: false });
    if (get_gpt) {
      return response.success(get_gpt, constants.GENERAL_PURPOSE_TRACKING.FETCHED, req, res);
    }
    throw constants.GENERAL_PURPOSE_TRACKING.INVALID_ID;
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};

exports.getAllGPT= async (req, res) => {
  try {
    let query = {};
    let count = req.param("count") || 10;
    let page = req.param("page") || 1;
    let { search, sortBy, isDeleted } = req.query;
    let skipNo = Number(page - 1) * Number(count);
    // if (search) {
    //   query.$or = [
    //     { fullName: { $regex: search, $options: "i" } },
    //     { email: { $regex: search, $options: "i" } },
    //   ];
    // }

    if (isDeleted) {
      query.isDeleted = true;
    } else {
      query.isDeleted = false;
    }

    let sortquery = {};
    if (sortBy) {
      let typeArr = [];
      typeArr = sortBy.split(" ");
      let sortType = typeArr[1];
      let field = typeArr[0];
      sortquery[field ? field : "createdAt"] = sortType
        ? sortType == "desc"
          ? -1
          : 1
        : -1;
    } else {
      sortquery = { updatedAt: -1 };
    }

    let pipeline = [
    ];
    
    pipeline.push({
      $match: query,
    });
    pipeline.push({
      $sort: sortquery,
    });
    let totalresult = await db.collection("generalpurposetracking")
      .aggregate(pipeline)
      .toArray();
    pipeline.push({
      $skip: Number(skipNo),
    });
    pipeline.push({
      $limit: Number(count),
    });
    let result = await db.collection("generalpurposetracking")
      .aggregate(pipeline)
      .toArray();
    let resData = {
      data: result ? result : [],
      total_count: totalresult ? totalresult.length : 0,
    };
    if (!req.param("page") && !req.param("count")) {
      resData.data = totalresult ? totalresult : [];
    }
    return response.success(resData, constants.GENERAL_PURPOSE_TRACKING.FETCHED, req, res);

  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};

exports.deleteGPTById = async (req, res) => {
    try {
        let id = req.param("id");
        if (!id) {
          throw constants.GENERAL_PURPOSE_TRACKING.ID_REQUIRED;
        }
    
        let get_gpt = await GeneralPurposeTracking.findOne({ _id: id, isDeleted: false });
        if (!get_gpt) {
          return response.failed(get_gpt, constants.GENERAL_PURPOSE_TRACKING.INVALID_ID, req, res);
        }
        let deletedGPT = await GeneralPurposeTracking.updateOne({_id: id}).set({
            isDeleted: true});
        return response.success(null, constants.GENERAL_PURPOSE_TRACKING.DELETED_SUCCESSFULLY, req, res);
      } catch (error) {
        return response.failed(null, `${error}`, req, res);
      }
}
