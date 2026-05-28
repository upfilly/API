/**
 * AffiliateLinkController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const Services = require("../services/index");
const constants = require("../../config/constants").constants;
const response = require("../services/Response");
const db = sails.getDatastore().manager;
const excel = require("exceljs");
const moment = require("moment");
const ObjectId = require("mongodb").ObjectId;
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios")
// const {customAlphabet} = require('nanoid');
// const nanoid = customAlphabet('1234567890abcdef', 6);
// const baseUrl = 'https://upfilly.com';
const credentials = require("../../config/local");

function calculatetotalCommission(
  commission_type,
  price,
  commission,
  commission_override
) {
  let CalPrice;

  if (commission_type === "percentage") {
    CalPrice = (price * commission) / 100;
  } else {
    CalPrice = price - commission;
  }

  const finalPrice = (CalPrice * commission_override) / 100;

  return "$" + (finalPrice + CalPrice).toFixed(2);
}

exports.generateLink = async (req, res) => {
  try {
    // Generate affiliate link
    const { base_url, parameters } = req.body;

    let get_link = await Services.generateAffiliateLink.generateLink({
      baseUrl: base_url,
      parameters: parameters,
    });

    let query = {
      affiliate_id: req.identity.id,
    };
    let isExist = await AffiliateLink.find(query).sort({ createdAt: -1 });
    isExist = isExist[0];
    if (!isExist) {
      let create_link = await AffiliateLink.create({
        affiliate_id: req.identity.id,
        link: get_link,
      }).fetch();
      if (create_link) {
        if (
          ["operator", "super_user", "publisher"].includes(req.identity.role)
        ) {
          let get_account_manager = await Users.findOne({
            id: req.identity.addedBy,
            isDeleted: false,
          });
          await Services.activityHistoryServices.create_activity_history(
            req.identity.id,
            "generate_link",
            "created",
            create_link,
            create_link,
            get_account_manager.id ? get_account_manager.id : null
          );
        } else if (["affiliate", "brand"].includes(req.identity.role)) {
          let get_all_admin = await Services.UserServices.get_users_with_role([
            "admin",
          ]);
          let get_account_manager = get_all_admin[0].id;
          await Services.activityHistoryServices.create_activity_history(
            req.identity.id,
            "generate_link",
            "created",
            create_link,
            create_link,
            get_account_manager ? get_account_manager.id : null
          );
        }
      }
    } else {
      let update_link = await AffiliateLink.updateOne(
        { id: isExist.id, isDeleted: false },
        { link: get_link }
      );
      if (update_link) {
        if (["operator", "super_user"].includes(req.identity.role)) {
          let get_account_manager = await Users.findOne({
            id: req.identity.addedBy,
            isDeleted: false,
          });

          await Services.activityHistoryServices.create_activity_history(
            req.identity.id,
            "generate_link",
            "updated",
            update_link,
            isExist,
            get_account_manager.id ? get_account_manager.id : null
          );
        } else if (["affiliate", "brand"].includes(req.identity.role)) {
          let get_all_admin = await Services.UserServices.get_users_with_role([
            "admin",
          ]);
          let get_account_manager = get_all_admin[0].id;

          await Services.activityHistoryServices.create_activity_history(
            req.identity.id,
            "generate_link",
            "updated",
            update_link,
            isExist,
            get_account_manager ? get_account_manager : null
          );
        }
      }
    }
    return response.success(get_link, constants.TRACKING.LINK, req, res);
  } catch (err) {
    return response.failed(null, `${err}`, req, res);
  }
};

exports.generateLinkOfAffiliate = async (req, res) => {
  try {
    let query = {
      affiliate_id: req.identity.id,
      isDeleted: false,
    };
    let get_affilaite_link = await AffiliateLink.find(query).sort({
      createdAt: -1,
    });
    get_affilaite_link = get_affilaite_link[0];
    return response.success(
      get_affilaite_link,
      constants.TRACKING.LINK,
      req,
      res
    );
  } catch (err) {
    return response.failed(null, `${err}`, req, res);
  }
};

exports.create = async function (req, res) {
  try {
    const { event, timestamp, urlParams, data, couponId } = req.body;

    if (!event || !timestamp) {
      return response.failed(
        null,
        constants.AFFILIATELINK.MISSING_FIELDS,
        req,
        res
      );
    }
    req.body.addedBy = req.identity?.id ? req.identity.id : null;
    req.body.updatedBy = req.identity?.id ? req.identity.id : null;
    if (couponId) {
      const couponCheck = await Coupon.findOne({ _id: couponId });
      if (!couponCheck) {
        return response.failed(
          null,
          constants.AFFILIATELINK.COUPONINVALID,
          req,
          res
        );
      }
    }

    const newAffiliateLink = await AffiliateLink.create(req.body).fetch();
    
    // Send the saved data to the chat/shopify-listing-update API
    try {
      const chatBaseUrl = credentials.CHAT_WEB_URL || "https://chat.upfilly.com" || "http://localhost:6026";
      const chatEndpoint = `${chatBaseUrl}/chat/user/shopify-listing-update`;
      await axios.post(chatEndpoint, newAffiliateLink);
    } catch (chatErr) {
      sails.log.error("[AffiliateLinkController.create] Error calling chat API:", chatErr.message);
    }

    return response.success(
      newAffiliateLink,
      constants.AFFILIATELINK.CREATED,
      req,
      res
    );
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};

exports.find = async function (req, res) {
  try {
    let query = {};
    let count = parseInt(req.query.count) || 10;
    let page = parseInt(req.query.page) || 1;

    let skipNo = (page - 1) * count;

    let {
      search,
      sortBy,
      status,
      isDeleted,
      format,
      addedBy,
      affiliate_id,
      brand_id,
      campaignId,
      commission_status,
      commission_paid,
      admin_paid,
      export_to_xls,
      startDate,
      endDate,
      couponId,
    } = req.query;

    // Handle search
    if (search) {
      search = Services.Utils.remove_special_char_exept_underscores(search);
      query.$or = [
        { event: { $regex: search, $options: "i" } },
        { "urlParams.page": { $regex: search, $options: "i" } },
        { "data.page": { $regex: search, $options: "i" } },
      ];
    }

    // Handle isDeleted
    if (isDeleted) {
      query.isDeleted = isDeleted === "true";
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

    // Handle status
    if (status) {
      query.status = status;
    }

    if (couponId) {
      query.couponId = new ObjectId(couponId);
    }

    // Handle addedBy
    if (addedBy) {
      query.addedBy = new ObjectId(addedBy);
    }
    if (brand_id) {
      query.brand_id = new ObjectId(brand_id);
    }
    if (affiliate_id) {
      query.affiliate_id = new ObjectId(affiliate_id);
    }
    if (campaignId) {
      query.campaignId = new ObjectId(campaignId);
    }

    if (commission_status) {
      query.commission_status = commission_status;
    }

    if (commission_paid) {
      query.commission_paid = commission_paid;
    }
    if (admin_paid) {
      query.admin_paid = admin_paid;
    }

    // Handle format
    if (format) {
      query.format = format;
    }

    let pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "affiliate_id",
          foreignField: "_id",
          as: "affiliate_details",
        },
      },
      {
        $unwind: {
          path: "$affiliate_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "brand_id",
          foreignField: "_id",
          as: "brand_details",
        },
      },
      {
        $unwind: {
          path: "$brand_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "brandaffiliateassociation",
          let: {
            brand_id: "$brand_id",
            affiliate_id: "$affiliate_id",
            isActive: true,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$brand_id", "$$brand_id"] },
                    { $eq: ["$affiliate_id", "$$affiliate_id"] },
                    { $eq: ["$isActive", "$$isActive"] },
                  ],
                },
              },
            },
          ],
          as: "brand_association_details", // The final result will be stored in "campaign_details"
        },
      },

      {
        $unwind: {
          path: "$brand_association_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "campaign",
          localField: "brand_association_details.campaign_id",
          foreignField: "_id",
          as: "campaign_details",
        },
      },
      {
        $unwind: {
          path: "$campaign_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "subscriptionplans",
          localField: "brand_details.plan_id",
          foreignField: "_id",
          as: "plan_details",
        },
      },
      {
        $unwind: {
          path: "$plan_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "coupon",
          localField: "couponId",
          foreignField: "_id",
          as: "coupondetalis",
        },
      },
      {
        $unwind: {
          path: "$coupondetalis",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    let projection = {
      $project: {
        affiliate_id: "$affiliate_id",
        brand_id: "$brand_id",
        order_id: "$order_id",
        currency: "$currency",
        price: "$price",
        campaignId: "$brand_association_details.campaign_id",
        brand_association_details: {
          _id: "$brand_association_details._id",
          campaign_id: "$brand_association_details.campaign_id",
        },
        campaign_details: "$campaign_details",
        commission: { $toString: "$campaign_details.commission" },
        discount: "$discount",
        event: "$event",
        timestamp: "$timestamp",
        urlParams: "$urlParams",
        data: "$data",
        affiliate_name: "$affiliate_details.fullName",
        brand_name: "$brand_details.fullName",
        brand_details: {
          _id: "$brand_details._id",
          plan_id: "$brand_details.plan_id",
        },
        plan_details: "$plan_details",
        isDeleted: "$isDeleted",
        status: "$status",
        addedBy: "$addedBy",
        updatedBy: "$updatedBy",
        updatedAt: "$updatedAt",
        createdAt: "$createdAt",
        commission_status: "$commission_status",
        commission_paid: "$commission_paid",
        admin_paid: "$admin_paid",
        lead_id: "$lead_id",
        amount_of_commission: "$amount_of_commission",
        commission_type: "$commission_type",
        couponId: "$couponId",
        couponDetails: "$coupondetalis",
      },
    };

    pipeline.push(projection);
    pipeline.push({
      $match: query,
    });

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);

      pipeline.push({
        $addFields: {
          timestampAsDate: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$timestamp", null] },
                  { $ne: ["$timestamp", ""] },
                ],
              },
              then: { $toDate: "$timestamp" },
              else: null,
            },
          },
        },
      });

      pipeline.push({
        $match: {
          timestampAsDate: {
            $gte: start,
            $lte: end,
          },
        },
      });
    }

    pipeline.push({
      $sort: sortquery,
    });

    let totalresult = await db
      .collection("affiliatelink")
      .aggregate(pipeline)
      .toArray();

    pipeline.push({
      $skip: Number(skipNo),
    });
    pipeline.push({
      $limit: Number(count),
    });

    let result = await db
      .collection("affiliatelink")
      .aggregate(pipeline)
      .toArray();
    const planData = await SubscriptionPlans.findOne({
      id: req.identity.plan_id,
    });
    const commission_override = planData?.commission_override;
    if (export_to_xls === "yes") {
      let transactionData = [];
      let counter = 1;
      for (let obj of result) {
        transactionData.push({
          createdAt: obj.timestamp
            ? moment(obj.timestamp).format("D-MM-YYYY")
            : moment(obj.createdAt).format("D-MM-YYYY"),
          affiliate: obj?.affiliate_name,
          brand_name: obj?.brand_name,
          currency: obj?.currency || "USD",
          price: obj?.price,
          order_id: obj?.order_id,
          commission: obj?.commission
            ? obj?.commission_type === "amount"
              ? `$${obj?.commission}`
              : `${obj?.commission}%`
            : "--",
          // amount_of_commission: obj?.amount_of_commission,
          amount_of_commission: calculatetotalCommission(
            obj?.commission_type,
            obj?.price,
            obj?.commission,
            commission_override
          ),
          commission_paid: obj?.commission_paid,
          commission_status: obj?.commission_status,
          counter: counter,
        });

        counter++;
      }

      let excelFileName = `TransactionData.xlsx`;
      let workbook = new excel.Workbook();
      let worksheet = workbook.addWorksheet("Logs");

      worksheet.columns = [
        {
          header: "Serial No.",
          key: "counter",
          width: 15,
          style: { alignment: { horizontal: "center" } },
        },
        { header: "Affiliate", key: "affiliate", width: 10 },
        {
          header: "Brand",
          key: "brand_name",
          width: 10,
          style: { alignment: { horizontal: "center" } },
        },
        { header: "Order price", key: "price", width: 25 },
        { header: "Order Id", key: "order_id", width: 25 },
        { header: "Transaction Date", key: "createdAt", width: 25 },
        { header: "Commission", key: "commission", width: 25 },
        { header: "Commission paid", key: "amount_of_commission", width: 25 },
        { header: "Commission Status", key: "commission_status", width: 25 },
        { header: "Payment Status", key: "commission_paid", width: 25 },
      ];
      worksheet.addRows(transactionData);
      // Sending the response as an Excel file
      try {
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${excelFileName}`
        );

        await workbook.xlsx.write(res);
        return res.status(200).end();
      } catch (err) {
        return response.failed(null, err, req, res);
      }
    } else {
      let resData = {
        total_count: totalresult ? totalresult.length : 0,
        data: result ? result : [],
      };
      if (!req.param("page") && !req.param("count")) {
        resData.data = totalresult ? totalresult : [];
      }
      return response.success(
        resData,
        constants.AFFILIATELINK.FETCHED,
        req,
        res
      );
    }
  } catch (error) {
    console.log(error, "==df");
    return response.failed(null, `${error}`, req, res);
  }
};

exports.findGraph = async (req, res) => {
  try {
    const { startDate, endDate, filter, brand_id, affiliate_id } = req.query;

    const moment = require("moment");
    let start, end;
    let filterType = filter || "this_month";

    if (startDate && endDate) {
      start = moment(startDate, "YYYY-MM-DD").startOf("day").toDate();
      end = moment(endDate, "YYYY-MM-DD").endOf("day").toDate();
    } else {
      switch (filterType) {
        case "this_week":
          start = moment().startOf("week").toDate();
          end = moment().endOf("week").toDate();
          break;
        case "last_week":
          start = moment().subtract(1, "week").startOf("week").toDate();
          end = moment().subtract(1, "week").endOf("week").toDate();
          break;
        case "this_month":
          start = moment().startOf("month").toDate();
          end = moment().endOf("month").toDate();
          break;
        case "last_month":
          start = moment().subtract(1, "month").startOf("month").toDate();
          end = moment().subtract(1, "month").endOf("month").toDate();
          break;
        case "this_year":
          start = moment().startOf("year").toDate();
          end = moment().endOf("year").toDate();
          break;
        case "last_year":
          start = moment().subtract(1, "year").startOf("year").toDate();
          end = moment().subtract(1, "year").endOf("year").toDate();
          break;
        default:
          start = moment().startOf("month").toDate();
          end = moment().endOf("month").toDate();
      }
    }
    let matchConditions = {};
    if (brand_id) {
      matchConditions.brand_id = new ObjectId(brand_id);
    }
    if (affiliate_id) {
      matchConditions.affiliate_id = new ObjectId(affiliate_id);
    }

    const result = await db
      .collection("affiliatelink")
      .aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $match: matchConditions,
        },
        {
          $group: {
            _id: "$source", // You can change this to "campaign" or any field that makes sense
            totalAmount: { $sum: "$price" },
            count: { $sum: 1 },
            firstCreatedAt: { $first: "$createdAt" },
          },
        },
        {
          $project: {
            totalAmount: 1,
            count: 1,
            createdAt: "$firstCreatedAt",
            _id: 0,
          },
        },
      ])
      .toArray();

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.log(err);
    return response.failed(null, `${error}`, req, res);
  }
};

exports.findOne = async function (req, res) {
  try {
    if (!req.query.id) {
      return response.failed(
        null,
        "Affiliatelink id is required.",
        req,
        res
      );
    }
    const affiliateLink = await AffiliateLink.findOne({
      id: req.query.id,
      isDeleted: false,
    }).populate("couponId");
    console.log("affiliateLink",affiliateLink)
    if (!affiliateLink) {
      return response.failed(
        null,
        "Invalid affiliatelink id.",
        req,
        res
      );
    }
    return response.success(
      affiliateLink,
      constants.AFFILIATELINK.FETCHED,
      req,
      res
    );
  } catch (error) {
    console.log("error", error);
    return response.failed(null, `${error}`, req, res);
  }
};

exports.update = async function (req, res) {
  try {
    const { event, timestamp, urlParams, data, couponId } = req.body;

    if (!event || !timestamp || !urlParams || !data) {
      return res
        .status(400)
        .json({ error: constants.AFFILIATELINK.MISSING_FIELDS });
    }

    if (couponId) {
      const couponCheck = await Coupon.findOne({ _id: couponId });
      if (!couponCheck) {
        return response.failed(
          null,
          constants.AFFILIATELINK.COUPONINVALID,
          req,
          res
        );
      }
    }

    const updatedAffiliateLink = await AffiliateLink.updateOne({
      id: req.query.id,
      isDeleted: false,
    }).set(req.body);

    if (!updatedAffiliateLink) {
      response.failed(
        updatedAffiliateLink,
        constants.AFFILIATELINK.NOT_FOUND,
        req,
        res
      );
    }
    return response.success(
      updatedAffiliateLink,
      constants.AFFILIATELINK.UPDATED,
      req,
      res
    );
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};

exports.destroy = async function (req, res) {
  try {
    if (!req.query.id) {
      return response.failed(
        null,
        constants.AFFILIATEINVITE.ID_REQUIRED,
        req,
        res
      );
    }
    const updatedAffiliateLink = await AffiliateLink.updateOne({
      id: req.query.id,
    }).set({ isDeleted: true });
    if (!updatedAffiliateLink) {
      return response.success(
        null,
        constants.AFFILIATELINK.NOT_FOUND,
        req,
        res
      );
    }
    return response.success(null, constants.AFFILIATELINK.DELETED, req, res);
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};

exports.report = async function (req, res) {
  let query = {};
  let count = req.param("count") || 10;
  let page = req.param("page") || 1;
  let skipNo = (Number(page) - 1) * Number(count);
  let {
    search,
    sortBy,
    status,
    isDeleted,
    format,
    campaignId,
    affiliate_id,
    brand_id,
    startDate,
    endDate,
  } = req.query;

  // Handle search
  if (search) {
    search = Services.Utils.remove_special_char_exept_underscores(search);
    query.$or = [
      { event: { $regex: search, $options: "i" } },
      { "urlParams.page": { $regex: search, $options: "i" } },
      { "data.page": { $regex: search, $options: "i" } },
    ];
  }

  // Handle isDeleted
  if (isDeleted) {
    query.isDeleted = isDeleted === "true";
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

  // Handle status
  if (status) {
    query.status = status;
  }

  let group_query = {};
  group_query.campaignId = "$campaignId";
  group_query.affiliate_id = "$affiliate_id";
  group_query.brand_id = "$brand_id";
  if (campaignId) {
    query.campaignId = {
      $in: campaignId.split(",").map((id) => new ObjectId(id)),
    };
  } else if (affiliate_id) {
    query.affiliate_id = {
      $in: affiliate_id.split(",").map((id) => new ObjectId(id)),
    };
  } else if (brand_id) {
    query.brand_id = { $in: brand_id.split(",").map((id) => new ObjectId(id)) };
  }

  // Handle format
  if (format) {
    query.format = format;
  }

  if (startDate && endDate) {
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    query.createdAt = { $gte: startDate, $lte: endDate };
  }

  let pipeline = [
    {
      $project: {
        id: "$_id",
        affiliate_id: "$affiliate_id",
        brand_id: "$brand_id",
        order_id: "$order_id",
        currency: "$currency",
        price: "$price",
        campaignId: "$campaignId",
        discount: "$discount",
        event: "$event",
        timestamp: "$timestamp",
        urlParams: "$urlParams",
        data: "$data",
        isDeleted: "$isDeleted",
        status: "$status",
        addedBy: "$addedBy",
        updatedBy: "$updatedBy",
        updatedAt: "$updatedAt",
        createdAt: "$createdAt",
        month: { $month: "$createdAt" },
        couponId: "$couponId",
      },
    },
    {
      $match: query,
    },
    {
      $facet: {
        data: [
          {
            $group: {
              _id: group_query,
              revenue: { $sum: "$price" },
              click_count: { $sum: 1 },
            },
          },
          // {
          //     $unset: ['_id']
          // },
          {
            $skip: Number(skipNo),
          },
          {
            $limit: Number(count),
          },
          {
            $project: {
              affiliate_id: "$_id.affiliate_id",
              campaignId: "$_id.campaignId",
              brand_id: "$_id.brand_id",
              revenue: "$revenue",
              click_count: "$click_count",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "affiliate_id",
              foreignField: "_id",
              as: "affiliate_details",
            },
          },
          {
            $unwind: {
              path: "$affiliate_details",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "campaign",
              localField: "campaignId",
              foreignField: "_id",
              as: "campaign_details",
            },
          },
          {
            $unwind: {
              path: "$campaign_details",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "brand_id",
              foreignField: "_id",
              as: "brand_details",
            },
          },
          {
            $unwind: {
              path: "$brand_details",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unset: ["_id", "brand_id", "affiliate_id", "campaignId"],
          },
        ],
      },
    },
  ];

  let projection = {
    $project: {
      data: "$data",
    },
  };

  pipeline.push(projection);

  pipeline.push({ $sort: sortquery });
  try {
    // pipeline.push({
    //     $skip: Number(skipNo)
    // });
    // pipeline.push({
    //     $limit: Number(count)
    // });

    let result = await db
      .collection("affiliatelink")
      .aggregate(pipeline, { allowDiskUse: true })
      .toArray();
    let resData = {
      total: result[0] ? result[0].data.length : 0,
      data: result[0] ? result[0].data : [],
    };
    if (!req.param("page") && !req.param("count")) {
      resData.data = result[0].data ? result[0].data : [];
    }
    return Response.success(resData, constants.COMMON.SUCCESS, req, res);
  } catch (error) {
    console.error(error, "=================err");
    return Response.failed(null, `${error}`, req, res);
  }
};

exports.updateCommission = async (req, res) => {
  try {
    console.log("hlwo")
    const { commission_status, commission_paid, id, campaignId } = req.body;
    if ((commission_status || commission_paid) && !id) {
      return res
        .status(400)
        .json({ error: constants.AFFILIATELINK.MISSING_FIELDS });
    }
    const affiliateLinkCheck = await AffiliateLink.findOne({
      isDeleted: false,
      id: id,
    });
    console.log("affiliateLinkCheck", affiliateLinkCheck);
    let updateFields = { commission_status: commission_status };
    let amount = 0;
    
     const updatedAffiliateLink = await AffiliateLink.updateOne({
        id: id,
        isDeleted: false,
      }).set(updateFields);

      // Check if update was successful
      if (!updatedAffiliateLink) {
        throw "Failed to update affiliate link";
      }

    if (commission_status == "accepted") {
      const get_campaign = await Campaign.findOne({ id: campaignId });
      if (!get_campaign) {
        throw "Campaigin not found";
      }

      const commission_type = get_campaign.commission_type;

      if (get_campaign.tiered_commission_enabled === true) {
        const revenueClicks = affiliateLinkCheck.price;
        let totalCalculatedCommission = 0;
        let leadCommission = 0;
        let purchaseCommission = 0;

        // Get event types from array
        const eventTypes = get_campaign.event_type || [];

        // Calculate lead commission if "lead" exists in event_type array
        if (eventTypes.includes("lead")) {
          const leadCount = affiliateLinkCheck.leadCount || 1;
          const result = calculateEventCommission(
            "lead",
            leadCount,
            get_campaign.lead_tiers,
            get_campaign.tier_calculation_type,
            revenueClicks
          );
          leadCommission = result.commission;
        }

        // Calculate purchase commission if "purchase" exists in event_type array
        if (eventTypes.includes("purchase")) {
          const purchaseAmount = revenueClicks;
          const result = calculateEventCommission(
            "purchase",
            purchaseAmount,
            get_campaign.tiers,
            get_campaign.tier_calculation_type,
            revenueClicks
          );
          purchaseCommission = result.commission;
        }

        // Calculate total commission
        totalCalculatedCommission = leadCommission + purchaseCommission;

        // Store results in updateFields
        updateFields.commission = totalCalculatedCommission;
        updateFields.lead_commission = leadCommission;
        updateFields.purchase_commission = purchaseCommission;
        updateFields.applied_event_types = eventTypes;
        
        // Use the calculated amount for the transaction
        amount = totalCalculatedCommission;

        console.log({
          eventTypes,
          leadCommission,
          purchaseCommission,
          totalCommission: totalCalculatedCommission,
          calculationType: get_campaign.tier_calculation_type
        });
      } else {
        // Fallback to old logic if tiered is disabled
        if (affiliateLinkCheck.amount_of_commission) {
          amount = affiliateLinkCheck.amount_of_commission;
        } else if (commission_type == "percentage") {
          const percentage_value =
            (get_campaign.commission / 100) * +affiliateLinkCheck.price;
          amount = percentage_value;
        } else {
          amount = get_campaign.commission;
        }
      }

      // Update the affiliate link with all calculated values
     

      // const stripe_fee = calculateStripeFee(amount)
      let total_amount = amount;

      // Find user acitve subscription plan
      // const user_active_subscription = await Subscriptions.findOne({ user_id: req.identity?.id, status: "active" }).populate("subscription_plan_id");
      // let commission_override = 0;
      // if (user_active_subscription) {
      //   commission_override = user_active_subscription?.subscription_plan_id?.commission_override;
      // } else {
      //   return response.failed(null, "You don't have any active plan", req, res);
      // }

      // const commission_override_amount = (commission_override / 100) * total_amount
      // total_amount += +commission_override_amount
      // Get Admin Details
      let get_admin = await Users.findOne({ role: "admin" });

      // Create invoices directory if it doesn't exist
      const invoicesDir = path.join(__dirname, "../../assets", "invoices");
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const filename = `invoice_${id}_${Date.now()}.pdf`;
      const outputPath = path.join(invoicesDir, filename);

      const payload = {
        commission: amount,
        // stripe_fees: stripe_fee,
        // platform_fee: commission_override,
        total_amount,
      };
      // Generate PDF and wait for it to complete
      await htmlToPdf(invoice_itm_html(payload), outputPath);
      const custom_invoice_url = `invoices/${filename}`;

      console.log("PDF created:", custom_invoice_url);

      let data = {
        user_id: req.identity?.id,
        paid_to: get_admin.id || "654227e78fd3b1018600710d",
        transaction_type: "pay_commission",
        transaction_id: "",
        stripe_charge_id: "",
        currency: get_campaign?.currencies,
        amount: total_amount.toFixed(2),
        transaction_status: "pending",
        special_plan_id: null,
        subscription_id: null,
        stripe_subscription_id: "",
        addedBy: req.identity?.id,
        updatedBy: null,
        paypal_transaction_id: "",
        paypal_transaction_status: "",
        affiliateLinkId: id,
        custom_invoice_url,
        campaign: campaignId || null,
      };

      await Transactions.create(data);
    }

    return response.success(
      updatedAffiliateLink,
      constants.AFFILIATELINK.UPDATED,
      req,
      res
    );
  } catch (error) {
    console.log("error", error);
    return response.failed(null, `${error}`, req, res);
  }
};

function calculateStripeFee(amount) {
  const PERCENT_FEE = 0.029; // 2.9%
  const FIXED_FEE = 0.3; // $0.30

  return amount * PERCENT_FEE + FIXED_FEE;
}

const invoice_itm_html = (payload) => {
  // const { commission, stripe_fees, platform_fee, total_amount } = payload

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #f6f8fb;
      margin: 0;
      padding: 20px;
    }

    .invoice-container {
      max-width: 600px;
      margin: auto;
      background: #ffffff;
      border-radius: 10px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.08);
      padding: 30px;
    }

    .invoice-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #eee;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }

    .invoice-header img {
      height: 40px;
    }

    .invoice-header h2 {
      margin: 0;
      font-size: 22px;
      color: #333;
    }

    .invoice-details {
      margin-bottom: 25px;
    }

    .invoice-details p {
      margin: 4px 0;
      color: #666;
      font-size: 14px;
    }

    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .invoice-table th,
    .invoice-table td {
      padding: 12px 10px;
      font-size: 14px;
    }

    .invoice-table th {
      text-align: left;
      color: #555;
      border-bottom: 1px solid #ddd;
    }

    .invoice-table td {
      text-align: right;
      color: #333;
    }

    .invoice-table tr:not(:last-child) td {
      border-bottom: 1px solid #f0f0f0;
    }

    .total-row td {
      font-weight: bold;
      font-size: 16px;
      border-top: 2px solid #333;
      padding-top: 15px;
    }

    .footer-note {
      text-align: center;
      font-size: 12px;
      color: #888;
      margin-top: 30px;
    }

    @page { margin: 0; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="invoice-header">
      <img src=${credentials.BACK_WEB_URL}/images/logo.png alt="Upfilly Logo" />
      <h2>Invoice</h2>
    </div>

    <div class="invoice-details">
      <p><strong>Invoice ID:</strong> #INV-${Date.now()}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString("en-CA")}</p>
    </div>

    <table class="invoice-table">
      <tr>
        <th>Description</th>
        <th>Amount</th>
      </tr>
      <tr>
        <td style="text-align:left;">Main Amount</td>
        <td>${payload.commission}</td>
      </tr>
      <tr class="total-row">
        <td style="text-align:left;">Total Payout</td>
        <td>${payload.total_amount}</td>
      </tr>
    </table>

    <div class="footer-note">
      Powered by Upfilly • Payments processed securely via Stripe
    </div>
  </div>
</body>
</html>
`;
};

async function htmlToPdf(html, outputPath) {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: process.env.LOCAL
      ? "/usr/bin/google-chrome"
      : "/usr/bin/chromium-browser",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
    });

    fs.writeFileSync(outputPath, pdfBuffer);
    return outputPath;
  } finally {
    await browser.close();
  }
}

// exports.find_2_admin = async function (req, res) {
//   try {
//     console.log("aaa")
//     let query = {};
//     let count = parseInt(req.query.count) || 10;
//     let page = parseInt(req.query.page) || 1;

//     let skipNo = (page - 1) * count;

//     let { search, sortBy, status, isDeleted, format, addedBy, affiliate_id, brand_id, campaignId, commission_status, commission_paid, admin_paid, export_to_xls, startDate, endDate, couponId } = req.query;

//     // Handle search
//     if (search) {
//       search = Services.Utils.remove_special_char_exept_underscores(search);
//       query.$or = [
//         { event: { $regex: search, '$options': 'i' } },
//         { 'urlParams.page': { $regex: search, '$options': 'i' } },
//         { 'data.page': { $regex: search, '$options': 'i' } }
//       ];
//     }

//     // Handle isDeleted
//     if (isDeleted) {
//       query.isDeleted = isDeleted === 'true';
//     } else {
//       query.isDeleted = false;
//     }

//     let sortquery = {};
//     if (sortBy && typeof sortBy === "string") {
//       const [rawField, rawOrder] = sortBy.trim().split(/\s+/);
//       const field = rawField || "createdAt";
//       const sortType = rawOrder?.toLowerCase() === "asc" ? 1 : -1;
//       sortquery[field] = sortType;
//     } else {
//       sortquery = { updatedAt: -1 };
//     }

//     // Handle status
//     if (status) {
//       query.status = status;
//     }

//     if (couponId) {
//       query.couponId = new ObjectId(couponId);
//     }

//     // Handle addedBy
//     if (addedBy) {
//       query.addedBy = new ObjectId(addedBy);
//     }
//     if (brand_id) {
//       query.brand_id = new ObjectId(brand_id);
//     }
//     if (affiliate_id) {
//       query.affiliate_id = new ObjectId(affiliate_id);
//     }
//     if (campaignId) {
//       query.campaignId = new ObjectId(campaignId);
//     }

//     if (commission_status) {
//       query.commission_status = commission_status
//     }

//     if (commission_paid) {
//       query.commission_paid = commission_paid
//     }
//     if (admin_paid) {
//       query.admin_paid = admin_paid
//     }

//     // Handle format
//     if (format) {
//       query.format = format;
//     }

//     // Get plan data for commission calculation
//     const planData = await SubscriptionPlans.findOne({ id: req.identity.plan_id });
//     const commission_override = planData?.commission_override || 0;

//     // Base pipeline for all aggregations
//     let basePipeline = [
//       {
//         $lookup: {
//           from: "users",
//           localField: "affiliate_id",
//           foreignField: "_id",
//           as: "affiliate_details",
//         },
//       },
//       {
//         $unwind: {
//           path: "$affiliate_details",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "brand_id",
//           foreignField: "_id",
//           as: "brand_details",
//         },
//       },
//       {
//         $unwind: {
//           path: "$brand_details",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $lookup: {
//           from: "brandaffiliateassociation",
//           let: { brand_id: "$brand_id", affiliate_id: "$affiliate_id", isActive: true },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$brand_id", "$$brand_id"] },
//                     { $eq: ["$affiliate_id", "$$affiliate_id"] },
//                     { $eq: ["$isActive", "$$isActive"] }
//                   ]
//                 }
//               }
//             },
//           ],
//           as: "brand_association_details"
//         }
//       },
//       {
//         $unwind: {
//           path: "$brand_association_details",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $lookup: {
//           from: "campaign",
//           localField: "brand_association_details.campaign_id",
//           foreignField: "_id",
//           as: "campaign_details",
//         },
//       },
//       {
//         $unwind: {
//           path: "$campaign_details",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $lookup: {
//           from: "subscriptionplans",
//           localField: "brand_details.plan_id",
//           foreignField: "_id",
//           as: "plan_details",
//         },
//       },
//       {
//         $unwind: {
//           path: "$plan_details",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $lookup: {
//           from: "coupon",
//           localField: "couponId",
//           foreignField: "_id",
//           as: "coupondetalis",
//         },
//       },
//       {
//         $unwind: {
//           path: "$coupondetalis",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $project: {
//           // Include affiliatelink document ID
//           affiliatelink_id: "$_id",

//           affiliate_id: "$affiliate_id",
//           affiliate_name: "$affiliate_details.fullName",
//           affiliate_email: "$affiliate_details.email",

//           brand_id: "$brand_id",
//           brand_name: "$brand_details.fullName",
//           brand_email: "$brand_details.email",
//           brand_company: "$brand_details.companyName",

//           order_id: "$order_id",
//           currency: "$currency",
//           price: "$price",

//           campaignId: "$brand_association_details.campaign_id",
//           brand_association_details: {
//             _id: "$brand_association_details._id",
//             campaign_id: "$brand_association_details.campaign_id"
//           },
//           campaign_details: "$campaign_details",
//           commission: { $toString: "$campaign_details.commission" },
//           discount: "$discount",
//           event: '$event',
//           timestamp: '$timestamp',
//           urlParams: '$urlParams',
//           data: '$data',
//           brand_details: {
//             _id: "$brand_details._id",
//             plan_id: "$brand_details.plan_id",
//             // Include affiliatelink ID in brand details for easy reference
//             affiliatelink_id: "$_id"
//           },
//           plan_details: "$plan_details",
//           isDeleted: '$isDeleted',
//           status: '$status',
//           addedBy: '$addedBy',
//           updatedBy: '$updatedBy',
//           updatedAt: '$updatedAt',
//           createdAt: '$createdAt',
//           commission_status: "$commission_status",
//           commission_paid: "$commission_paid",
//           admin_paid: "$admin_paid", // Add this field
//           lead_id: "$lead_id",
//           amount_of_commission: "$amount_of_commission",
//           commission_type: "$commission_type",
//           couponId: "$couponId",
//           couponDetails: "$coupondetalis"
//         },
//       },
//       {
//         $match: query
//       }
//     ];

//     // Add date filtering if provided
//     if (startDate && endDate) {
//       const start = new Date(startDate);
//       start.setUTCHours(0, 0, 0, 0);

//       const end = new Date(endDate);
//       end.setUTCHours(23, 59, 59, 999);

//       basePipeline.push({
//         $addFields: {
//           timestampAsDate: {
//             $cond: {
//               if: { $and: [{ $ne: ["$timestamp", null] }, { $ne: ["$timestamp", ""] }] },
//               then: { $toDate: "$timestamp" },
//               else: null
//             }
//           }
//         }
//       });

//       basePipeline.push({
//         $match: {
//           timestampAsDate: {
//             $gte: start,
//             $lte: end
//           }
//         }
//       });
//     }

//     // Add commission calculation to base pipeline
//     basePipeline.push({
//       $addFields: {
//         calculated_commission: {
//           $cond: {
//             if: { $and: [
//               { $ne: ["$amount_of_commission", null] },
//               { $ne: ["$amount_of_commission", undefined] }
//             ]},
//             then: { $toDouble: "$amount_of_commission" },
//             else: {
//               $cond: {
//                 if: { $and: [
//                   { $ne: ["$price", null] },
//                   { $ne: ["$commission", null] },
//                   { $ne: ["$commission_type", null] }
//                 ]},
//                 then: {
//                   $cond: {
//                     if: { $eq: ["$commission_type", "amount"] },
//                     then: { $toDouble: "$commission" },
//                     else: {
//                       $cond: {
//                         if: { $eq: ["$commission_type", "percentage"] },
//                         then: {
//                           $multiply: [
//                             { $divide: [{ $toDouble: "$price" }, 100] },
//                             { $toDouble: "$commission" }
//                           ]
//                         },
//                         else: 0
//                       }
//                     }
//                   }
//                 },
//                 else: 0
//               }
//             }
//           }
//         }
//       }
//     });

//     // Apply commission override if needed
//     if (commission_override > 0) {
//       basePipeline.push({
//         $addFields: {
//           calculated_commission: {
//             $multiply: [
//               "$calculated_commission",
//               { $divide: [commission_override, 100] }
//             ]
//           }
//         }
//       });
//     }

//     // Create a pipeline for affiliate-wise summary
//     let affiliateSummaryPipeline = [...basePipeline];

//     affiliateSummaryPipeline.push({
//       $group: {
//         _id: {
//           affiliate_id: "$affiliate_id",
//           affiliate_name: "$affiliate_name",
//           affiliate_email: "$affiliate_email"
//         },
//         total_transactions: { $sum: 1 },
//         total_order_value: { $sum: { $toDouble: "$price" } },
//         total_commission_earned: { $sum: "$calculated_commission" },

//         // Commission status breakdown
//         pending_commission: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_status", "pending"] }, "$calculated_commission", 0]
//           }
//         },
//         pending_count: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_status", "pending"] }, 1, 0]
//           }
//         },

//         accepted_commission: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_status", "accepted"] }, "$calculated_commission", 0]
//           }
//         },
//         accepted_count: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_status", "accepted"] }, 1, 0]
//           }
//         },

//         rejected_commission: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_status", "rejected"] }, "$calculated_commission", 0]
//           }
//         },
//         rejected_count: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_status", "rejected"] }, 1, 0]
//           }
//         },

//         // Commission paid status
//         commission_paid_amount: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_paid", "paid"] }, "$calculated_commission", 0]
//           }
//         },
//         commission_paid_count: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_paid", "paid"] }, 1, 0]
//           }
//         },

//         commission_pending_amount: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_paid", "pending"] }, "$calculated_commission", 0]
//           }
//         },
//         commission_pending_count: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_paid", "pending"] }, 1, 0]
//           }
//         },

//         // Admin paid status - FIXED: Changed from boolean to string comparison
//         admin_paid_amount: {
//           $sum: {
//             $cond: [{ $eq: ["$admin_paid", "paid"] }, "$calculated_commission", 0]
//           }
//         },
//         admin_paid_count: {
//           $sum: {
//             $cond: [{ $eq: ["$admin_paid", "paid"] }, 1, 0]
//           }
//         },

//         admin_pending_amount: {
//           $sum: {
//             $cond: [{ $eq: ["$admin_paid", "pending"] }, "$calculated_commission", 0]
//           }
//         },
//         admin_pending_count: {
//           $sum: {
//             $cond: [{ $eq: ["$admin_paid", "pending"] }, 1, 0]
//           }
//         },

//         admin_failed_amount: {
//           $sum: {
//             $cond: [{ $eq: ["$admin_paid", "failed"] }, "$calculated_commission", 0]
//           }
//         },
//         admin_failed_count: {
//           $sum: {
//             $cond: [{ $eq: ["$admin_paid", "failed"] }, 1, 0]
//           }
//         },

//         // First and last transaction
//         first_transaction_date: { $min: "$timestampAsDate" },
//         last_transaction_date: { $max: "$timestampAsDate" },

//         // Store all brands for this affiliate
//         brands: { $addToSet: {
//           brand_id: "$brand_id",
//           brand_name: "$brand_name"
//         }}
//       }
//     });

//     affiliateSummaryPipeline.push({
//       $project: {
//         affiliate_id: "$_id.affiliate_id",
//         affiliate_name: "$_id.affiliate_name",
//         affiliate_email: "$_id.affiliate_email",
//         total_transactions: 1,
//         total_order_value: { $round: ["$total_order_value", 2] },
//         total_commission_earned: { $round: ["$total_commission_earned", 2] },

//         commission_status_summary: {
//           pending: {
//             count: "$pending_count",
//             amount: { $round: ["$pending_commission", 2] }
//           },
//           accepted: {
//             count: "$accepted_count",
//             amount: { $round: ["$accepted_commission", 2] }
//           },
//           rejected: {
//             count: "$rejected_count",
//             amount: { $round: ["$rejected_commission", 2] }
//           }
//         },

//         commission_paid_summary: {
//           paid: {
//             count: "$commission_paid_count",
//             amount: { $round: ["$commission_paid_amount", 2] }
//           },
//           pending: {
//             count: "$commission_pending_count",
//             amount: { $round: ["$commission_pending_amount", 2] }
//           }
//         },

//         admin_paid_summary: {
//           paid: {
//             count: "$admin_paid_count",
//             amount: { $round: ["$admin_paid_amount", 2] }
//           },
//           pending: {
//             count: "$admin_pending_count",
//             amount: { $round: ["$admin_pending_amount", 2] }
//           },
//           failed: {
//             count: "$admin_failed_count",
//             amount: { $round: ["$admin_failed_amount", 2] }
//           }
//         },

//         first_transaction_date: 1,
//         last_transaction_date: 1,
//         brands_count: { $size: "$brands" },
//         brands: 1,
//         _id: 0
//       }
//     });

//     affiliateSummaryPipeline.push({
//       $sort: { total_commission_earned: -1 }
//     });

//     // Create a pipeline for brand-wise summary per affiliate (with affiliatelink IDs)
//     let brandPerAffiliatePipeline = [...basePipeline];

//     brandPerAffiliatePipeline.push({
//       $group: {
//         _id: {
//           affiliate_id: "$affiliate_id",
//           affiliate_name: "$affiliate_name",
//           brand_id: "$brand_id",
//           brand_name: "$brand_name",
//           brand_company: "$brand_company"
//         },
//         transaction_count: { $sum: 1 },
//         total_order_value: { $sum: { $toDouble: "$price" } },
//         total_commission_payable: { $sum: "$calculated_commission" },

//         // Store all affiliatelink IDs for this brand-affiliate relationship
//         affiliatelink_ids: { $push: "$affiliatelink_id" },

//         // Commission status breakdown
//         pending_commission: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_status", "pending"] }, "$calculated_commission", 0]
//           }
//         },
//         pending_count: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_status", "pending"] }, 1, 0]
//           }
//         },

//         accepted_commission: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_status", "accepted"] }, "$calculated_commission", 0]
//           }
//         },
//         accepted_count: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_status", "accepted"] }, 1, 0]
//           }
//         },

//         rejected_commission: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_status", "rejected"] }, "$calculated_commission", 0]
//           }
//         },
//         rejected_count: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_status", "rejected"] }, 1, 0]
//           }
//         },

//         // Commission paid status
//         commission_paid_amount: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_paid", "paid"] }, "$calculated_commission", 0]
//           }
//         },
//         commission_pending_amount: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_paid", "pending"] }, "$calculated_commission", 0]
//           }
//         },

//         // Admin paid status - FIXED
//         admin_paid_amount: {
//           $sum: {
//             $cond: [{ $eq: ["$admin_paid", "paid"] }, "$calculated_commission", 0]
//           }
//         },
//         admin_pending_amount: {
//           $sum: {
//             $cond: [{ $eq: ["$admin_paid", "pending"] }, "$calculated_commission", 0]
//           }
//         },
//         admin_failed_amount: {
//           $sum: {
//             $cond: [{ $eq: ["$admin_paid", "failed"] }, "$calculated_commission", 0]
//           }
//         }
//       }
//     });

//     brandPerAffiliatePipeline.push({
//       $group: {
//         _id: {
//           affiliate_id: "$_id.affiliate_id",
//           affiliate_name: "$_id.affiliate_name"
//         },
//         brand_details: {
//           $push: {
//             brand_id: "$_id.brand_id",
//             brand_name: "$_id.brand_name",
//             brand_company: "$_id.brand_company",
//             transaction_count: "$transaction_count",
//             total_order_value: { $round: ["$total_order_value", 2] },
//             total_commission_payable: { $round: ["$total_commission_payable", 2] },
//             affiliatelink_ids: "$affiliatelink_ids", // Include affiliatelink IDs

//             commission_status_summary: {
//               pending: {
//                 count: "$pending_count",
//                 amount: { $round: ["$pending_commission", 2] }
//               },
//               accepted: {
//                 count: "$accepted_count",
//                 amount: { $round: ["$accepted_commission", 2] }
//               },
//               rejected: {
//                 count: "$rejected_count",
//                 amount: { $round: ["$rejected_commission", 2] }
//               }
//             },

//             commission_paid_summary: {
//               paid: {
//                 amount: { $round: ["$commission_paid_amount", 2] }
//               },
//               pending: {
//                 amount: { $round: ["$commission_pending_amount", 2] }
//               }
//             },

//             admin_paid_summary: {
//               paid: {
//                 amount: { $round: ["$admin_paid_amount", 2] }
//               },
//               pending: {
//                 amount: { $round: ["$admin_pending_amount", 2] }
//               },
//               failed: {
//                 amount: { $round: ["$admin_failed_amount", 2] }
//               }
//             }
//           }
//         }
//       }
//     });

//     brandPerAffiliatePipeline.push({
//       $project: {
//         affiliate_id: "$_id.affiliate_id",
//         affiliate_name: "$_id.affiliate_name",
//         brand_details: 1,
//         _id: 0
//       }
//     });

//     // Run both summary pipelines in parallel
//     const [affiliateSummary, brandPerAffiliateSummary] = await Promise.all([
//       db.collection('affiliatelink').aggregate(affiliateSummaryPipeline).toArray(),
//       db.collection('affiliatelink').aggregate(brandPerAffiliatePipeline).toArray()
//     ]);

//     // Merge affiliate summary with brand details
//     const combinedAffiliateSummary = affiliateSummary.map(affiliate => {
//       const brandDetails = brandPerAffiliateSummary.find(b =>
//         b.affiliate_id.toString() === affiliate.affiliate_id.toString()
//       );

//       return {
//         ...affiliate,
//         brand_details: brandDetails ? brandDetails.brand_details : []
//       };
//     });

//     // Create overall summary
//     let overallSummaryPipeline = [...basePipeline];

//     overallSummaryPipeline.push({
//       $group: {
//         _id: null,
//         total_transactions: { $sum: 1 },
//         total_order_value: { $sum: { $toDouble: "$price" } },
//         total_commission: { $sum: "$calculated_commission" },

//         // Overall commission status
//         pending_total: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_status", "pending"] }, "$calculated_commission", 0]
//           }
//         },
//         accepted_total: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_status", "accepted"] }, "$calculated_commission", 0]
//           }
//         },
//         rejected_total: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_status", "rejected"] }, "$calculated_commission", 0]
//           }
//         },

//         // Overall commission paid status
//         commission_paid_total: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_paid", "paid"] }, "$calculated_commission", 0]
//           }
//         },
//         commission_pending_total: {
//           $sum: {
//             $cond: [{ $eq: ["$commission_paid", "pending"] }, "$calculated_commission", 0]
//           }
//         },

//         // Overall admin paid status
//         admin_paid_total: {
//           $sum: {
//             $cond: [{ $eq: ["$admin_paid", "paid"] }, "$calculated_commission", 0]
//           }
//         },
//         admin_pending_total: {
//           $sum: {
//             $cond: [{ $eq: ["$admin_paid", "pending"] }, "$calculated_commission", 0]
//           }
//         },
//         admin_failed_total: {
//           $sum: {
//             $cond: [{ $eq: ["$admin_paid", "failed"] }, "$calculated_commission", 0]
//           }
//         }
//       }
//     });

//     overallSummaryPipeline.push({
//       $project: {
//         _id: 0,
//         total_transactions: 1,
//         total_order_value: { $round: ["$total_order_value", 2] },
//         total_commission: { $round: ["$total_commission", 2] },

//         commission_status_summary: {
//           pending: { $round: ["$pending_total", 2] },
//           accepted: { $round: ["$accepted_total", 2] },
//           rejected: { $round: ["$rejected_total", 2] }
//         },

//         commission_paid_summary: {
//           paid: { $round: ["$commission_paid_total", 2] },
//           pending: { $round: ["$commission_pending_total", 2] }
//         },

//         admin_paid_summary: {
//           paid: { $round: ["$admin_paid_total", 2] },
//           pending: { $round: ["$admin_pending_total", 2] },
//           failed: { $round: ["$admin_failed_total", 2] }
//         }
//       }
//     });

//     const overallSummaryResult = await db.collection('affiliatelink').aggregate(overallSummaryPipeline).toArray();
//     const overallSummary = overallSummaryResult.length > 0 ? overallSummaryResult[0] : {
//       total_transactions: 0,
//       total_order_value: 0,
//       total_commission: 0,
//       commission_status_summary: { pending: 0, accepted: 0, rejected: 0 },
//       commission_paid_summary: { paid: 0, pending: 0 },
//       admin_paid_summary: { paid: 0, pending: 0, failed: 0 }
//     };

//     // Get paginated transaction data
//     let dataPipeline = [...basePipeline];

//     dataPipeline.push({
//       $sort: sortquery
//     });

//     // Get total count
//     let countPipeline = [...basePipeline];
//     countPipeline.push({ $count: "total_count" });
//     const totalCountResult = await db.collection('affiliatelink').aggregate(countPipeline).toArray();
//     const totalCount = totalCountResult.length > 0 ? totalCountResult[0].total_count : 0;

//     // Apply pagination only if page and count are provided
//     if (req.query.page && req.query.count) {
//       dataPipeline.push({
//         $skip: Number(skipNo)
//       });
//       dataPipeline.push({
//         $limit: Number(count)
//       });
//     }

//     let result = await db.collection('affiliatelink').aggregate(dataPipeline).toArray();

//     if (export_to_xls === "yes") {
//       let transactionData = [];
//       let counter = 1;
//       for (let obj of result) {
//         transactionData.push({
//           createdAt: obj.timestamp ? moment(obj.timestamp).format("D-MM-YYYY") : moment(obj.createdAt).format("D-MM-YYYY"),
//           affiliate: obj?.affiliate_name,
//           brand_name: obj?.brand_name,
//           currency: obj?.currency || "USD",
//           price: obj?.price,
//           order_id: obj?.order_id,
//           commission: obj?.commission ? obj?.commission_type === "amount" ? `$${obj?.commission}` : `${obj?.commission}%` : "--",
//           amount_of_commission: calculatetotalCommission(obj?.commission_type, obj?.price, obj?.commission, commission_override),
//           commission_paid: obj?.commission_paid,
//           commission_status: obj?.commission_status,
//           admin_paid: obj?.admin_paid, // Add admin_paid to export
//           counter: counter
//         });

//         counter++;
//       }

//       let excelFileName = `TransactionData.xlsx`;
//       let workbook = new excel.Workbook();
//       let worksheet = workbook.addWorksheet("Logs");

//       worksheet.columns = [
//         { header: "Serial No.", key: "counter", width: 15, style: { alignment: { horizontal: "center" } } },
//         { header: "Affiliate", key: "affiliate", width: 10 },
//         { header: "Brand", key: "brand_name", width: 10, style: { alignment: { horizontal: "center" } } },
//         { header: "Order price", key: "price", width: 25 },
//         { header: "Order Id", key: "order_id", width: 25 },
//         { header: "Transaction Date", key: "createdAt", width: 25 },
//         { header: "Commission", key: "commission", width: 25 },
//         { header: "Commission paid", key: "amount_of_commission", width: 25 },
//         { header: "Commission Status", key: "commission_status", width: 25 },
//         { header: "Payment Status", key: "commission_paid", width: 25 },
//         { header: "Admin Payment Status", key: "admin_paid", width: 25 }, // Add admin payment status column
//       ];
//       worksheet.addRows(transactionData);

//       try {
//         res.setHeader(
//           "Content-Type",
//           "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//         );
//         res.setHeader(
//           "Content-Disposition",
//           `attachment; filename=${excelFileName}`
//         );

//         await workbook.xlsx.write(res);
//         return res.status(200).end();
//       } catch (err) {
//         return response.failed(null, err, req, res)
//       }
//     } else {
//       let resData = {
//         total_count: totalCount,
//         overall_summary: overallSummary,
//         affiliate_summary: combinedAffiliateSummary,
//         data: result || []
//       };

//       if (!req.param('page') && !req.param('count')) {
//         resData.data = await db.collection('affiliatelink').aggregate([...basePipeline, { $sort: sortquery }]).toArray();
//       }

//       return response.success(resData, constants.AFFILIATELINK.FETCHED, req, res);
//     }
//   } catch (error) {
//     console.log(error, '==df')
//     return response.failed(null, `${error}`, req, res);
//   }
// };

exports.find_2_admin = async function (req, res) {
  try {
    console.log("aaa")
    let query = {};
    let count = parseInt(req.query.count) || 10;
    let page = parseInt(req.query.page) || 1;

    let skipNo = (page - 1) * count;

    let { search, sortBy, status, isDeleted, format, addedBy, affiliate_id, brand_id, campaignId, commission_status, commission_paid, admin_paid, export_to_xls, startDate, endDate, couponId } = req.query;

    // Handle search
    if (search) {
      search = Services.Utils.remove_special_char_exept_underscores(search);
      query.$or = [
        { event: { $regex: search, '$options': 'i' } },
        { 'urlParams.page': { $regex: search, '$options': 'i' } },
        { 'data.page': { $regex: search, '$options': 'i' } }
      ];
    }

    // Handle isDeleted
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

    // Handle status
    if (status) {
      query.status = status;
    }

    if (couponId) {
      query.couponId = new ObjectId(couponId);
    }

    // Handle addedBy
    if (addedBy) {
      query.addedBy = new ObjectId(addedBy);
    }
    if (brand_id) {
      query.brand_id = new ObjectId(brand_id);
    }
    if (affiliate_id) {
      query.affiliate_id = new ObjectId(affiliate_id);
    }
    if (campaignId) {
      query.campaignId = new ObjectId(campaignId);
    }

    if (commission_status) {
      query.commission_status = commission_status
    }

    if (commission_paid) {
      query.commission_paid = commission_paid
    }
    if (admin_paid) {
      query.admin_paid = admin_paid
    }

    // Handle format
    if (format) {
      query.format = format;
    }

    // Get plan data for commission calculation
    const planData = await SubscriptionPlans.findOne({ id: req.identity.plan_id });
    const commission_override = planData?.commission_override || 0;

    // Base pipeline for all aggregations
    let basePipeline = [
      {
        $lookup: {
          from: "users",
          localField: "affiliate_id",
          foreignField: "_id",
          as: "affiliate_details",
        },
      },
      {
        $unwind: {
          path: "$affiliate_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "brand_id",
          foreignField: "_id",
          as: "brand_details",
        },
      },
      {
        $unwind: {
          path: "$brand_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "brandaffiliateassociation",
          let: { brand_id: "$brand_id", affiliate_id: "$affiliate_id", isActive: true },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$brand_id", "$$brand_id"] },
                    { $eq: ["$affiliate_id", "$$affiliate_id"] },
                    { $eq: ["$isActive", "$$isActive"] }
                  ]
                }
              }
            },
          ],
          as: "brand_association_details"
        }
      },
      {
        $unwind: {
          path: "$brand_association_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "campaign",
          localField: "brand_association_details.campaign_id",
          foreignField: "_id",
          as: "campaign_details",
        },
      },
      {
        $unwind: {
          path: "$campaign_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "subscriptionplans",
          localField: "brand_details.plan_id",
          foreignField: "_id",
          as: "plan_details",
        },
      },
      {
        $unwind: {
          path: "$plan_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "coupon",
          localField: "couponId",
          foreignField: "_id",
          as: "coupondetalis",
        },
      },
      {
        $unwind: {
          path: "$coupondetalis",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          // Include affiliatelink document ID
          affiliatelink_id: "$_id",

          affiliate_id: "$affiliate_id",
          affiliate_name: "$affiliate_details.fullName",
          affiliate_email: "$affiliate_details.email",

          brand_id: "$brand_id",
          brand_name: "$brand_details.fullName",
          brand_email: "$brand_details.email",
          brand_company: "$brand_details.companyName",

          order_id: "$order_id",
          currency: "$currency",
          price: "$price",

          campaignId: "$brand_association_details.campaign_id",
          brand_association_details: {
            _id: "$brand_association_details._id",
            campaign_id: "$brand_association_details.campaign_id"
          },
          campaign_details: "$campaign_details",
          commission: { $toString: "$campaign_details.commission" },
          discount: "$discount",
          event: '$event',
          timestamp: '$timestamp',
          urlParams: '$urlParams',
          data: '$data',
          brand_details: {
            _id: "$brand_details._id",
            plan_id: "$brand_details.plan_id",
            // Include affiliatelink ID in brand details for easy reference
            affiliatelink_id: "$_id"
          },
          plan_details: "$plan_details",
          isDeleted: '$isDeleted',
          status: '$status',
          addedBy: '$addedBy',
          updatedBy: '$updatedBy',
          updatedAt: '$updatedAt',
          createdAt: '$createdAt',
          commission_status: "$commission_status",
          commission_paid: "$commission_paid",
          admin_paid: "$admin_paid", // Add this field
          lead_id: "$lead_id",
          amount_of_commission: "$amount_of_commission",
          commission_type: "$commission_type",
          couponId: "$couponId",
          couponDetails: "$coupondetalis"
        },
      },
      {
        $match: query
      }
    ];

    // Add date filtering if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);

      basePipeline.push({
        $addFields: {
          timestampAsDate: {
            $cond: {
              if: { $and: [{ $ne: ["$timestamp", null] }, { $ne: ["$timestamp", ""] }] },
              then: { $toDate: "$timestamp" },
              else: null
            }
          }
        }
      });

      basePipeline.push({
        $match: {
          timestampAsDate: {
            $gte: start,
            $lte: end
          }
        }
      });
    }

    // Add commission calculation to base pipeline
    basePipeline.push({
      $addFields: {
        calculated_commission: {
          $cond: {
            if: {
              $and: [
                { $ne: ["$amount_of_commission", null] },
                { $ne: ["$amount_of_commission", undefined] }
              ]
            },
            then: { $toDouble: "$amount_of_commission" },
            else: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$price", null] },
                    { $ne: ["$commission", null] },
                    { $ne: ["$commission_type", null] }
                  ]
                },
                then: {
                  $cond: {
                    if: { $eq: ["$commission_type", "amount"] },
                    then: { $toDouble: "$commission" },
                    else: {
                      $cond: {
                        if: { $eq: ["$commission_type", "percentage"] },
                        then: {
                          $multiply: [
                            { $divide: [{ $toDouble: "$price" }, 100] },
                            { $toDouble: "$commission" }
                          ]
                        },
                        else: 0
                      }
                    }
                  }
                },
                else: 0
              }
            }
          }
        }
      }
    });

    // Apply commission override if needed
    if (commission_override > 0) {
      basePipeline.push({
        $addFields: {
          calculated_commission: {
            $multiply: [
              "$calculated_commission",
              { $divide: [commission_override, 100] }
            ]
          }
        }
      });
    }

    // Create a pipeline for affiliate-wise summary
    let affiliateSummaryPipeline = [...basePipeline];

    affiliateSummaryPipeline.push({
      $group: {
        _id: {
          affiliate_id: "$affiliate_id",
          affiliate_name: "$affiliate_name",
          affiliate_email: "$affiliate_email"
        },
        total_transactions: { $sum: 1 },
        total_order_value: { $sum: { $toDouble: "$price" } },
        total_commission_earned: { $sum: "$calculated_commission" },

        // Commission status breakdown
        pending_commission: {
          $sum: {
            $cond: [{ $eq: ["$commission_status", "pending"] }, "$calculated_commission", 0]
          }
        },
        pending_count: {
          $sum: {
            $cond: [{ $eq: ["$commission_status", "pending"] }, 1, 0]
          }
        },

        accepted_commission: {
          $sum: {
            $cond: [{ $eq: ["$commission_status", "accepted"] }, "$calculated_commission", 0]
          }
        },
        accepted_count: {
          $sum: {
            $cond: [{ $eq: ["$commission_status", "accepted"] }, 1, 0]
          }
        },

        rejected_commission: {
          $sum: {
            $cond: [{ $eq: ["$commission_status", "rejected"] }, "$calculated_commission", 0]
          }
        },
        rejected_count: {
          $sum: {
            $cond: [{ $eq: ["$commission_status", "rejected"] }, 1, 0]
          }
        },

        // Commission paid status
        commission_paid_amount: {
          $sum: {
            $cond: [{ $eq: ["$commission_paid", "paid"] }, "$calculated_commission", 0]
          }
        },
        commission_paid_count: {
          $sum: {
            $cond: [{ $eq: ["$commission_paid", "paid"] }, 1, 0]
          }
        },

        commission_pending_amount: {
          $sum: {
            $cond: [{ $eq: ["$commission_paid", "pending"] }, "$calculated_commission", 0]
          }
        },
        commission_pending_count: {
          $sum: {
            $cond: [{ $eq: ["$commission_paid", "pending"] }, 1, 0]
          }
        },

        // Admin paid status - FIXED: Changed from boolean to string comparison
        admin_paid_amount: {
          $sum: {
            $cond: [{ $eq: ["$admin_paid", "paid"] }, "$calculated_commission", 0]
          }
        },
        admin_paid_count: {
          $sum: {
            $cond: [{ $eq: ["$admin_paid", "paid"] }, 1, 0]
          }
        },

        admin_pending_amount: {
          $sum: {
            $cond: [{ $eq: ["$admin_paid", "pending"] }, "$calculated_commission", 0]
          }
        },
        admin_pending_count: {
          $sum: {
            $cond: [{ $eq: ["$admin_paid", "pending"] }, 1, 0]
          }
        },

        admin_failed_amount: {
          $sum: {
            $cond: [{ $eq: ["$admin_paid", "failed"] }, "$calculated_commission", 0]
          }
        },
        admin_failed_count: {
          $sum: {
            $cond: [{ $eq: ["$admin_paid", "failed"] }, 1, 0]
          }
        },

        // First and last transaction
        first_transaction_date: { $min: "$timestampAsDate" },
        last_transaction_date: { $max: "$timestampAsDate" },

        // Store all brands for this affiliate
        brands: {
          $addToSet: {
            brand_id: "$brand_id",
            brand_name: "$brand_name"
          }
        }
      }
    });

    affiliateSummaryPipeline.push({
      $project: {
        affiliate_id: "$_id.affiliate_id",
        affiliate_name: "$_id.affiliate_name",
        affiliate_email: "$_id.affiliate_email",
        total_transactions: 1,
        total_order_value: { $round: ["$total_order_value", 2] },
        total_commission_earned: { $round: ["$total_commission_earned", 2] },

        commission_status_summary: {
          pending: {
            count: "$pending_count",
            amount: { $round: ["$pending_commission", 2] }
          },
          accepted: {
            count: "$accepted_count",
            amount: { $round: ["$accepted_commission", 2] }
          },
          rejected: {
            count: "$rejected_count",
            amount: { $round: ["$rejected_commission", 2] }
          }
        },

        commission_paid_summary: {
          paid: {
            count: "$commission_paid_count",
            amount: { $round: ["$commission_paid_amount", 2] }
          },
          pending: {
            count: "$commission_pending_count",
            amount: { $round: ["$commission_pending_amount", 2] }
          }
        },

        admin_paid_summary: {
          paid: {
            count: "$admin_paid_count",
            amount: { $round: ["$admin_paid_amount", 2] }
          },
          pending: {
            count: "$admin_pending_count",
            amount: { $round: ["$admin_pending_amount", 2] }
          },
          failed: {
            count: "$admin_failed_count",
            amount: { $round: ["$admin_failed_amount", 2] }
          }
        },

        first_transaction_date: 1,
        last_transaction_date: 1,
        brands_count: { $size: "$brands" },
        brands: 1,
        _id: 0
      }
    });

    affiliateSummaryPipeline.push({
      $sort: { total_commission_earned: -1 }
    });

    // Create a pipeline for brand-wise summary per affiliate (with affiliatelink IDs)
    let brandPerAffiliatePipeline = [...basePipeline];

    brandPerAffiliatePipeline.push({
      $group: {
        _id: {
          affiliate_id: "$affiliate_id",
          affiliate_name: "$affiliate_name",
          brand_id: "$brand_id",
          brand_name: "$brand_name",
          brand_company: "$brand_company"
        },
        transaction_count: { $sum: 1 },
        total_order_value: { $sum: { $toDouble: "$price" } },
        total_commission_payable: { $sum: "$calculated_commission" },

        // Store all affiliatelink IDs for this brand-affiliate relationship
        affiliatelink_ids: { $push: "$affiliatelink_id" },

        // Commission status breakdown
        pending_commission: {
          $sum: {
            $cond: [{ $eq: ["$commission_status", "pending"] }, "$calculated_commission", 0]
          }
        },
        pending_count: {
          $sum: {
            $cond: [{ $eq: ["$commission_status", "pending"] }, 1, 0]
          }
        },

        accepted_commission: {
          $sum: {
            $cond: [{ $eq: ["$commission_status", "accepted"] }, "$calculated_commission", 0]
          }
        },
        accepted_count: {
          $sum: {
            $cond: [{ $eq: ["$commission_status", "accepted"] }, 1, 0]
          }
        },

        rejected_commission: {
          $sum: {
            $cond: [{ $eq: ["$commission_status", "rejected"] }, "$calculated_commission", 0]
          }
        },
        rejected_count: {
          $sum: {
            $cond: [{ $eq: ["$commission_status", "rejected"] }, 1, 0]
          }
        },

        // Commission paid status
        commission_paid_amount: {
          $sum: {
            $cond: [{ $eq: ["$commission_paid", "paid"] }, "$calculated_commission", 0]
          }
        },
        commission_pending_amount: {
          $sum: {
            $cond: [{ $eq: ["$commission_paid", "pending"] }, "$calculated_commission", 0]
          }
        },

        // Admin paid status - FIXED
        admin_paid_amount: {
          $sum: {
            $cond: [{ $eq: ["$admin_paid", "paid"] }, "$calculated_commission", 0]
          }
        },
        admin_pending_amount: {
          $sum: {
            $cond: [{ $eq: ["$admin_paid", "pending"] }, "$calculated_commission", 0]
          }
        },
        admin_failed_amount: {
          $sum: {
            $cond: [{ $eq: ["$admin_paid", "failed"] }, "$calculated_commission", 0]
          }
        }
      }
    });

    brandPerAffiliatePipeline.push({
      $group: {
        _id: {
          affiliate_id: "$_id.affiliate_id",
          affiliate_name: "$_id.affiliate_name"
        },
        brand_details: {
          $push: {
            brand_id: "$_id.brand_id",
            brand_name: "$_id.brand_name",
            brand_company: "$_id.brand_company",
            transaction_count: "$transaction_count",
            total_order_value: { $round: ["$total_order_value", 2] },
            total_commission_payable: { $round: ["$total_commission_payable", 2] },
            affiliatelink_ids: "$affiliatelink_ids", // Include affiliatelink IDs

            commission_status_summary: {
              pending: {
                count: "$pending_count",
                amount: { $round: ["$pending_commission", 2] }
              },
              accepted: {
                count: "$accepted_count",
                amount: { $round: ["$accepted_commission", 2] }
              },
              rejected: {
                count: "$rejected_count",
                amount: { $round: ["$rejected_commission", 2] }
              }
            },

            commission_paid_summary: {
              paid: {
                amount: { $round: ["$commission_paid_amount", 2] }
              },
              pending: {
                amount: { $round: ["$commission_pending_amount", 2] }
              }
            },

            admin_paid_summary: {
              paid: {
                amount: { $round: ["$admin_paid_amount", 2] }
              },
              pending: {
                amount: { $round: ["$admin_pending_amount", 2] }
              },
              failed: {
                amount: { $round: ["$admin_failed_amount", 2] }
              }
            }
          }
        }
      }
    });

    brandPerAffiliatePipeline.push({
      $project: {
        affiliate_id: "$_id.affiliate_id",
        affiliate_name: "$_id.affiliate_name",
        brand_details: 1,
        _id: 0
      }
    });

    // Run both summary pipelines in parallel
    const [affiliateSummary, brandPerAffiliateSummary] = await Promise.all([
      db.collection('affiliatelink').aggregate(affiliateSummaryPipeline).toArray(),
      db.collection('affiliatelink').aggregate(brandPerAffiliatePipeline).toArray()
    ]);

    // // Check connected accounts for each affiliate
    // const affiliateIds = affiliateSummary.map(affiliate => affiliate.affiliate_id);
    // console.log("affiliateIds",affiliateIds,typeof affiliateIds)

    // // Fetch all connected accounts for these affiliates
    //  const connectedAccounts = await Account.find({
    //   where: {
    //     addedBy: affiliateIds.map(id => id.toString()),  // Ensure all are strings
    //     isActive: true,
    //     isDeleted: false,
    //   }
    // }).populate('addedBy');
    // // Create a map of affiliate_id to connectedAccount status
    // const affiliateConnectedAccountMap = {};
    // connectedAccounts.forEach(account => {
    //   affiliateConnectedAccountMap[account.addedBy.toString()] = true;
    // });

    // // Merge affiliate summary with brand details and add connectedAccount status
    // const combinedAffiliateSummary = affiliateSummary.map(affiliate => {
    //   const brandDetails = brandPerAffiliateSummary.find(b =>
    //     b.affiliate_id.toString() === affiliate.affiliate_id.toString()
    //   );

    //   return {
    //     ...affiliate,
    //     has_connected_account: !!affiliateConnectedAccountMap[affiliate.affiliate_id.toString()],
    //     brand_details: brandDetails ? brandDetails.brand_details : []
    //   };
    // });
    // Check connected accounts for each affiliate
    const affiliateIds = affiliateSummary.map(affiliate => affiliate.affiliate_id.toString());
    console.log("affiliateIds", affiliateIds, typeof affiliateIds);

    // CORRECT SAILS.JS WATERLINE SYNTAX:
    // Method 1: Simple query with string IDs
    const connectedAccounts = await Account.find({
      addedBy: affiliateIds,  // Just pass the array of strings
      isActive: true,
      isDeleted: false,
    });

    // Create a map of affiliate_id to connectedAccount status
    const affiliateConnectedAccountMap = {};
    connectedAccounts.forEach(account => {
      // addedBy might be a string ID or a populated user object
      const addedById = account.addedBy;
      const affiliateId = (addedById && typeof addedById === 'object' && addedById.id)
        ? addedById.id.toString()
        : addedById.toString();
      affiliateConnectedAccountMap[affiliateId] = true;
    });

    // Merge affiliate summary with brand details and add connectedAccount status
    const combinedAffiliateSummary = affiliateSummary.map(affiliate => {
      const brandDetails = brandPerAffiliateSummary.find(b =>
        b.affiliate_id.toString() === affiliate.affiliate_id.toString()
      );

      return {
        ...affiliate,
        has_connected_account: !!affiliateConnectedAccountMap[affiliate.affiliate_id.toString()],
        brand_details: brandDetails ? brandDetails.brand_details : []
      };
    });

    // Create overall summary
    let overallSummaryPipeline = [...basePipeline];

    overallSummaryPipeline.push({
      $group: {
        _id: null,
        total_transactions: { $sum: 1 },
        total_order_value: { $sum: { $toDouble: "$price" } },
        total_commission: { $sum: "$calculated_commission" },

        // Overall commission status
        pending_total: {
          $sum: {
            $cond: [{ $eq: ["$commission_status", "pending"] }, "$calculated_commission", 0]
          }
        },
        accepted_total: {
          $sum: {
            $cond: [{ $eq: ["$commission_status", "accepted"] }, "$calculated_commission", 0]
          }
        },
        rejected_total: {
          $sum: {
            $cond: [{ $eq: ["$commission_status", "rejected"] }, "$calculated_commission", 0]
          }
        },

        // Overall commission paid status
        commission_paid_total: {
          $sum: {
            $cond: [{ $eq: ["$commission_paid", "paid"] }, "$calculated_commission", 0]
          }
        },
        commission_pending_total: {
          $sum: {
            $cond: [{ $eq: ["$commission_paid", "pending"] }, "$calculated_commission", 0]
          }
        },

        // Overall admin paid status
        admin_paid_total: {
          $sum: {
            $cond: [{ $eq: ["$admin_paid", "paid"] }, "$calculated_commission", 0]
          }
        },
        admin_pending_total: {
          $sum: {
            $cond: [{ $eq: ["$admin_paid", "pending"] }, "$calculated_commission", 0]
          }
        },
        admin_failed_total: {
          $sum: {
            $cond: [{ $eq: ["$admin_paid", "failed"] }, "$calculated_commission", 0]
          }
        }
      }
    });

    overallSummaryPipeline.push({
      $project: {
        _id: 0,
        total_transactions: 1,
        total_order_value: { $round: ["$total_order_value", 2] },
        total_commission: { $round: ["$total_commission", 2] },

        commission_status_summary: {
          pending: { $round: ["$pending_total", 2] },
          accepted: { $round: ["$accepted_total", 2] },
          rejected: { $round: ["$rejected_total", 2] }
        },

        commission_paid_summary: {
          paid: { $round: ["$commission_paid_total", 2] },
          pending: { $round: ["$commission_pending_total", 2] }
        },

        admin_paid_summary: {
          paid: { $round: ["$admin_paid_total", 2] },
          pending: { $round: ["$admin_pending_total", 2] },
          failed: { $round: ["$admin_failed_total", 2] }
        }
      }
    });

    const overallSummaryResult = await db.collection('affiliatelink').aggregate(overallSummaryPipeline).toArray();
    const overallSummary = overallSummaryResult.length > 0 ? overallSummaryResult[0] : {
      total_transactions: 0,
      total_order_value: 0,
      total_commission: 0,
      commission_status_summary: { pending: 0, accepted: 0, rejected: 0 },
      commission_paid_summary: { paid: 0, pending: 0 },
      admin_paid_summary: { paid: 0, pending: 0, failed: 0 }
    };

    // Get paginated transaction data
    let dataPipeline = [...basePipeline];

    dataPipeline.push({
      $sort: sortquery
    });

    // Get total count
    let countPipeline = [...basePipeline];
    countPipeline.push({ $count: "total_count" });
    const totalCountResult = await db.collection('affiliatelink').aggregate(countPipeline).toArray();
    const totalCount = totalCountResult.length > 0 ? totalCountResult[0].total_count : 0;

    // Apply pagination only if page and count are provided
    if (req.query.page && req.query.count) {
      dataPipeline.push({
        $skip: Number(skipNo)
      });
      dataPipeline.push({
        $limit: Number(count)
      });
    }

    let result = await db.collection('affiliatelink').aggregate(dataPipeline).toArray();

    // Add connectedAccount status to each transaction record if needed
    // if (result.length > 0) {
    //   // Fetch connected accounts for all affiliates in the result
    //   const resultAffiliateIds = result.map(transaction => transaction.affiliate_id);
    //   const resultConnectedAccounts = await Account.find({
    //     addedBy: { $in: resultAffiliateIds },
    //     isActive: true,
    //     isDeleted: false,
    //   }).lean();

    //   // Create a map for quick lookup
    //   const resultAffiliateConnectedMap = {};
    //   resultConnectedAccounts.forEach(account => {
    //     resultAffiliateConnectedMap[account.addedBy.toString()] = true;
    //   });

    //   // Add connectedAccount status to each transaction
    //   result = result.map(transaction => ({
    //     ...transaction,
    //     has_connected_account: !!resultAffiliateConnectedMap[transaction.affiliate_id.toString()]
    //   }));
    // }
    // Add connectedAccount status to each transaction record if needed
    if (result.length > 0) {
      // Fetch connected accounts for all affiliates in the result
      const resultAffiliateIds = result.map(transaction => transaction.affiliate_id.toString());
      const resultConnectedAccounts = await Account.find({
        addedBy: resultAffiliateIds,
        isActive: true,
        isDeleted: false,
      });

      // Create a map for quick lookup
      const resultAffiliateConnectedMap = {};
      resultConnectedAccounts.forEach(account => {
        const addedById = account.addedBy;
        const affiliateId = (addedById && typeof addedById === 'object' && addedById.id)
          ? addedById.id.toString()
          : addedById.toString();
        resultAffiliateConnectedMap[affiliateId] = true;
      });

      // Add connectedAccount status to each transaction
      result = result.map(transaction => ({
        ...transaction,
        has_connected_account: !!resultAffiliateConnectedMap[transaction.affiliate_id.toString()]
      }));
    }

    if (export_to_xls === "yes") {
      let transactionData = [];
      let counter = 1;
      for (let obj of result) {
        transactionData.push({
          createdAt: obj.timestamp ? moment(obj.timestamp).format("D-MM-YYYY") : moment(obj.createdAt).format("D-MM-YYYY"),
          affiliate: obj?.affiliate_name,
          brand_name: obj?.brand_name,
          currency: obj?.currency || "USD",
          price: obj?.price,
          order_id: obj?.order_id,
          commission: obj?.commission ? obj?.commission_type === "amount" ? `$${obj?.commission}` : `${obj?.commission}%` : "--",
          amount_of_commission: calculatetotalCommission(obj?.commission_type, obj?.price, obj?.commission, commission_override),
          commission_paid: obj?.commission_paid,
          commission_status: obj?.commission_status,
          admin_paid: obj?.admin_paid, // Add admin_paid to export
          has_connected_account: obj?.has_connected_account ? "Yes" : "No", // Add connected account status to export
          counter: counter
        });

        counter++;
      }

      let excelFileName = `TransactionData.xlsx`;
      let workbook = new excel.Workbook();
      let worksheet = workbook.addWorksheet("Logs");

      worksheet.columns = [
        { header: "Serial No.", key: "counter", width: 15, style: { alignment: { horizontal: "center" } } },
        { header: "Affiliate", key: "affiliate", width: 10 },
        { header: "Brand", key: "brand_name", width: 10, style: { alignment: { horizontal: "center" } } },
        { header: "Order price", key: "price", width: 25 },
        { header: "Order Id", key: "order_id", width: 25 },
        { header: "Transaction Date", key: "createdAt", width: 25 },
        { header: "Commission", key: "commission", width: 25 },
        { header: "Commission paid", key: "amount_of_commission", width: 25 },
        { header: "Commission Status", key: "commission_status", width: 25 },
        { header: "Payment Status", key: "commission_paid", width: 25 },
        { header: "Admin Payment Status", key: "admin_paid", width: 25 }, // Add admin payment status column
        { header: "Has Connected Account", key: "has_connected_account", width: 25 }, // Add connected account column
      ];
      worksheet.addRows(transactionData);

      try {
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${excelFileName}`
        );

        await workbook.xlsx.write(res);
        return res.status(200).end();
      } catch (err) {
        return response.failed(null, err, req, res)
      }
    } else {
      let resData = {
        total_count: totalCount,
        overall_summary: overallSummary,
        affiliate_summary: combinedAffiliateSummary,
        data: result || []
      };

      // if (!req.param('page') && !req.param('count')) {
      //   const fullData = await db.collection('affiliatelink').aggregate([...basePipeline, { $sort: sortquery }]).toArray();

      //   // Add connectedAccount status to full data if needed
      //   if (fullData.length > 0) {
      //     const fullAffiliateIds = fullData.map(transaction => transaction.affiliate_id);
      //     const fullConnectedAccounts = await Account.find({
      //       addedBy: { $in: fullAffiliateIds },
      //       isActive: true,
      //       isDeleted: false,
      //     }).lean();

      //     const fullAffiliateConnectedMap = {};
      //     fullConnectedAccounts.forEach(account => {
      //       fullAffiliateConnectedMap[account.addedBy.toString()] = true;
      //     });

      //     resData.data = fullData.map(transaction => ({
      //       ...transaction,
      //       has_connected_account: !!fullAffiliateConnectedMap[transaction.affiliate_id.toString()]
      //     }));
      //   }
      // }
      if (!req.param('page') && !req.param('count')) {
        const fullData = await db.collection('affiliatelink').aggregate([...basePipeline, { $sort: sortquery }]).toArray();

        // Add connectedAccount status to full data if needed
        if (fullData.length > 0) {
          const fullAffiliateIds = fullData.map(transaction => transaction.affiliate_id.toString());
          const fullConnectedAccounts = await Account.find({
            addedBy: fullAffiliateIds,
            isActive: true,
            isDeleted: false,
          });

          const fullAffiliateConnectedMap = {};
          fullConnectedAccounts.forEach(account => {
            const addedById = account.addedBy;
            const affiliateId = (addedById && typeof addedById === 'object' && addedById.id)
              ? addedById.id.toString()
              : addedById.toString();
            fullAffiliateConnectedMap[affiliateId] = true;
          });

          resData.data = fullData.map(transaction => ({
            ...transaction,
            has_connected_account: !!fullAffiliateConnectedMap[transaction.affiliate_id.toString()]
          }));
        }
      }
      return response.success(resData, constants.AFFILIATELINK.FETCHED, req, res);
    }
  } catch (error) {
    console.log(error, '==df')
    return response.failed(null, `${error}`, req, res);
  }
};

exports.affiliateOrderDetail = async function (req, res) {
  try {
    const {
      affiliate_id,
      order_id,
      brand_id,
      commission_status,
      commission_paid,
      admin_paid,
      startDate,
      endDate,
    } = req.query;

    if (!affiliate_id && !order_id) {
      return response.failed(
        null,
        "affiliate_id or order_id is required",
        req,
        res
      );
    }

    let matchQuery = { isDeleted: false };

    if (order_id) {
      matchQuery.order_id = order_id;
    }

    if (affiliate_id) {
      matchQuery.affiliate_id = new ObjectId(affiliate_id);
    }

    if (brand_id) {
      matchQuery.brand_id = new ObjectId(brand_id);
    }

    if (commission_status) {
      matchQuery.commission_status = commission_status;
    }

    if (commission_paid) {
      matchQuery.commission_paid = commission_paid;
    }

    if (admin_paid) {
      matchQuery.admin_paid = admin_paid;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);

      matchQuery.createdAt = {
        $gte: start,
        $lte: end,
      };
    }

    const pipeline = [
      { $match: matchQuery },

      { $sort: { createdAt: -1 } },

      {
        $lookup: {
          from: "users",
          localField: "affiliate_id",
          foreignField: "_id",
          as: "affiliate",
        },
      },
      { $unwind: { path: "$affiliate", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "users",
          localField: "brand_id",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "brandaffiliateassociation",
          let: { brand_id: "$brand_id", affiliate_id: "$affiliate_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$brand_id", "$$brand_id"] },
                    { $eq: ["$affiliate_id", "$$affiliate_id"] },
                    { $eq: ["$isActive", true] },
                  ],
                },
              },
            },
          ],
          as: "association",
        },
      },
      { $unwind: { path: "$association", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "campaign",
          localField: "association.campaign_id",
          foreignField: "_id",
          as: "campaign",
        },
      },
      { $unwind: { path: "$campaign", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "payments",
          let: { orderId: "$order_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$order_id", "$$orderId"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 5 }, // Get last 5 payment records
          ],
          as: "payment_history",
        },
      },

      {
        $lookup: {
          from: "commissionpayments",
          let: { affiliatelink_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$affiliatelink_id", "$$affiliatelink_id"],
                },
              },
            },
            { $sort: { createdAt: -1 } },
          ],
          as: "commission_payments",
        },
      },

      {
        $lookup: {
          from: "brandcommissionpayments",
          let: { affiliatelink_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$affiliatelink_id", "$$affiliatelink_id"] },
                    { $eq: ["$payment_type", "brand_to_admin"] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: "brand_payments",
        },
      },

      {
        $lookup: {
          from: "admincommissionpayments",
          let: { affiliatelink_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$affiliatelink_id", "$$affiliatelink_id"] },
                    { $eq: ["$payment_type", "admin_to_affiliate"] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: "admin_payments",
        },
      },

      {
        $project: {
          affiliatelink_id: "$_id",
          order_id: 1,
          lead_id: 1,
          currency: 1,
          price: 1,
          discount: 1,
          timestamp: 1,
          event: 1,
          urlParams: 1,
          data: 1,
          createdAt: 1,
          updatedAt: 1,
          status: 1, // Add status field

          affiliate: {
            id: "$affiliate._id",
            name: "$affiliate.fullName",
            email: "$affiliate.email",
            phone: "$affiliate.phone",
            account_status: "$affiliate.status",
            wallet_balance: "$affiliate.wallet_balance",
          },

          brand: {
            id: "$brand._id",
            name: "$brand.fullName",
            company: "$brand.companyName",
            email: "$brand.email",
            phone: "$brand.phone",
          },

          campaign: {
            id: "$campaign._id",
            name: "$campaign.name",
            commission: "$campaign.commission",
            commission_type: "$campaign.commission_type",
            status: "$campaign.status",
          },

          association: {
            id: "$association._id",
            campaign_id: "$association.campaign_id",
            commission_rate: "$association.commission_rate",
            status: "$association.status",
          },

          payment_status: {
            brand_commission_status: {
              status: "$commission_status", // pending, accepted, rejected
              status_label: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ["$commission_status", "pending"] },
                      then: "Pending Brand Approval",
                    },
                    {
                      case: { $eq: ["$commission_status", "accepted"] },
                      then: "Commission Accepted by Brand",
                    },
                    {
                      case: { $eq: ["$commission_status", "rejected"] },
                      then: "Commission Rejected by Brand",
                    },
                  ],
                  default: "Status Unknown",
                },
              },
              accepted_date: {
                $cond: {
                  if: { $eq: ["$commission_status", "accepted"] },
                  then: "$updatedAt",
                  else: null,
                },
              },
              rejected_date: {
                $cond: {
                  if: { $eq: ["$commission_status", "rejected"] },
                  then: "$updatedAt",
                  else: null,
                },
              },
              accepted_by: "$commission_accepted_by",
              rejected_by: "$commission_rejected_by",
              rejection_reason: "$rejection_reason",
            },

            brand_payment_status: {
              status: "$commission_paid", // pending, paid
              status_label: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ["$commission_paid", "pending"] },
                      then: "Awaiting Brand Payment",
                    },
                    {
                      case: { $eq: ["$commission_paid", "paid"] },
                      then: "Paid by Brand to Admin",
                    },
                  ],
                  default: "Payment Status Unknown",
                },
              },
              paid_date: "$commission_paid_date",
              payment_method: "$commission_payment_method",
              transaction_id: "$commission_transaction_id",
              payment_details: {
                $arrayElemAt: ["$brand_payments", 0],
              },
            },

            admin_payment_status: {
              status: "$admin_paid", // pending, paid, failed
              status_label: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ["$admin_paid", "pending"] },
                      then: "Awaiting Admin Payment",
                    },
                    {
                      case: { $eq: ["$admin_paid", "paid"] },
                      then: "Paid by Admin to Affiliate",
                    },
                    {
                      case: { $eq: ["$admin_paid", "failed"] },
                      then: "Admin Payment Failed",
                    },
                  ],
                  default: "Payment Status Unknown",
                },
              },
              paid_date: "$admin_paid_date",
              payment_method: "$admin_payment_method",
              transaction_id: "$admin_transaction_id",
              payment_details: {
                $arrayElemAt: ["$admin_payments", 0],
              },
            },

            overall_status: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$commission_status", "rejected"] },
                    then: {
                      label: "Commission Rejected",
                      code: "rejected",
                      step: 0,
                    },
                  },
                  {
                    case: {
                      $and: [
                        { $eq: ["$commission_status", "pending"] },
                        { $eq: ["$commission_paid", "pending"] },
                      ],
                    },
                    then: {
                      label: "Awaiting Brand Approval",
                      code: "brand_approval_pending",
                      step: 1,
                    },
                  },
                  {
                    case: {
                      $and: [
                        { $eq: ["$commission_status", "accepted"] },
                        { $eq: ["$commission_paid", "pending"] },
                      ],
                    },
                    then: {
                      label: "Awaiting Brand Payment",
                      code: "brand_payment_pending",
                      step: 2,
                    },
                  },
                  {
                    case: {
                      $and: [
                        { $eq: ["$commission_status", "accepted"] },
                        { $eq: ["$commission_paid", "paid"] },
                        { $eq: ["$admin_paid", "pending"] },
                      ],
                    },
                    then: {
                      label: "Awaiting Admin Payment",
                      code: "admin_payment_pending",
                      step: 3,
                    },
                  },
                  {
                    case: {
                      $and: [
                        { $eq: ["$commission_status", "accepted"] },
                        { $eq: ["$commission_paid", "paid"] },
                        { $eq: ["$admin_paid", "paid"] },
                      ],
                    },
                    then: {
                      label: "Payment Completed",
                      code: "completed",
                      step: 4,
                    },
                  },
                  {
                    case: {
                      $and: [
                        { $eq: ["$commission_status", "accepted"] },
                        { $eq: ["$commission_paid", "paid"] },
                        { $eq: ["$admin_paid", "failed"] },
                      ],
                    },
                    then: {
                      label: "Admin Payment Failed",
                      code: "admin_payment_failed",
                      step: 3,
                    },
                  },
                ],
                default: {
                  label: "Unknown Status",
                  code: "unknown",
                  step: 0,
                },
              },
            },
          },

          commission_info: {
            amount_of_commission: "$amount_of_commission",
            commission_type: "$commission_type",

            calculated_commission: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$amount_of_commission", null] },
                    { $ne: ["$amount_of_commission", undefined] },
                  ],
                },
                then: { $toDouble: "$amount_of_commission" },
                else: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ["$price", null] },
                        { $ne: ["$campaign.commission", null] },
                        { $ne: ["$campaign.commission_type", null] },
                      ],
                    },
                    then: {
                      $cond: {
                        if: { $eq: ["$campaign.commission_type", "amount"] },
                        then: { $toDouble: "$campaign.commission" },
                        else: {
                          $cond: {
                            if: {
                              $eq: ["$campaign.commission_type", "percentage"],
                            },
                            then: {
                              $multiply: [
                                { $divide: [{ $toDouble: "$price" }, 100] },
                                { $toDouble: "$campaign.commission" },
                              ],
                            },
                            else: 0,
                          },
                        },
                      },
                    },
                    else: 0,
                  },
                },
              },
            },

            commission_breakdown: {
              brand_commission: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ["$commission_status", "accepted"] },
                      {
                        $or: [
                          { $eq: ["$commission_paid", "paid"] },
                          { $eq: ["$admin_paid", "paid"] },
                        ],
                      },
                    ],
                  },
                  then: {
                    $cond: {
                      if: {
                        $and: [
                          { $ne: ["$amount_of_commission", null] },
                          { $ne: ["$amount_of_commission", undefined] },
                        ],
                      },
                      then: { $toDouble: "$amount_of_commission" },
                      else: {
                        $cond: {
                          if: {
                            $and: [
                              { $ne: ["$price", null] },
                              { $ne: ["$campaign.commission", null] },
                              { $ne: ["$campaign.commission_type", null] },
                            ],
                          },
                          then: {
                            $cond: {
                              if: {
                                $eq: ["$campaign.commission_type", "amount"],
                              },
                              then: { $toDouble: "$campaign.commission" },
                              else: {
                                $cond: {
                                  if: {
                                    $eq: [
                                      "$campaign.commission_type",
                                      "percentage",
                                    ],
                                  },
                                  then: {
                                    $multiply: [
                                      {
                                        $divide: [{ $toDouble: "$price" }, 100],
                                      },
                                      { $toDouble: "$campaign.commission" },
                                    ],
                                  },
                                  else: 0,
                                },
                              },
                            },
                          },
                          else: 0,
                        },
                      },
                    },
                  },
                  else: 0,
                },
              },
              admin_commission: {
                $cond: {
                  if: { $eq: ["$admin_paid", "paid"] },
                  then: {
                    $cond: {
                      if: {
                        $and: [
                          { $ne: ["$amount_of_commission", null] },
                          { $ne: ["$amount_of_commission", undefined] },
                        ],
                      },
                      then: { $toDouble: "$amount_of_commission" },
                      else: {
                        $cond: {
                          if: {
                            $and: [
                              { $ne: ["$price", null] },
                              { $ne: ["$campaign.commission", null] },
                              { $ne: ["$campaign.commission_type", null] },
                            ],
                          },
                          then: {
                            $cond: {
                              if: {
                                $eq: ["$campaign.commission_type", "amount"],
                              },
                              then: { $toDouble: "$campaign.commission" },
                              else: {
                                $cond: {
                                  if: {
                                    $eq: [
                                      "$campaign.commission_type",
                                      "percentage",
                                    ],
                                  },
                                  then: {
                                    $multiply: [
                                      {
                                        $divide: [{ $toDouble: "$price" }, 100],
                                      },
                                      { $toDouble: "$campaign.commission" },
                                    ],
                                  },
                                  else: 0,
                                },
                              },
                            },
                          },
                          else: 0,
                        },
                      },
                    },
                  },
                  else: 0,
                },
              },
            },
          },

          payment_history: {
            $map: {
              input: "$payment_history",
              as: "payment",
              in: {
                id: "$$payment._id",
                amount: "$$payment.amount",
                payment_method: "$$payment.payment_method",
                status: "$$payment.status",
                transaction_id: "$$payment.transaction_id",
                created_at: "$$payment.createdAt",
              },
            },
          },

          status_timeline: {
            order_created: "$createdAt",
            brand_commission_status_updated: {
              $cond: {
                if: { $ne: ["$commission_status", null] },
                then: "$updatedAt",
                else: null,
              },
            },
            brand_payment_date: "$commission_paid_date",
            admin_payment_date: "$admin_paid_date",
          },

          metadata: {
            last_updated: "$updatedAt",
            created_by: "$addedBy",
            updated_by: "$updatedBy",
          },
        },
      },
    ];

    const result = await db
      .collection("affiliatelink")
      .aggregate(pipeline)
      .toArray();

    if (!result.length) {
      return response.failed(null, "No orders found", req, res);
    }

    let summary = null;
    if (affiliate_id && !order_id) {
      const commissionSummary = {
        total_orders: result.length,
        total_order_value: 0,
        total_commission_earned: 0,
        total_commission_accepted_by_brand: 0,
        total_commission_paid_by_brand: 0,
        total_commission_paid_by_admin: 0,
        pending_commission: 0,
        accepted_commission: 0,
        rejected_commission: 0,
        awaiting_brand_payment: 0,
        awaiting_admin_payment: 0,
        completed_payments: 0,
        failed_payments: 0,
      };

      const brandSummary = {};
      const statusSummary = {
        awaiting_brand_approval: 0,
        awaiting_brand_payment: 0,
        awaiting_admin_payment: 0,
        payment_completed: 0,
        commission_rejected: 0,
        admin_payment_failed: 0,
      };

      result.forEach((order) => {
        const price = parseFloat(order.price) || 0;
        const commission = order.commission_info.calculated_commission || 0;

        commissionSummary.total_order_value += price;
        commissionSummary.total_commission_earned += commission;

        const overallStatus = order.payment_status.overall_status.code;

        if (overallStatus === "rejected") {
          statusSummary.commission_rejected++;
          commissionSummary.rejected_commission += commission;
        } else if (overallStatus === "brand_approval_pending") {
          statusSummary.awaiting_brand_approval++;
          commissionSummary.pending_commission += commission;
        } else if (overallStatus === "brand_payment_pending") {
          statusSummary.awaiting_brand_payment++;
          commissionSummary.awaiting_brand_payment += commission;
          commissionSummary.accepted_commission += commission;
          commissionSummary.total_commission_accepted_by_brand += commission;
        } else if (overallStatus === "admin_payment_pending") {
          statusSummary.awaiting_admin_payment++;
          commissionSummary.awaiting_admin_payment += commission;
          commissionSummary.total_commission_paid_by_brand += commission;
        } else if (overallStatus === "completed") {
          statusSummary.payment_completed++;
          commissionSummary.completed_payments += commission;
          commissionSummary.total_commission_paid_by_admin += commission;
        } else if (overallStatus === "admin_payment_failed") {
          statusSummary.admin_payment_failed++;
          commissionSummary.failed_payments += commission;
        }

        const brandId = order.brand.id.toString();
        if (!brandSummary[brandId]) {
          brandSummary[brandId] = {
            brand_id: brandId,
            brand_name: order.brand.name,
            brand_company: order.brand.company,
            brand_email: order.brand.email,
            order_count: 0,
            total_order_value: 0,
            total_commission: 0,
            commission_accepted: 0,
            commission_paid: 0,
            pending_commission: 0,
          };
        }

        brandSummary[brandId].order_count++;
        brandSummary[brandId].total_order_value += price;
        brandSummary[brandId].total_commission += commission;

        if (
          order.payment_status.brand_commission_status.status === "accepted"
        ) {
          brandSummary[brandId].commission_accepted += commission;

          if (order.payment_status.brand_payment_status.status === "paid") {
            brandSummary[brandId].commission_paid += commission;
          } else {
            brandSummary[brandId].pending_commission += commission;
          }
        }
      });

      Object.keys(commissionSummary).forEach((key) => {
        if (typeof commissionSummary[key] === "number") {
          commissionSummary[key] =
            Math.round(commissionSummary[key] * 100) / 100;
        }
      });

      const brandSummaryArray = Object.values(brandSummary).map((brand) => ({
        ...brand,
        total_order_value: Math.round(brand.total_order_value * 100) / 100,
        total_commission: Math.round(brand.total_commission * 100) / 100,
        commission_accepted: Math.round(brand.commission_accepted * 100) / 100,
        commission_paid: Math.round(brand.commission_paid * 100) / 100,
        pending_commission: Math.round(brand.pending_commission * 100) / 100,
      }));

      summary = {
        commission_summary: commissionSummary,
        status_summary: statusSummary,
        brand_summary: brandSummaryArray,
        brands_worked_with: brandSummaryArray.length,
        payment_breakdown: {
          brand_acceptance_rate:
            result.length > 0
              ? Math.round(
                (commissionSummary.total_commission_accepted_by_brand /
                  commissionSummary.total_commission_earned) *
                100
              )
              : 0,
          brand_payment_rate:
            commissionSummary.total_commission_accepted_by_brand > 0
              ? Math.round(
                (commissionSummary.total_commission_paid_by_brand /
                  commissionSummary.total_commission_accepted_by_brand) *
                100
              )
              : 0,
          admin_payment_rate:
            commissionSummary.total_commission_paid_by_brand > 0
              ? Math.round(
                (commissionSummary.total_commission_paid_by_admin /
                  commissionSummary.total_commission_paid_by_brand) *
                100
              )
              : 0,
        },
      };
    }

    const responseData = {
      success: true,
      message: order_id ? "Order details fetched" : "Affiliate orders fetched",
      data: order_id ? result[0] : result,
    };

    return res.status(200).json(responseData);
  } catch (err) {
    console.error("API Error:", err);
    return response.failed(null, err.message, req, res);
  }
};

// Helper function to calculate commission
function calculateEventCommission(eventType, amount, tiers, calculationType, revenueClicks) {
  let commission = 0;
  let selectedTier = null;

  if (!tiers || tiers.length === 0) return { commission, selectedTier };

  if (calculationType === "retrospective") {
    // Find highest eligible tier
    for (let i = tiers.length - 1; i >= 0; i--) {
      const tier = tiers[i];
      if (amount >= (tier.min || 0)) {
        if (tier.max === null || amount <= tier.max) {
          selectedTier = tier;
          break;
        }
      }
    }

    if (selectedTier) {
      if (eventType === "purchase" && selectedTier.type === "percentage") {
        commission = (revenueClicks * selectedTier.rate) / 100;
      } else if (eventType === "purchase" && selectedTier.type === "fixed") {
        commission = selectedTier.rate;
      } else {
        // For lead events (fixed rate per lead)
        commission = amount * selectedTier.rate;
      }
    }
  }
  else {
    // Per-tier calculation
    let remainingAmount = amount;

    for (const tier of tiers) {
      if (remainingAmount <= 0) break;

      if (amount >= (tier.min || 0)) {
        let tierAmount = remainingAmount;
        if (tier.max !== null) {
          tierAmount = Math.min(remainingAmount, tier.max - (tier.min || 0) + 1);
        }

        if (eventType === "purchase" && tier.type === "percentage") {
          commission += (tierAmount * tier.rate) / 100;
        } else if (eventType === "purchase" && tier.type === "fixed") {
          commission += tier.rate;
        } else {
          // For lead events
          commission += (tierAmount * tier.rate);
        }

        remainingAmount -= tierAmount;
      }
    }
  }

  return { commission, selectedTier };
}

