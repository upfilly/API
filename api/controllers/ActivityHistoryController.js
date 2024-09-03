/**
 * ActivityHistoryController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const db = sails.getDatastore().manager;
const { constants } = require("../../config/constants");
const response = require("../services/Response");
const Services = require("../services/index");
const ObjectId = require("mongodb").ObjectId;

exports.getAllActivityHistory = async (req, res) => {
    try {
        let page = req.param("page") || 1;
        let count = req.param("count") || 10;
        let { search, isDeleted, sortBy, module, type, user_id, account_manager_id } = req.query;
        let skipNo = (Number(page) - 1) * Number(count);
        let query = { isDeleted: false };
        if (search) {
            search = await Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { fullName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
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

        if (isDeleted) {
            query.isDeleted = isDeleted
                ? isDeleted === "true"
                : true
                    ? isDeleted
                    : false;
        }

        if (user_id) {
            query.user_id = new ObjectId(user_id);
        }

        if (account_manager_id) {
            query.account_manager_id = new ObjectId(account_manager_id);
        }


        if (module) {
            query.module = module;
        }
        if (type) {
            query.type = type;
        }
        // console.log(JSON.stringify(query), '===========query');
        let pipeline = [
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user_id_details",
                },
            },
            {
                $unwind: {
                    path: "$user_id_details",
                    preserveNullAndEmptyArrays: true,
                },
            },
        ];

        let projection = {
            $project: {
                id: "$_id",
                module: "$module",
                type: "$type",
                user_id: "$user_id",
                old_data: "$old_data",
                data: "$data",
                account_manager_id: "$account_manager_id",
                new_data: "$new_data",

                fullName: "$user_id_details.fullName",
                role: "$user_id_details.role",
                email: "$user_id_details.email",
                isDeleted: "$isDeleted",
                createdAt: "$createdAt",
                updatedAt: "$updatedAt",
            },
        };
        pipeline.push(projection);
        pipeline.push({
            $match: query,
        });
        pipeline.push({
            $sort: sortquery,
        });

        let totalResult = await db.collection("activityhistory").aggregate(pipeline).toArray();
        pipeline.push({
            $skip: Number(skipNo),
        });
        pipeline.push({
            $limit: Number(count),
        });

        let result = await db.collection("activityhistory").aggregate(pipeline).toArray();

        let resData = {
            total: totalResult ? totalResult.length : 0,
            data: result ? result : [],
        };

        if (!req.param("page") && !req.param("count")) {
            resData.data = totalResult ? totalResult : [];
        }
        return response.success(resData, constants.ACTIVITY_HISTORY.FETCHED_ALL, req, res);
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
};

exports.getActivityHistoryById = async (req, res) => {
    try {
        let { id } = req.query;
        if (!id) {
            throw constants.AUDIT_TRIAL.ID_REQUIRED;
        }

        let get_activity_logs = await ActivityHistory.findOne({ id: id }).populate(
            "user_id"
        );
        if (get_activity_logs) {
            return response.success(get_activity_logs, constants.ACTIVITY_HISTORY.FETCHED, req, res);
        }
        throw constants.AUDIT_TRIAL.INVALID_ID;
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
};

