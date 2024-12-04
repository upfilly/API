/**
 * DiscountController
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


exports.addDiscount = async (req, res) => {
    try {

        let validation_result = await Validations.DiscountValidation.addDiscount(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }


        req.body.addedBy = req.identity.id;
        req.body.name = req.body.name.toLowerCase()

        let query = {};
        query.isDeleted = false;
        query.name = req.body.name;

        let get_user = await Discount.findOne(query);
        if (get_user) {
            throw constants.DISCOUNT.ALREADY_EXIST;
        }

        let created_on_stripe = await Services.StripeServices.create_coupon(req.body);
        if (created_on_stripe) {
            req.body.stripe_coupon_id = created_on_stripe.id
            let created_discount = await Discount.create(req.body).fetch();
            if (created_discount) {
                return response.success(null, constants.DISCOUNT.ADDED, req, res);
            }
        }
        throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
        // console.log(error, "----------------err");
        return response.failed(null, `${error}`, req, res);
    }
}

exports.getByIdDiscount = async (req, res) => {
    try {
        const id = req.param("id")
        if (!id) {
            throw constants.DISCOUNT.ID_REQUIRED
        }
        const get_discount = await Discount.findOne({ id: id });
        if (get_discount) {
            return response.success(get_discount, constants.DISCOUNT.FETCHED, req, res);
        }
        throw constants.DISCOUNT.INVALID_ID;
    } catch (error) {
        return response.failed(null, `${error}`, req, res)
    }
}

exports.getAllDiscount = async (req, res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let skipNo = (Number(page) - 1) * Number(count);
        let { search, sortBy, status, isDeleted, plan_type } = req.query;
        let sortquery = {};

        if (search) {
            search = Services.Utils.remove_special_char_exept_underscores(search);
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

        if (plan_type) {
            query.plan_type = plan_type;
        }

        // console.log(sortquery, "-----------------sortquery");
        let pipeline = [

        ];
        let projection = {
            $project: {
                id: '$_id',
                name: '$name',
                discount_type: '$discount_type',
                duration: '$duration',
                duration_in_months: '$duration_in_months',
                stripe_coupon_id: "$stripe_coupon_id",
                amount_value:"$amount_value",
                percent_off: "$percent_off",
                amount_off: "$amount_off",
                total_amount: '$total_amount',
                // max_redemptions: "$max_redemptions",
                isDeleted: "$isDeleted",
                deletedAt: "$deletedAt",
                status: "$status",
                addedBy: "$addedBy",
                updatedBy: "$updatedBy",
                updatedAt: "$updatedAt",
                createdAt: "$createdAt",
            }
        };
        pipeline.push(projection);
        pipeline.push({
            $match: query
        });
        // pipeline.push({
        //     $sort: sortquery
        // });

        pipeline.push({
            $sort: sortquery
        });

        // let unset_stage = {
        //     $unset: ['_id']
        // }
        // pipeline.push(unset_stage)

        let totalresult =await db.collection('discount').aggregate(pipeline).toArray();
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            let result =await  db.collection('discount').aggregate(pipeline).toArray();
                let resData = {
                    total_count: totalresult ? totalresult.length : 0,
                    data: result ? result : [],
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalresult ? totalresult : [];
                }
                return response.success(resData, constants.DISCOUNT.FETCHED, req, res);
          
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.editDiscount = async (req, res) => {
    try {
        let validation_result = await Validations.DiscountValidation.editDiscount(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }
        const { name, id } = req.body;

        req.body.updatedBy = req.identity.id;
        req.body.updatedAt = new Date();
        req.body.name = name.toLowerCase();
        const update_discount = await Discount.updateOne({ id: id }, req.body);
        if (update_discount) {
            return response.success(null, constants.DISCOUNT.UPDATED, req, res);
        }
        throw constants.DISCOUNT.INVALID_ID;
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}



