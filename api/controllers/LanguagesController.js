/**
 * LanguagesController
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

exports.addLanguage = async (req, res) => {
    try {
        let validation_result = await Validations.LanguageValidations.addLanguage(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }
        let { name } = req.body;

        const get_language = await Languages.findOne({ name: name.toLowerCase(), isDeleted: false })

        if (get_language) {
            // throw constants.LANGUAGE.ALREADY_EXIST;
            return response.success(null, constants.LANGUAGE.ADDED, req, res);
        }

        req.body.addedBy = req.identity.id;
        req.body.name = name.toLowerCase();
        const create_language = await Languages.create(req.body).fetch()
        if (create_language) {
            return response.success(null, constants.LANGUAGE.ADDED, req, res);
        }
        throw constants.COMMON.SERVER_ERROR
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}
exports.editLanguage = async (req, res) => {
    try {
        let validation_result = await Validations.LanguageValidations.editLanguage(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }
        const { name, id } = req.body;

        const get_language = await Languages.findOne({
            id: { "!=": id },
            name: name.toLowerCase(),
            isDeleted: false
        })

        if (get_language) {
            throw constants.LANGUAGE.ALREADY_EXIST;
        }

        req.body.updatedBy = req.identity.id;
        req.body.updatedAt = new Date();
        req.body.name = name.toLowerCase();
        const update_language = await Languages.updateOne({ id: id }, req.body);
        if (update_language) {
            return response.success(null, constants.LANGUAGE.UPDATED, req, res);
        }
        throw constants.LANGUAGE.INVALID_ID;
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}
exports.getLanguageById = async (req, res) => {
    try {
        const id = req.param("id")
        if (!id) {
            throw constants.LANGUAGE.ID_REQUIRED
        }
        const get_language = await Languages.findOne({ id: id });
        if (get_language) {
            return response.success(get_language, constants.LANGUAGE.FETCHED, req, res);
        }
        throw constants.LANGUAGE.INVALID_ID;

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}
exports.getAllLanguages = async (req, res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let { search, isDeleted, status, sortBy, addedBy } = req.query;
        let skipNo = (Number(page) - 1) * Number(count);

        if (search) {
            search = Services.Utils.remove_special_char_exept_underscores(search);
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

        if (addedBy) {
            query.addedBy = new ObjectId(addedBy);
        }

        // Pipeline Stages
        let pipeline = [
        ];

        let projection = {
            $project: {
                id: "$_id",
                name: "$name",
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
        let totalresult = await db.collection('languages').aggregate(pipeline).toArray();
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            let result = await db.collection("languages").aggregate(pipeline).toArray();
                let resData = {
                    total_count: totalresult ? totalresult.length : 0,
                    data: result ? result : [],
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalresult ? totalresult : [];
                }
                return response.success(resData, constants.LANGUAGE.FETCHED_ALL, req, res);

          

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}
exports.deleteLanguage = async (req, res) => {
    try {
        const id = req.param("id")
        if (!id) {
            throw constants.LANGUAGE.ID_REQUIRED
        }
        const update_language = await Languages.updateOne({ id: id }, { isDeleted: true, updatedBy: req.identity.id });
        if (update_language) {
            return response.success(null, constants.LANGUAGE.DELETED, req, res);
        }
        throw constants.LANGUAGE.INVALID_ID;
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

