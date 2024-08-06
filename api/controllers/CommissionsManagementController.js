/**
 * CommissionsManagementController
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

exports.addCommission = async (req, res) => {
  try {
    let validation_result = await Validations.CommissionValidation.addCommssion(
      req,
      res
    );

    if (validation_result && !validation_result.success) {
      throw validation_result.message;
    }
    let {
      plan_id,
      event_type,
      affiliate_group,
      campaign,
      time_frame_type,
      time_frame,
    } = req.body;

    req.body.addedBy = req.identity.id;
    req.body.updatedBy = req.identity.id;

    if (time_frame_type && time_frame_type == "month") {
      let currentDate = new Date();
      currentDate.setMonth(currentDate.getMonth() + Number(time_frame));
      req.body.due_date = currentDate;
    } else {
      let currentDate = new Date();
      // currentDate.setMonth(currentDate.getMonth() + Number(time_frame));
      currentDate.setDate(currentDate.getDate() + Number(time_frame));
      req.body.due_date = currentDate;
    }

    // const plan = await SubscriptionPlans.findOne({ id: plan_id, isDeleted: false });
    // if (!plan) {
    //     throw constants.COMMISSION.INVALID_PLAN
    // }
    if (affiliate_group && affiliate_group != null) {
      var get_affiliate_group = await AffiliateManagement.findOne({
        id: affiliate_group,
        isDeleted: false,
      });
      if (!get_affiliate_group) {
        throw constants.COMMISSION.INVALID_AFFILIATE_GROUP;
      }
      const existedCommission = await CommissionsManagement.findOne({
        affiliate_group: get_affiliate_group.id,
        addedBy: req.identity.id,
        event_type: event_type,
        isDeleted: false,
      });

      if (existedCommission) {
        throw constants.COMMISSION.ALREADY_EXIST;
      }
    } else {
      var get_campaign = await Campaign.findOne({
        id: campaign,
        isDeleted: false,
      });
      if (!get_campaign) {
        throw constants.COMMISSION.INVALID_campaign;
      }
      const existedCommission = await CommissionsManagement.findOne({
        campaign: get_campaign.id,
        event_type: event_type,
        isDeleted: false,
      });

      if (existedCommission) {
        throw constants.COMMISSION.ALREADY_EXIST;
      }
    }

    // const existedCommission = await CommissionsManagement.findOne({ affiliate_group: get_affiliate_group.id, event_type: event_type, isDeleted: false });

    // if (existedCommission) {
    //     throw constants.COMMISSION.ALREADY_EXIST;
    // }

    const created = await CommissionsManagement.create(req.body).fetch();
    if (created) {
      return response.success(null, constants.COMMISSION.CREATED, req, res);
    }
    throw constants.COMMON.SERVER_ERROR;
  } catch (error) {
    console.log(error, "------------------error");
    return response.failed(null, `${error}`, req, res);
  }
};

exports.editCommssion = async (req, res) => {
  try {
    let validation_result =
      await Validations.CommissionValidation.editCommission(req, res);

    if (validation_result && !validation_result.success) {
      throw validation_result.message;
    }

    let { id } = req.body;

    let get_commission = await CommissionsManagement.findOne({
      id: id,
      isDeleted: false,
    });
    if (!get_commission) {
      throw constants.COMMISSION.INVALID_ID;
    }

    req.body.updatedBy = req.identity.id;
    let edit_affiliate_group = await CommissionsManagement.updateOne(
      { id: id },
      req.body
    );
    if (edit_affiliate_group) {
      if (isDefaultAffiliateGroup && isDefaultAffiliateGroup == true) {
        let update_Group = await AffiliateManagement.update(
          {
            isDefaultAffiliateGroup: true,
            status: "active",
            isDeleted: false,
            id: { "!=": edit_affiliate_group.id },
          },
          {
            isDefaultAffiliateGroup: false,
          }
        ).fetch();
      }
      return response.success(null, constants.AFFLIATE_GROUP.UPDATED, req, res);
    }
    throw constants.COMMON.SERVER_ERROR;
  } catch (error) {
    console.log(error, "==error");

    return response.failed(null, `${error}`, req, res);
  }
};

exports.getAllCommission = async (req, res) => {
  try {
    let query = {};
    let count = req.param("count") || 10;
    let page = req.param("page") || 1;
    let { search, isDeleted, status, sortBy, addedBy } = req.query;
    let skipNo = (Number(page) - 1) * Number(count);

    if (search) {
      search = await Services.Utils.remove_special_char_exept_underscores(
        search
      );
      query.$or = [
        { affiliate_group_name: { $regex: search, $options: "i" } },
        { subscriptionPlan_name: { $regex: search, $options: "i" } },
      ];
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

    if (status) {
      query.status = status;
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

    if (addedBy) {
      query.addedBy = new ObjectId(addedBy);
    }

    // console.log(JSON.stringify(query), "-----");
    // Pipeline Stages
    let pipeline = [
      {
        $lookup: {
          from: "affiliatemanagement",
          localField: "affiliate_group",
          foreignField: "_id",
          as: "affiliate_group_details",
        },
      },
      {
        $unwind: {
          path: "$affiliate_group_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      // {
      //     $lookup:
      //     {
      //         from: "users",
      //         // let: { agencyId: "$_id", addedBy: "$addedBy" },
      //         let: { affiliate_id: "$_id", isDeleted: false, affiliate_group: null },
      //         pipeline: [
      //             {
      //                 $match:
      //                 {
      //                     $expr:
      //                     {
      //                         $and:
      //                             [
      //                                 { $eq: ["$affiliate_id", "$$affiliate_id"] },
      //                                 { $eq: ["$isDeleted", "$$isDeleted"] },
      //                                 { $ne: ["$affiliate_group", "$$affiliate_group"] }
      //                             ]
      //                     }
      //                 }
      //             }
      //         ],
      //         as: "affiliate_details"
      //     }
      // },
      // {
      //     $unwind: {
      //         path: '$affiliate_details',
      //         preserveNullAndEmptyArrays: true
      //     }
      // },
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
          localField: "campaign",
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
      // {
      //     $lookup: {
      //         from: "users",
      //         localField: "affiliate_group",
      //         foreignField: "affiliate_group",
      //         as: "affiliate_details_of_group"
      //     },
      // },
      // {
      //     $unwind: {
      //         path: '$affiliate_details_of_group',
      //         preserveNullAndEmptyArrays: true
      //     }
      // },
      {
        $lookup: {
          from: "subscriptionplans",
          localField: "plan_id",
          foreignField: "_id",
          as: "subscriptionPlan_details",
        },
      },
      {
        $unwind: {
          path: "$subscriptionPlan_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      // {
      //     $lookup:
      //     {
      //         from: "users",
      //         // let: { agencyId: "$_id", addedBy: "$addedBy" },
      //         let: { affiliate_group: "$affiliate_group", isDeleted: false, affiliate_group: null },
      //         pipeline: [
      //             {
      //                 $match:
      //                 {
      //                     $expr:
      //                     {
      //                         $and:
      //                             [
      //                                 { $ne: ["$affiliate_group", "$$affiliate_group"] },
      //                                 { $eq: ["$isDeleted", "$$isDeleted"] },
      //                                 { $eq: ["$affiliate_group", "$$affiliate_group"] }
      //                             ]
      //                     }
      //                 }
      //             }
      //         ],
      //         as: "groupDetails"
      //     }
      // },
      {
        $lookup: {
          from: "users",
          let: {
            affiliate_group: "$affiliate_group",
            isDeleted: false,
            addedBy: "$addedBy",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $and: [
                        { $eq: ["$affiliate_group", "$$affiliate_group"] },
                        { $eq: ["$addedBy", "$$addedBy"] },
                        { $eq: ["$isDeleted", "$$isDeleted"] },
                      ],
                    },
                    {
                      $and: [
                        { $ne: ["$affiliate_group", null] },
                        { $eq: ["$isDeleted", "$$isDeleted"] },
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "groupDetails",
        },
      },
      // {
      //     $unwind: {
      //         path: '$groupDetails',
      //         preserveNullAndEmptyArrays: true
      //     }
      // },
    ];

    let projection = {
      $project: {
        id: "$_id",
        plan_id: "$plan_id",
        event_type: "$event_type",
        amount_type: "$amount_type",
        amount: "$amount",
        commision: "$commision",
        affiliate_group: "$affiliate_group",
        affiliate_id: "$affiliate_id",
        time_frame: "$time_frame",
        time_frame_type: "$time_frame_type",
        affiliate_group_name: "$affiliate_group_details.group_name",
        affiliate_name: "$affiliate_details.fullName",
        // subscriptionPlan_name: "$subscriptionPlan_details.name",
        // // affiliate_details_of_group: "$affiliate_details_of_group",
        groupDetails: "$groupDetails",
        affiliate_details: "$affiliate_details",
        due_date: "$due_date",
        date: "$date",
        campaign: "$campaign",
        campaign_details: "$campaign_details",
        campaign_name: "$campaign_details.name",
        // affiliate_details_name: "$groupDetails.fullName",
        // affiliate_details_email: "$groupDetails.email",
        status: "$status",
        addedBy: "$addedBy",
        updatedBy: "$updatedBy",
        isDeleted: "$isDeleted",
        createdAt: "$createdAt",
        updatedAt: "$updatedAt",
      },
    };
    // console.log("pipeline",JSON.stringify(pipeline));
    pipeline.push(projection);
    pipeline.push({
      $match: query,
    });

    // let group_stage = {
    //     $group: {
    //         _id: "$_id",
    //         // plan_id: { $first: "$plan_id" },
    //         event_type: { $first: "$event_type" },
    //         amount_type: { $first: "$amount_type" },
    //         amount: { $first: "$amount" },
    //         // commision: { $first: "$commision" },
    //         // event_type: { $first: "$event_type" },
    //         // plan_id: { $first: "$plan_id" },
    //         // event_type: { $first: "$event_type" },
    //         // affiliate_name: { $first: "$affiliate_name" },
    //         // affiliate_id: { $first: "$affiliate_id" },
    //         // affiliate_group: { $first: "$affiliate_group" },

    //         total_affiliates: {
    //             $push: {
    //                 // tracking_details: "$tracking_details",
    //                 // event_type: "$event_type",
    //                 affiliate_group: "$affiliate_group",
    //                 name: "$affiliate_details_name",
    //                 email: "$affiliate_details_email"
    //                 // ip_address: "$ip_address"
    //             }
    //         }
    //     },
    // };

    // pipeline.push(group_stage)

    pipeline.push({
      $sort: sortquery,
    });
    // Pipeline Stages
    let totalresult = await db
      .collection("commissionsmanagement")
      .aggregate(pipeline)
      .toArray();
    pipeline.push({
      $skip: Number(skipNo),
    });
    pipeline.push({
      $limit: Number(count),
    });
    let result = await db
      .collection("commissionsmanagement")
      .aggregate(pipeline)
      .toArray();
    let resData = {
      total_count: totalresult ? totalresult.length : 0,
      data: result ? result : [],
    };
    if (!req.param("page") && !req.param("count")) {
      resData.data = totalresult ? totalresult : [];
    }
    return response.success(resData, constants.CAMPAIGN.FETCHED_ALL, req, res);
  } catch (err) {
    console.log(err, "error here");
    return response.failed(null, `${err}`, req, res);
  }
};

exports.getCommissionById = async (req, res) => {
  try {
    let id = req.param("id");
    if (!id) {
      throw constants.COMMISSION.ID_REQUIRED;
    }
    let get_commission = await CommissionsManagement.findOne({
      id: id,
      isDeleted: false,
    });
    if (get_commission) {
      if (get_commission.plan_id) {
        let get_plan_details = await SubscriptionPlans.findOne({
          id: get_commission.plan_id,
        });
        if (get_plan_details) {
          get_commission.plan_name = get_plan_details.name;
        }
      }
      if (get_commission.affiliate_group) {
        let get_group_details = await AffiliateManagement.findOne({
          id: get_commission.affiliate_group,
        });
        if (get_group_details) {
          get_commission.group_name = get_group_details.group_name;
        }
      }
      return response.success(
        get_commission,
        constants.COMMISSION.FETCHED,
        req,
        res
      );
    }
    throw constants.COMMISSION.INVALID_ID;
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};
