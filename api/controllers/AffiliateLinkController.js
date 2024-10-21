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
const ObjectId = require('mongodb').ObjectId;
// const {customAlphabet} = require('nanoid');
// const nanoid = customAlphabet('1234567890abcdef', 6);
// const baseUrl = 'https://upfilly.com';


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
    let isExist = await AffiliateLink.findOne(query);
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
    console.log(err);
    return response.failed(null, `${err}`, req, res);
  }
}

exports.generateLinkOfAffiliate = async (req, res) => {
  try {


    let query = {
      affiliate_id: req.identity.id,
      isDeleted: false
    }
    let get_affilaite_link = await AffiliateLink.find(query);
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
    console.log(req.body, "==req.body");

    const newAffiliateLink = await AffiliateLink.create(req.body).fetch();

    return response.success(newAffiliateLink, constants.AFFILIATELINK.CREATED, req, res);

  } catch (error) {
    console.log(error, "==error");

    return response.failed(null, `${error}`, req, res);
  }
};

exports.find = async function (req, res) {
  try {
    let query = {};
    let count = req.param('count') || 10;
    let page = req.param('page') || 1;
    let skipNo = (Number(page) - 1) * Number(count);
    let { search, sortBy, status, isDeleted, format, addedBy, affiliate_id, brand_id, campaignId } = req.query;
    let sortquery = {};

    // Handle search
    if (search) {
      search = await Services.Utils.remove_special_char_exept_underscores(search);
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
    if(campaignId) {
      query.campaignId = new ObjectId(campaignId);
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
    ];

    let projection = {
      $project: {
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
        affiliate_name: "$affiliate_details.fullName",
        brand_name: "$brand_details.fullName",
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

    let totalresult = await db.collection('affiliatelink').aggregate(pipeline).toArray();


    pipeline.push({
      $skip: Number(skipNo)
    });
    pipeline.push({
      $limit: Number(count)
    });

    let result = await db.collection('affiliatelink').aggregate(pipeline).toArray();


    let resData = {
      total_count: totalresult ? totalresult.length : 0,
      data: result ? result : []
    };

    if (!req.param('page') && !req.param('count')) {
      resData.data = totalresult ? totalresult : [];
    }

    return response.success(resData, constants.AFFILIATELINK.FETCHED, req, res);
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
          search = await Services.Utils.remove_special_char_exept_underscores(search);
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
      if(campaignId) {
          query.campaignId = {$in: campaignId.split(",").map(id=>new ObjectId(id))};
      }else if(affiliate_id) {
          query.affiliate_id = {$in: affiliate_id.split(",").map(id=>new ObjectId(id))};
      }else if(brand_id) {
          query.brand_id = {$in: brand_id.split(",").map(id=>new ObjectId(id))};
      }

      // Handle format
      if (format) {
          query.format = format;
      }
      
      if(startDate && endDate) {
          startDate = new Date(startDate);
          endDate = new Date(endDate);
          query.createdAt = { $gte: startDate, $lte: endDate };
      }
      console.log(group_query);

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
                              click_count: { $sum: 1}
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
          console.log(result);
          let resData = {
              total: result[0] ? result[0].data.length : 0,
              data: result[0] ? result[0].data: []
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


