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
        let brand_id = req.body.brand_id;
        let get_brand = await Users.findOne({id: brand_id, isDeleted: false});
        if(!get_brand) {
            return response.failed(null, constants.CAMPAIGN.INVALID_BRAND_ID, req, res);
        }
        req.body.isDefault = req.body.isDefault === 'true'? true: false;
        if(req.body.isDefault) {
            //make all other campaigns non-default
            await Campaign.update({brand_id: brand_id, isDefault: true}).set({isDefault: false});
        } else {
            let defaultCampaign = await Campaign.findOne({brand_id: brand_id, isDefault: true, isDeleted: false});
            if(!defaultCampaign) {
                req.body.isDefault = true;
            }
        }

        req.body.campaign_unique_id = generateRandom8DigitNumber();
        let affiliate_id_list;
        if(req.body.affiliate_id && req.body.access_type === 'private') {
            affiliate_id_list = [...req.body.affiliate_id]; 
        } else {
            affiliate_id_list = await Users.find({role: "affiliate", isDeleted: false});
            affiliate_id_list = affiliate_id_list.map(affiliate => affiliate.id);
        }
        let add_campaign = await Campaign.create(req.body).fetch();

        if (add_campaign) {
            //Create entries for all these affiliates in PublicPrivateCampaigns table
            let createPPCampaignsPromises = affiliate_id_list.map(id => {
                return BrandAffiliateAssociation.create({
                    affiliate_id: id,
                    campaign_id: add_campaign.id,
                    brand_id: brand_id,
                    addedBy: req.identity.id
                });
            });
            
            // Wait for all the promises to resolve
            await Promise.all(createPPCampaignsPromises);
            for(let current_affiliate_id of affiliate_id_list) {
                let notification_payload = {};
                notification_payload.send_to = current_affiliate_id;
                notification_payload.title = `Campaign | ${Services.Utils.title_case(add_campaign.name)} | ${Services.Utils.title_case(req.identity.fullName)}`;
                notification_payload.message = `You have a new campaign request from ${Services.Utils.title_case(req.identity.fullName)}`;
                notification_payload.type = "campaign"
                notification_payload.addedBy = req.identity.id;
                notification_payload.campaign_id = add_campaign.id;
                let create_notification = await Notifications.create(notification_payload).fetch();
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
            return response.success(null, constants.CAMPAIGN.ADDED, req, res);
        }
        throw constants.COMMON.SERVER_ERROR;

    } catch (error) {
        console.log(error);
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
        let edit_campaign = await Campaign.updateOne({ id: id }).set(req.body);
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

exports.listPublicCampaignsOfAllBrands = async (req, res) => {
    try {
        let campaigns = await Campaign.find({access_type: 'public', isDeleted: false}).populate('brand_id');
        return response.success(campaigns, constants.CAMPAIGN.FETCHED_ALL, req, res);
    } catch(err) {
        return response.failed(null, `${err}`, req, res);
    }
}

exports.getAllCampaignRequestsForAffiliate = async (req, res) => {
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
                {source: "affiliate_request", status: "accepted"}
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

        let totalresult = await db.collection('brandaffiliateassociation').aggregate(pipeline).toArray();
        pipeline.push({
            $skip: Number(skipNo)
        });
        pipeline.push({
            $limit: Number(count)
        });
        let result = await db.collection("brandaffiliateassociation").aggregate(pipeline).toArray();
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
    //From brand's perspective
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
        let listOfAffiliates = await BrandAffiliateAssociation.find({ where: { campaign_id: get_campaign.id, brand_id: get_campaign.brand_id.id, isDeleted: false, isActive: true }, select: ['affiliate_id', 'status', 'reason', 'campaign_link'] }).populate("affiliate_id");
        get_campaign.affiliate_id = listOfAffiliates;
        return response.success(get_campaign, constants.CAMPAIGN.FETCHED, req, res);
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}


exports.changeCampaignStatus = async (req, res) => {
    try {
        //To approve or reject campaign requests
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

        let get_campaign = await BrandAffiliateAssociation.findOne({ id: id, isDeleted: false, status: "pending" }).populate('campaign_id');

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
                await BrandAffiliateAssociation.update({affiliate_id: req.body.affiliate_id, brand_id: get_campaign.brand_id}).set({isActive: false});
                await BrandAffiliateAssociation.updateOne({id: id}).set({status: req.body.status, isActive: true});
                
            } else if(req.body.status === 'rejected'){
                await BrandAffiliateAssociation.updateOne({id: get_campaign.id}).set({status: "rejected"});
            } else {
                return response.failed(null, constants.CAMPAIGN.INVALID_STATUS, req, res);
            }
            
            // await PublicCampaigns.create({ affiliate_id: req.identity.id, campaign_id: get_campaign.id, brand_id: get_campaign.addedBy, addedBy: req.identity.id });
            //Email to brand when status of a campaign changes
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
            // if (create_notification && brandDetail && brandDetail.device_token) {
            //     let fcm_payload = {
            //         device_token: brandDetail.device_token,
            //         title: req.identity.fullName,
            //         message: create_notification.message,
            //     }

            //     await Services.FCM.send_fcm_push_notification(fcm_payload)
            // }
            return response.success(null, constants.CAMPAIGN.STATUS_UPDATE, req, res)    
        } else {
           return response.failed(null, constants.CAMPAIGN.NOT_FOUND);
        }
    } catch (error) {
        return response.failed(null, `${error}`, req, res)
    }
}


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
        let brandAffiliateAssociation = await BrandAffiliateAssociation.find({campaign_id: id, isActive: true, status: "accepted"});
        if(brandAffiliateAssociation && brandAffiliateAssociation.length > 0) {
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
        await BrandAffiliateAssociation.update({campaign_id: id}).set({isDeleted: true});
        if (update_campaign) {
            return response.success(null, constants.CAMPAIGN.DELETED, req, res);
        }
        throw constants.CAMPAIGN.INVALID_ID;
    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}