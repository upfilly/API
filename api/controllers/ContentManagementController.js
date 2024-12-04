const response = require('../services/Response')
const constants = require('../../config/constants').constants;
const db = sails.getDatastore().manager
const Validations = require("../Validations/index");
const Services = require('../services/index');
const ObjectId = require('mongodb').ObjectId;


exports.addContent = async (req, res) => {
    try {

        let validation_result = await Validations.ContentManagementValidations.addContent(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }


        req.body.addedBy = req.identity.id;
        req.body.updatedBy = req.identity.id;

        let query = {};
        query.isDeleted = false;
        query.meta_title = req.body.meta_title;
        query.meta_key = req.body.meta_key;


        let get_user = await ContentManagement.findOne(query);
        if (get_user) {
            throw constants.CONTENT_MANAGEMENT.ALREADY_EXIST;
        }


        let add_content = await ContentManagement.create(req.body).fetch();
        if (add_content) {
            return response.success(null, constants.CONTENT_MANAGEMENT.ADDED, req, res);

        }
        throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
        // console.log(error, "----------------err");
        return response.failed(null, `${error}`, req, res);
    }
}
exports.getAllContents = async (req, res) => {
    try {
        let query = { _id: { $ne: null } };
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;

        let { search, sortBy, updatedBy, isDeleted, status } = req.query;

        let skipNo = (Number(page) - 1) * Number(count);

        if (search) {
            search = Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { title: { $regex: search, '$options': 'i' } },
                { description: { $regex: search, '$options': 'i' } },
                { meta_title: { $regex: search, '$options': 'i' } },
                { meta_description: { $regex: search, '$options': 'i' } },
                { meta_key: { $regex: search, '$options': 'i' } },
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

        if (status) {
            query.status = status;
        }

        if (updatedBy) {
            query.updatedBy = new ObjectId(updatedBy);
        }

        if (isDeleted) {
            if (isDeleted === 'true') {
                isDeleted = true;
            } else {
                isDeleted = false;
            }
            query.isDeleted = isDeleted;
        } else {
            query.isDeleted = false;
        }

        // Pipeline Stages
        let pipeline = [
            {
                $lookup: {
                    from: "users",
                    localField: "updatedBy",
                    foreignField: "_id",
                    as: "updatedBy_details"
                }
            },
            {
                $unwind: {
                    path: '$updatedBy_details',
                    preserveNullAndEmptyArrays: true
                }
            },
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
                title: "$title",
                image: "$image",
                description: "$description",
                meta_title: "$meta_title",
                meta_description: "$meta_description",
                meta_key: "$meta_key",
                status: "$status",
                isDeleted: "$isDeleted",
                updatedBy: "$updatedBy",
                updatedAt: "$updatedAt",
                createdAt: "$createdAt",
                addedBy: "$addedBy",
                addedBy_name: "$addedBy_details.fullName",
                updatedBy_name: "$updatedBy_details.fullName",
                // updatedBy_slug: "$updatedBy_details.slug",
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

        let totalresult=await  db.collection('contentmanagement').aggregate(pipeline).toArray();
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            let result  = await db.collection("contentmanagement").aggregate(pipeline).toArray();
                let resData = {
                    data: result ? result : [],
                    total_count: totalresult ? totalresult.length : 0
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalresult ? totalresult : [];
                }
                return response.success(resData, constants.CONTENT_MANAGEMENT.FETCHED, req, res);

    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}

exports.editContent = async (req, res) => {
    try {
        let validation_result = await Validations.ContentManagementValidations.editContent(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let get_content = await ContentManagement.findOne({ id: req.body.id });
        if (!get_content) {
            throw constants.CONTENT_MANAGEMENT.INVALID_ID;
        }

        req.body.updatedBy = req.identity.id;

        const update_content = await ContentManagement.updateOne({ id: req.body.id }, req.body);
        if (update_content) {
            if (['team'].includes(req.identity.role)) {
                await Services.AuditTrial.create_audit_trial(req.identity.id, 'contentmanagement', 'updated', update_content, get_content)
            }
            return response.success(null, constants.CONTENT_MANAGEMENT.UPDATED, req, res);
        }
        throw constants.CONTENT_MANAGEMENT.INVALID_ID;
    } catch (error) {
        // console.log(error);
        return response.failed(null, `${error}`, req, res);
    }
}

exports.getContent = async (req, res) => {
    try {
        let { title, id } = req.query;
        if (!title && !id) {
            throw constants.CONTENT_MANAGEMENT.PARAM_MISSING;
        }

        let query = {};
        if (title) {
            query.title = title;
        }

        if (id) {
            query.id = id;
        }
        const get_content = await ContentManagement.findOne(query);
        if (get_content) {
            return response.success(get_content, constants.CONTENT_MANAGEMENT.FETCHED, req, res);
        }
        throw constants.CONTENT_MANAGEMENT.NOT_FOUND;
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}