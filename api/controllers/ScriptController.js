/**
 * ProposalController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const response = require('../services/Response')
const constants = require('../../config/constants').constants;
const db = sails.getDatastore().manager
const Validations = require("../Validations/index");
const ObjectId = require('mongodb').ObjectId;
const Services = require('../services/index');

exports.addScript = async (req, res) => {
    try {

        let validation_result = await Validations.ScriptValidations.addScript(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { script_content } = req.body;
        let query = {};
        query.script_content = script_content;
        req.body.updatedBy = req.identity.id;

        let get_script = await Script.findOne(query);
        if (get_script) {
            throw constants.SCRIPT.ALREADY_EXIST;
        }

        req.body.addedBy = req.identity.id;

        let create_Script = await Script.create(req.body).fetch();
        if (create_Script) {
            return response.success(null, constants.SCRIPT.ADDED, res, res)
        }

        throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
        // console.log(error);
        return response.failed(null, `${error}`, req, res)
    }

}

exports.getAllScript = async (req, res) => {
    try {
        // console.log('in script');
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let { search, sortBy, script_type, status, isDeleted } = req.query;

        skipNo = (Number(page - 1)) * Number(count);

        if (search) {
            query.$or = [
                { script_content: { $regex: search, '$options': 'i' } },
            ]
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

        if (isDeleted) {
            query.isDeleted = isDeleted ? isDeleted === 'true' : true ? isDeleted : false;
        } else {
            query.isDeleted = false;
        }

        if (script_type) {
            query.script_type = script_type
        }

        if (status) {
            query.status = status
        }

        // console.log(query);
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
            }
        ];

        let projection = {
            $project: {
                id: "$_id",
                script_content: "$script_content",
                script_type: "$script_type",
                isDeleted: "$isDeleted",
                status: "$status",
                addedBy: "$addedBy",
                addedBy_name: "$addedBy_details.fullName",
                createdAt: "$createdAt",
                updatedAt: "$updatedAt",
                updatedBy: "$updatedBy",
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

        db.collection('script').aggregate(pipeline).toArray((err, totalresult) => {
            // console.log(totalresult,"-------ff");
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            db.collection("script").aggregate(pipeline).toArray((err, result) => {
                let resData = {
                    data: result ? result : [],
                    total_count: totalresult ? totalresult.length : 0
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalresult ? totalresult : [];
                }
                return response.success(resData, constants.SCRIPT.FETCHED, req, res);

            })
        })

    }
    catch (error) {
        return response.failed(null, `${error}`, req, res)
    }
}

exports.getById = async (req, res) => {
    try {
        const id = req.param("id")
        if (!id) {
            throw constants.SCRIPT.ID_REQUIRED
        }
        const get_script = await Script.findOne({ id: id });
        if (get_script) {
            return response.success(get_script, constants.SCRIPT.FETCHED, req, res);
        }
        throw constants.SCRIPT.INVALID_ID;
    } catch (error) {
        return response.failed(null, `${error}`, req, res)
    }
}

exports.editScript = async (req, res) => {
    try {
        let validation_result = await Validations.ScriptValidations.editScript(req, res);

        if (validation_result && !validation_result) {
            throw validation_result.message;
        }
        let { id } = req.body;

        req.identity.updatedBy = req.identity.id;
        let updatefeatureData = await Script.updateOne({ id: id }, req.body);
        if (updatefeatureData) {
            return response.success(null, constants.SCRIPT.UPDATED, req, res);
        }
        throw constants.SCRIPT.INVALID_ID;

    } catch (error) {
        // console.log(error, "err");
        return response.failed(null, `${error}`, req, res)
    }
}


