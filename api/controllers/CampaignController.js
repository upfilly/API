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

        if (req.identity.role !== "brand") {
            throw constants.COMMON.UNAUTHORIZED;
        }

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
        req.body.brand_id = req.identity.id;

        req.body.campaign_unique_id = generateRandom8DigitNumber();
        var campaign_link;
        if (event_type == "lead") {
            campaign_link = credentials.FRONT_WEB_URL + "/signup/affiliate" + "?event_type=" + event_type + "&campaign_code=" + req.body.campaign_unique_id;
        } else if (event_type == "visitor") {
            campaign_link = credentials.FRONT_WEB_URL + "?event_type=" + event_type + "&campaign_code=" + req.body.campaign_unique_id;
        } else if (event_type == "line-item") {
            campaign_link = credentials.FRONT_WEB_URL + "?event_type=" + event_type + "&campaign_code=" + req.body.campaign_unique_id;
        } else if (event_type == "purchase") {
            campaign_link = credentials.FRONT_WEB_URL + "?event_type=" + event_type + "&campaign_code=" + req.body.campaign_unique_id;
        }

        req.body.campaign_link = campaign_link;
        let add_campaign = await Campaign.create(req.body).fetch();
        if (add_campaign) {
            let get_brand = await Users.findOne({ id: add_campaign.brand_id });
            let email_payload = {
                affiliate_id: add_campaign.affiliate_id,
                brand_id: req.body.brand_id,
                campaign_link: req.body.campaign_link
            };
            await Emails.CampaignEmails.AddCampaign(email_payload)


            //-------------------- Send Notification ------------------//
            let notification_payload = {};
            notification_payload.send_to = add_campaign.affiliate_id;
            notification_payload.title = `Campaign | ${await Services.Utils.title_case(add_campaign.name)} | ${await Services.Utils.title_case(req.identity.fullName)}`;
            notification_payload.message = `You have a new campaign request from ${await Services.Utils.title_case(req.identity.fullName)}`;
            notification_payload.type = "campaign"
            notification_payload.addedBy = req.identity.id;
            notification_payload.campaign_id = add_campaign.id;
            let create_notification = await Notifications.create(notification_payload).fetch();

            let affiliate_detail = await Users.findOne({ id: add_campaign.affiliate_id })
            if (create_notification && affiliate_detail.device_token) {
                let fcm_payload = {
                    device_token: affiliate_detail.device_token,
                    title: req.identity.fullName,
                    message: create_notification.message,
                }

                await Services.FCM.send_fcm_push_notification(fcm_payload)
            }

            //-------------------- Send Notification ------------------//

            return response.success(null, constants.CAMPAIGN.ADDED, req, res);
        }
        throw constants.COMMON.SERVER_ERROR;

    } catch (error) {
        console.log(error, '==error');
        return response.failed(null, `${error}`, req, res);
    }
};

exports.editCampaign = async (req, res) => {
    try {
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

        req.body.updatedBy = req.identity.id;
        let edit_campaign = await Campaign.updateOne({ id: id }, req.body);
        if (edit_campaign) {
            return response.success(null, constants.CAMPAIGN.UPDATED, req, res);
        }
        throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
        console.log(error, '==error');

        return response.failed(null, `${error}`, req, res);
    }
}

exports.getAllCampaigns = async (req, res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let { search, isDeleted, status, sortBy, brand_id, affiliate_id } = req.query;
        let skipNo = (Number(page) - 1) * Number(count);

        if (search) {
            search = await Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { name: { $regex: search, '$options': 'i' } }
            ]
        }

        if (isDeleted) {
            query.isDeleted = isDeleted ? isDeleted === 'true' : true ? isDeleted : false;
        } else {
            query.isDeleted = false;
        }

        if (status) {
            query.status = status;
        }

        if (brand_id) {
            query.brand_id = ObjectId(brand_id);
        }

        if (affiliate_id) {
            query.affiliate_id = ObjectId(affiliate_id);
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
            {
                $lookup: {
                    from: "contracts",
                    localField: "contract_id",
                    foreignField: "_id",
                    as: "contract_id_details"
                }
            },
            {
                $unwind: {
                    path: '$contract_id_details',
                    preserveNullAndEmptyArrays: true
                }
            }

        ];

        let projection = {
            $project: {
                id: "$_id",
                affiliate_id: "$affiliate_id",
                affiliate_name: "$affiliate_id_details.fullName",
                brand_id: "$brand_id",
                brand_name: "$brand_id_details.fullName",
                name: "$name",
                images: "$images",
                videos: "$videos",
                description: "$description",
                status: "$status",
                reason: "$reason",
                amount: "$amount",
                event_type: "$event_type",
                campaign_link: "$campaign_link",
                campaign_unique_id: "$campaign_unique_id",
                addedBy: "$addedBy",
                updatedBy: "$updatedBy",
                isDeleted: "$isDeleted",
                createdAt: "$createdAt",
                updatedAt: "$updatedAt",

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
        db.collection('campaign').aggregate(pipeline).toArray((err, totalresult) => {
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            db.collection("campaign").aggregate(pipeline).toArray((err, result) => {
                let resData = {
                    total_count: totalresult ? totalresult.length : 0,
                    data: result ? result : [],
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalresult ? totalresult : [];
                }
                return response.success(resData, constants.CAMPAIGN.FETCHED_ALL, req, res);

            })
        })
    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}

exports.getCampaignById = async (req, res) => {
    try {
        let id = req.param("id")
        if (!id) {
            throw constants.CAMPAIGN.ID_REQUIRED;
        }
        let get_campaign = await Campaign.findOne({ id: id, isDeleted: false }).populate('brand_id').populate('affiliate_id');
        if (get_campaign) {
            return response.success(get_campaign, constants.CAMPAIGN.FETCHED, req, res);
        }
        throw constants.CAMPAIGN.INVALID_ID;

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.changeCampaignStatus = async (req, res) => {
    try {

        let validation_result = await Validations.CampaignValidations.changeCampaignStatus(req, res);
        if (validation_result && !validation_result.success) {
            throw validation_result.message
        }

        let { id } = req.body;

        let get_campaign = await Campaign.findOne({ id: id, isDeleted: false });

        if (!get_campaign) {
            throw constants.CAMPAIGN.INVALID_ID;
        }



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

        req.body.updatedBy = req.identity.id;
        let update_status = await Campaign.updateOne({ id: req.body.id }, req.body);

        if (update_status) {
            let email_payload = {
                affiliate_id: get_campaign.affiliate_id,
                brand_id: get_campaign.brand_id,
                status: update_status.status,
                reason: update_status.reason
            };
            await Emails.CampaignEmails.changeStatus(email_payload);

            let device_token = "";
            let notification_payload = {};
            notification_payload.type = "campaign"
            notification_payload.addedBy = req.identity.id;
            notification_payload.title = `Campaign ${await Services.Utils.title_case(update_status.status)} | ${await Services.Utils.title_case(update_status.name)} | ${req.identity.fullName}`;
            notification_payload.message = `Your campaign request is ${await Services.Utils.title_case(update_status.status)}`;
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
        throw constants.COMMON.SERVER_ERROR

    } catch (error) {
        console.log(error);
        return response.failed(null, `${error}`, req, res)
    }
}

exports.deleteCampaign = async (req, res) => {
    try {
        let id = req.param("id");
        if (!id) {
            throw constants.CAMPAIGN.ID_REQUIRED;
        }

        const update_campaign = await Campaign.updateOne({ id: id, status: "pending", brand_id: req.identity.id }, { isDeleted: true, updatedBy: req.identity.id });
        if (update_campaign) {
            return response.success(null, constants.CAMPAIGN.DELETED, req, res);
        }
        throw constants.CAMPAIGN.INVALID_ID;
    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}