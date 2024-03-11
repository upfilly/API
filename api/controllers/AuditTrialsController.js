/**
 * AuditTrialsController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const db = sails.getDatastore().manager;
const { constants } = require('../../config/constants');
const response = require('../services/Response');
const Services = require('../services/index');
const ObjectId = require('mongodb').ObjectId;

exports.getAllAuditTrials = async (req, res) => {
    try {
        let page = req.param('page') || 1;
        let count = req.param('count') || 10;
        let { search, isDeleted, sortBy, module, type, user_id } = req.query;
        let skipNo = (Number(page) - 1) * Number(count);
        let query = { isDeleted: false };
        if (search) {
            search = await Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { fullName: { $regex: search, '$options': 'i' } },
                { email: { $regex: search, '$options': 'i' } },
            ];
        };
        let sortquery = {};
        if (sortBy) {
            let typeArr = [];
            typeArr = sortBy.split(" ");
            let sortType = typeArr[1];
            let field = typeArr[0];
            sortquery[field ? field : 'createdAt'] = sortType ? (sortType == 'desc' ? -1 : 1) : -1;
        } else {
            sortquery = { updatedAt: -1 };
        };

        if (isDeleted) {
            query.isDeleted = isDeleted ? isDeleted === 'true' : true ? isDeleted : false;
        }

        if (user_id) { query.user_id = ObjectId(user_id) };
        if (module) { query.module = module; };
        if (type) { query.type = type; };
        // console.log(JSON.stringify(query), '===========query');
        let pipeline = [
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user_id_details"
                }
            },
            {
                $unwind: {
                    path: '$user_id_details',
                    preserveNullAndEmptyArrays: true
                }
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
                fullName: "$user_id_details.fullName",
                email: "$user_id_details.email",
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
        
        db.collection('audittrials').aggregate(pipeline).toArray((err, totalResult) => {
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });

            db.collection('audittrials').aggregate(pipeline).toArray(async (err, result) => {
                let resData = {
                    total: totalResult ? totalResult.length : 0,
                    data: result ? result : []
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalResult ? totalResult : []
                }
                return response.success(resData, constants.AUDIT_TRIAL.FETCHED_ALL, req, res);
            })
        })

    } catch (error) {
        return response.failed(null, `${error}`, req, res)
    }
}

exports.getAuditTrialById = async (req, res) => {
    try {
        let { id } = req.query;
        if (!id) {
            throw constants.AUDIT_TRIAL.ID_REQUIRED;
        }

        let get_audit_trial = await AuditTrials.findOne({ id: id }).populate('user_id');
        if (get_audit_trial) {
            return response.success(get_audit_trial, constants.AUDIT_TRIAL.FETCHED, req, res);
        }
        throw constants.AUDIT_TRIAL.INVALID_ID;
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}
