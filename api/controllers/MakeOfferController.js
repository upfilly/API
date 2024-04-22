/**
 * MakeOfferController
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

exports.makeOfferToAffiliate = async (req, res) => {
    try {

        if (req.identity.role !== "brand") {
            throw constants.COMMON.UNAUTHORIZED;
        }

        let validation_result = await Validations.MakeOfferValidations.assign(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }
        let { name, product_id, brand_id } = req.body;

        req.body.brand_id = req.identity.id;

        if (req.body.name) {
            req.body.name = name.toLowerCase();
        }

        let get_product = await Product.findOne({ id: product_id });
        if (get_product) {
            req.body.affiliate_id = get_product.addedBy;
        }

        let get_campaign = await MakeOffer.findOne({ product_id: product_id, brand_id: brand_id, affiliate_id: req.body.affiliate_id, isDeleted: false });
        if (get_campaign) {
            throw constants.MAKE_OFFER.ALREADY_EXIST
        }

        req.body.addedBy = req.identity.id;
        let sent_offer = await MakeOffer.create(req.body).fetch();
        if (sent_offer) {
            // let get_brand = await Users.findOne({ id: add_campaign.brand_id });
            let email_payload = {
                affiliate_id: sent_offer.affiliate_id,
                brand_id: req.body.brand_id,

            };
            await Emails.MakeOfferEmails.offerSent(email_payload)

            //-------------------- Send Notification ------------------//
            let notification_payload = {};
            notification_payload.send_to = sent_offer.affiliate_id;
            notification_payload.title = `Offer | ${await Services.Utils.title_case(sent_offer.name)} | ${await Services.Utils.title_case(req.identity.fullName)}`;
            notification_payload.message = `You have a new opportunity request from ${await Services.Utils.title_case(req.identity.fullName)}`;
            notification_payload.type = "product_assign"
            notification_payload.addedBy = req.identity.id;
            notification_payload.product_id = sent_offer.id;
            let create_notification = await Notifications.create(notification_payload).fetch();

            let affiliate_detail = await Users.findOne({ id: sent_offer.affiliate_id })
            if (create_notification && affiliate_detail.device_token) {
                let fcm_payload = {
                    device_token: affiliate_detail.device_token,
                    title: req.identity.fullName,
                    message: create_notification.message,
                }

                await Services.FCM.send_fcm_push_notification(fcm_payload)
            }

            //-------------------- Send Notification ------------------//

            return response.success(null, constants.MAKE_OFFER.ADDED, req, res);
        }
        throw constants.COMMON.SERVER_ERROR;

    } catch (error) {

        return response.failed(null, `${error}`, req, res);
    }
};

exports.getAllOffers = async (req, res) => {
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
        } else {
            if (req.identity.role == "affiliate") {
                query.affiliate_id = ObjectId(req.identity.id);
            }
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
                    from: "product",
                    localField: "product_id",
                    foreignField: "_id",
                    as: "product_details"
                }
            },
            {
                $unwind: {
                    path: '$product_details',
                    preserveNullAndEmptyArrays: true
                }
            },

        ];

        let projection = {
            $project: {
                id: "$_id",
                product_id: "$product_id",
                affiliate_id: "$affiliate_id",
                brand_id: "$brand_id",
                brand_name: "$brand_id_details.fullName",
                affiliate_name: "$affiliate_details.fullName",

                name: "$name",
                sent_from: "$sent_from",
                sent_to: "$sent_to",
                comments: "$comments",
                description: "$description",
                product_name: "$product_details.name",

                status: "$status",
                reason: "$reason",

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
        db.collection('makeoffer').aggregate(pipeline).toArray((err, totalresult) => {
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            db.collection("makeoffer").aggregate(pipeline).toArray((err, result) => {
                let resData = {
                    total_count: totalresult ? totalresult.length : 0,
                    data: result ? result : [],
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalresult ? totalresult : [];
                }
                return response.success(resData, constants.MAKE_OFFER.FETCHED_ALL, req, res);

            })
        })
    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}

exports.getOfferById = async (req, res) => {
    try {
        let id = req.param("id")
        if (!id) {
            throw constants.MAKE_OFFER.ID_REQUIRED;
        }
        let get_offer = await MakeOffer.findOne({ id: id, isDeleted: false }).populate("affiliate_id").populate("brand_id");
        if (get_offer) {
            return response.success(get_offer, constants.MAKE_OFFER.FETCHED, req, res);
        }
        throw constants.CAMPAIGN.INVALID_ID;

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.changeOfferStatus = async (req, res) => {
    try {

        let validation_result = await Validations.MakeOfferValidations.changeCampaignStatus(req, res);
        if (validation_result && !validation_result.success) {
            throw validation_result.message
        }

        let { id } = req.body;

        let get_make_offer = await MakeOffer.findOne({ id: id, isDeleted: false });

        if (!get_make_offer) {
            throw constants.MAKE_OFFER.INVALID_ID;
        }

        if (req.body.status == "accepted" && ['accepted'].includes(get_make_offer.status)) {
            throw constants.MAKE_OFFER.CANNOT_ACCEPT;
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
        let update_status = await MakeOffer.updateOne({ id: req.body.id }, req.body);

        if (update_status) {
            let email_payload = {
                affiliate_id: get_make_offer.affiliate_id,
                brand_id: get_make_offer.brand_id,
                status: update_status.status,
                reason: update_status.reason
            };
            await Emails.MakeOfferEmails.changeStatus(email_payload);

            // let device_token = "";
            // let notification_payload = {};
            // notification_payload.type = "campaign"
            // notification_payload.addedBy = req.identity.id;
            // notification_payload.title = `Campaign ${await Services.Utils.title_case(update_status.status)} | ${await Services.Utils.title_case(update_status.name)} | ${req.identity.fullName}`;
            // notification_payload.message = `Your campaign request is ${await Services.Utils.title_case(update_status.status)}`;
            // notification_payload.send_to = update_status.brand_id;
            // notification_payload.campaign_id = update_status.id;
            // let brandDetail = await Users.findOne({ id: update_status.brand_id })
            // let create_notification = await Notifications.create(notification_payload).fetch();
            // if (create_notification && brandDetail && brandDetail.device_token) {
            //     let fcm_payload = {
            //         device_token: brandDetail.device_token,
            //         title: req.identity.fullName,
            //         message: create_notification.message,
            //     }

            //     await Services.FCM.send_fcm_push_notification(fcm_payload)
            // }
            return response.success(null, constants.MAKE_OFFER.STATUS_UPDATE, req, res)
        }
        throw constants.COMMON.SERVER_ERROR

    } catch (error) {
        console.log(error);
        return response.failed(null, `${error}`, req, res)
    }
}



