/**
 * ProductController
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

module.exports = {

    addProduct: async (req, res) => {
        try {

            let validation_result = await Validations.Product.addProduct(req, res);
            if (validation_result && !validation_result.success) {
                throw validation_result.message
            }

            var { name, price_type } = req.body;
            req.body.name = name.toLowerCase();

            if (req.body.start_date) {
                req.body.start_date = new Date(req.body.start_date);
            }

            if (req.body.end_date) {
                req.body.end_date = new Date(req.body.end_date);
            }

            if (req.body.price_type) {
                req.body.price_type = price_type.toLowerCase()
            }

            let query = {};
            query.name = name.toLowerCase();
            query.isDeleted = false
            query.addedBy = req.identity.id;

            let nameexist = await Product.findOne(query);
            if (nameexist) {
                throw constants.PRODUCT.ALREADY_EXIST
            }

            req.body.addedBy = req.identity.id;
            req.body.updatedBy = req.identity.id;

            let addProducts = await Product.create(req.body).fetch();
            if (addProducts) {

                if (['operator', 'super_user'].includes(req.identity.role)) {

                    //----------------get main account manager---------------------
                    let get_account_manager = await Users.findOne({ id: req.identity.addedBy, isDeleted: false })
                    await Services.activityHistoryServices.create_activity_history(req.identity.id, 'marketplace_product', 'created', addProducts, addProducts, get_account_manager ? get_account_manager.id : null)
                    //----------------get main account manager---------------------

                } else if (['brand'].includes(req.identity.role)) {

                    //----------------get main account manager---------------------
                    let get_all_admin = await Services.UserServices.get_users_with_role(["admin"])
                    let get_account_manager = get_all_admin[0].id
                    await Services.activityHistoryServices.create_activity_history(req.identity.id, 'marketplace_product', 'created', addProducts, addProducts, get_account_manager ? get_account_manager.id : null)
                    //----------------get main account manager---------------------
                }

                return response.success(null, constants.PRODUCT.ADDED, req, res);
            }
            throw constants.COMMON.SERVER_ERROR;
        } catch (error) {
            console.log(error, "===err");

            return response.failed(null, `${error}`, req, res);
        }
    },

    ProductById: async (req, res) => {
        try {
            let { id } = req.query;
            if (!id) {
                throw constants.PRODUCT.ID_REQUIRED;
            }

            let get_product = await Product.findOne({ id: id });
            if (get_product) {
                if (get_product.category_id) {
                    let get_category = await CommonCategories.findOne({ id: get_product.category_id, isDeleted: false });
                    get_product.category_name = get_category.name
                }
                if (get_product.sub_category_id) {
                    let get_sub_category = await CommonCategories.findOne({ id: get_product.sub_category_id, isDeleted: false });
                    get_product.sub_category_name = get_sub_category.name
                }
                return response.success(get_product, constants.PRODUCT.FETCHED_ALL, req, res);
            }
            throw constants.PRODUCT.INVALID_ID;
        } catch (error) {
            return response.failed(null, `${error}`, req, res);
        }
    },

    editProduct: async (req, res) => {
        try {
            let validation_result = await Validations.Product.editProduct(req, res);
            if (validation_result && !validation_result.success) {
                throw validation_result.message;
            }

            let { id } = req.body;

            if (req.body.name) {
                req.body.name = req.body.name.toLowerCase();
            }

            let get_product = await Product.findOne({ id: id });
            if (!get_product) {
                throw constants.PRODUCT.INVALID_ID;
            }

            let query = {
                name: req.body.name,
                isDeleted: false,
                id: { '!=': req.body.id }
            }

            let name_exist = await Product.findOne(query);
            if (name_exist) {
                throw constants.PRODUCT.ALREADY_EXIST;
            }

            req.body.updatedBy = req.identity.id;

            let editProduct = await Product.updateOne({ id: req.body.id }, req.body);
            if (editProduct) {
                if (['operator', 'super_user'].includes(req.identity.role)) {
                    //----------------get main account manager---------------------
                    let get_account_manager = await Users.findOne({ addedBy: req.identity.id, isDeleted: false })
                    await Services.activityHistoryServices.create_activity_history(req.identity.id, 'marketplace_product', 'updated', editProduct, get_product, get_account_manager.id ? get_account_manager.id : null)

                } else if (['brand'].includes(req.identity.role)) {

                    //----------------get main account manager---------------------
                    let get_all_admin = await Services.UserServices.get_users_with_role(["admin"])
                    let get_account_manager = get_all_admin[0].id
                    await Services.activityHistoryServices.create_activity_history(req.identity.id, 'marketplace_product', 'updated', editProduct, get_product, get_account_manager ? get_account_manager.id : null)
                    //----------------get main account manager---------------------
                }
                return response.success(null, constants.PRODUCT.UPDATED, req, res)
            }
            throw constants.PRODUCT.INVALID_ID;
        } catch (err) {

            return response.failed(null, `${err}`, req, res);
        }
    },

    ProductList: async (req, res) => {
        try {
            let page = req.param('page') || 1;
            let count = req.param('count') || 10;

            let { search, isDeleted, status, role, sortBy, addedBy, category_id, sub_category_id, start_date, end_date, price_type, opportunity_type, placement, min_price, max_price } = req.query;
            let skipNo = (Number(page) - 1) * Number(count);

            let query = { isDeleted: false };

            if (search) {
                search = await Services.Utils.remove_special_char_exept_underscores(search);
                query.$or = [
                    { name: { $regex: search, '$options': 'i' } },
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

            if (isDeleted) { query.isDeleted = isDeleted ? isDeleted === 'true' : true ? isDeleted : false; }

            if (status) { query.status = status; };

            if (role) { query.role = role; };

            if (addedBy) { query.addedBy = new ObjectId(addedBy) };


            if (category_id) { query.category_id = new ObjectId(category_id); }

            if (sub_category_id) { query.sub_category_id = new ObjectId(sub_category_id); }

            if (opportunity_type) {
                opportunity_type = opportunity_type.split(',');
                query.opportunity_type = { $in: opportunity_type }
            }

            if (placement) {
                placement = placement.split(',');
                query.placement = { $in: placement }
            }

            if (price_type) {
                query.price_type = price_type
            }


            if (start_date && end_date) {
                query.start_date = {
                    $gte: new Date(new Date(start_date).setUTCHours(0, 0, 0, 0)),
                    $lte: new Date(new Date(start_date).setUTCHours(23, 59, 59)),
                };

                query.end_date = {
                    $gte: new Date(new Date(end_date).setUTCHours(0, 0, 0, 0)),
                    $lte: new Date(new Date(end_date).setUTCHours(23, 59, 59)),
                };
            }

            if (min_price && max_price) {
                query.price = { $lte: Number(max_price), $gte: Number(min_price) }

            }

            // console.log(JSON.stringify(query), "============query");
            let pipeline = [
                {
                    $lookup: {
                        from: "commoncategories",
                        localField: "category_id",
                        foreignField: "_id",
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
                        from: "commoncategories",
                        localField: "sub_category_id",
                        foreignField: "_id",
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
                    $lookup:
                    {
                        from: "makeoffer",
                        let: { brand_id: new ObjectId(req.identity.id), product_id: "$_id", isDeleted: false },
                        // let: { user_id: "$req.identity.id", fav_user_id: new ObjectId("64d076e86ecebee01af09d8c") },
                        pipeline: [
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $eq: ["$brand_id", "$$brand_id"] },
                                                { $eq: ["$isDeleted", "$$isDeleted"] },
                                                { $eq: ["$product_id", "$$product_id"] }

                                            ]
                                    }
                                }
                            }
                        ],
                        as: "makeOfferDetails"
                    }
                },
                {
                    $unwind: {
                        path: '$makeOfferDetails',
                        preserveNullAndEmptyArrays: true
                    }
                },

            ];

            let projection = {
                $project: {
                    id: "$_id",
                    name: "$name",
                    image: "$image",
                    price: "$price",
                    description: "$description",
                    quantity: "$quantity",
                    price_type: "$price_type",

                    price_type: "$price_type",
                    opportunity_type: "$opportunity_type",
                    placement: "$placement",
                    payment_model: "$payment_model",
                    start_date: "$start_date",
                    end_date: "$end_date",

                    category_name: "$category_details.name",
                    category_id: "$category_id",
                    sub_category_id: "$sub_category_id",
                    sub_category_name: "$sub_category_details.name",
                    makeOfferDetails: "$makeOfferDetails",
                    isSubmitted: {
                        $cond: [{ $eq: ['$makeOfferDetails.isDeleted', false] }, true, false]
                    },
                    addedBy_name: "$addedBy_details.fullName",
                    status: "$status",
                    createdAt: "$createdAt",
                    updatedAt: "$updatedAt",
                    isDeleted: "$isDeleted",
                    addedBy: "$addedBy"
                }
            };
            pipeline.push(projection);
            pipeline.push({
                $match: query

            });

            pipeline.push({
                $sort: sortquery
            });

            let totalresult = await db.collection('product').aggregate(pipeline).toArray();
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            let result = await db.collection('product').aggregate(pipeline).toArray();
            let resData = {
                total_count: totalresult ? totalresult.length : 0,
                data: result ? result : [],
            }
            if (!req.param('page') && !req.param('count')) {
                resData.data = totalresult ? totalresult : [];
            }
            return response.success(resData, constants.PRODUCT.FETCHED_ALL, req, res);

        } catch (error) {
            console.log(error, "err");
            return response.failed(null, `${error}`, req, res)
        }
    }

};

