/**
 * NotificationsController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const Validations = require("../Validations/index");
const constants = require('../../config/constants').constants;
const response = require("../services/Response");
const db = sails.getDatastore().manager;
const Services = require('../services/index');
const ObjectId = require('mongodb').ObjectId;

module.exports = {
    ReadUnread: async (req, res) => {
        try {
            let validation_result = await Validations.NotificationsValidate.ReadUnread(req, res);

            if (validation_result && !validation_result.success) {
                throw validation_result.message;
            }
            let { id, status } = req.body;
            console.log(req.identity.id);
            let update_status = await Notifications.updateOne({ id: id, send_to: req.identity.id }, { status: status, updatedBy: req.identity.id });
            if (update_status) {
                return response.success(null, constants.NOTIFICATION.UPDATED, req, res);
            }
            throw constants.NOTIFICATION.INVALID_ID;
        } catch (error) {
            return response.failed(null, `${error}`, req, res);
        }
    },

    ReadUnreadAll: async (req, res) => {
        try {
            let validation_result = await Validations.NotificationsValidate.ReadUnreadAll(req, res);

            if (validation_result && !validation_result.success) {
                throw validation_result.message;
            };
            let query_status;
            query_status = req.body.status == "read" ? "unread" : "read";

            let update_status = await Notifications.update({ isDeleted: false, status: query_status, send_to: req.identity.id }, { status: req.body.status }).fetch();
            if (update_status) {
                return response.success(null, constants.NOTIFICATION.UPDATED, req, res);
            }
            throw constants.COMMON.SERVER_ERROR;
        } catch (error) {
            return response.failed(null, `${error}`, req, res);
        }
    },

    getAllNotifications: async (req, res) => {
        try {
            let query = {};
            let count = req.param('count') || 10;
            let page = req.param('page') || 1;
            let skipNo = (Number(page) - 1) * Number(count);
            let { search, type, send_to, sortBy, status, isDeleted } = req.query;
            let sortquery = {};

            if (search) {
                search = Services.Utils.remove_special_char_exept_underscores(search);
                query.$or = [
                    { title: { $regex: search, '$options': 'i' } },
                    { message: { $regex: search, '$options': 'i' } },
                ]
            }

            if (isDeleted) {
                query.isDeleted = isDeleted ? isDeleted === 'true' : true ? isDeleted : false;
            } else {
                query.isDeleted = false;
            }

            if (sortBy) {
                let typeArr = [];
                typeArr = sortBy.split(" ");
                let sortType = typeArr[1];
                let field = typeArr[0];
                sortquery[field ? field : 'createdAt'] = sortType ? (sortType == 'desc' ? -1 : 1) : -1;
            } else {
                sortquery = { createdAt: -1 }
            }

            if (type) {
                query.type = type;
            }

            if (send_to) {
                query.send_to = new ObjectId(send_to);
            }

            if (status) {
                query.status = status;
            }

            let pipeline = [
                {
                    $lookup: {
                        from: "users",
                        localField: "addedBy",
                        foreignField: "_id",
                        as: "addedBy_details"
                    }
                },
                {
                    $unwind: {
                        path: '$addedBy_details',
                        preserveNullAndEmptyArrays: true
                    }
                },
            ];
            let projection = {
                $project: {
                    id: "$_id",
                    type: "$type",
                    addedBy: "$addedBy",
                    addedBy_name: "$addedBy_details.fullName",
                    addedBy_image: "$addedBy_details.image",
                    addedBy_logo: "$addedBy_details.logo",
                    addedBy_banner_image: "$addedBy_details.banner_image",
                    send_to: "$send_to",
                    title: "$title",
                    message: "$message",
                    status: "$status",
                    updatedBy: "$updatedBy",
                    createdAt: "$createdAt",
                    updatedAt: "$updatedAt",
                    isDeleted: "$isDeleted",

                    invite_id: "$invite_id",
                    contract_id: "$contract_id",
                    campaign_id: "$campaign_id",
                    campaign_result_id : "$campaign_result_id",
                }
            };
            pipeline.push(projection);
            pipeline.push({
                $match: query
            });
            pipeline.push({
                $sort: sortquery
            });

            let totalresult=await db.collection('notifications').aggregate(pipeline).toArray();
                pipeline.push({
                    $skip: Number(skipNo)
                });
                pipeline.push({
                    $limit: Number(count)
                });
                let result=await db.collection('notifications').aggregate(pipeline).toArray();
                    let resData = {
                        total_count: totalresult ? totalresult.length : 0,
                        data: result ? result : [],
                    }
                    if (!req.param('page') && !req.param('count')) {
                        resData.data = totalresult ? totalresult : [];
                    }
                    return response.success(resData, constants.NOTIFICATION.FETCHED_ALL, req, res);
              
        } catch (error) {
            return response.failed(null, `${error}`, req, res);
        }
    },

    deleteNotification: async (req, res) => {
        try {
            let id = req.param("id")
            if (!id) {
                throw constants.NOTIFICATION.ID_REQUIRED;
            }
            let update_notification = await Notifications.updateOne({ id: id, send_to: req.identity.id }, { isDeleted: true, updatedBy: req.identity.id });
            if (update_notification) {
                return response.success(null, constants.NOTIFICATION.DELETED, req, res);
            }
            throw constants.NOTIFICATION.INVALID_ID;
        } catch (error) {
            return response.failed(null, `${error}`, req, res);
        }
    },

    deleteAllNotification: async (req, res) => {
        try {
            let update_notification = await Notifications.update({ send_to: req.identity.id, isDeleted: false }, { isDeleted: true, updatedBy: req.identity.id }).fetch();
            if (update_notification) {
                return response.success(null, constants.NOTIFICATION.DELETED, req, res);
            }
            throw constants.COMMON.SERVER_ERROR;
        } catch (error) {
            return response.failed(null, `${error}`, req, res);
        }
    }

};

