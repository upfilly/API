/**
 * TrackingManagementController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const response = require("../services/Response")
const constants = require('../../config/constants').constants;
const Validations = require("../Validations/index");
const db = sails.getDatastore().manager
const ObjectId = require('mongodb').ObjectId;
const credentials = require('../../config/local');


exports.addTracking = async (req, res) => {
    try {
        let validation_result = await Validations.TrackingValidation.addTracking(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { campaign_unique_id, event_type, ip_address } = req.body;

        if (req.body.event_type) {
            req.body.event_type = req.body.event_type.toLowerCase();
        }

        let query = {
            campaign_unique_id: campaign_unique_id,
            event_type: event_type,
            ip_address: ip_address
        }
        let already_clicked;
        let existed_click = await TrackingManagement.findOne(query);
        if (existed_click) {
            already_clicked++
        } else {
            let add_click = await TrackingManagement.create(req.body).fetch();
        }

        return response.success(null, constants.TRACKING.SAVED, req, res);
    }
    catch (err) {
        console.log(err, "===err");
        return res.status(400).json({
            success: false,
            error: { message: err },
        });
    }
}

exports.getAllTracking = async (req, res) => {
    try {
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
            query.isDeleted = isDeleted ? isDeleted === 'true' : true ? isDeleted : false;
        } else {
            query.isDeleted = false;
        }

        if (status) {
            query.status = status;
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
                    from: "campaign",
                    localField: "campaign_unique_id",
                    foreignField: "campaign_unique_id",
                    as: "campaign_details"
                }
            },
            {
                $unwind: {
                    path: '$campaign_details',
                    preserveNullAndEmptyArrays: true
                }
            },
        ];

        let projection = {
            $project: {
                id: "$_id",
                campaign_unique_id: "$campaign_unique_id",
                event_type: "$event_type",
                ip_address: "$ip_address",
                clicks: "$clicks",
                event_type: "$event_type",
                // brand_name: "$brand_id_details.fullName",
                // name: "$name",
                // images: "$images",
                // affiliate_id: "$affiliate_id",
                // affiliate_name: "$affiliate_id_details.fullName",
                // videos: "$videos",
                // description: "$description",
                // status: "$status",
                // reason: "$reason",
                affiliate_id: "$campaign_details.affiliate_id",
                name: "$campaign_details.name",
                // affiliate_id: "$campaign_details.affiliate_id",
                addedBy: "$addedBy",
                updatedBy: "$updatedBy",
                isDeleted: "$isDeleted",
                createdAt: "$createdAt",
                updatedAt: "$updatedAt"
            }
        };

        pipeline.push(projection);
        pipeline.push({
            $match: query
        });
        let group_stage = {
            $group: {
                _id: { affiliate_id: "$affiliate_id", event_type: "$event_type" },
                campign_name: { $first: "$name" },
                event_type: { $first: "$event_type" },
                // clicks: { $first: "$clicks" },
                clicks: { $sum: 1 }
                // Total: {
                //     $push: {
                //         // tracking_details: "$tracking_details",
                //         // event_type: "$event_type",
                //         clicks: "$clicks",
                //         // ip_address: "$ip_address"
                //     }
                // }
            },
        };

        pipeline.push(group_stage)
        pipeline.push({
            $sort: sortquery
        });
        // Pipeline Stages
        let totalresult = await   db.collection('trackingmanagement').aggregate(pipeline).toArray();
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            let result = await    db.collection("trackingmanagement").aggregate(pipeline).toArray( );
                let resData = {
                    total_count: totalresult ? totalresult.length : 0,
                    data: result ? result : [],
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalresult ? totalresult : [];
                }
                return response.success(resData, constants.CAMPAIGN.FETCHED_ALL, req, res);

          
    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}

exports.generateTrackingLink = async (req, res) => {
    try {
        let { user_id } = req.body;
        let get_affiliate = await Users.findOne({ id: user_id });
        let affiliate_link = credentials.FRONT_WEB_URL + "/affiliate/status/" + user_id + "?" + get_affiliate.affilaite_unique_id
        let update_user = await Users.updateOne({ id: user_id }, { affiliate_link: affiliate_link });
        // console.log(update_user,"--update_user");
        if (update_user) {
            return response.success(update_user.affiliate_link, constants.TRACKING.LINK, req, res);
        }
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

