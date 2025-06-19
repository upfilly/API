/**
 * CouponController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const response = require("../services/Response");
const constants = require("../../config/constants").constants;
const db = sails.getDatastore().manager;
const ObjectId = require("mongodb").ObjectId;
const Services = require("../services/index");
const Validations = require("../Validations/index");
const credentials = require("../../config/local");
const excel = require('exceljs');

const { Parser } = require("json2csv");
const xml2js = require("xml2js");
const fs = require("fs");
const path = require("path");

generateName = function () {
  // action are perform to generate random name for every file
  var uuid = require('uuid');
  var randomStr = uuid.v4();
  var date = new Date();
  var currentDate = date.valueOf();

  retVal = randomStr + currentDate;
  return retVal;
};

exports.addCoupon = async (req, res) => {
  try {
    let {
      media,
      couponCode,
      couponType,
      startDate,
      expirationDate,
      commissionType,
      applicable,
      visibility,
      status,
      url,
      couponCommission,
      description,
      title
    } = req.body;
    let validation_result = await Validations.CouponValidations.addCoupon(
      req,
      res
    );

    if (validation_result && !validation_result.success) {
      throw validation_result.message;
    }

    let couponExists = await Coupon.findOne({
      couponCode: req.body.couponCode,
      isDeleted: false,
    });

    if (couponExists) {
      throw constants.COUPON.ALREADY_EXISTS;
    }
    let user;
    if (req.body.visibility != "Public") {
      user = await Users.findOne({ id: req.body.media, isDeleted: false }); //here media refers to affiliate
      if (!user) {
        throw constants.user.USER_NOT_FOUND;
      }
    }

    if (new Date(startDate) > new Date(expirationDate)) {
      throw constants.COUPON.START_DATE_OVERLAPED;
    }

    req.body.addedBy = req.identity.id;

    const coupon = await Coupon.create(req.body).fetch();

    if (coupon) {
      if (["operator", "super_user"].includes(req.identity.role)) {
        //----------------get main account manager---------------------
        let get_account_manager = await Users.findOne({
          id: req.identity.addedBy,
          isDeleted: false,
        });

        await Services.activityHistoryServices.create_activity_history(
          req.identity.id,
          "coupon",
          "created",
          coupon,
          coupon,
          get_account_manager.id ? get_account_manager.id : null
        );
      } else if (["brand"].includes(req.identity.role)) {
        //----------------get main account manager---------------------
        let get_all_admin = await Services.UserServices.get_users_with_role([
          "admin",
        ]);

        let get_account_manager = get_all_admin[0].id;

        await Services.activityHistoryServices.create_activity_history(
          req.identity.id,
          "coupon",
          "created",
          coupon,
          coupon,
          get_account_manager ? get_account_manager : null
        );
      }
      return response.success(coupon, constants.COUPON.CREATED, req, res);
    }

    throw constants.COMMON.SERVER_ERROR;
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};
exports.editCoupon = async function (req, res) {
  try {
    let {
      media,
      couponCode,
      couponType,
      startDate,
      expirationDate,
      commissionType,
      applicable,
      visibility,
      status,
      url,
      couponCommission,
      title,
      description
    } = req.body;
    let validation_result = await Validations.CouponValidations.editCoupon(
      req,
      res
    );

    if (validation_result && !validation_result.success) {
      throw validation_result.message;
    }
    let couponExists = await Coupon.findOne({
      id: req.body.id,
      isDeleted: false,
    });

    if (!couponExists) {
      throw constants.COUPON.NOT_EXISTS;
    }

    if (media) {
      let user = await Users.findOne({ id: req.body.media, isDeleted: false }); //here media refers to affiliate

      if (!user) {
        throw constants.user.USER_NOT_FOUND;
      }
    }

    if (new Date(startDate) > new Date(expirationDate)) {
      throw constants.COUPON.START_DATE_OVERLAPED;
    }

    const coupon = await Coupon.updateOne({ id: req.body.id }, req.body);

    if (coupon) {
      if (["operator", "super_user"].includes(req.identity.role)) {
        //----------------get main account manager---------------------
        let get_account_manager = await Users.findOne({
          id: req.identity.addedBy,
          isDeleted: false,
        });
        await Services.activityHistoryServices.create_activity_history(
          req.identity.id,
          "coupon",
          "updated",
          coupon,
          couponExists,
          get_account_manager.id ? get_account_manager.id : null
        );
      } else if (["brand"].includes(req.identity.role)) {
        //----------------get main account manager---------------------
        let get_all_admin = await Services.UserServices.get_users_with_role([
          "admin",
        ]);
        let get_account_manager = get_all_admin[0].id;
        await Services.activityHistoryServices.create_activity_history(
          req.identity.id,
          "coupon",
          "updated",
          coupon,
          couponExists,
          get_account_manager ? get_account_manager : null
        );
      }
      return response.success(coupon, constants.COUPON.UPDATED, req, res);
    }

    throw constants.COMMON.SERVER_ERROR;
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};
exports.deleteCoupon = async function (req, res) {
  try {
    //   let validation_result = await Validations.CouponValidations.editCoupon(
    //       req,
    //       res
    //     );

    //     if (validation_result && !validation_result.success) {
    //       throw validation_result.message;
    //     }
    let couponExists = await Coupon.findOne({
      id: req.query.id,
      isDeleted: false,
    });

    if (!couponExists) {
      throw constants.COUPON.NOT_EXISTS;
    }

    const coupon = await Coupon.updateOne(
      { id: req.query.id },
      { isDeleted: true }
    );

    if (coupon) {
      return response.success(null, constants.COUPON.DELETED, req, res);
    }

    throw constants.COMMON.SERVER_ERROR;
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};
exports.getAllCoupon = async (req, res) => {
    try {
        let query = {};
        let count = req.param('count') || 1000;
        let page = req.param('page') || 1;
        let skipNo = (Number(page) - 1) * Number(count);
        let { search, sortBy, status, isDeleted, plan_type, couponType, addedBy, visibility, media,csv,xml,export_to_xls } = req.query;
        let sortquery = {};

        if (search) {
            search = Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { name: { $regex: search, '$options': 'i' } }
            ]
        }

        if (isDeleted) {
            query.isDeleted = isDeleted ? isDeleted === 'true' : true ? isDeleted : false;
        } else {
            query.isDeleted = false;
        }

        if (sortBy) {
            let typeArr = [];
            typeArr = sortBy.split(" ");
            let sortType = typeArr[1];
            let field = typeArr[0];
            sortquery[field ? field : 'createdAt'] = sortType ? (sortType == 'desc' ? -1 : 1) : -1;
        } else {
            sortquery = { createdAt: -1 }
        }

        if (status) {
            query.status = status;
        }

        if (plan_type) {
            query.plan_type = plan_type;
        }
        if (addedBy) {
            query.addedBy = new ObjectId(addedBy);
        }
        // else {
        //     query.addedBy = new ObjectId(req.identity.id);
        // }
        if(couponType) {
            query.couponType = couponType;
        }

        if (visibility || media) {
            query.$or = [
                { visibility: "Public" },
                ...(media ? [{ media: new ObjectId(media) }] : [])
            ];
        }
        // console.log(sortquery, "-----------------sortquery");
        let pipeline = [
            {
                $lookup :{
                from  :"users",
                localField : "addedBy",
                foreignField : "_id",
                as : "addedByDetails"
             }
            },
            {
                $unwind : {
                path : "$addedByDetails",
                preserveNullAndEmptyArrays : true
                }
            },
        ];
        let projection = {

            $project: {
                id: '$_id',
                media: '$media',
                couponCode: "$couponCode",
                couponType: "$couponType",
                startDate: "$startDate",
                expirationDate: "$expirationDate",
                commissionType: "$commissionType",
                applicable: "$applicable",
                visibility: "$visibility",
                url: "$url",
                addedByDetails : {fullName : "$addedByDetails.fullName",email : "$addedByDetails.email"},
                brand_name : "$addedByDetails.fullName",
                couponCommission: "$couponCommission",
                isDeleted: "$isDeleted",
                deletedAt: "$deletedAt",
                status: "$status",
                addedBy: "$addedBy",
                updatedBy: "$updatedBy",
                updatedAt: "$updatedAt",
                createdAt: "$createdAt",
                i : "$addedBy",
                fullName: "$addedByDetails.fullName",
                couponAmount:"$couponAmount",
            }
        };
        pipeline.push(projection);
        pipeline.push({
            $match: query
        });
        // pipeline.push({
        //     $sort: sortquery
        // });

        pipeline.push({
            $sort: sortquery
        });

        // let unset_stage = {
        //     $unset: ['_id']
        // }
        // pipeline.push(unset_stage)

        let totalresult = await db.collection('coupon').aggregate(pipeline).toArray();
        pipeline.push({
            $skip: Number(skipNo)
        });
        pipeline.push({
            $limit: Number(count)
        });
        let result = await db.collection('coupon').aggregate(pipeline).toArray();

         if (export_to_xls == "yes") {
      if (result && result.length > 0) {
        let workbook = new excel.Workbook();
        let worksheet = workbook.addWorksheet("Transactions");
        worksheet.columns = [
          { header: "Coupon Code", key: "couponCode", width: 20 },
          { header: "Coupon Type", key: "couponType", width: 20 },
          { header: "Brand Name", key: "brand_name", width: 20 },
          { header: "Visibility", key: "visibility", width: 35 },
          { header: "Start Date ", key: "startDate", width: 20 ,style: { alignment: { horizontal: "center" } }},
          { header: "Expiration Date", key: "expirationDate", width: 20 ,style: { alignment: { horizontal: "center" } }},
          { header: "Status", key: "status", width: 15 ,style: { alignment: { horizontal: "center" } }},
          { header: "Created Date", key: "createdAt", width: 20 ,style: { alignment: { horizontal: "center" } }},
        ];
        let counter = 0;
        for await (let values of result) {
          let id = counter;
          if (counter) {
            values.serial_number = `${1 + counter}`;
          } else {
            values.serial_number = `${1}`;
          }

          if (values.amount) {
            values.amount = `$${values.amount}`;
          }
          worksheet.addRow(values);
          counter++;
        }

        try {
          res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          );
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=" + "transactions.xlsx"
          );

          return workbook.xlsx.write(res).then(function () {
            res.status(200).end();
          });

        } catch (err) {
          return response.failed(null, `${err}`, req, res);
        }

      } else {
        return response.failed(null, `No data found to export`, req, res)
      }
    } 

        if (csv || xml) {
            const dirPath = path.join(__dirname, "../documents");
            if (!fs.existsSync(dirPath)) {
              fs.mkdirSync(dirPath, { recursive: true });
            }
          }
          // Check if CSV is requested
          if (csv) {
              let fields = ["fullName", "couponCode", "couponType", "startDate", "expirationDate","URL"];
              result.forEach(item => {
                item.URL = `${credentials.BACK_WEB_URL}/?affiliate_id=${media}&brand_id=${item.addedBy ? item.addedBy : "No data"}&url=${item.url}`;
              });
              const json2csvParser = new Parser({ fields });
              const csvData = json2csvParser.parse(result);
              let rootpath = process.cwd()
              let csvPath = rootpath + "/assets/documents/" +generateName()+ ".csv"
              
              // const filePath = path.join(csvPath);
              fs.writeFileSync(csvPath, csvData);
        
              res.setHeader("Content-Disposition", "attachment; filename=coupons.csv");
              res.setHeader("Content-Type", "text/csv");
              return res.download(csvPath, "coupons.csv");
            }
        
            // ✅ Generate XML
            if (xml) {
              const xmlFormattedResult = result.map(item => ({
                  fullName: item.fullName,
                  couponCode: item.couponCode,
                  couponType: item.couponType,
                  startDate: item.startDate,
                  expirationDate: item.expirationDate,
                  URL: `${credentials.BACK_WEB_URL}/?affiliate_id=${media}&brand_id=${item.addedBy}&url=${item.url}`
                }));
              
                const builder = new xml2js.Builder();
                const xmlData = builder.buildObject({ coupons: { coupon: xmlFormattedResult } });
              
                // ✅ Define Root Path for XML File
                let rootPath = process.cwd(); // Get the current working directory
                let xmlPath = path.join(rootPath, "assets", "documents");
              
                // ✅ Ensure Directory Exists
                if (!fs.existsSync(xmlPath)) {
                  fs.mkdirSync(xmlPath, { recursive: true }); // Create directory if not exists
                }
              
                // ✅ Generate Unique File Name
                let fileName = `coupons_${Date.now()}.xml`;
                let filePath = path.join(xmlPath, fileName);
              
                // ✅ Write XML Data to File
                fs.writeFileSync(filePath, xmlData, "utf8");
              
                // ✅ Send File for Download
                return res.download(filePath, fileName);
              }
      
        let resData = {
            total_count: totalresult ? totalresult.length : 0,
            data: result ? result : [],
        }
        if (!req.param('page') && !req.param('count')) {
            resData.data = totalresult ? totalresult : [];
        }
        return response.success(resData, constants.COUPON.FETCHED, req, res);

    } catch (error) {
      console.log(error,',===')
        return response.failed(null, `${error}`, req, res);
    }
}
exports.getByIdCoupon = async (req, res) => {
  try {
    const id = req.param("id");
    if (!id) {
      throw constants.COUPON.ID_REQUIRED;
    }
    const get_Coupon = await Coupon.findOne({ id: id });
    if (get_Coupon) {
      return response.success(get_Coupon, constants.COUPON.FETCHED, req, res);
    }
    throw constants.COUPON.INVALID_ID;
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};
