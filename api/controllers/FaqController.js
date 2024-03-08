/**
 * FaqController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const response = require("../services/Response")
const constants = require('../../config/constants').constants;
const db = sails.getDatastore().manager
const Validations = require("../Validations/index");
const ObjectId = require('mongodb').ObjectId;
const Services = require('../services/index');

exports.addFaq = async (req, res) => {
    try {
        let validation_result = await Validations.FaqValidations.addFaq(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }
        let data = req.body;

        if (!data.question) {
            throw constants.FAQ.QUESTION_REQUIRED;
        }

        const existedFaq = await FAQ.findOne({ question: data.question, content_id: data.content_id, isDeleted: false })

        if (existedFaq) {
            throw constants.FAQ.ALREADY_EXIST;
        }

        date = new Date()
        data.createdAt = date
        data.updatedAt = date
        data.addedBy = req.identity.id;
        data.updatedBy = req.identity.id;
        const createdFaq = await FAQ.create(data).fetch()
        if (createdFaq) {
            return response.success(null, constants.FAQ.CREATED, req, res);
        }
        throw constants.COMMON.SERVER_ERROR
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}
exports.editFaq = async (req, res) => {
    try {
        let validation_result = await Validations.FaqValidations.editFaq(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }
        const id = req.body.id;

        if (!req.body.question) {
            throw constants.FAQ.QUESTION_REQUIRED;
        }

        const existedFaq = await FAQ.findOne({
            id: { "!=": id },
            question: req.body.question,
            isDeleted: false
        })

        if (existedFaq) {
            throw constants.FAQ.ALREADY_EXIST;
        }

        let check_faq = await FAQ.findOne({ id: id });
        if (!check_faq) {
            throw constants.FAQ.INVALID_ID;
        }
        req.body.updatedBy = req.identity.id;
        req.body.updatedAt = new Date();
        const data = await FAQ.updateOne({ id: id }, req.body);

        if (data) {
            if (['team'].includes(req.identity.role)) {
                await Services.AuditTrial.create_audit_trial(req.identity.id, 'faq', 'updated', data, check_faq)
            }
            return response.success(null, constants.FAQ.UPDATED, req, res);
        }
        throw constants.FAQ.INVALID_ID;
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}
exports.faqDetail = async (req, res) => {
    try {
        const id = req.param("id")
        if (!id) {
            throw constants.FAQ.ID_REQUIRED
        }
        const data = await FAQ.findOne({ id: id });
        if (data) {
            if (data.addedBy) {
                let get_added_by_details = await Users.findOne({ id: data.addedBy });
                if (get_added_by_details) {
                    data.addedBy_name = get_added_by_details.fullName;
                }
            }
            if (data.category_id) {
                let get_category_details = await CommonCategories.findOne({ id: data.category_id });
                if (get_category_details) {
                    data.category_name = get_category_details.name;
                }
            }
            if (data.sub_category_id) {
                let get_subcategory_details = await CommonCategories.findOne({ id: data.sub_category_id });
                if (get_subcategory_details) {
                    data.sub_category_name = get_subcategory_details.name;
                }
            }
            if (data.content_id) {
                let get_content_details = await ContentManagement.findOne({ id: data.content_id });
                if (get_content_details) {
                    data.page_title = get_content_details.title;
                }
            }
            return response.success(data, constants.FAQ.FETCHED, req, res);
        }
        throw constants.FAQ.INVALID_ID;

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}
exports.getAllFaqs = async (req, res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let { search, isDeleted, status, sortBy, addedBy, cat_type, category_id ,content_id} = req.query;
        let skipNo = (Number(page) - 1) * Number(count);

        if (search) {
            search = await Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { question: { $regex: search, '$options': 'i' } },
                { answer: { $regex: search, '$options': 'i' } },
                { category_name: { $regex: search, '$options': 'i' } },

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

        if (cat_type) {
            query.category_type = cat_type;
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

        if (addedBy) {
            query.addedBy = ObjectId(addedBy);
        }
        if (category_id) {
            query.category_id = ObjectId(category_id);
        }

        if (content_id) {
            query.content_id = ObjectId(content_id);
        }

        // Pipeline Stages
        let pipeline = [
            {
                $lookup: {
                    from: 'commoncategories',
                    localField: 'category_id',
                    foreignField: '_id',
                    as: "category_details"
                }
            },
            {
                $unwind: {
                    path: '$category_details',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'commoncategories',
                    localField: 'sub_category_id',
                    foreignField: '_id',
                    as: "sub_category_details"
                }
            },
            {
                $unwind: {
                    path: '$sub_category_details',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'contentmanagement',
                    localField: 'content_id',
                    foreignField: '_id',
                    as: "pages_details"
                }
            },
            {
                $unwind: {
                    path: '$pages_details',
                    preserveNullAndEmptyArrays: true
                }
            },
        ];

        let projection = {
            $project: {
                id: "$_id",
                question: "$question",
                answer: "$answer",
                video: "$video",
                category_id: "$category_id",
                category_name: "$category_details.name",
                category_type: "$category_details.cat_type",
                sub_category_id: "$sub_category_id",
                sub_category_name: "$sub_category_details.name",
                content_id:"$content_id",
                page_title:"$pages_details.title",
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
        db.collection('faq').aggregate(pipeline).toArray((err, totalresult) => {
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            db.collection("faq").aggregate(pipeline).toArray((err, result) => {
                let resData = {
                    total_count: totalresult ? totalresult.length : 0,
                    data: result ? result : [],
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalresult ? totalresult : [];
                }
                return response.success(resData, constants.FAQ.FETCHED_ALL, req, res);

            })
        })

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}
exports.deleteFaq = async (req, res) => {
    try {
        const id = req.param("id")
        if (!id) {
            throw constants.FAQ.ID_REQUIRED
        }
        const data = await FAQ.updateOne({ id: id }, { isDeleted: true, updatedBy: req.identity.id });
        return response.success(null, constants.FAQ.DELETED, req, res);
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

