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
const Emails = require('../Emails/index');

module.exports = {

    addsales: async (req, res) => {
        try {
            let validation_result = await Validations.addsales(req, res);

            if (validation_result && !validation_result.success) {
                throw validation_result.message;
            }

            req.body.addedBy = req.identity.id;
            req.body.title = req.body.title.toLowerCase();
            req.body.order_date = new Date(req.body.order_date);

            let result = await UntrackSales.findOne({ title: req.body.title, addedBy: req.identity.id, isDeleted: false })


            if (!result) {
                let result1 = await UntrackSales.create(req.body).fetch()
                if (result1) {

                    if (['operator', 'super_user'].includes(req.identity.role)) {
                        //----------------get main account manager---------------------
                        let get_account_manager = await Users.findOne({ addedBy: req.identity.id, isDeleted: false })

                        await Services.activityHistoryServices.create_activity_history(req.identity.id, 'untrack_sales', 'created', result1, result1, get_account_manager.id ? get_account_manager.id : null)

                    } else if (['affiliate'].includes(req.identity.role)) {

                        //----------------get main account manager---------------------
                        let get_all_admin = await Services.UserServices.get_users_with_role(["admin"])
                        let get_account_manager = get_all_admin[0].id

                        await Services.activityHistoryServices.create_activity_history(req.identity.id, 'untrack_sales', 'created', result1, result1, get_account_manager ? get_account_manager : null)

                    }

                    let data = await Users.findOne({ id: result1.brand_id });
                    let get_afiliate = await Users.findOne({ id: result1.addedBy, isDeleted: false })
                    const emailpayload = {
                        email: data.email,
                        name: data.fullName,
                        affiliate_name: get_afiliate.fullName
                    }
                    await Emails.OnboardingEmails.send_mail_to_brand(emailpayload)
                    return response.success(null, constants.UNTRACKSALES.ADDED, req, res);
                }
            }
            else {
                throw constants.UNTRACKSALES.ALREADY_EXIST
            }
        }

        catch (error) {
            console.log(error, "========err");
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
                if (result.brand_id) {
                    let get_brand = await Users.findOne({ id: result.brand_id });
                    if (get_brand) {
                        result.brand_fullName = get_brand.fullName
                        result.brand_email = get_brand.email
                    }
                }
                if (result.addedBy) {
                    let get_affiliate = await Users.findOne({ id: result.addedBy });
                    if (get_affiliate) {
                        result.affiliate_fullName = get_affiliate.fullName
                        result.affiliate_email = get_affiliate.email
                    }
                }
                return response.success(result, constants.UNTRACKSALES.FETCHED, req, res);
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

            let result_old = await UntrackSales.findOne({ id: id, isDeleted: false });

            let result = await UntrackSales.updateOne({ id: id }, (req.body));
            if (result) {
                if (['operator', 'super_user'].includes(req.identity.role)) {
                    let get_account_manager = await Users.findOne({ addedBy: req.identity.id, isDeleted: false })

                    await Services.activityHistoryServices.create_activity_history(req.identity.id, 'untrack_sales', 'updated', result, result_old, get_account_manager.id ? get_account_manager.id : null)

                } else if (['affiliate'].includes(req.identity.role)) {

                    let get_all_admin = await Services.UserServices.get_users_with_role(["admin"])
                    let get_account_manager = get_all_admin[0].id

                    await Services.activityHistoryServices.create_activity_history(req.identity.id, 'untrack_sales', 'updated', result, result_old, get_account_manager ? get_account_manager : null)
                }

                return response.success(result, constants.UNTRACKSALES.UPDATED, req, res);
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
                return response.success(result, constants.UNTRACKSALES.DELETED, req, res);
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

            let { search, sortBy, status, addedBy, brand_id } = req.query;
            let page = req.param('page') || 1;
            let count = req.param('count') || 10;

            var query = {}
            if (search) {
                search = await Services.Utils.remove_special_char_exept_underscores(search);
                query.$or = [{ brand_fullName: { $regex: search, '$options': 'i' } }];
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

            if (addedBy) {
                query.addedBy = new ObjectId(addedBy);
            }

            if (brand_id) {
                query.brand_id = new ObjectId(brand_id);
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
                    $lookup: {
                        from: "users",
                        localField: "brand_id",
                        foreignField: "_id",
                        as: "brand_details"
                    }
                },
                {
                    $unwind: {
                        path: '$brand_details',
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
                        affiliate_fullName: "$addedBy_details.fullName",
                        affiliate_email: "$addedBy_details.email",
                        brand_fullName: "$brand_details.fullName",
                        updatedBy: "$updatedBy",
                        isDeleted: '$isDeleted',
                        status: '$status',
                        createdAt: '$createdAt',
                        updatedAt: '$updatedAt',
                        type: "$type",
                        click_ref: "$click_ref",
                        order_date: "$order_date",
                        amount: "$amount",
                        commission: "$commission",
                        order_reference: "$order_reference",
                        customer_reference: "$customer_reference",
                        currency: "$currency",
                        timeZone: "$timeZone"
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
    },

    changeStatus: async (req, res) => {
        try {

            let validation_result = await Validations.changeStatus(req, res);
            if (validation_result && !validation_result.success) {
                throw validation_result.message
            }

            let { id } = req.body;

            let data = await UntrackSales.findOne({ id: id, isDeleted: false });

            if (!data) {
                throw constants.UNTRACKSALES.INVALID_ID;
            }

            if (req.body.status == "accepted" && ['accepted'].includes(data.status)) {
                throw constants.UNTRACKSALES.CANNOT_ACCEPT;
            }



            req.body.updatedBy = req.identity.id;
            let update_status = await UntrackSales.updateOne({ id: req.body.id }, req.body);

            if (update_status) {
                let email_payload = {
                    id: data.addedBy,
                    status: update_status.status,
                    reason: update_status.reason,
                    email: update_status.email
                };
                await Emails.OnboardingEmails.change_status(email_payload)
                return response.success(null, constants.UNTRACKSALES.STATUS_UPDATE, req, res)
            }
            throw constants.COMMON.SERVER_ERROR

        } catch (error) {
            console.log(error);
            return response.failed(null, `${error}`, req, res)
        }
    }


};

