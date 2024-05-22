/**
 * CommissionController
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
const Emails = require('../Emails/index');


exports.addCommission = async (req, res) => {
    try {
        let validation_result = await Validations.CommissionNew.addCommission(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { } = req.body;

        // let query = {};
        // query.title = title.toLowerCase();
        // query.isDeleted = false;


        // let get_commission = await Commission.findOne(query);
        // if (get_commission) {
        //     throw constants.COMMISSION.ALREADY_EXIST
        // }

        req.body.addedBy = req.identity.id;
        req.body.commission = "manual"

        let add_detail = await Commission.create(req.body).fetch();
        if (add_detail) {
            if (add_detail.is_send_email_to_publisher == true) {
                let get_affiliate = await Users.findOne({ id: add_detail.affiliate_id, isDeleted: false });
                let get_brand = await Users.findOne({ id: add_detail.addedBy, isDeleted: false });
                let email_payload = {
                    email: get_affiliate.email,
                    fullName: get_affiliate.fullName,
                    brand_name: get_brand.fullName,
                    commission_detail: add_detail
                };
                await Emails.Commission.AddCommission(email_payload);
            }
            return response.success(null, constants.COMMISSION.CREATED, req, res);
        }
        throw constants.COMMON.SERVER_ERROR;

    } catch (err) {
        console.log(err, "err");
        return response.failed(null, `${err}`, req, res);
    }
};

exports.editCommission = async (req, res) => {
    try {
        let validation_result = await Validations.CommissionNew.editCommission(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { title, id, activation_date, availability_date, expiration_date } = req.body;

        // let query = {
        //     isDeleted: false,
        //     id: { "!=": id }
        // }

        // let name_exist = await Commission.findOne(query);
        // if (name_exist) {
        //     throw constants.COMMISSION.ALREADY_EXIST;
        // }

        req.body.updatedBy = req.identity.id;


        let get_COMMISSION = await Commission.findOne({ id: id, isDeleted: false }).populate("campaign");
        if (!get_COMMISSION) {
            throw constants.COMMISSION.INVALID_ID;
        }

        let update_detail = await Commission.updateOne({ id: id }, req.body);
        if (update_detail) {
            return response.success(null, constants.COMMISSION.UPDATED, req, res);
        }
        throw constants.COMMISSION.INVALID_ID;
    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}

exports.getAllCommission = async (req, res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;

        let { search, isDeleted, status, sortBy, upload_method, commission_type, mobile_creative } = req.query;
        let skipNo = (Number(page) - 1) * Number(count);

        if (search) {
            search = await Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { title: { $regex: search, '$options': 'i' } },
                { destination_url: { $regex: search, '$options': 'i' } },

            ]
        }

        if (isDeleted) { if (isDeleted === 'true') { isDeleted = true; } else { isDeleted = false; } query.isDeleted = isDeleted; } else { query.isDeleted = false; }

        if (status) { query.status = status; }

        if (status) { query.status = status; }
        if (upload_method) { query.upload_method = upload_method; }
        if (commission_type) { query.commission_type = commission_type; }


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


        // Pipeline Stages
        let pipeline = [
            {
                $lookup: {
                    from: 'users',
                    localField: 'addedBy',
                    foreignField: '_id',
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
                    from: 'Campaign',
                    localField: 'campaign',
                    foreignField: '_id',
                    as: "campaign_details"
                }
            },
            {
                $unwind: {
                    path: '$campaign_details',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'affiliate_id',
                    foreignField: '_id',
                    as: "affiliate_details"
                }
            },
            {
                $unwind: {
                    path: '$affiliate_details',
                    preserveNullAndEmptyArrays: true
                }
            },
        ];

        let projection = {
            $project: {
                id: "$_id",
                commission: "$commission",
                upload_method: "$upload_method",
                commission_type: "$commission_type",
                publisher_id: "$publisher_id",
                amount_of_sale: "$amount_of_sale",
                amount_of_commission: "$amount_of_commission",
                order_reference: "$order_reference",
                click_ref: "$click_ref",
                affiliate_id: "$affiliate_id",
                is_send_email_to_publisher: "$is_send_email_to_publisher",

                status: "$status",
                addedBy: "$addedBy",
                addedBy_name: "$addedBy_details.fullName",
                affiliate_name: "$affiliate_details.fullName",
                campaign_details:"$campaign_details",
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
        db.collection('commission').aggregate(pipeline).toArray((err, totalresult) => {
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            db.collection("commission").aggregate(pipeline).toArray((err, result) => {
                let resData = {
                    total_count: totalresult ? totalresult.length : 0,
                    data: result ? result : [],
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalresult ? totalresult : [];
                }
                return response.success(resData, constants.COMMISSION.FETCHED_ALL, req, res);

            })
        })
    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}

exports.getCommissionById = async (req, res) => {
    try {

        let id = req.param("id")
        if (!id) {
            throw constants.COMMISSION.ID_REQUIRED;
        }
        let get_detail = await Commission.findOne({ id: id }).populate('affiliate_id');
        if (get_detail) {
            return response.success(get_detail, constants.COMMISSION.FETCHED, req, res)
        }
        throw constants.COMMISSION.INVALID_ID;

    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}

exports.deleteCommission = async (req, res) => {
    try {
        let id = req.param("id");
        if (!id) {
            throw constants.COMMISSION.ID_REQUIRED;
        }

        const delete_detail = await COMMISSION.updateOne({ id: id }, { isDeleted: true, updatedBy: req.identity.id });
        if (delete_detail) {
            return response.success(null, constants.COMMISSION.DELETED, req, res);
        }
        throw constants.COMMON_CATEGORIES.INVALID_ID;
    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}

