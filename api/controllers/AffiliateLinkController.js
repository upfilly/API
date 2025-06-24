/**
 * AffiliateLinkController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const Services = require('../services/index');
const constants = require('../../config/constants').constants;
const response = require("../services/Response");
const db = sails.getDatastore().manager;
const excel = require('exceljs');
const moment = require("moment")
const ObjectId = require('mongodb').ObjectId;
// const {customAlphabet} = require('nanoid');
// const nanoid = customAlphabet('1234567890abcdef', 6);
// const baseUrl = 'https://upfilly.com';

function calculatetotalCommission(commission_type, price, commission, commission_override) {
  let CalPrice;

  if (commission_type === "percentage") {
    CalPrice = price * commission / 100;
  } else {
    CalPrice = price - commission;
  }

  const finalPrice = CalPrice * commission_override / 100

  return "$" + (finalPrice + CalPrice).toFixed(2)


}

exports.generateLink = async (req, res) => {
  try {

    // Generate affiliate link
    const { base_url, parameters } = req.body;


    let get_link = await Services.generateAffiliateLink.generateLink({
      baseUrl: base_url,
      parameters: parameters
    })

    let query = {
      affiliate_id: req.identity.id
    }
    let isExist = await AffiliateLink.find(query).sort({ "createdAt": -1 });
    isExist = isExist[0]
    if (!isExist) {
      let create_link = await AffiliateLink.create({ affiliate_id: req.identity.id, link: get_link }).fetch()
      if (create_link) {

        if (['operator', 'super_user', 'publisher'].includes(req.identity.role)) {
          let get_account_manager = await Users.findOne({ id: req.identity.addedBy, isDeleted: false })
          await Services.activityHistoryServices.create_activity_history(req.identity.id, 'generate_link', 'created', create_link, create_link, get_account_manager.id ? get_account_manager.id : null)

        } else if (['affiliate', 'brand'].includes(req.identity.role)) {

          let get_all_admin = await Services.UserServices.get_users_with_role(["admin"])
          let get_account_manager = get_all_admin[0].id
          await Services.activityHistoryServices.create_activity_history(req.identity.id, 'generate_link', 'created', create_link, create_link, get_account_manager ? get_account_manager.id : null)
        }
      }
    } else {
      let update_link = await AffiliateLink.updateOne({ id: isExist.id, isDeleted: false }, { link: get_link })
      if (update_link) {
        if (['operator', 'super_user'].includes(req.identity.role)) {
          let get_account_manager = await Users.findOne({ id: req.identity.addedBy, isDeleted: false })

          await Services.activityHistoryServices.create_activity_history(req.identity.id, 'generate_link', 'updated', update_link, isExist, get_account_manager.id ? get_account_manager.id : null)

        } else if (['affiliate', 'brand'].includes(req.identity.role)) {

          let get_all_admin = await Services.UserServices.get_users_with_role(["admin"])
          let get_account_manager = get_all_admin[0].id

          await Services.activityHistoryServices.create_activity_history(req.identity.id, 'generate_link', 'updated', update_link, isExist, get_account_manager ? get_account_manager : null)
        }
      }
    }
    return response.success(get_link, constants.TRACKING.LINK, req, res);

  } catch (err) {
    return response.failed(null, `${err}`, req, res);
  }
}

exports.generateLinkOfAffiliate = async (req, res) => {
  try {


    let query = {
      affiliate_id: req.identity.id,
      isDeleted: false
    }
    let get_affilaite_link = await AffiliateLink.find(query).sort({ "createdAt": -1 });
    get_affilaite_link = get_affilaite_link[0]
    return response.success(get_affilaite_link, constants.TRACKING.LINK, req, res);

  } catch (err) {
    return response.failed(null, `${err}`, req, res);
  }
}




exports.create = async function (req, res) {
  try {
    const { event, timestamp, urlParams, data } = req.body;

    if (!event || !timestamp) {
      return response.failed(null, constants.AFFILIATELINK.MISSING_FIELDS, req, res);
    }
    req.body.addedBy = (req.identity?.id) ? req.identity.id : null;
    req.body.updatedBy = (req.identity?.id) ? req.identity.id : null;

    const newAffiliateLink = await AffiliateLink.create(req.body).fetch();

    return response.success(newAffiliateLink, constants.AFFILIATELINK.CREATED, req, res);

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

    let { search, sortBy, status, isDeleted, format, addedBy, affiliate_id, brand_id, campaignId, commission_status, commission_paid, admin_paid, export_to_xls, startDate, endDate } = req.query;
    let sortquery = {};

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

    // Handle sorting
    if (sortBy) {
      let typeArr = sortBy.split(" ");
      let sortType = typeArr[1];
      let field = typeArr[0];
      sortquery[field ? field : 'createdAt'] = sortType === 'desc' ? -1 : 1;
    } else {
      sortquery = { createdAt: -1 };
    }

    // Handle status
    if (status) {
      query.status = status;
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
          as: "brand_association_details"  // The final result will be stored in "campaign_details"
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
    ];

    let projection = {
      $project: {
        affiliate_id: "$affiliate_id",
        brand_id: "$brand_id",
        order_id: "$order_id",
        currency: "$currency",
        price: "$price",
        campaignId: "$brand_association_details.campaign_id",
        brand_association_details: { _id: "$brand_association_details._id", campaign_id: "$brand_association_details.campaign_id" },
        campaign_details: "$campaign_details",
        commission: { $toString: "$campaign_details.commission" },
        discount: "$discount",
        event: '$event',
        timestamp: '$timestamp',
        urlParams: '$urlParams',
        data: '$data',
        affiliate_name: "$affiliate_details.fullName",
        brand_name: "$brand_details.fullName",
        brand_details: { _id: "$brand_details._id", plan_id: "$brand_details.plan_id" },
        plan_details: "$plan_details",
        isDeleted: '$isDeleted',
        status: '$status',
        addedBy: '$addedBy',
        updatedBy: '$updatedBy',
        updatedAt: '$updatedAt',
        createdAt: '$createdAt',
        commission_status: "$commission_status",
        commission_paid: "$commission_paid",
        admin_paid: "$admin_paid",
        lead_id: "$lead_id",
        amount_of_commission: "$amount_of_commission",
        commission_type: "$commission_type",
      },
    };

    pipeline.push(projection);
    pipeline.push({
      $match: query
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
              if: { $and: [{ $ne: ["$timestamp", null] }, { $ne: ["$timestamp", ""] }] },
              then: { $toDate: "$timestamp" },
              else: null
            }
          }
        }
      });

      pipeline.push({
        $match: {
          timestampAsDate: {
            $gte: start,
            $lte: end
          }
        }
      });
    }


    pipeline.push({
      $sort: sortquery
    });

    let totalresult = await db.collection('affiliatelink').aggregate(pipeline).toArray();


    pipeline.push({
      $skip: Number(skipNo)
    });
    pipeline.push({
      $limit: Number(count)
    });

    let result = await db.collection('affiliatelink').aggregate(pipeline).toArray();
    const planData = await SubscriptionPlans.findOne({ id: req.identity.plan_id })
    const commission_override = planData?.commission_override
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
          amount_of_commission: obj?.amount_of_commission,
          commission_paid: calculatetotalCommission(obj?.commission_type, obj?.price, obj?.commission, commission_override),
          commission_status: obj?.commission_status,
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
        return response.failed(null, err, req, res)
      }
    } else {
      let resData = {
        total_count: totalresult ? totalresult.length : 0,
        data: result ? result : []
      };
      if (!req.param('page') && !req.param('count')) {
        resData.data = totalresult ? totalresult : [];
      }
      return response.success(resData, constants.AFFILIATELINK.FETCHED, req, res);
    }
  } catch (error) {
    console.log(error, '==df')
    return response.failed(null, `${error}`, req, res);
  }
};

exports.findGraph = async (req, res) => {
  try {
    const { startDate, endDate, filter } = req.query;

    const moment = require('moment');
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


    const result = await db.collection('affiliatelink').aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        },
      },
      {
        $group: {
          _id: "$source", // You can change this to "campaign" or any field that makes sense
          totalAmount: { $sum: "$price" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          totalAmount: 1,
          count: 1,
          _id: 0
        }
      },
    ]).toArray();

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};

exports.findOne = async function (req, res) {
  try {
    if (!req.query.id) {
      return response.failed(null, constants.AFFILIATELINK.ID_REQUIRED, req, res);
    }
    const affiliateLink = await AffiliateLink.findOne({
      id: req.query.id,
      isDeleted: false,
    });
    if (!affiliateLink) {
      return response.failed(null, constants.AFFILIATELINK.INVALID_ID, req, res);
    }
    return response.success(affiliateLink, constants.AFFILIATELINK.FETCHED, req, res);
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};

exports.update = async function (req, res) {
  try {
    const { event, timestamp, urlParams, data } = req.body;

    if (!event || !timestamp || !urlParams || !data) {
      return res
        .status(400)
        .json({ error: constants.AFFILIATELINK.MISSING_FIELDS });
    }

    const updatedAffiliateLink = await AffiliateLink.updateOne({
      id: req.query.id,
      isDeleted: false,
    }).set(req.body);

    if (!updatedAffiliateLink) {
      response.failed(updatedAffiliateLink, constants.AFFILIATELINK.NOT_FOUND, req, res);
    }
    return response.success(updatedAffiliateLink, constants.AFFILIATELINK.UPDATED, req, res);
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};

exports.destroy = async function (req, res) {
  try {
    if (!req.query.id) {
      return response.failed(null, constants.AFFILIATEINVITE.ID_REQUIRED, req, res);
    }
    const updatedAffiliateLink = await AffiliateLink.updateOne({
      id: req.query.id,
    }).set({ isDeleted: true });
    if (!updatedAffiliateLink) {
      return response.success(null, constants.AFFILIATELINK.NOT_FOUND, req, res);
    }
    return response.success(null, constants.AFFILIATELINK.DELETED, req, res);
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};


exports.report = async function (req, res) {
  let query = {};
  let count = req.param('count') || 10;
  let page = req.param('page') || 1;
  let skipNo = (Number(page) - 1) * Number(count);
  let { search, sortBy, status, isDeleted, format, campaignId, affiliate_id, brand_id, startDate, endDate } = req.query;
  let sortquery = {};

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

  // Handle sorting
  if (sortBy) {
    let typeArr = sortBy.split(" ");
    let sortType = typeArr[1];
    let field = typeArr[0];
    sortquery[field ? field : 'createdAt'] = sortType === 'desc' ? -1 : 1;
  } else {
    sortquery = { createdAt: -1 };
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
    query.campaignId = { $in: campaignId.split(",").map(id => new ObjectId(id)) };
  } else if (affiliate_id) {
    query.affiliate_id = { $in: affiliate_id.split(",").map(id => new ObjectId(id)) };
  } else if (brand_id) {
    query.brand_id = { $in: brand_id.split(",").map(id => new ObjectId(id)) };
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
        event: '$event',
        timestamp: '$timestamp',
        urlParams: '$urlParams',
        data: '$data',
        isDeleted: '$isDeleted',
        status: '$status',
        addedBy: '$addedBy',
        updatedBy: '$updatedBy',
        updatedAt: '$updatedAt',
        createdAt: '$createdAt',
        month: { $month: "$createdAt" },
      }
    },
    {
      $match: query
    },
    {
      $facet: {
        data: [
          {
            $group: {
              _id: group_query,
              revenue: { $sum: '$price' },
              click_count: { $sum: 1 }
            }

          },
          // {
          //     $unset: ['_id']
          // },
          {
            $skip: Number(skipNo)
          },
          {

            $limit: Number(count)
          },
          {
            $project: {
              affiliate_id: "$_id.affiliate_id",
              campaignId: "$_id.campaignId",
              brand_id: "$_id.brand_id",
              revenue: "$revenue",
              click_count: "$click_count"
            }
          },
          {
            $lookup: {
              from: "users",
              localField: "affiliate_id",
              foreignField: "_id",
              as: "affiliate_details"
            }
          },
          {
            $unwind: {
              path: '$affiliate_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: "campaign",
              localField: "campaignId",
              foreignField: "_id",
              as: "campaign_details"
            }
          },
          {
            $unwind: {
              path: '$campaign_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: "users",
              localField: "brand_id",
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
          {
            $unset: ["_id", "brand_id", "affiliate_id", "campaignId"]
          }
        ]

      }
    },
  ];

  let projection = {
    $project: {
      data: "$data"
    }

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

    let result = await db.collection('affiliatelink').aggregate(pipeline, { allowDiskUse: true }).toArray()
    let resData = {
      total: result[0] ? result[0].data.length : 0,
      data: result[0] ? result[0].data : []
    }
    if (!req.param('page') && !req.param('count')) {
      resData.data = result[0].data ? result[0].data : []
    }
    return Response.success(resData, constants.COMMON.SUCCESS, req, res);
  } catch (error) {
    console.error(error, "=================err");
    return Response.failed(null, `${error}`, req, res);
  }
}

exports.updateCommission = async (req, res) => {
  try {
    const { commission_status, commission_paid, id } = req.body
    if ((commission_status || commission_paid) && !id) {
      return res
        .status(400)
        .json({ error: constants.AFFILIATELINK.MISSING_FIELDS });
    }

    const updatedAffiliateLink = await AffiliateLink.updateOne({
      id: id,
      isDeleted: false,
    }).set(req.body);
    return response.success(updatedAffiliateLink, constants.AFFILIATELINK.UPDATED, req, res);


  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
}


