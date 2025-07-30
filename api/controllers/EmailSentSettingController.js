/**
 * SettingController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const response = require("../services/Response");
const constants = require("../../config/constants").constants;
const db = sails.getDatastore().manager;
const Validations = require("../Validations/index");
const ObjectId = require("mongodb").ObjectId;
const Services = require("../services/index");

exports.addEmailSentSetting = async (req, res) => {
  try {
    let validation_result = await Validations.EmailSentSetting.addEmailSentSetting(
      req,
      res
    );

    if (validation_result && !validation_result.success) {
      throw validation_result.message;
    }
       req.body.name = req.body.name.toLowerCase()

        let query = {};
        query.isDeleted = false;
        query.name = req.body.name;

        let modelCheck = await EmailSentSetting.findOne(query);
        if (modelCheck) {
            throw constants.EMAILSETTING.ALREADY_EXIST;
        }
        req.body.addedBy = req.identity.id;

        let saveEmailSentSetting = await EmailSentSetting.create(req.body)

      return response.success(saveEmailSentSetting, constants.EMAILSETTING.ADDED, req, res);

      return res.status(200).json({
        status:true,
        message:constants.EMAILSETTING.ADDED,
        data:saveEmailSentSetting
      })
  } catch (error) {
    console.log(error);
    return response.failed(null, `${error}`, req, res);
  }
};


exports.updateEmailSentSetting = async (req, res) => {
  try {
    let validation_result = await Validations.EmailSentSetting.editEmailSentSetting(
      req,
      res
    );

    if (validation_result && !validation_result.success) {
      throw validation_result.message;
    }
      
       let { id } = req.body;

    req.body.updatedBy = req.identity.id;
    req.body.updatedAt = new Date()


    let idCheck = await EmailSentSetting.findOne({ id: id,isDeleted:false });
     if(!idCheck){
         return res.status(400).json({
          success: false,
          error: { code: 400, message: constants.user.INVALID_ID },
        });
      }


    if(req.body.name){
      req.body.name = req.body.name.toLowerCase()
      let nameCheck = await EmailSentSetting.findOne(
        // name:req.body.name,
        // isDeleted:false,
        // id: { $ne: idCheck.id },
        { where: {  name:req.body.name,isDeleted:false,id: { '!=': idCheck.id } } },
      )
      if(nameCheck){
         return res.status(200).json({
        status:true,
        message: constants.EMAILSETTING.NAME,
      })
      }
    }

    let updateData = await EmailSentSetting.updateOne({ id: id }, req.body);

      return response.success(updateData, constants.EMAILSETTING.UPDATED, req, res);
      
      return res.status(200).json({
        status:true,
        message: constants.EMAILSETTING.UPDATED,
        data:updateData
      })
  } catch (error) {
    console.log(error);
    return response.failed(null, `${error}`, req, res);
  }
};

exports.getAllEmailSentSettingList = async (req, res) => {
  try {
    let query = {};
    let count = req.param("count") || 10;
    let page = req.param("page") || 1;
    let {
      search,
      sortBy,
      status,
      isDeleted,
    } = req.query;

    skipNo = Number(page - 1) * Number(count);

    if (search) {
      query.$or = [{ name: { $regex: search, $options: "i" } }];
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

    if (isDeleted) {
      query.isDeleted = isDeleted
        ? isDeleted === "true"
        : true
        ? isDeleted
        : false;
    } else {
      query.isDeleted = false;
    }

    let pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "addedBy",
          foreignField: "_id",
          as: "addedBy_details",
        },
      },
      {
        $unwind: {
          path: "$addedBy_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "updatedBy",
          foreignField: "_id",
          as: "updatedBydetails",
        },
      },
      {
        $unwind: {
          path: "$updatedBydetails",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    let projection = {
      $project: {
        id: "$_id",
        name: "$name",
        emailSent: "$emailSent",
        isDeleted: "$isDeleted",
        addedBy: "$addedBy",
        addedByDetails: {
          id:"$addedBy_details._id",
          name:"$addedBy_details.fullName",
          email:"$addedBy_details.email"
        },
        createdAt: "$createdAt",
        updatedAt: "$updatedAt",
        updatedBy: "$updatedBy",
        updateByDetails: {
          id:"$updatedBydetails._id",
          name:"$updatedBydetails.fullName",
          email:"$updatedBydetails.email"

        },
      },
    };
    pipeline.push(projection);
    pipeline.push({
      $match: query,
    });
    pipeline.push({
      $sort: sortquery,
    });

    let totalresult = await db
      .collection("emailsentsetting")
      .aggregate(pipeline)
      .toArray();

      pipeline.push({
      $skip: Number(skipNo),
    });
    pipeline.push({
      $limit: Number(count),
    });
    let result = await db.collection("emailsentsetting").aggregate(pipeline).toArray();
    let resData = {
      data: result ? result : [],
      total_count: totalresult ? totalresult.length : 0,
    };
    if (!req.param("page") && !req.param("count")) {
      resData.data = totalresult ? totalresult : [];
    }
    return response.success(resData, constants.EMAILSETTING.FETCHED, req, res);
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};

exports.getById = async (req, res) => {
  try {
    const id = req.param("id");
console.log(id,"id")
    if (!id) {
      throw constants.EMAILSETTING.ID_REQUIRED;
    }
    const fetchData = await EmailSentSetting.findOne({ id: id,isDeleted:false }).populate('addedBy').populate('updatedBy');
    if (fetchData) {
      return response.success(fetchData, constants.EMAILSETTING.FETCHED, req, res);
    }
    throw constants.EMAILSETTING.ID_REQUIRED;
  } catch (error) {
    console.log("error",error)
    return response.failed(null, `${error}`, req, res);
  }
};

exports.deleteEmailSent = async (req, res) => {
    try {
     const id = req.param('id') || req.query.id

      if (!id) {
      throw constants.EMAILSETTING.ID_REQUIRED;
    }

      const idCheck = await EmailSentSetting.findOne({ id: id,isDeleted:false })
      if (!idCheck) {
        return res.status(400).json({
          success: false,
          error: { code: 400, message: constants.user.INVALID_ID },
        });
      }

      const deletedData = await EmailSentSetting.updateOne({
        id: idCheck.id,
      }).set({ isDeleted: true });
      return response.success(null, constants.EMAILSETTING.DELETED, req, res);

      return res.status(200).json({
        success: true,
        message: constants.EMAILSETTING.DELETED,
        data: deletedData,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "" + err },
      });
    }
};


