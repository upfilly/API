/**
 * SubChildCategoryController
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

exports.addSubChildCategory = async (req, res) => {
    try {
        let validation_result = await Validations.SubChildCategory.addSubChildCategory(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { name } = req.body;

        let query = {};
        query.name = name.toLowerCase();
        query.isDeleted = false;


        let get_category = await SubChildCategory.findOne(query);
        if (get_category) {
            throw constants.COMMON_SUB_CHILD_CATEGORIES.ALREADY_EXIST
        }

        req.body.addedBy = req.identity.id;
        req.body.name = req.body.name.toLowerCase();

        let add_sub_child_category = await SubChildCategory.create(req.body).fetch();
        if (add_sub_child_category) {
            return response.success(null, constants.COMMON_SUB_CHILD_CATEGORIES.ADDED, req, res);
        }
        throw constants.COMMON.SERVER_ERROR;

    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
};

exports.editSubChildCategory = async (req, res) => {
    try {
        let validation_result = await Validations.SubChildCategory.editSubChildCategory(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { name, id } = req.body;

        let query = {
            name: name.toLowerCase(),
            isDeleted: false,
            id: { "!=": id }
        }

        let name_exist = await SubChildCategory.findOne(query);
        if (name_exist) {
            throw constants.COMMON_SUB_CHILD_CATEGORIES.ALREADY_EXIST;
        }

        req.body.updatedBy = req.identity.id;
        req.body.name = req.body.name.toLowerCase();


        let get_category = await SubChildCategory.findOne({ id: id, isDeleted: false });
        if (!get_category) {
            throw constants.COMMON_SUB_CHILD_CATEGORIES.INVALID_ID;
        }

        let edit_category = await SubChildCategory.updateOne({ id: id }, req.body);
        if (edit_category) {
            return response.success(null, constants.COMMON_SUB_CHILD_CATEGORIES.UPDATED, req, res);
        }
        throw constants.COMMON_SUB_CHILD_CATEGORIES.INVALID_ID;
    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}

exports.getAllSubChildCommonCategory = async (req, res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let { search, isDeleted, status, sortBy, category_id, sub_category_id } = req.query;
        let skipNo = (Number(page) - 1) * Number(count);

        if (search) {
            search = await Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { name: { $regex: search, '$options': 'i' } },
            ]
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

        if (status) {
            query.status = status;
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

        if (category_id) { query.category_id = new ObjectId(category_id); }
        if (sub_category_id) { query.sub_category_id = new ObjectId(sub_category_id); }


        // Pipeline Stages
        let pipeline = [
            {
                $lookup: {
                    from: 'commoncategories',
                    localField: 'category_id',
                    foreignField: '_id',
                    as: "categories_details"
                }
            },
            {
                $unwind: {
                    path: '$categories_details',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'commoncategories',
                    localField: 'sub_category_id',
                    foreignField: '_id',
                    as: "sub_categories_details"
                }
            },
            {
                $unwind: {
                    path: '$sub_categories_details',
                    preserveNullAndEmptyArrays: true
                }
            },

        ];

        let projection = {
            $project: {
                id: "$_id",
                name: "$name",
                category_id: "$category_id",
                sub_category_id: "$sub_category_id",
                categories_details: "$categories_details",
                sub_categories_details: "$sub_categories_details",
                status: "$status",
                addedBy: "$addedBy",
                updatedBy: "$updatedBy",
                updatedAt: "$updatedAt",
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
        let totalresult = await  db.collection('subchildcategory').aggregate(pipeline).toArray();
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            let result = await     db.collection("subchildcategory").aggregate(pipeline).toArray();
                let resData = {
                    total_count: totalresult ? totalresult.length : 0,
                    data: result ? result : [],
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalresult ? totalresult : [];
                }
                return response.success(resData, constants.COMMON_CATEGORIES.FETCHED_ALL, req, res);

          
    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}

exports.getById = async (req, res) => {
    try {

        let id = req.param("id")
        if (!id) {
            throw constants.COMMON_SUB_CHILD_CATEGORIES.ID_REQUIRED;
        }
        let get_category = await SubChildCategory.findOne({ id: id }).populate('category_id').populate('sub_category_id');
        if (get_category) {
            return response.success(get_category, constants.COMMON_SUB_CHILD_CATEGORIES.FETCHED, req, res);
        }
        throw constants.COMMON_SUB_CHILD_CATEGORIES.INVALID_ID;

    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}

exports.deleteSubChildCommonCategory = async (req, res) => {
    try {
        let id = req.param("id");
        if (!id) {
            throw constants.COMMON_CATEGORIES.ID_REQUIRED;
        }

        const update_category = await SubChildCategory.updateOne({ id: id }, { isDeleted: true, updatedBy: req.identity.id });
        if (update_category) {
            return response.success(null, constants.COMMON_SUB_CHILD_CATEGORIES.DELETED, req, res);
        }
        throw constants.COMMON_CATEGORIES.INVALID_ID;
    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}


