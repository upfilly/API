/**
 * TrackCustomerController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const response = require("../services/Response")
const constants = require('../../config/constants').constants;
const db = sails.getDatastore().manager
const Services = require('../services/index');
const ObjectId = require('mongodb').ObjectId;

exports.getAllTrackingCustomer = async (req, res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let { search, isDeleted, status, sortBy, type, affiliate_id } = req.query;
        let skipNo = (Number(page) - 1) * Number(count);

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

        if (affiliate_id) {
            query.affiliate_id = new ObjectId(affiliate_id);
        }

        if (type) {
            query.type = type
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

        // Pipeline Stages
        let pipeline = [
            {
                $lookup: {
                    from: "users",
                    localField: "affiliate_id",
                    foreignField: "_id",
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
                affiliate_id: "$affiliate_id",
                affiliate_link: "$affiliate_link",
                track_to: "$track_to",
                type: "$type",
                clicks: "$clicks",

                addedBy: "$addedBy",
                updatedBy: "$updatedBy",
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
        let totalresult =await  db.collection('trackcustomer').aggregate(pipeline).toArray();
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            let result = await  db.collection("trackcustomer").aggregate(pipeline).toArray();
                let resData = {
                    total_count: totalresult ? totalresult.length : 0,
                    data: result ? result : [],
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalresult ? totalresult : [];
                }
                return response.success(resData, constants.MAKE_OFFER.FETCHED_ALL, req, res);
    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}

exports.getByIdTrackingCustomer = async (req, res) => {
    try {
        let id = req.param("id")
        if (!id) {
            throw constants.TRACK_CUSTOMER.ID_REQUIRED;
        }
        let get_track = await TrackCustomer.findOne({ id: id, isDeleted: false })
        if (get_track) {
            return response.success(get_track, constants.TRACK_CUSTOMER.VIEW, req, res);
        }
        throw constants.TRACK_CUSTOMER.INVALID_ID;

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

