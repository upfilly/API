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
const excel = require("exceljs");

const { Parser } = require("json2csv");
const xml2js = require("xml2js");
const fs = require("fs");
const path = require("path");
const Email = require("../Emails/coupon");

generateName = function () {
  // action are perform to generate random name for every file
  var uuid = require("uuid");
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
      campaign_id,
      commissionType,
      applicable,
      visibility,
      status,
      url,
      couponCommission,
      description,
      title,
      expireCheck,
    } = req.body;
    let validation_result = await Validations.CouponValidations.addCoupon(
      req,
      res
    );

    if (validation_result && !validation_result.success) {
      throw validation_result.message;
    }

    // if (expireCheck === false || expireCheck === "false") {
    //   delete req.body.expirationDate;
    // }
    if (expireCheck === true || expireCheck === "true") {
      delete req.body.expirationDate;
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
      user = await Users.find({ id: req.body.media, isDeleted: false }); //here media refers to affiliate
      if (!user) {
        throw constants.user.USER_NOT_FOUND;
      }
    }

    // if (expireCheck === true || expireCheck === "true") {
    //   if (new Date(startDate) > new Date(expirationDate)) {
    //     throw constants.COUPON.START_DATE_OVERLAPED;
    //   }
    // }

     if (expireCheck === false || expireCheck === "false") {
      if (new Date(startDate) > new Date(expirationDate)) {
        throw constants.COUPON.START_DATE_OVERLAPED;
      }
    }
    if (media && media.length > 0) {
      for (let itm of media) {
        let check = await Users.findOne({ id: itm });
        if (!check) {
          throw constants.COUPON.MEDIA_ID;
        }
      }
    }


    if (campaign_id && campaign_id.length > 0) {
      for (let itm of campaign_id) {
        let check = await Campaign.findOne({ id: itm });
        if (!check) {
          throw constants.COUPON.CAMAPIGN;
        }
      }
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

      if (visibility === "Exclusive to specific affiliate") {
        let mediaIds = [];

        if (Array.isArray(media)) {
          mediaIds = media;
        } else if (media) {
          mediaIds = [media];
        }

        const affiliate = await Users.find({
          id: { in: mediaIds },
          isDeleted: false,
        });

        const brand = await Users.findOne({
          id: req.identity.id,
          isDeleted: false,
        });

        if (affiliate.length && affiliate[0].email && brand) {
          const emailSentCheck = await EmailSentSetting.findOne({
            name: "coupon",
            isDeleted: false,
          });

          if (emailSentCheck?.emailSent === true) {
            for (let aff of affiliate) {
              await Email.sendCouponNotificationEmail({
                brandFullName: brand.fullName,
                affiliateFullName: aff.fullName,
                affiliateEmail: aff.email,
                couponTitle: title,
                couponCode,
                expirationDate,
                visibility,
              });
            }
          } else {
            console.log("emailSent setting is false in coupon");
          }
        }

        // const affiliate = await Users.find({ id: media, isDeleted: false });
        // const brand = await Users.findOne({
        //   id: req.identity.id,
        //   isDeleted: false,
        // });

        // if (affiliate && affiliate.email && brand) {
        //   //emailSenting check
        //   let emailSentCheck = await EmailSentSetting.findOne({
        //     name: "coupon",
        //     isDeleted: false,
        //   });
        //   if (emailSentCheck.emailSent == true) {
        //     await Email.sendCouponNotificationEmail({
        //       brandFullName: brand.fullName,
        //       affiliateFullName: affiliate.fullName,
        //       affiliateEmail: affiliate.email,
        //       couponTitle: title,
        //       couponCode,
        //       expirationDate:expirationDate,
        //       visibility,
        //     });
        // } else {
        //   console.log("emailSent setting is false in coupon");
        // }
        // }
      } else if (visibility === "Public") {
        console.log("public");
        const brand = await Users.findOne({
          id: req.identity.id,
          isDeleted: false,
        });

        let affiliates = [];

        if (campaign_id && campaign_id.length > 0) {
          let affiliateIdsSet = new Set();

          for (let campaignId of campaign_id) {
            const mappings = await BrandAffiliateAssociation.find({
              brand_id: brand.id,
              campaign_id: campaignId,
              source: "campaign",
              status: "accepted",
              isActive: true,
              isDeleted: false,
            });

            mappings.forEach((map) => {
              if (map.affiliate_id) affiliateIdsSet.add(map.affiliate_id);
            });
            console.log("mappings", mappings);
          }

          const affiliateIds = Array.from(affiliateIdsSet);
          console.log("affiliateIds", affiliateIds);

          affiliates = await Users.find({
            id: affiliateIds,
            role: "affiliate",
            isDeleted: false,
            status: "active",
          });
          console.log("affiliates", affiliates);
        } else {
          console.log("2");
          affiliates =
            await Services.UserServices.getAssociatedAffiliatesForBrand(
              brand.id
            );
        }

        for (let affiliate of affiliates) {
          if (affiliate.email && affiliate.fullName) {
            let emailSentCheck = await EmailSentSetting.findOne({
              name: "coupon",
              isDeleted: false,
            });
            if (emailSentCheck.emailSent == true) {
              await Email.sendCouponNotificationEmail({
                brandFullName: brand.fullName,
                affiliateFullName: affiliate.fullName,
                affiliateEmail: affiliate.email,
                couponTitle: title,
                couponCode,
                expirationDate: expirationDate,
                visibility,
              });
            } else {
              console.log("emailSent setting is false in coupon");
            }
          }
        }
      }

      return response.success(coupon, constants.COUPON.CREATED, req, res);
    }

    throw constants.COMMON.SERVER_ERROR;
  } catch (error) {
    console.log("error ", error);
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
      description,
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

    // if (media) {
    //   let user = await Users.find({ id: req.body.media, isDeleted: false }); //here media refers to affiliate

    //   if (!user) {
    //     throw constants.user.USER_NOT_FOUND;
    //   }
    // }
     if (media && media.length > 0) {
      for (let itm of media) {
        let check = await Users.findOne({ id: itm ,isDeleted: false});
        if (!check) {
          throw constants.COUPON.MEDIA_ID;
        }
      }
    }
    //check
    // if (couponExists.expireCheck == "true") {
    //   if (new Date(startDate) > new Date(expirationDate)) {
    //     throw constants.COUPON.START_DATE_OVERLAPED;
    //   }
    // }else{
    //   delete req.body.expirationDate;
    // }
     if (couponExists.expireCheck == false) {
     if (expirationDate) {
      req.body.expirationDate = new Date(expirationDate);
    }
    }else if (req.body?.expireCheck  == false) {
      req.body.expirationDate = new Date(expirationDate);
     }else{
      delete req.body.expirationDate
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
    let count = req.param("count") || 1000;
    let page = req.param("page") || 1;
    let skipNo = (Number(page) - 1) * Number(count);
    let {
      search,
      sortBy,
      status,
      isDeleted,
      plan_type,
      couponType,
      addedBy,
      visibility,
      media,
      csv,
      xml,
      export_to_xls,
      campaign,
      selectedCoupon,
      expireCheck,
    } = req.query;

    if (search) {
      search = Services.Utils.remove_special_char_exept_underscores(search);
      query.$or = [{ name: { $regex: search, $options: "i" } }];
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
    if (expireCheck) {
      query.expireCheck = expireCheck
        ? expireCheck === "true"
        : true
        ? expireCheck
        : false;
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

    if (plan_type) {
      query.plan_type = plan_type;
    }
    if (addedBy) {
      query.addedBy = new ObjectId(addedBy);
    }
    if (campaign) {
      query.campaign = new ObjectId(campaign);
    }
    // else {
    //     query.addedBy = new ObjectId(req.identity.id);
    // }
    if (couponType) {
      query.couponType = couponType;
    }

    if (selectedCoupon) {
      selectedCoupon = selectedCoupon.split(",");
      selectedCoupon = selectedCoupon.map((itm) => new ObjectId(itm));
      query.id = { $in: selectedCoupon };
    }
    // if (visibility || media) {
    //   query.$or = [
    //     { visibility: "Public" },
    //     ...(media ? [{ media: new ObjectId(media) }] : []),
    //   ];
    // }
    // if (visibility || media) {
    //   const mediaArray =
    //     typeof media === "string"
    //       ? media.split(",").map((id) => new ObjectId(id.trim()))
    //       : [new ObjectId(media)];

    //   query.$or = [{ visibility: "Public" }, { media: { $in: mediaArray } }];
    // }

    if (visibility || media) {
      let mediaArray = [];

      if (typeof media === "string") {
        mediaArray = media
          .split(",")
          .map((id) => id.trim())
          .filter((id) => ObjectId.isValid(id))
          .map((id) => new ObjectId(id));
      } else if (Array.isArray(media)) {
        mediaArray = media
          .filter((id) => ObjectId.isValid(id))
          .map((id) => new ObjectId(id));
      }

      if (mediaArray.length > 0) {
        query.$or = [
          { visibility: "Public" },
          { media: { $in: mediaArray.map((id) => id.toString()) } }, // since media is saved as string IDs
        ];
      } else {
        query.visibility = "Public"; // default if media is invalid
      }
    }

    // console.log(sortquery, "-----------------sortquery");
    let pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "addedBy",
          foreignField: "_id",
          as: "addedByDetails",
        },
      },
      {
        $unwind: {
          path: "$addedByDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "campaign",
          localField: "campaign_id",
          foreignField: "_id",
          as: "campaignData",
        },
      },
      {
        $unwind: {
          path: "$campaignData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "mediaObjectIds",
          foreignField: "_id",
          as: "mediaDetails",
        },
      },
      {
        $project: {
          mediaObjectIds: 0,
        },
      },
    ];
    let projection = {
      $project: {
        id: "$_id",
        media: "$media",
        title: "$title",
        description: "$description",
        couponCode: "$couponCode",
        couponType: "$couponType",
        startDate: "$startDate",
        expirationDate: "$expirationDate",
        commissionType: "$commissionType",
        applicable: "$applicable",
        visibility: "$visibility",
        url: "$url",
        addedByDetails: {
          fullName: "$addedByDetails.fullName",
          email: "$addedByDetails.email",
        },
        brand_name: "$addedByDetails.fullName",
        couponCommission: "$couponCommission",
        isDeleted: "$isDeleted",
        deletedAt: "$deletedAt",
        status: "$status",
        addedBy: "$addedBy",
        updatedBy: "$updatedBy",
        updatedAt: "$updatedAt",
        createdAt: "$createdAt",
        i: "$addedBy",
        fullName: "$addedByDetails.fullName",
        couponAmount: "$couponAmount",
        campaign_id: "$campaign_id",
        campaignDetails: "$campaignData",
        expireCheck: "$expireCheck",
        media_details: "$mediaDetails",
      },
    };
    pipeline.push(projection);
    pipeline.push({
      $match: query,
    });
    // pipeline.push({
    //     $sort: sortquery
    // });

    pipeline.push({
      $sort: sortquery,
    });

    // let unset_stage = {
    //     $unset: ['_id']
    // }
    // pipeline.push(unset_stage)

    let totalresult = await db
      .collection("coupon")
      .aggregate(pipeline)
      .toArray();
    pipeline.push({
      $skip: Number(skipNo),
    });
    pipeline.push({
      $limit: Number(count),
    });
    let result = await db.collection("coupon").aggregate(pipeline).toArray();

    if (export_to_xls == "yes") {
      if (result && result.length > 0) {
        let workbook = new excel.Workbook();
        let worksheet = workbook.addWorksheet("Coupons");
        worksheet.columns = [
          { header: "Coupon Code", key: "couponCode", width: 20 },
          { header: "Coupon Type", key: "couponType", width: 20 },
          { header: "Brand Name", key: "brand_name", width: 20 },
          { header: "Visibility", key: "visibility", width: 35 },
          {
            header: "Start Date ",
            key: "startDate",
            width: 20,
            style: { alignment: { horizontal: "center" } },
          },
          {
            header: "Expiration Date",
            key: "expirationDate",
            width: 20,
            style: { alignment: { horizontal: "center" } },
          },
          {
            header: "Status",
            key: "status",
            width: 15,
            style: { alignment: { horizontal: "center" } },
          },
          {
            header: "Created Date",
            key: "createdAt",
            width: 20,
            style: { alignment: { horizontal: "center" } },
          },
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
            "attachment; filename=" + "Coupons.xlsx"
          );

          return workbook.xlsx.write(res).then(function () {
            res.status(200).end();
          });
        } catch (err) {
          return response.failed(null, `${err}`, req, res);
        }
      } else {
        return response.failed(null, `No data found to export`, req, res);
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
      let fields = [
        "fullName",
        "couponCode",
        "couponType",
        "startDate",
        "expirationDate",
        "URL",
      ];
      result.forEach((item) => {
        item.URL = `${
          credentials.BACK_WEB_URL
        }/?affiliate_id=${media}&brand_id=${
          item.addedBy ? item.addedBy : "No data"
        }&url=${item.url}`;
      });
      const json2csvParser = new Parser({ fields });
      const csvData = json2csvParser.parse(result);
      let rootpath = process.cwd();
      let csvPath = rootpath + "/assets/documents/" + generateName() + ".csv";

      // const filePath = path.join(csvPath);
      fs.writeFileSync(csvPath, csvData);

      res.setHeader("Content-Disposition", "attachment; filename=coupons.csv");
      res.setHeader("Content-Type", "text/csv");
      return res.download(csvPath, "coupons.csv");
    }

    if (xml) {
      const xmlFormattedResult = result.map((item) => ({
        fullName: item.fullName,
        couponCode: item.couponCode,
        couponType: item.couponType,
        startDate: item.startDate,
        expirationDate: item.expirationDate,
        URL: `${credentials.BACK_WEB_URL}/?affiliate_id=${media}&brand_id=${item.addedBy}&url=${item.url}`,
      }));

      const builder = new xml2js.Builder();
      const xmlData = builder.buildObject({
        coupons: { coupon: xmlFormattedResult },
      });

      let rootPath = process.cwd(); // Get the current working directory
      let xmlPath = path.join(rootPath, "assets", "documents");

      // Ensure Directory Exists
      if (!fs.existsSync(xmlPath)) {
        fs.mkdirSync(xmlPath, { recursive: true }); // Create directory if not exists
      }

      // Generate Unique File Name
      let fileName = `coupons_${Date.now()}.xml`;
      let filePath = path.join(xmlPath, fileName);

      // Write XML Data to File
      fs.writeFileSync(filePath, xmlData, "utf8");

      // Send File for Download
      return res.download(filePath, fileName);
    }

    let resData = {
      total_count: totalresult ? totalresult.length : 0,
      data: result ? result : [],
    };
    if (!req.param("page") && !req.param("count")) {
      resData.data = totalresult ? totalresult : [];
    }
    return response.success(resData, constants.COUPON.FETCHED, req, res);
  } catch (error) {
    console.log(error, ",===");
    return response.failed(null, `${error}`, req, res);
  }
};
exports.getByIdCoupon = async (req, res) => {
  try {
    const id = req.param("id");
    if (!id) {
      throw constants.COUPON.ID_REQUIRED;
    }
    const get_Coupon = await Coupon.findOne({ id: id }).populate("addedBy");
    if (!get_Coupon) {
      return response.success(get_Coupon, constants.COUPON.NOT_EXISTS, req, res);
    }
    let mediaUsers = [];
    if (get_Coupon.media?.length) {
      mediaUsers = await Users.find({
        where: {
          id: { in: get_Coupon.media },
          isDeleted: false,
        },
      });
    }

     get_Coupon.mediaDetails = mediaUsers;
      return response.success(get_Coupon, constants.COUPON.FETCHED, req, res);
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};
