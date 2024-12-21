// /**
//  * CampaignRequestController
//  *
//  * @description :: Server-side actions for handling incoming requests.
//  * @help        :: See https://sailsjs.com/docs/concepts/actions
//  */

// const response = require("../services/Response.js")
// const constants = require('../../config/constants.js').constants;
// const db = sails.getDatastore().manager
// const Validations = require("../Validations/index");
// const Services = require('../services/index');
// const ObjectId = require('mongodb').ObjectId;
// const Emails = require('../Emails/index');
// const credentials = require('../../config/local.js'); //sails.config.env.production;

// generateName = function () {
//     // action are perform to generate random name for every file
//     var uuid = require('uuid');
//     var randomStr = uuid.v4();
//     var date = new Date();
//     var currentDate = date.valueOf();

//     retVal = randomStr + currentDate;
//     return retVal;
// };

// generateRandom8DigitNumber = function () {
//     const min = 10000000; // 8-digit number starts at 10000000
//     const max = 99999999; // 8-digit number ends at 99999999
//     return Math.floor(Math.random() * (max - min + 1)) + min;
// }

// exports.sendCampaignRequestToBrand = async (req, res) => {
//     try {
//         //Affiliate calls this API
//         // let validation_result = await Validations.CampaignRequestValidations.sendCampaignRequestToBrand(req, res);

//         // if (validation_result && !validation_result.success) {
//         //     throw validation_result.message;
//         // }
//         let { campaign_id, brand_id, affiliate_id } = req.body;
//         if(!affiliate_id)
//             affiliate_id = req.identity.id;
//         let campaign = await Campaign.findOne({id: campaign_id, isDeleted: false, access_type: 'public'});
//         if(!campaign) {
//             return response.failed(null, constants.CAMPAIGN_REQUEST.CAMPAIGN_NOT_FOUND, req, res);
//         }

//         let request_query = {
//             campaign_id: campaign_id,
//             brand_id: brand_id,
//             affiliate_id: req.body.affiliate_id,
//             isDeleted: false
//         }
//         // console.log(offer_query)
//         let get_request = await CampaignRequestByAffiliate.findOne(request_query);
//         if (get_request) {
//             throw constants.CAMPAIGN_REQUEST_BY_AFFILIATE.ALREADY_EXISTS;
//         }

//         req.body.addedBy = req.identity.id;
//         let association = await BrandAffiliateAssociation.create({brand_id: brand_id, affiliate_id: affiliate_id, campaign_id: campaign_id, status: "pending", source: "affiliate_request"}).fetch();
//         req.body.association = association.id.toString();
//         let sent_request = await CampaignRequestByAffiliate.create(req.body).fetch();

//         if (sent_request) {
//             // let get_brand = await Users.findOne({ id: add_campaign.brand_id });
//             // let email_payload = {
//             //     affiliate_id: sent_offer.affiliate_id,
//             //     brand_id: brand_id
//             // };
//             // await Emails.MakeOfferEmails.offerSent(email_payload)

//             //-------------------- Send Notification ------------------//
//             // let notification_payload = {};
//             // notification_payload.send_to = sent_offer.affiliate_id;
//             // notification_payload.title = `Offer | ${Services.Utils.title_case(sent_offer.name)} | ${Services.Utils.title_case(req.identity.fullName)}`;
//             // notification_payload.message = `You have a new opportunity request from ${Services.Utils.title_case(req.identity.fullName)}`;
//             // notification_payload.type = "make_offer"
//             // notification_payload.addedBy = req.identity.id;
//             // notification_payload.product_id = sent_offer.id;
//             // let create_notification = await Notifications.create(notification_payload).fetch();

//             // let affiliate_detail = await Users.findOne({ id: sent_offer.affiliate_id })
//             // if (create_notification && affiliate_detail.device_token) {
//             //     let fcm_payload = {
//             //         device_token: affiliate_detail.device_token,
//             //         title: req.identity.fullName,
//             //         message: create_notification.message,
//             //     }

//             //     await Services.FCM.send_fcm_push_notification(fcm_payload)
//             // }
//             //-------------------- Send Notification ------------------//

//             return response.success(null, constants.CAMPAIGN_REQUEST_BY_AFFILIATE.ADDED, req, res);
//         }
//         throw constants.COMMON.SERVER_ERROR;

//     } catch (error) {
//         console.log(error, "err");
//         return response.failed(null, `${error}`, req, res);
//     }
// };

// exports.getAllRequestsForBrand = async (req, res) => {
//     try {
//         let query = {};
//         let count = req.param('count') || 10;
//         let page = req.param('page') || 1;
//         let { search, isDeleted, status, sortBy, brand_id, campaign_id, affiliate_id } = req.query;
//         let skipNo = (Number(page) - 1) * Number(count);

//         if (search) {
//             search = Services.Utils.remove_special_char_exept_underscores(search);
//             query.$or = [
//                 { name: { $regex: search, '$options': 'i' } }
//             ]
//         }
        
//         if (isDeleted) {
//             query.isDeleted = isDeleted === 'true' ? true : false;
//         } else {
//             query.isDeleted = false;
//         }

//         if (status) {
//             query.status = status;
//         }

//         if (brand_id) {
//             query.brand_id = new ObjectId(brand_id);
//         }

//         if (affiliate_id) {
//             query.affiliate_id = new ObjectId(affiliate_id);
//         } else {
//             if (req.identity.role == "affiliate") {
//                 query.affiliate_id = new ObjectId(req.identity.id);
//             }
//         }

//         if(campaign_id) {
//             query.campaign_id = new ObjectId(product_id);
//         }

//         let sortquery = {};
//         if (sortBy) {
//             let typeArr = [];
//             typeArr = sortBy.split(" ");
//             let sortType = typeArr[1];
//             let field = typeArr[0];
//             sortquery[field ? field : 'createdAt'] = sortType ? (sortType == 'desc' ? -1 : 1) : -1;
//         } else {
//             sortquery = { updatedAt: -1 }
//         }

//         // Pipeline Stages
//         let pipeline = [
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "affiliate_id",
//                     foreignField: "_id",
//                     as: "affiliate_id_details"
//                 }
//             },
//             {
//                 $unwind: {
//                     path: '$affiliate_id_details',
//                     preserveNullAndEmptyArrays: true
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "brand_id",
//                     foreignField: "_id",
//                     as: "brand_id_details"
//                 }
//             },
//             {
//                 $unwind: {
//                     path: '$brand_id_details',
//                     preserveNullAndEmptyArrays: true
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "affiliate_id",
//                     foreignField: "_id",
//                     as: "affiliate_details"
//                 }
//             },
//             {
//                 $unwind: {
//                     path: '$affiliate_details',
//                     preserveNullAndEmptyArrays: true
//                 }
//             },

//             {
//                 $lookup: {
//                     from: "campaign",
//                     localField: "campaign_id",
//                     foreignField: "_id",
//                     as: "campaign_details"
//                 }
//             },
//             {
//                 $unwind: {
//                     path: '$campaign_details',
//                     preserveNullAndEmptyArrays: true
//                 }
//             },

//         ];

//         let projection = {
//             $project: {
//                 id: "$_id",
//                 product_id: "$product_id",
//                 affiliate_id: "$affiliate_id",
//                 brand_id: "$brand_id",
//                 brand_name: "$brand_id_details.fullName",
//                 affiliate_name: "$affiliate_details.fullName",
//                 campaign_details: "$campaign_details",
//                 description: "$description",
//                 campaign_name: "$campaign_details.name",

//                 status: "$status",
//                 affiliate_comment: "$affiliate_comment",
//                 brand_comment: "$brand_comment",
//                 addedBy: "$addedBy",
//                 updatedBy: "$updatedBy",
//                 isDeleted: "$isDeleted",
//                 createdAt: "$createdAt",
//                 updatedAt: "$updatedAt",

//             }
//         };

//         pipeline.push(projection);
//         pipeline.push({
//             $match: query
//         });
//         pipeline.push({
//             $sort: sortquery
//         });
//         // Pipeline Stages
//         let totalresult = await db.collection('campaignrequestbyaffiliate').aggregate(pipeline).toArray();
//         pipeline.push({
//             $skip: Number(skipNo)
//         });
//         pipeline.push({
//             $limit: Number(count)
//         });
//         let result = await db.collection("campaignrequestbyaffiliate").aggregate(pipeline).toArray();
//         let resData = {
//             total_count: totalresult ? totalresult.length : 0,
//             data: result ? result : [],
//         }
//         if (!req.param('page') && !req.param('count')) {
//             resData.data = totalresult ? totalresult : [];
//         }
//         return response.success(resData, constants.CAMPAIGN_REQUEST_BY_AFFILIATE.FETCHED_ALL, req, res);


//     } catch (err) {
//         return response.failed(null, `${err}`, req, res);
//     }
// }

// exports.getRequestById = async (req, res) => {
//     try {
//         let id = req.param("id")
//         if (!id) {
//             throw constants.CAMPAIGN_REQUEST_BY_AFFILIATE.ID_REQUIRED;
//         }
//         let get_request = await CampaignRequestByAffiliate.findOne({ id: id, isDeleted: false }).populate("affiliate_id").populate("brand_id").populate('campaign_id');
//         if (get_request) {
//             return response.success(get_request, constants.CAMPAIGN_REQUEST_BY_AFFILIATE.FETCHED, req, res);
//         }
//         throw constants.CAMPAIGN_REQUEST_BY_AFFILIATE.INVALID_ID;

//     } catch (error) {
//         return response.failed(null, `${error}`, req, res);
//     }
// }

// exports.changeRequestStatus = async (req, res) => {
//     try {

//         // let validation_result = await Validations.CampaignRequestValidations.changeRequestStatus(req, res);
//         // if (validation_result && !validation_result.success) {
//         //     throw validation_result.message
//         // }

//         let { id } = req.body;

//         let get_request = await CampaignRequestByAffiliate.findOne({ id: id, isDeleted: false });

//         if (!get_request) {
//             throw constants.CAMPAIGN_REQUEST_BY_AFFILIATE.INVALID_ID;
//         }

//         if (req.body.status == "accepted" && ['accepted'].includes(get_request.status)) {
//             throw constants.CAMPAIGN_REQUEST_BY_AFFILIATE.CANNOT_ACCEPT;
//         }

//         if (!['affiliate'].includes(req.identity.role)) {
//             throw constants.COMMON.UNAUTHORIZED;
//         }

//         switch (req.body.status) {
//             case "accepted":
//                 req.body.accepted_at = new Date()
//                 break;
//             default:
//                 break;

//         }

//         req.body.updatedBy = req.identity.id;
//         let update_status = await CampaignRequestByAffiliate.updateOne({ id: req.body.id }).set(req.body);
//         if(req.body.status === 'accepted') {
//             await BrandAffiliateAssociation.update({brand_id: get_request.brand_id, affiliate_id: get_request.affiliate_id}).set({isActive: false});
//             await BrandAffiliateAssociation.updateOne({id: update_status.association}).set({status: "accepted", isActive: true});
//         } else if(req.body.status === 'rejected') {
//             await BrandAffiliateAssociation.updateOne({id: update_status.association}).set({status: "rejected"});
//         }
//         if (update_status) {
//             let email_payload = {
//                 affiliate_id: get_request.affiliate_id,
//                 brand_id: get_request.brand_id,
//                 status: update_status.status,
//                 reason: update_status.brand_comment
//             };
//             await Emails.CampaignEmails.changeRequestStatus(email_payload);

//             // let device_token = "";
//             // let notification_payload = {};
//             // notification_payload.type = "campaign"
//             // notification_payload.addedBy = req.identity.id;
//             // notification_payload.title = `Campaign ${Services.Utils.title_case(update_status.status)} | ${Services.Utils.title_case(update_status.name)} | ${req.identity.fullName}`;
//             // notification_payload.message = `Your campaign request is ${Services.Utils.title_case(update_status.status)}`;
//             // notification_payload.send_to = update_status.affiliate_id;
//             // notification_payload.campaign_id = update_status.id;
//             // let brandDetail = await Users.findOne({ id: update_status.brand_id })
//             // let create_notification = await Notifications.create(notification_payload).fetch();
//             // if (create_notification && brandDetail && brandDetail.device_token) {
//             //     let fcm_payload = {
//             //         device_token: brandDetail.device_token,
//             //         title: req.identity.fullName,
//             //         message: create_notification.message,
//             //     }

//             //     await Services.FCM.send_fcm_push_notification(fcm_payload)
//             // }
//             return response.success(null, constants.CAMPAIGN_REQUEST_BY_AFFILIATE.STATUS_UPDATE, req, res)
//         }
//         throw constants.COMMON.SERVER_ERROR;

//     } catch (error) {
//         console.log(error);
//         return response.failed(null, `${error}`, req, res)
//     }
// }


// exports.getAllPublicCampaigns = async (req, res) => {
//     try {
//         let user_id = req.identity.id;
//         let loggedInUser = await Users.findOne({ id: user_id, isDeleted: false });
//         if (loggedInUser.addedBy) {
//             let get_account_manager_detail = await Users.findOne({ id: loggedInUser.addedBy, isDeleted: false });
//             if (get_account_manager_detail && get_account_manager_detail.role) {
//                 if(loggedInUser.role === 'brand' || loggedInUser.role === 'affiliate') {
//                     var isPermissionExists = await Permissions.findOne({
//                       role: loggedInUser.role,
//                       //account_manager: get_account_manager_detail.role
//                     });
//                   }
//                 else {
//                     var isPermissionExists = await Permissions.findOne({
//                         role: loggedInUser.role,
//                         account_manager: get_account_manager_detail.role
//                 });
//                 }
//                 if (!isPermissionExists) {
//                     throw "Permission not exists";
//                 }
//             }
//         }

//         let query = {};
//         let count = req.param('count') || 10;
//         let page = req.param('page') || 1;
//         let { search, sortBy, affiliate_id } = req.query;
//         affiliate_id = new ObjectId(affiliate_id);
//         let skipNo = (Number(page) - 1) * Number(count);

//         if (search) {
//             search = Services.Utils.remove_special_char_exept_underscores(search);
//             query.$or = [
//                 { "name": { $regex: search, '$options': 'i' } }
//             ]
//         }
//         query.isDeleted = false;

//         query.access_type = 'public';
//         let sortquery = {};
//         if (sortBy) {
//             let typeArr = [];
//             typeArr = sortBy.split(" ");
//             let sortType = typeArr[1];
//             let field = typeArr[0];
//             sortquery[field ? field : 'createdAt'] = sortType ? (sortType == 'desc' ? -1 : 1) : -1;
//         } else {
//             sortquery = { updatedAt: -1 }
//         }
//         // Pipeline Stages
//         let pipeline = [
//             {
//                 $match: query
//             },
//             {
//                 $lookup: {
//                     from: "campaignrequestbyaffiliate", // Collection to join with
//                     let: { campaignId: "$_id" }, // Local field to match with
//                     pipeline: [
//                         {
//                             $match: {
//                                 $expr: {
//                                     $and: [
//                                         { $eq: ["$campaign_id", "$$campaignId"] }, // Match campaign_id with _id of campaign
//                                         { $eq: ["$affiliate_id", affiliate_id] }  // Match affiliate_id input
//                                     ]
//                                 }
//                             }
//                         },
//                         {
//                             $project: {
//                                 _id: 1, // Fields to include from campaignrequests
//                                 affiliate_id: 1,
//                                 status: 1,
//                                 createdAt: 1
//                             }
//                         }
//                     ],
//                     as: "request" // New field to store matched data
//                 }
//             },
//             {
//                 $unwind: {
//                     path: "$request",
//                     preserveNullAndEmptyArrays: true
//                 }
//             },
//             {
//                 $project: {
//                     _id: 1,
//                     brand_id: 1,
//                     parent_id: 1,
//                     parent_role: 1,
//                     name: 1,
//                     description: 1,
//                     images: 1,
//                     documents: 1,
//                     videos: 1,
//                     access_type: 1,
//                     amount: 1,
//                     event_type: 1,
//                     campaign_unique_id: 1,
//                     addedBy: 1,
//                     updatedBy: 1,
//                     createdAt: 1,
//                     updatedAt: 1,
//                     isDefault: 1,
//                     isDeleted: 1,
//                     request: 1 
//                 }
//             },
//             {
//                 $sort: sortquery
//             }
//         ];
//         let totalresult = await db.collection('campaign').aggregate(pipeline).toArray();
//         pipeline.push({
//             $skip: Number(skipNo)
//         });
//         pipeline.push({
//             $limit: Number(count)
//         });
//         let result = await db.collection("campaign").aggregate(pipeline).toArray();
//         let resData = {
//             total_count: totalresult ? totalresult.length : 0,
//             data: result ? result : [],
//         }
//         if (!req.param('page') && !req.param('count')) {
//             resData.data = totalresult ? totalresult : [];
//         }
//         return response.success(resData, constants.CAMPAIGN.FETCHED_ALL, req, res);


//     } catch(err) {
//         return response.failed(null, `${err}`, req, res);
//     }
// }



