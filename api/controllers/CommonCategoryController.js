/**
 * CommonCategoryController
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

exports.addCommonCategory = async (req, res) => {
    try {
        let validation_result = await Validations.CommonCategoryValidations.addCommonCategory(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { name, type, parent_id } = req.body;

        let query = {};
        query.name = name.toLowerCase();
        query.isDeleted = false;
        query.type = type;

        if (parent_id) {
            let get_category = await CommonCategories.findOne({ id: parent_id });
            if (get_category) {
                req.body.cat_type = get_category.cat_type
            }
        }

        let get_category = await CommonCategories.findOne(query);
        if (get_category) {
            throw constants.COMMON_CATEGORIES.ALREADY_EXIST
        }

        req.body.addedBy = req.identity.id;
        req.body.name = req.body.name.toLowerCase();

        let add_category = await CommonCategories.create(req.body).fetch();
        if (add_category) {
            return response.success(null, constants.COMMON_CATEGORIES.ADDED, req, res);
        }
        throw constants.COMMON.SERVER_ERROR;

    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
};

exports.editCommonCategory = async (req, res) => {
    try {
        let validation_result = await Validations.CommonCategoryValidations.editCommonCategory(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { name, type, id, region_id } = req.body;

        let query = {
            type: type,
            name: name.toLowerCase(),
            isDeleted: false,
            id: { "!=": id }
        }

        let name_exist = await CommonCategories.findOne(query);
        if (name_exist) {
            throw constants.COMMON_CATEGORIES.ALREADY_EXIST;
        }

        req.body.updatedBy = req.identity.id;
        req.body.name = req.body.name.toLowerCase();
        delete req.body.type;

        let get_category = await CommonCategories.findOne({ id: id, isDeleted: false });
        if (!get_category) {
            throw constants.COMMON_CATEGORIES.INVALID_ID;
        }

        let edit_category = await CommonCategories.updateOne({ id: id }, req.body);
        if (edit_category) {
            if (['team'].includes(req.identity.role)) {
                await Services.AuditTrial.create_audit_trial(req.identity.id, 'commoncategories', 'updated', edit_category, get_category)
            }
            return response.success(null, constants.COMMON_CATEGORIES.UPDATED, req, res);
        }
        throw constants.COMMON_CATEGORIES.INVALID_ID;
    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}

// exports.getAllCommonCategory = async (req, res) => {
//     try {
//         let query = {};
//         let count = req.param('count') || 10;
//         let page = req.param('page') || 1;
//         let { search, isDeleted, status, sortBy, type, cat_type } = req.query;
//         let skipNo = (Number(page) - 1) * Number(count);

//         if (search) {
//             search = await Services.Utils.remove_special_char_exept_underscores(search);
//             query.$or = [
//                 { name: { $regex: search, '$options': 'i' } },
//             ]
//         }

//         if (isDeleted) {
//             if (isDeleted === 'true') {
//                 isDeleted = true;
//             } else {
//                 isDeleted = false;
//             }
//             query.isDeleted = isDeleted;
//         } else {
//             query.isDeleted = false;
//         }

//         if (status) {
//             query.status = status;
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

//         if (type) {
//             query.type = type;
//         }

//         if (cat_type) {
//             query.type = type;
//         }

//         // Pipeline Stages
//         let pipeline = [

//         ];

//         let projection = {
//             $project: {
//                 id: "$_id",
//                 type: "$type",
//                 // name: "$name",
//                 name: { $toLower: "$name" },
//                 cat_type: "$cat_type",
//                 status: "$status",
//                 addedBy: "$addedBy",
//                 updatedBy: "$updatedBy",
//                 updatedAt: "$updatedAt",
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
//         db.collection('commoncategories').aggregate(pipeline).toArray((err, totalresult) => {
//             pipeline.push({
//                 $skip: Number(skipNo)
//             });
//             pipeline.push({
//                 $limit: Number(count)
//             });
//             db.collection("commoncategories").aggregate(pipeline).toArray((err, result) => {
//                 let resData = {
//                     total_count: totalresult ? totalresult.length : 0,
//                     data: result ? result : [],
//                 }
//                 if (!req.param('page') && !req.param('count')) {
//                     resData.data = totalresult ? totalresult : [];
//                 }
//                 return response.success(resData, constants.COMMON_CATEGORIES.FETCHED_ALL, req, res);

//             })
//         })
//     } catch (err) {
//         return response.failed(null, `${err}`, req, res);
//     }
// }

exports.getAllMainCommonCategory = async (req, res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let { search, isDeleted, status, sortBy, type, cat_type, isPopular } = req.query;
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

        query.type = "main";
        query.parent_id = null;

        if (cat_type) {
            query.type = type;
        }

        if (isPopular) {
            query.isPopular = isPopular ? isPopular === 'true' : true ? isPopular : false;
        }

        // Pipeline Stages
        let pipeline = [

        ];

        let projection = {
            $project: {
                id: "$_id",
                type: "$type",
                // name: "$name",
                name: { $toLower: "$name" },
                cat_type: "$cat_type",
                parent_id: "$parent_id",
                isPopular: "$isPopular",
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
        let totalresult = await db.collection('commoncategories').aggregate(pipeline).toArray();
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
          let result =await  db.collection("commoncategories").aggregate(pipeline).toArray()
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

exports.getAllSubsCommonCategory = async (req, res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let { search, isDeleted, status, sortBy, type, cat_type, parent_id } = req.query;
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

        query.type = "sub";
        if (parent_id) {
            query.parent_id = new ObjectId(parent_id);
        }

        if (cat_type) {
            query.type = type;
        }

        // Pipeline Stages
        let pipeline = [
            {
                $lookup: {
                    from: 'commoncategories',
                    localField: 'parent_id',
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
        ];

        let projection = {
            $project: {
                id: "$_id",
                type: "$type",
                // name: "$name",
                name: { $toLower: "$name" },
                parent_cat_name: "$categories_details.name",
                cat_type: "$cat_type",
                parent_id: "$parent_id",
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
        let totalresult=await  db.collection('commoncategories').aggregate(pipeline).toArray();
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            let result= db.collection("commoncategories").aggregate(pipeline).toArray();
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

exports.getCategoryWithSub = async (req, res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let { search, isDeleted, status, sortBy, type, cat_type } = req.query;
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


        query.type = "sub";


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

        if (type) {
            query.type = type;
        }

        if (cat_type) {
            query.cat_type = cat_type;
        }

        // Pipeline Stages
        let pipeline = [
            {
                $lookup: {
                    from: 'commoncategories',
                    localField: 'parent_id',
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
                $lookup:
                {
                    from: "subchildcategory",
                    let: { category_id: "$parent_id", sub_category_id: "$_id", isDeleted: false },
                    pipeline: [
                        {
                            $match:
                            {
                                $expr:
                                {
                                    $and:
                                        [
                                            { $eq: ["$category_id", "$$category_id"] },
                                            { $eq: ["$sub_category_id", "$$sub_category_id"] },
                                            { $eq: ["$isDeleted", "$$isDeleted"] }

                                        ]
                                }
                            }
                        }
                    ],
                    as: "subchildcategory"
                }
            }
        ];

        let projection = {
            $project: {
                id: "$_id",
                type: "$type",
                parent_id: "$parent_id",
                name: { $toLower: "$name" },
                parent_cat_name: "$categories_details.name",
                cat_type: "$cat_type",
                subchildcategory: "$subchildcategory",

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
        let group_stage = {
            $group: {
                _id: "$parent_id",
                parent_cat_name: { $first: "$parent_cat_name" },
                cat_type: { $first: "$cat_type" },
                subCategories: {
                    $push: {
                        id: "$id",
                        name: "$name",
                        subchildcategory: "$subchildcategory"
                    }
                }
            },
        };

        pipeline.push(group_stage)
        pipeline.push({
            $sort: sortquery
        });


        // Pipeline Stages
        db.collection('commoncategories').aggregate(pipeline).toArray((err, totalresult) => {
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            db.collection("commoncategories").aggregate(pipeline).toArray((err, result) => {
                let resData = {
                    total_count: totalresult ? totalresult.length : 0,
                    data: result ? result : [],
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalresult ? totalresult : [];
                }
                return response.success(resData, constants.COMMON_CATEGORIES.FETCHED_ALL, req, res);

            })
        })
    } catch (err) {
        console.log(err, "==err");
        return response.failed(null, `${err}`, req, res);
    }
}

exports.getById = async (req, res) => {
    try {

        let id = req.param("id")
        if (!id) {
            throw constants.COMMON_CATEGORIES.ID_REQUIRED;
        }
        let get_category = await CommonCategories.findOne({ id: id });
        // console.log(get_category,"-----get");
        if (get_category) {
            if (get_category.parent_id) {
                let get_maincategory_details = await CommonCategories.findOne({ id: get_category.parent_id });
                if (get_maincategory_details) {
                    get_category.main_category_name = get_maincategory_details.name;
                }
            }
            return response.success(get_category, constants.COMMON_CATEGORIES.FETCHED, req, res);
        }
        throw constants.COMMON_CATEGORIES.INVALID_ID;

    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}

exports.deleteCommonCategory = async (req, res) => {
    try {
        let id = req.param("id");
        if (!id) {
            throw constants.COMMON_CATEGORIES.ID_REQUIRED;
        }

        const update_category = await CommonCategories.updateOne({ id: id }, { isDeleted: true, updatedBy: req.identity.id });
        if (update_category) {
            return response.success(null, constants.COMMON_CATEGORIES.DELETED, req, res);
        }
        throw constants.COMMON_CATEGORIES.INVALID_ID;
    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}

exports.addMultipleCommonCategories = async (req, res) => {
    try {
        let validation_result = await Validations.CommonCategoryValidations.addMultipleCommonCategories(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { cultures, type, region_id } = req.body;
        let total_records = cultures ? cultures.length : 0;
        let addded_records = 0;

        if (cultures && cultures.length > 0) {
            for await (let item of cultures) {
                let query = {};
                query.name = item.name.toLowerCase();
                query.isDeleted = false;
                query.type = type;

                if (region_id) {
                    query.region_id = region_id;
                }

                let get_category = await CommonCategories.findOne(query);
                if (!get_category) {
                    req.body.addedBy = req.identity.id;
                    req.body.name = item.name.toLowerCase();
                    let obj = {
                        addedBy: req.identity.id,
                        name: item.name.toLowerCase(),
                        type: type,
                    }
                    if (region_id) {
                        obj.region_id = region_id;
                    }
                    let add_category = await CommonCategories.create(obj).fetch();
                    if (add_category) {
                        addded_records++;
                    }
                }
            }
        }

        let message = `${addded_records}/${total_records} ${constants.COMMON_CATEGORIES.ADDED}`;
        return response.success(null, message, req, res);
    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
};

exports.updateToggleKeys = async (req, res) => {
    try {
        let validation_result = await Validations.CommonCategoryValidations.updateToggleKeys(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { id, key, model } = req.body;
        let Model = sails.models[model];

        let query = {
            id: id
        }

        let get_category = await Model.findOne(query);
        if (!get_category) {
            throw constants.COMMON.INVALID_ID;
        }

        let update_payload = {
            updatedBy: req.identity.id
        }
        update_payload[key] = true
        if (get_category[key]) {
            update_payload[key] = false;
        }

        let edit_category = await Model.updateOne({ id: id }, update_payload);
        if (edit_category) {
            return response.success(null, constants.COMMON_CATEGORIES.UPDATED, req, res);
        }
        throw constants.COMMON.UNPROCESSABLE_DATA;
    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}
