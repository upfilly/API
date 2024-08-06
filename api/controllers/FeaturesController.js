/**
 * FeaturesController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const Validations = require("../Validations/index");
const constants = require('../../config/constants.js').constants;
const response = require('../services/Response')
const Services = require('../services/index');
const db = sails.getDatastore().manager;

function arrayUnique(array) {
    var a = array.concat();
    for (var i = 0; i < a.length; ++i) {
        for (var j = i + 1; j < a.length; ++j) {
            if (a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
}

module.exports = {

    addFeatures: async (req, res) => {
        try {
            let validation_result = await Validations.FeaturesValidation.addFeatures(req, res);

            if (validation_result && !validation_result.success) {
                throw validation_result.message;
            }

            let { name } = req.body;
            let featuresArray = [];
            for await (items of name) {
                items.addedBy = req.identity.id;
                items.updatedBy = req.identity.id;
                // items.role_type = data.role_type;

                let query = {}
                query.isDeleted = false;
                query.name = items.name;
                // query.role_type = data.role_type;

                const features_data = await Features.findOne(query);
                if (features_data) {

                } else {
                    let createFeatures = await Features.create(items).fetch();
                    featuresArray.push(createFeatures);
                }
            }
            let find_all_plans = await SubscriptionPlans.find({ isDeleted: false });
            if (find_all_plans && find_all_plans.length > 0) {
                for await (let get_single_plan of find_all_plans) {
                    if (featuresArray && featuresArray.length > 0) {
                        for await (let obj of featuresArray) {
                            get_single_plan.features.push(obj);
                        }
                    }
                    let update_plans = await SubscriptionPlans.updateOne({ id: get_single_plan.id }, { features: get_single_plan.features });
                }
            }
            return response.success(null, constants.features.FEATURES_SAVED, req, res);
        }
        catch (error) {
            // console.log(error,"err");
            return response.failed(null, `${error}`, req, res);
        }
    },

    findSingleFeature: async (req, res) => {
        try {
            let id = req.param('id');
            if (!id) {
                throw constants.features.ID_REQUIRED;
            }

            let get_Features = await Features.findOne({ id: id });

            if (get_Features) {
                if (get_Features.addedBy) {
                    let get_added_by_details = await Users.findOne({ id: get_Features.addedBy });
                    if (get_added_by_details) {
                        get_Features.addedBy_name = get_added_by_details.fullName;
                    }
                }
                if (get_Features.updatedBy) {
                    let get_updated_by_details = await Users.findOne({ id: get_Features.updatedBy });
                    if (get_updated_by_details) {
                        get_Features.updatedBy = get_updated_by_details.fullName;
                    }
                }
                return response.success(get_Features, constants.features.GET_DATA, req, res);
            }
            throw constants.features.INVALID_ID;
        } catch (error) {
            return response.failed(null, `${error}`, req, res);
        }
    },

    editfeature: async (req, res) => {
        try {
            let validation_result = await Validations.FeaturesValidation.editFeatures(req, res);

            if (validation_result && !validation_result) {
                throw validation_result.message;
            }
            let { id } = req.body;

            req.identity.updatedBy = req.identity.id;
            let updatefeatureData = await Features.updateOne({ id: id }, req.body);
            if (updatefeatureData) {
                return response.success(null, constants.features.UPDATED_FEATURES, req, res);
            }
            throw constants.features.INVALID_ID;

        } catch (error) {
            // console.log(error, "err");
            return response.failed(null, `${error}`, req, res)
        }
    },

    getAllFeatures: async (req, res) => {
        try {
            let query = {};
            let count = req.param('count') || 10;
            let page = req.param('page') || 1;
            let skipNo = (Number(page) - 1) * Number(count);
            let { search, sortBy, status, isDeleted } = req.query;
            let sortquery = {};

            if (search) {
                search = await Services.Utils.remove_special_char_exept_underscores(search);
                query.$or = [
                    { name: { $regex: search, '$options': 'i' } }
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
                    name: { $toLower: "$name" },
                    status: "$status",
                    // role_type: "$role_type",
                    createdBy: "$createdBy",
                    isDeleted: "$isDeleted",
                    deletedAt: "$deletedAt",
                    deletedBy: "$deletedBy",
                    addedBy: "$addedBy",
                    addeBy_name: "$addedBy_details.fullName",
                    updatedBy: "$updatedBy",
                    updatedAt: "$updatedAt",
                    createdAt: "$createdAt",
                }
            };
            pipeline.push(projection);
            pipeline.push({
                $match: query
            });
            pipeline.push({
                $sort: sortquery
            });

            let totalresult = await db.collection('features').aggregate(pipeline).toArray();
                pipeline.push({
                    $skip: Number(skipNo)
                });
                pipeline.push({
                    $limit: Number(count)
                });
                let result = await db.collection('features').aggregate(pipeline).toArray();
                    let resData = {
                        total_count: totalresult ? totalresult.length : 0,
                        data: result ? result : [],
                    }
                    if (!req.param('page') && !req.param('count')) {
                        resData.data = totalresult ? totalresult : [];
                    }
                    return response.success(resData, constants.features.ALL_FEATURES, req, res);
             
        } catch (error) {
            return response.failed(null, `${error}`, req, res);
        }
    },
}