/**
 * CampaignController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const response = require("../services/Response")
const constants = require('../../config/constants').constants;
const db = sails.getDatastore().manager
const Validations = require("../Validations/index");
const Services = require('../services/index');
const ObjectId = require('mongodb').ObjectId;
const Emails = require('../Emails/index');
const credentials = require('../../config/local.js'); //sails.config.env.production;
const { pipeline } = require("form-data");
// const Campaign = require("../models/Campaign.js");

generateName = function () {
    // action are perform to generate random name for every file
    var uuid = require('uuid');
    var randomStr = uuid.v4();
    var date = new Date();
    var currentDate = date.valueOf();

    retVal = randomStr + currentDate;
    return retVal;
};

generateRandom8DigitNumber = function () {
    const min = 10000000; // 8-digit number starts at 10000000
    const max = 99999999; // 8-digit number ends at 99999999
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

exports.addCampaign = async (req, res) => {
    try {

        // if (req.identity.role !== "brand") {
        //     throw constants.COMMON.UNAUTHORIZED;
        // }

        let user_id = req.identity.id;

        let loggedInUser = await Users.findOne({ id: user_id, isDeleted: false });
        if (loggedInUser.addedBy) {

            let get_account_manager_detail = await Users.findOne({ id: loggedInUser.addedBy, isDeleted: false });
            if (get_account_manager_detail && get_account_manager_detail.role) {
                if(loggedInUser.role === 'brand' || loggedInUser.role === 'affiliate') {
                    var isPermissionExists = await Permissions.findOne({
                      role: loggedInUser.role,
                      //account_manager: get_account_manager_detail.role
                    });
                  }
                else {
                    var isPermissionExists = await Permissions.findOne({
                        role: loggedInUser.role,
                        account_manager: get_account_manager_detail.role
                });
                }

                if (!isPermissionExists) {
                    throw "Permission not exists";
                }
            }
        }

        // return;
        let validation_result = await Validations.CampaignValidations.addCampaign(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }
        let { event_type } = req.body;

        let get_campaign = await Campaign.findOne({ name: req.body.name, isDeleted: false });
        if (get_campaign) {
            throw constants.CAMPAIGN.ALREADY_EXIST
        }

        req.body.addedBy = req.identity.id;
        req.body.brand_id = req.body.brand_id;
        let get_brand = await Users.findOne({id: req.body.brand_id, isDeleted: false});
        if(!get_brand) {
            return response.failed(null, constants.CAMPAIGN.INVALID_BRAND_ID, req, res);
        }

        if(req.body.isDefault) {
            //make all other campaigns non-default
            req.body.isDefault = req.body.isDefault === 'true'? true: false;
            if(req.body.isDefault)
                await Campaign.update({brand_id: (req.body.brand_id), isDefault: true}).set({isDefault: false});
            
        }

        req.body.campaign_unique_id = generateRandom8DigitNumber();
        let affiliate_id_list = [...req.body.affiliate_id];
        req.body.affiliate_id = [];
        let add_campaign = await Campaign.create(req.body).fetch();
        req.body.affiliate_id = [...affiliate_id_list];
        if (add_campaign) {
            if (add_campaign.access_type == "private") {

                //Create entries for all these affiliates in PublicPrivateCampaigns table
                for(let id of req.body.affiliate_id){
                    await PublicPrivateCampaigns.create({ affiliate_id: id, campaign_id: add_campaign.id, brand_id: req.body.brand_id, addedBy: req.identity.id });
                }

                //Change this to send emails to multiple affiliates

                const emailTasks = req.body.affiliate_id.map(current_affiliate_id => {
                    let email_payload = {
                        affiliate_id: current_affiliate_id,
                        brand_id: req.body.brand_id,
                    };
                    return Emails.CampaignEmails.AddCampaign(email_payload);
                });
            
                // Execute all email tasks concurrently
                await Promise.all(emailTasks);
                for(let current_affiliate_id of req.body.affiliate_id) {
                    let notification_payload = {};
                    notification_payload.send_to = current_affiliate_id;
                    notification_payload.title = `Campaign | ${Services.Utils.title_case(add_campaign.name)} | ${Services.Utils.title_case(req.identity.fullName)}`;
                    notification_payload.message = `You have a new campaign request from ${Services.Utils.title_case(req.identity.fullName)}`;
                    notification_payload.type = "campaign"
                    notification_payload.addedBy = req.identity.id;
                    notification_payload.campaign_id = add_campaign.id;
                    let create_notification = await Notifications.create(notification_payload).fetch();

                    let affiliate_detail = await Users.findOne({ id: current_affiliate_id, isDeleted: false });
                    if(!affiliate_detail) {
                        return response.failed(null, constants.CAMPAIGN.INVALID_AFFILIATE_ID, req, res);
                    }
                    if (create_notification && affiliate_detail.device_token) 
                    {
                        let fcm_payload = {
                            device_token: affiliate_detail.device_token,
                            title: req.identity.fullName,
                            message: create_notification.message,
                        }

                        // await Services.FCM.send_fcm_push_notification(fcm_payload)
                    }
                }
                
            }else
            {
               for(let id of req.body.affiliate_id){
                   await PublicPrivateCampaigns.create({ affiliate_id: id, campaign_id: add_campaign.id, brand_id: req.body.brand_id, addedBy: req.identity.id });
               }
            }

            //------------------------Create Logs here -------------------------------
            if (add_campaign) {
                if (['operator', 'super_user'].includes(req.identity.role)) {
                    let get_account_manager = await Users.findOne({ id: req.identity.addedBy, isDeleted: false })
                    await Services.activityHistoryServices.create_activity_history(req.identity.id, 'campaign', 'created', add_campaign, add_campaign, get_account_manager.id ? get_account_manager.id : null)

                } else if (['brand'].includes(req.identity.role)) {

                    let get_all_admin = await Services.UserServices.get_users_with_role(["admin"])
                    let get_account_manager = get_all_admin[0].id
                    await Services.activityHistoryServices.create_activity_history(req.identity.id, 'campaign', 'created', add_campaign, add_campaign, get_account_manager ? get_account_manager.id : null)
                }
            }

            return response.success(add_campaign, constants.CAMPAIGN.ADDED, req, res);
        }
        throw constants.COMMON.SERVER_ERROR;

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
};

exports.editCampaign = async (req, res) => {
    try {

        let user_id = req.identity.id;


        let loggedInUser = await Users.findOne({ id: user_id, isDeleted: false });
        if (loggedInUser.addedBy) {

            let get_account_manager_detail = await Users.findOne({ id: loggedInUser.addedBy, isDeleted: false });
            if (get_account_manager_detail && get_account_manager_detail.role) {
                if(loggedInUser.role === 'brand' || loggedInUser.role === 'affiliate') {
                    var isPermissionExists = await Permissions.findOne({
                      role: loggedInUser.role,
                      //account_manager: get_account_manager_detail.role
                    });
                  }
                else {
                    var isPermissionExists = await Permissions.findOne({
                        role: loggedInUser.role,
                        account_manager: get_account_manager_detail.role
                });
                }

                if (!isPermissionExists) {
                    throw "Permission not exists";
                }
            }
        }

        let validation_result = await Validations.CampaignValidations.editCampaign(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { id } = req.body;

        let get_campaign = await Campaign.findOne({ id: id, isDeleted: false });
        if (!get_campaign) {
            throw constants.CAMPAIGN.INVALID_ID;
        }

        if (![get_campaign.brand_id].includes(req.identity.id)) {
            throw constants.COMMON.UNAUTHORIZED;
        }

        if(req.body.isDefault) {
            //make all other campaigns non-default
            req.body.isDefault = req.body.isDefault === 'true'? true: false;
            if(req.body.isDefault)
                await Campaign.update({brand_id: (req.body.brand_id), isDefault: true}).set({isDefault: false});
            
        }

        req.body.updatedBy = req.identity.id;
        let edit_campaign = await Campaign.updateOne({ id: id }, req.body);
        if (edit_campaign) {
            if (['operator', 'super_user'].includes(req.identity.role)) {
                let get_account_manager = await Users.findOne({ id: req.identity.addedBy, isDeleted: false })

                await Services.activityHistoryServices.create_activity_history(req.identity.id, 'campaign', 'created', edit_campaign, get_campaign, get_account_manager.id ? get_account_manager.id : null)

            } else if (['brand'].includes(req.identity.role)) {

                let get_all_admin = await Services.UserServices.get_users_with_role(["admin"])
                let get_account_manager = get_all_admin[0].id

                await Services.activityHistoryServices.create_activity_history(req.identity.id, 'campaign', 'created', edit_campaign, get_campaign, get_account_manager ? get_account_manager.id : null)
            }
            return response.success(null, constants.CAMPAIGN.UPDATED, req, res);
        }
        throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.getAllCampaignsForAffiliate = async (req, res) => {
    try {
        let user_id = req.identity.id;
        let loggedInUser = await Users.findOne({ id: user_id, isDeleted: false });
        if (loggedInUser.addedBy) {

            let get_account_manager_detail = await Users.findOne({ id: loggedInUser.addedBy, isDeleted: false });
            if (get_account_manager_detail && get_account_manager_detail.role) {
                if(loggedInUser.role === 'brand' || loggedInUser.role === 'affiliate') {
                    var isPermissionExists = await Permissions.findOne({
                      role: loggedInUser.role,
                      //account_manager: get_account_manager_detail.role
                    });
                  }
                else {
                    var isPermissionExists = await Permissions.findOne({
                        role: loggedInUser.role,
                        account_manager: get_account_manager_detail.role
                });
                }
                if (!isPermissionExists) {
                    throw "Permission not exists";
                }
            }
        }

        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let { search, isDeleted, status, sortBy, brand_id, affiliate_id } = req.query;
        let skipNo = (Number(page) - 1) * Number(count);

        if (search) {
            search = Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { "campaign_detail.name": { $regex: search, '$options': 'i' } }
            ]
        }

        query.isDeleted = false;

        if (status) {
            if(status != 'accepted') {
                query.$or = [
                    {source: "campaign", status: status}
                ];
            }
        } else {
            query.$or = [
                {source: "campaign", status: "accepted"},
                {source: "campaign", status: "rejected"},
                {source: "campaign", status: "pending"},
                {source: "invite", status: "accepted"},
                {source: "make_offer", status: "accepted"},
            ]
        }

        if (brand_id) {
            query.campaign_detail.brand_id = new ObjectId(brand_id);
        }

        if (affiliate_id) {
            query.affiliate_id = new ObjectId(affiliate_id);
        }

        let sortquery = {};
        if (sortBy) {
            let typeArr = [];
            typeArr = sortBy.split(" ");
            let sortType = typeArr[1];
            let field = typeArr[0];
            sortquery[field ? field : 'updatedAt'] = sortType ? (sortType == 'desc' ? -1 : 1) : -1;
        } else {
            sortquery = { updatedAt: -1 }
        }
        // Pipeline Stages
        let pipeline = [
            {
                $lookup: {
                    from: "campaign",
                    localField: "campaign_id",
                    foreignField: "_id",
                    as: "campaign_detail"
                }
            },
            {
                $unwind: {
                    path: '$campaign_detail',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "brand_id",
                    foreignField: "_id",
                    as: "brand_detail"
                }
            },
            {
                $unwind: {
                    path: '$brand_detail',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: query
            },
            {
                $project: {
                    affiliate_id:1,
                    campaign_id:1,
                    campaign_detail:1,
                    brand_id: 1,
                    brand_detail: 1,
                    isDeleted: 1,
                    status: 1,
                    deletedBy: 1,
                    deletedAt: 1,
                    updatedBy: 1,
                    addedBy: 1,
                    createdAt: 1,
                    accepted_at: 1,
                    updatedAt: 1,
                    isActive: 1,
                }
            }
        ];

        let totalresult = await db.collection('publicprivatecampaigns').aggregate(pipeline).toArray();
        pipeline.push({
            $skip: Number(skipNo)
        });
        pipeline.push({
            $limit: Number(count)
        });
        let result = await db.collection("publicprivatecampaigns").aggregate(pipeline).toArray();
        let resData = {
            total_count: totalresult ? totalresult.length : 0,
            data: result ? result : [],
        }
        if (!req.param('page') && !req.param('count')) {
            resData.data = totalresult ? totalresult : [];
        }
        return response.success(resData, constants.CAMPAIGN.FETCHED_ALL, req, res);


    } catch(err) {
        return response.failed(null, `${err}`, req, res);
    }
}

exports.getAllCampaignsForBrand = async (req, res) => {
    try {
        let user_id = req.identity.id;
        let loggedInUser = await Users.findOne({ id: user_id, isDeleted: false });
        if (loggedInUser.addedBy) {

            let get_account_manager_detail = await Users.findOne({ id: loggedInUser.addedBy, isDeleted: false });
            if (get_account_manager_detail && get_account_manager_detail.role) {
                if(loggedInUser.role === 'brand' || loggedInUser.role === 'affiliate') {
                    var isPermissionExists = await Permissions.findOne({
                      role: loggedInUser.role,
                      //account_manager: get_account_manager_detail.role
                    });
                  }
                else {
                    var isPermissionExists = await Permissions.findOne({
                        role: loggedInUser.role,
                        account_manager: get_account_manager_detail.role
                });
                }
                if (!isPermissionExists) {
                    throw "Permission not exists";
                }
            }
        }

        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let { search, sortBy, brand_id } = req.query;
        
        let skipNo = (Number(page) - 1) * Number(count);

        if (search) {
            search = Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { "name": { $regex: search, '$options': 'i' } }
            ]
        }
        query.isDeleted = false;

        if (brand_id) {
            query.brand_id = new ObjectId(brand_id);
        }
        let sortquery = {};
        if (sortBy) {
            let typeArr = [];
            typeArr = sortBy.split(" ");
            let sortType = typeArr[1];
            let field = typeArr[0];
            sortquery[field ? field : 'createdAt'] = sortType ? (sortType == 'desc' ? -1 : 1) : -1;
        } else {
            sortquery = { updatedAt: -1 }
        }
        // Pipeline Stages
        let pipeline = [
            {
                $match: query
            },
            {
                $project: {
                    _id: 1,
                    brand_id: 1,
                    parent_id:1,
                    parent_role:1,
                    name: 1,
                    description: 1,
                    images: 1,
                    documents: 1,
                    videos: 1,
                    access_type: 1,
                    amount: 1,
                    event_type: 1,
                    campaign_unique_id: 1,
                    addedBy: 1,
                    updatedBy: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    isDefault: 1,
                    isDeleted: 1
                }
            },
            {
                $sort: sortquery
            }
        ];
        let totalresult = await db.collection('campaign').aggregate(pipeline).toArray();
        pipeline.push({
            $skip: Number(skipNo)
        });
        pipeline.push({
            $limit: Number(count)
        });
        let result = await db.collection("campaign").aggregate(pipeline).toArray();
        let resData = {
            total_count: totalresult ? totalresult.length : 0,
            data: result ? result : [],
        }
        if (!req.param('page') && !req.param('count')) {
            resData.data = totalresult ? totalresult : [];
        }
        return response.success(resData, constants.CAMPAIGN.FETCHED_ALL, req, res);


    } catch(err) {
        return response.failed(null, `${err}`, req, res);
    }
}
/*
exports.getAllCampaigns = async (req, res) => {
    try {

        let user_id = req.identity.id;
        console.log(req.identity);
        let loggedInUser = await Users.findOne({ id: user_id, isDeleted: false });
        if (loggedInUser.addedBy) {

            let get_account_manager_detail = await Users.findOne({ id: loggedInUser.addedBy, isDeleted: false });
            if (get_account_manager_detail && get_account_manager_detail.role) {
                if(loggedInUser.role === 'brand' || loggedInUser.role === 'affiliate') {
                    var isPermissionExists = await Permissions.findOne({
                      role: loggedInUser.role,
                      //account_manager: get_account_manager_detail.role
                    });
                  }
                else {
                    var isPermissionExists = await Permissions.findOne({
                        role: loggedInUser.role,
                        account_manager: get_account_manager_detail.role
                });
                }
                if (!isPermissionExists) {
                    throw "Permission not exists";
                }
            }
        }

        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let { search, isDeleted, status, sortBy, brand_id, affiliate_id } = req.query;
        let skipNo = (Number(page) - 1) * Number(count);

        if (search) {
            search = Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { name: { $regex: search, '$options': 'i' } }
            ]
        }

        if (isDeleted) {
            query.isDeleted = true;
        } else {
            query.isDeleted = false;
        }

        if (status) {
            query.status = status;
        }

        if (brand_id) {
            query.brand_id = new ObjectId(brand_id);
        }

        if (affiliate_id) {
            // query.affiliate_id = new ObjectId(affiliate_id);
            query.$or = [
                { affiliate_id: new ObjectId(affiliate_id) },
                { affiliate_id: null },
            ];
        }

        query.isActive = true;
        // console.log(query, "==query");

        let sortquery = {};
        if (sortBy) {
            let typeArr = [];
            typeArr = sortBy.split(" ");
            let sortType = typeArr[1];
            let field = typeArr[0];
            sortquery[field ? field : 'createdAt'] = sortType ? (sortType == 'desc' ? -1 : 1) : -1;
        } else {
            sortquery = { updatedAt: -1 }
        }
        // Pipeline Stages
        let pipeline = [
            {
                $lookup: {
                    from: "users",
                    localField: "affiliate_id",
                    foreignField: "_id",
                    as: "affiliate_id_details"
                }
            },
            {
                $unwind: {
                    path: '$affiliate_id_details',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "brand_id",
                    foreignField: "_id",
                    as: "brand_id_details"
                }
            },
            {
                $unwind: {
                    path: '$brand_id_details',
                    preserveNullAndEmptyArrays: true
                }
            },
        ];
if(req.identity.role==="affiliate"){
    pipeline.push( {
        $lookup: {
            from: "publiccampaigns",
            let: {
                isDeleted: false,
                addedBy: new ObjectId(req.identity.id),
                campaign_id:"$_id"
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                { $eq: ["$addedBy", "$$addedBy"] },
                                { $eq: ["$isDeleted", "$$isDeleted"] },
                                { $eq: ["$campaign_id", "$$campaign_id"] },
                            ],
                        },
                    },
                },
            ],
            as: "campaign_details",
        },
    },
    {
        $unwind: {
            path: "$campaign_details",
            preserveNullAndEmptyArrays: true,
        },
    })
}   

        let projection = {
            $project: {
                id: "$_id",
                access_type: "$access_type",
                affiliate_id: "$affiliate_id",
                affiliate_name: "$affiliate_id_details.fullName",
                brand_id: "$brand_id",
                brand_name: "$brand_id_details.fullName",
                group_type: "$group_type",
                name: "$name",
                images: "$images",
                campaign_details:"$campaign_details",
                videos: "$videos",
                description: "$description",
                status: (req.identity.role === "affiliate")?"$campaign_details.status":"$status",
                reason: "$reason",
                amount: "$amount",
                event_type: "$event_type",
                campaign_link: "$campaign_link",
                campaign_unique_id: "$campaign_unique_id",
                addedBy: "$addedBy",
                updatedBy: "$updatedBy",
                isDefault: "$isDefault",
                isDeleted: "$isDeleted",
                createdAt: "$createdAt",
                updatedAt: "$updatedAt"
            }
        };

        pipeline.push(projection);
        pipeline.push({
            $match: query
        });
        pipeline.push({
            $sort: sortquery
        });
        // Pipeline Stages
        let totalresult = await db.collection('publicprivatecampaigns').aggregate(pipeline).toArray();
        pipeline.push({
            $skip: Number(skipNo)
        });
        pipeline.push({
            $limit: Number(count)
        });
        let result = await db.collection("publicprivatecampaigns").aggregate(pipeline).toArray();
        let resData = {
            total_count: totalresult ? totalresult.length : 0,
            data: result ? result : [],
        }
        if (!req.param('page') && !req.param('count')) {
            resData.data = totalresult ? totalresult : [];
        }
        return response.success(resData, constants.CAMPAIGN.FETCHED_ALL, req, res);


    } catch (err) {
        console.log(err);
        return response.failed(null, `${err}`, req, res);
    }
}
*/
exports.getCampaignById = async (req, res) => {
    try {
        let user_id = req.identity.id;

        let loggedInUser = await Users.findOne({ id: user_id, isDeleted: false });
        if (loggedInUser.addedBy) {

            let get_account_manager_detail = await Users.findOne({ id: loggedInUser.addedBy, isDeleted: false });
            if (get_account_manager_detail && get_account_manager_detail.role) {
                if(loggedInUser.role === 'brand' || loggedInUser.role === 'affiliate') {
                    var isPermissionExists = await Permissions.findOne({
                      role: loggedInUser.role,
                      //account_manager: get_account_manager_detail.role
                    });
                  }
                else {
                    var isPermissionExists = await Permissions.findOne({
                        role: loggedInUser.role,
                        account_manager: get_account_manager_detail.role
                });
                }
                if (!isPermissionExists) {
                    throw "Permission not exists";
                }
            }
        }


        let id = req.param("id")
        if (!id) {
            throw constants.CAMPAIGN.ID_REQUIRED;
        }
        let get_campaign = await Campaign.findOne({ id: id, isDeleted: false }).populate('brand_id');//.populate('affiliate_id');
        if (!get_campaign) {
            throw constants.CAMPAIGN.INVALID_ID;
        }
        let listOfAffiliates = await PublicPrivateCampaigns.find({ where: { campaign_id: get_campaign.id, brand_id: get_campaign.brand_id.id, isDeleted: false, isActive: true }, select: ['affiliate_id', 'status', 'reason', 'campaign_link'] }).populate("affiliate_id");
        get_campaign.affiliate_id = listOfAffiliates;
        return response.success(get_campaign, constants.CAMPAIGN.FETCHED, req, res);
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}


exports.changeCampaignStatus = async (req, res) => {
    try {

        let user_id = req.identity.id;

        let loggedInUser = await Users.findOne({ id: user_id, isDeleted: false });
        if (loggedInUser.addedBy) {

            let get_account_manager_detail = await Users.findOne({ id: loggedInUser.addedBy, isDeleted: false });
            if (get_account_manager_detail && get_account_manager_detail.role) {
                if(loggedInUser.role === 'brand' || loggedInUser.role === 'affiliate') {
                    var isPermissionExists = await Permissions.findOne({
                      role: loggedInUser.role,
                      //account_manager: get_account_manager_detail.role
                    });
                  }
                else {
                    var isPermissionExists = await Permissions.findOne({
                        role: loggedInUser.role,
                        account_manager: get_account_manager_detail.role
                });
                }

                if (!isPermissionExists) {
                    throw "Permission not exists";
                }
            }
        }

        let validation_result = await Validations.CampaignValidations.changeCampaignStatus(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message
        }
        let { id } = req.body;

        let get_campaign = await PublicPrivateCampaigns.findOne({ id: id, isDeleted: false, status: "pending" }).populate('campaign_id');

        if (!get_campaign) {
            throw constants.CAMPAIGN.INVALID_ID;
        }

        if (get_campaign) { 
            if (!['affiliate'].includes(req.identity.role)) {
                throw constants.COMMON.UNAUTHORIZED;
            }
            switch (req.body.status) {
                case "accepted":
                    req.body.accepted_at = new Date();
                    break;
                default:
                    break;

            }
            req.body.addedBy = user_id;
            if(req.body.status === 'accepted') {
                await PublicPrivateCampaigns.update({affiliate_id: req.body.affiliate_id, brand_id: get_campaign.brand_id}).set({isActive: false});
                await PublicPrivateCampaigns.updateOne({id: id}).set({status: req.body.status, isActive: true});
                
            } else if(req.body.status === 'rejected'){
                await PublicPrivateCampaigns.updateOne({id: get_campaign.id}).set({status: req.body.status});
            } else {
                return response.failed(null, constants.CAMPAIGN.INVALID_STATUS, req, res);
            }
            
            // await PublicCampaigns.create({ affiliate_id: req.identity.id, campaign_id: get_campaign.id, brand_id: get_campaign.addedBy, addedBy: req.identity.id });

            let email_payload = {
                affiliate_id: req.body.affiliate_id,
                brand_id: get_campaign.brand_id,
                status: req.body.status,
                reason: req.body.reason ? req.body.reason : "",
            };
            await Emails.CampaignEmails.changeStatus(email_payload);

            let notification_payload = {};
            notification_payload.type = "campaign"
            notification_payload.addedBy = req.identity.id;
            notification_payload.title = `Campaign ${Services.Utils.title_case(get_campaign.status)} | ${Services.Utils.title_case(get_campaign.campaign_id.name)} | ${req.identity.fullName}`;
            notification_payload.message = `Your campaign request is ${Services.Utils.title_case(get_campaign.status)}`;
            notification_payload.send_to = get_campaign.brand_id;
            notification_payload.campaign_id = get_campaign.id;
            let brandDetail = await Users.findOne({ id: get_campaign.brand_id, isDeleted: false });
            let create_notification = await Notifications.create(notification_payload).fetch();
            if (create_notification && brandDetail && brandDetail.device_token) {
                let fcm_payload = {
                    device_token: brandDetail.device_token,
                    title: req.identity.fullName,
                    message: create_notification.message,
                }

                await Services.FCM.send_fcm_push_notification(fcm_payload)
            }
            return response.success(null, constants.CAMPAIGN.STATUS_UPDATE, req, res)    
        } else {
           return response.failed(null, constants.CAMPAIGN.NOT_FOUND);
        }
    } catch (error) {
        return response.failed(null, `${error}`, req, res)
    }
}

/*
exports.changeCampaignStatus = async (req, res) => {
    try {

        let user_id = req.identity.id;

        let loggedInUser = await Users.findOne({ id: user_id, isDeleted: false });
        if (loggedInUser.addedBy) {

            let get_account_manager_detail = await Users.findOne({ id: loggedInUser.addedBy, isDeleted: false });
            if (get_account_manager_detail && get_account_manager_detail.role) {
                if(loggedInUser.role === 'brand' || loggedInUser.role === 'affiliate') {
                    var isPermissionExists = await Permissions.findOne({
                      role: loggedInUser.role,
                      //account_manager: get_account_manager_detail.role
                    });
                  }
                else {
                    var isPermissionExists = await Permissions.findOne({
                        role: loggedInUser.role,
                        account_manager: get_account_manager_detail.role
                });
                }

                if (!isPermissionExists) {
                    throw "Permission not exists";
                }
            }
        }

        let validation_result = await Validations.CampaignValidations.changeCampaignStatus(req, res);
        if (validation_result && !validation_result.success) {
            throw validation_result.message
        }

        let { id } = req.body;

        let get_campaign = await PublicPrivateCampaigns.findOne({ id: id, isDeleted: false });

        if (!get_campaign) {
            throw constants.CAMPAIGN.INVALID_ID;
        }

        if (get_campaign) {
            if (!['affiliate'].includes(req.identity.role)) {
                throw constants.COMMON.UNAUTHORIZED;
            }
            switch (req.body.status) {
                case "accepted":
                    req.body.accepted_at = new Date()
                    break;
                default:
                    break;

            }
            req.body.addedBy = user_id;


            let publicCampaign = await PublicCampaigns.findOne({ affiliate_id: req.identity.id, campaign_id: get_campaign.id, brand_id: get_campaign.addedBy, addedBy: req.identity.id });

            if (publicCampaign) {
                throw "Campaign request already accepted";
            }

            await PublicCampaigns.create({ affiliate_id: req.identity.id, campaign_id: get_campaign.id, brand_id: get_campaign.addedBy, addedBy: req.identity.id });

            let email_payload = {
                affiliate_id: req.identity.id,
                brand_id: get_campaign.brand_id,
                status: req.body.status,
                reason: req.body.reason ? req.body.reason : "",
            };

            console.log(email_payload, "---------->");

            await Emails.CampaignEmails.changeStatus(email_payload);

            let device_token = "";
            let notification_payload = {};
            notification_payload.type = "campaign"
            notification_payload.addedBy = req.identity.id;
            notification_payload.title = `Campaign ${Services.Utils.title_case(get_campaign.status)} | ${Services.Utils.title_case(get_campaign.name)} | ${req.identity.fullName}`;
            notification_payload.message = `Your campaign request is ${Services.Utils.title_case(get_campaign.status)}`;
            notification_payload.send_to = get_campaign.brand_id;
            notification_payload.campaign_id = get_campaign.id;
            let brandDetail = await Users.findOne({ id: get_campaign.brand_id })
            let create_notification = await Notifications.create(notification_payload).fetch();
            if (create_notification && brandDetail && brandDetail.device_token) {
                let fcm_payload = {
                    device_token: brandDetail.device_token,
                    title: req.identity.fullName,
                    message: create_notification.message,
                }

                await Services.FCM.send_fcm_push_notification(fcm_payload)
            }
            return response.success(null, constants.CAMPAIGN.STATUS_UPDATE, req, res)
        } else {
            if (req.body.status == "accepted" && ['accepted'].includes(get_campaign.status)) {
                throw constants.CAMPAIGN.CANNOT_ACCEPT;
            }

            if (!['affiliate'].includes(req.identity.role)) {
                throw constants.COMMON.UNAUTHORIZED;
            }

            switch (req.body.status) {
                case "accepted":
                    req.body.accepted_at = new Date()
                    break;
                default:
                    break;

            }

            req.body.updatedBy = user_id;
            let update_status = await Campaign.updateOne({ id: req.body.id }, req.body);

            if (update_status) {
                let email_payload = {
                    affiliate_id: req.identity.id,
                    brand_id: get_campaign.brand_id,
                    status: update_status.status,
                    reason: update_status.reason
                };
                console.log(email_payload, "---------->");
                await Emails.CampaignEmails.changeStatus(email_payload);

                let device_token = "";
                let notification_payload = {};
                notification_payload.type = "campaign"
                notification_payload.addedBy = req.identity.id;
                notification_payload.title = `Campaign ${Services.Utils.title_case(update_status.status)} | ${Services.Utils.title_case(update_status.name)} | ${req.identity.fullName}`;
                notification_payload.message = `Your campaign request is ${Services.Utils.title_case(update_status.status)}`;
                notification_payload.send_to = update_status.brand_id;
                notification_payload.campaign_id = update_status.id;
                let brandDetail = await Users.findOne({ id: update_status.brand_id })
                let create_notification = await Notifications.create(notification_payload).fetch();
                if (create_notification && brandDetail && brandDetail.device_token) {
                    let fcm_payload = {
                        device_token: brandDetail.device_token,
                        title: req.identity.fullName,
                        message: create_notification.message,
                    }

                    await Services.FCM.send_fcm_push_notification(fcm_payload)
                }
                return response.success(null, constants.CAMPAIGN.STATUS_UPDATE, req, res)
            }
        }
        throw constants.COMMON.SERVER_ERROR

    } catch (error) {
        console.log(error);
        return response.failed(null, `${error}`, req, res)
    }
}
*/
exports.deleteCampaign = async (req, res) => {
    try {

        let user_id = req.identity.id;


        let loggedInUser = await Users.findOne({ id: user_id, isDeleted: false });
        if (loggedInUser.addedBy) {

            let get_account_manager_detail = await Users.findOne({ id: loggedInUser.addedBy, isDeleted: false });
            if (get_account_manager_detail && get_account_manager_detail.role) {
                if(loggedInUser.role === 'brand' || loggedInUser.role === 'affiliate') {
                    var isPermissionExists = await Permissions.findOne({
                      role: loggedInUser.role,
                      //account_manager: get_account_manager_detail.role
                    });
                  }
                else {
                    var isPermissionExists = await Permissions.findOne({
                        role: loggedInUser.role,
                        account_manager: get_account_manager_detail.role
                });
                }

                if (!isPermissionExists) {
                    throw "Permission not exists";
                }
            }
        }

        let id = req.param("id");
        if (!id) {
            throw constants.CAMPAIGN.ID_REQUIRED;
        }
        let publicpvtcampaigns = await PublicPrivateCampaigns.find({campaign_id: id, isActive: true, status: "accepted"});
        if(publicpvtcampaigns && publicpvtcampaigns.length > 0) {
            return response.failed(null, constants.CAMPAIGN.NOT_ALLOWED_AFFS_EXIST, req, res);
        }
        let campaign = await Campaign.findOne({id: id});
        if(campaign.isDefault) {
            let campaignsForBrand = await Campaign.find({brand_id: campaign.brand_id, isDeleted: false}).sort({updatedAt: -1});
            if(campaignsForBrand && campaignsForBrand.length > 0) {
                await Campaign.updateOne({id: campaignsForBrand[0].id}).set({isDefault: true});
            }
        }
        const update_campaign = await Campaign.updateOne({ id: id }).set({ isDefault: false, isDeleted: true, updatedBy: req.identity.id });
        await PublicPrivateCampaigns.update({campaign_id: id}).set({isDeleted: true});
        if (update_campaign) {
            return response.success(null, constants.CAMPAIGN.DELETED, req, res);
        }
        throw constants.CAMPAIGN.INVALID_ID;
    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}