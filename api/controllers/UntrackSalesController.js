/**
 * SalesTrackingController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const constants = require('../../config/constants').constants
const db = sails.getDatastore().manager;
const ObjectId = require('mongodb').ObjectId;
const Services = require('../services/index');
const Joi = require('joi');
const Validations = require("../Validations/UntrackSales");
const response = require("../services/Response")

module.exports = {

    addsales: async (req, res) => {
        try {
            let validation_result = await Validations.addsales(req, res);

            if (validation_result && !validation_result.success) {
                throw validation_result.message;
            }
            
            req.body.addedBy = req.identity.id;
            req.body.title = req.body.title.toLowerCase();

            // let data = await Users.findOne({ id: req.identity.id, isDeleted: false })
            // req.body.brand_id = data.createdByBrand;


            let result = await UntrackSales.findOne({ title: req.body.title, addedBy: req.identity.id,isDeleted: false })
            if (!result) {
                let result1 = await UntrackSales.create(req.body);
                return response.success(result1, constants.UNTRACKSALES.ADDED,req,res);
            }
            else {
                throw constants.UNTRACKSALES.ALREADY_EXIST
            }
        }
        catch (error) {
            return response.failed(null, `${error}`, req, res)
        }
    },

    getTrackingById: async (req, res) => {
        try {
            let validation_result = await Validations.getsales(req, res);

            if (validation_result && !validation_result.success) {
                throw validation_result.message;
            }

            let result = await UntrackSales.findOne({ id: req.query.id, isDeleted: false })
            if (result) {
                return response.success(result,constants.UNTRACKSALES.FETCHED,req, res);
                // return res.status(200).json({
                //     success: true,
                //     data: result
                // })
            }
            else {
                throw constants.UNTRACKSALES.INVALID_ID
            }
        }
        catch (error) {
            return response.failed(null, `${error}`, req, res)
        }

    },

    updateSales: async (req, res) => {
        try {
            let validation_result = await Validations.updatesales(req, res);

            if (validation_result && !validation_result.success) {
                throw validation_result.message;
            }

            let { id } = req.body;
            let result = await UntrackSales.updateOne({ id: id }, (req.body));
            if (result) {
                return response.success(result,constants.UNTRACKSALES.UPDATED,req, res);
                // return res.status(200).json({
                //     success: true,
                //     message: constants.UNTRACKSALES.UPDATED
                // })
            }
            else {
                throw constants.UNTRACKSALES.INVALID_ID
            }
        }
        catch (error) {
            return response.failed(null, `${error}`, req, res)
        }
    },

    removeSales: async (req, res) => {
        try {

            let { id } = req.query;
            let result = await UntrackSales.updateOne({ id: id }, { isDeleted: true })
            if (result) {
                return response.success(result,constants.UNTRACKSALES.DELETED,req, res);
                // return res.status(200).json({
                //     success: true,
                //     message: constants.UNTRACKSALES.DELETED
                // })
            }
            else {
                throw constants.UNTRACKSALES.INVALID_ID

            }
        }
        catch (error) {
            return response.failed(null, `${error}`, req, res)
        }
    },

    getallSalesDetails: async (req, res) => {
        try {

            let { search, sortBy, status } = req.query;
            let page = req.param('page') || 1;
            let count = req.param('count') || 10;

            var query = {}
            if (search) {
                search = await services.Utils.remove_special_char_exept_underscores(search);
                query.$or = [{ brand_name: { $regex: search, '$options': 'i' } }];
            }
            query.isDeleted = false;

            var sortquery = {};
            if (sortBy) {
                var order = sortBy.split(' ');
                var field = order[0];
                var sortType = order[1];
            }

            let skip = (Number(page) - 1) * Number(count);
            sortquery[field ? field : 'createdAt'] = sortType
                ? sortType == 'desc'
                    ? -1
                    : 1
                : -1;
            if (status) {
                query.status = status;
            }

            const pipeline = [
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
                {
                    $project: {
                        image: "$image",
                        description: "$description",
                        title: "$title",
                        brand_id: "$brand_id",
                        addedBy: "$addedBy",
                        fullName:"$addedBy_details.fullName",
                        email:"$addedBy_details.email",
                        updatedBy: "$updatedBy",
                        isDeleted: '$isDeleted',
                        status: '$status',
                        createdAt: '$createdAt',
                        updatedAt: '$updatedAt'
                    }
                },
                {
                    $match: query,
                },
                {
                    $sort: sortquery,
                },
            ];

            let totalResult = await db.collection('untracksales').aggregate(pipeline).toArray()
            pipeline.push({
                $skip: Number(skip)
            });

            pipeline.push({
                $limit: Number(count)
            });

            let result = await db.collection('untracksales').aggregate(pipeline).toArray()
            let resData = {
                total: totalResult ? totalResult.length : 0,
                data: result ? result : []
            }
            if (!req.param('page') && !req.param('count')) {
                resData.data = totalResult ? totalResult : []
            }
            return res.status(200).json({
                success: true,
                total: totalResult.length,
                data: result,
            });

        }
        catch (error) {
            return response.failed(null, `${error}`, req, res)
        }
        // catch (error) {
        //     return res.status(500).json({
        //         success: false,
        //         error: { code: 500, message: '' + error },
        //     });
        // }
    },


};

