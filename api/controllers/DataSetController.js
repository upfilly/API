/**
 * CsvImportControllerController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const response = require("../services/Response");
const constants = require("../../config/constants").constants;
const db = sails.getDatastore().manager;
const ObjectId = require("mongodb").ObjectId;
const fs = require("fs");
const xlsx = require("xlsx");
const excel = require("exceljs");
const Validations = require("../Validations/index");
const Emails = require("../Emails");
// const EmailMessageTemplate = require("../models/EmailMessageTemplate");

exports.importCsvData = async (req, res) => {
  let duplicate = 0;
  let createdCount = 0;
  try {
    const student_arr = await new Promise((resolve, reject) => {
      req.file("file").upload(
        { maxBytes: 10485760, dirname: "../../assets" }, // Change the directory
        function whenDone(err, files) {
          if (err && err.code == "E_EXCEEDS_UPLOAD_LIMIT") {
            reject({
              success: false,
              error: {
                code: 404,
                message: "File size must be less than 10 MB",
              },
            });
          } else {
            // Assuming you want to do something with the first uploaded file
            const uploadedFile = files[0];
            // checking file type
            if (
              uploadedFile.type !==
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
              uploadedFile.type !== "text/csv"
            ) {
              reject({
                success: false,
                error: {
                  code: 404,
                  message: "Invalid file type",
                },
              });
            }
            // Access file properties
            const filename = uploadedFile.filename;
            const fileByteSize = uploadedFile.size;
            const name = uploadedFile.fd; // No need to replace here
            // Read the file based on file extension
            if (filename.endsWith(".csv")) {
              // CSV file
              fs.readFile(name, "utf8", async (err, data) => {
                if (err) {
                  reject({
                    success: false,
                    error: {
                      code: 500,
                      message: "Error reading CSV file",
                    },
                  });
                } else {
                  // Process CSV data
                  const parsedData = await parseCSV(data); // Implement parseCSV function
                  resolve(parsedData);
                }
              });
            } else if (
              filename.endsWith(".xlsx") ||
              filename.endsWith(".xls")
            ) {
              // Excel file
              const workbook = xlsx.readFile(name);
              const sheetName = workbook.SheetNames[0];
              const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
              resolve(data);
            } else {
              reject({
                success: false,
                error: {
                  code: 404,
                  message: "Unsupported file format",
                },
              });
            }
          }
        }
      );
    });
    response.success(
      student_arr,
      constants.CSVDATA.IMPORTED_SUCCESSFULLY,
      req,
      res
    );
  } catch (err) {
    console.log(err);
    res.status(400).json({
      success: false,
      error: {
        code: 400,
        message: err,
      },
    });
  }
};
async function parseCSV(csvData) {
  // Split the CSV data by lines
  const lines = csvData.trim().split("\n");
  const result = [];

  // Extract headers from the first line
  const headers = lines[0].split(",");

  // Iterate through each line, starting from the second line
  for (let i = 1; i < lines.length; i++) {
    const obj = {};
    const values = lines[i].split(",");

    // Create an object for each row, using the headers as keys
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index].trim();
    });

    result.push(obj);
  }

  return result;
}

exports.sendDataSets = async (req, res) => {
  try {
    let validation_result = await Validations.DataSetValidation.addDataSet(
      req,
      res
    );

    if (validation_result && !validation_result.success) {
      throw validation_result.message;
    }

    let data = req.body;

    let isExists = await Users.findOne({ id: data.user_id, isDeleted: false });

    if (!isExists) {
      throw constants.user.USER_NOT_FOUND;
    }

    data.addedBy = req.identity.id;

    let dataset = await DataSet.create(data).fetch();
    console.log(isExists.email);
    let emailPayload = {
      brandFullName: req.identity.fullName,
      affiliateFullName: isExists.fullName,
      affiliateEmail: isExists.email,
    };

    await Emails.DataSet.sendDataSet(emailPayload);

    response.success(dataset, constants.DATASET.ADDED, req, res);
  } catch (err) {
    response.failed(err, `${err}`, req, res);
  }
};

exports.listOfDataSet = async (req, res) => {
  try {
    var search = req.param("search");
    var isDeleted = req.param("isDeleted");
    var page = req.param("page");
    var count = parseInt(req.param("count"));
    let sortBy = req.param("sortBy");
    let addedBy = req.param("addedBy");
    let user_id = req.param("user_id");
    let startDate = req.param("startDate");
    let endDate = req.param("endDate");

    var date = new Date();

    var query = {};

    if (search) {
      query.$or = [{ event: { $regex: search, $options: "i" } }];
    }
    let sortquery = {};
    if (sortBy) {
      let typeArr = [];
      typeArr = sortBy.split(" ");
      let sortType = typeArr[1];
      let field = typeArr[0];
      sortquery[field ? field : "updatedAt"] = sortType
        ? sortType == "desc"
          ? -1
          : 1
        : -1;
    } else {
      sortquery = { updatedAt: -1 };
    }

    query.isDeleted = false;

    if (user_id) {
      query.user_id = user_id;
    } else {
      query.user_id = req.identity.id;
    }

    if (addedBy) {
      query.addedBy = ObjectId(addedBy);
    }

    if (startDate && endDate) {
      startDate = new Date(startDate);
      endDate = new Date(endDate);

      query.$and = [
        { assignDateAndTime: { $gte: startDate } },
        { submitDateAndTime: { $lte: endDate } },
      ];
    }
    if (startDate && !endDate) {
      startDate = new Date(startDate);

      query.assignDateAndTime = { $gte: startDate };
    }
    if (!startDate && endDate) {
      endDate = new Date(endDate);
      query.submitDateAndTime = { $lte: endDate };
    }

    console.log(query);

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "addedBy",
          foreignField: "_id",
          as: "users",
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
          localField: "user_id",
          foreignField: "_id",
          as: "user_details",
        },
      },
      {
        $unwind: {
          path: "$user_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          user_id: "$user_id",
          filePath: "$filePath",
          user_details: "$user_details",
          addedBy_details: "$addedBy_details",
          status: "$status",
          isDeleted: "$isDeleted",
          addedBy: "$addedBy",
          updatedBy: "$updatedBy",
          createdAt: "$createdAt",
          updatedAt: "$updatedAt",
        },
      },
      {
        $match: query,
      },
      {
        $sort: sortquery,
      },
    ];
    db.collection("dataset")
      .aggregate([...pipeline])
      .toArray((err, totalResult) => {
        if (page && count) {
          var skipNo = (page - 1) * count;
          pipeline.push(
            {
              $skip: Number(skipNo),
            },
            {
              $limit: Number(count),
            }
          );
        }
        db.collection("dataset")
          .aggregate([...pipeline])
          .toArray((err, result) => {
            return res.status(200).json({
              success: true,
              data: result,
              total: totalResult.length,
            });
          });
      });
  } catch (err) {
    // (err)
    return res.status(400).json({
      success: false,
      error: { code: 400, message: "" + err },
    });
  }
};

exports.sendEmailMessage = async (req, res) => {
  try {
    let validation_result = await Validations.SendEmailMessage.sendEmailMessage(
      req,
      res
    );

    if (validation_result && !validation_result.success) {
      throw validation_result.message;
    }

    let data = req.body;

    let isExists = await Users.findOne({ id: data.user_id, isDeleted: false });

    if (!isExists) {
      throw constants.user.USER_NOT_FOUND;
    }

    data.addedBy = req.identity.id;

    let emailMessage = await EmailMessageTemplate.create(data).fetch();

    if (!emailMessage) {
      throw constants.EMAILMESSAGE.ERROR_SENDING_EMAIL;
    }

    let emailPayload = {
      brandFullName: req.identity.fullName,
      affiliateFullName: isExists.fullName,
      affiliateEmail: isExists.email,
      emailMessage: data.description,
    };

    await Emails.EmailMessageTemplate.sendEmailMessageTemplate(emailPayload);

    response.success(emailMessage, constants.EMAILMESSAGE.ADDED, req, res);
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      success: false,
      error: { code: 400, message: "" + error },
    });
  }
};

exports.listOfEmailMessage = async (req, res) => {
  try {
    var search = req.param("search");
    var isDeleted = req.param("isDeleted");
    var page = req.param("page");
    var count = parseInt(req.param("count"));
    let sortBy = req.param("sortBy");
    let addedBy = req.param("addedBy");
    let user_id = req.param("user_id");
   

    var date = new Date();

    var query = {};

    if (search) {
      query.$or = [{ event: { $regex: search, $options: "i" } }];
    }
    let sortquery = {};
    if (sortBy) {
      let typeArr = [];
      typeArr = sortBy.split(" ");
      let sortType = typeArr[1];
      let field = typeArr[0];
      sortquery[field ? field : "updatedAt"] = sortType
        ? sortType == "desc"
          ? -1
          : 1
        : -1;
    } else {
      sortquery = { updatedAt: -1 };
    }

    query.isDeleted = false;

    if (user_id) {
      query.user_id = user_id;
    } 

    if (addedBy) {
      query.addedBy = ObjectId(addedBy);
    }

    // if (startDate && endDate) {
    //   startDate = new Date(startDate);
    //   endDate = new Date(endDate);

    //   query.$and = [
    //     { assignDateAndTime: { $gte: startDate } },
    //     { submitDateAndTime: { $lte: endDate } },
    //   ];
    // }
    // if (startDate && !endDate) {
    //   startDate = new Date(startDate);

    //   query.assignDateAndTime = { $gte: startDate };
    // }
    // if (!startDate && endDate) {
    //   endDate = new Date(endDate);
    //   query.submitDateAndTime = { $lte: endDate };
    // }

    console.log(query);

    const pipeline = [
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
          localField: "user_id",
          foreignField: "_id",
          as: "user_details",
        },
      },
      {
        $unwind: {
          path: "$user_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          title: "$title",
          user_id: "$user_id",
          description: "$description",
          user_details:"$user_details",
          addedBy_details:"$addedBy_details",
          status: "$status",
          isDeleted: "$isDeleted",
          addedBy: "$addedBy",
          updatedBy: "$updatedBy",
          createdAt: "$createdAt",
          updatedAt: "$updatedAt",
        },
      },
      {
        $match: query,
      },
      {
        $sort: sortquery,
      },
    ];
    db.collection("emailmessagetemplate")
      .aggregate([...pipeline])
      .toArray((err, totalResult) => {
        if (page && count) {
          var skipNo = (page - 1) * count;
          pipeline.push(
            {
              $skip: Number(skipNo),
            },
            {
              $limit: Number(count),
            }
          );
        }
        db.collection("emailmessagetemplate")
          .aggregate([...pipeline])
          .toArray((err, result) => {
            return res.status(200).json({
              success: true,
              data: result,
              total: totalResult.length,
            });
          });
      });
  } catch (err) {
    // (err)
    return res.status(400).json({
      success: false,
      error: { code: 400, message: "" + err },
    });
  }
};