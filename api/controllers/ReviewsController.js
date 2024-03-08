/**
 * ReviewsController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const constants = require('../../config/constants').constants
const response = require('../services/Response');
const Validations = require("../Validations/index");
const db = sails.getDatastore().manager;
const Services = require('../services/index');
const ObjectId = require('mongodb').ObjectId;

exports.addReviews = async (req, res) => {
    try {
        let validation_result = await Validations.ReviewsValidations.addReviews(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }
        let { type, contract_id } = req.body;

        req.body.user_id = req.identity.id;
        let Model;
        let query = {};
        let get_review_query = {
            user_id: req.identity.id,
            isDeleted: false,
            type: type
        };

        if (type == "contract") {
            Model = sails.models["users"];
            let get_contract = await Contracts.findOne({ id: contract_id });
            if (!get_contract) {
                throw constants.REVIEWS.INVALID_CONTRACT_ID;
            }

            if (req.identity.id != get_contract.brand_id) {
                throw constants.COMMON.UNAUTHORIZED;
            }

            get_review_query.contract_id = contract_id;
            query.id = get_contract.influencer_id;;
            req.body.rate_to = get_contract.influencer_id;
        }

        let get_review = await Reviews.findOne(get_review_query);
        if (get_review) {
            throw constants.REVIEWS.ALREADY_REVIEW;
        }

        let add_reviews = await Reviews.create(req.body).fetch();
        if (add_reviews) {

            let avg_rating = await Services.CommonServices.avg_rating(type, add_reviews.rate_to,)

            let get_review_count_data = await Model.findOne(query);
            let reviews_count = 0;
            if (get_review_count_data && get_review_count_data.total_reviews > 0) {
                reviews_count = get_review_count_data ? get_review_count_data.total_reviews : 0;
            }

            let update_payload = { avg_rating: avg_rating };
            if (add_reviews.review) {
                update_payload.total_reviews = reviews_count + 1
            }

            let review_update = await Model.updateOne(query, update_payload);
            if (review_update) {
                return response.success(null, constants.REVIEWS.ADDED, req, res);
            }
            throw constants.COMMON.SERVER_ERROR;
        }
        throw constants.COMMON.SERVER_ERROR
    } catch (error) {
        return response.failed(null, `${error}`, req, res)
    }
}

exports.editReviews = async (req, res) => {
    try {
        throw constants.COMMON.API_NOT_EXIST;
        let validation_result = await Validations.ReviewsValidations.editReviews(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { id, review } = req.body;
        let get_reviews = await Reviews.findOne({ id: id, isDeleted: false });
        if (get_reviews.user_id == req.identity.id) {
            let edit_reviews = await Reviews.updateOne({ id: id }, { review: review });
            if (edit_reviews) {
                return response.success(edit_reviews, constants.REVIEWS.UPDATED, req, res);
            }
            throw constants.REVIEWS.INVALID_ID;
        }
        throw constants.REVIEWS.UNAUTHORIZED;
    } catch (error) {
        console.log(error, '==========error');
        return response.failed(null, `${error}`, req, res)
    }
}

exports.getById = async (req, res) => {
    try {
        let { id } = req.query;
        if (!id) {
            throw constants.REVIEWS.ID_REQUIRED
        }
        let view_reviews = await Reviews.findOne({ id: id });
        if (view_reviews) {
            return response.success(view_reviews, constants.REVIEWS.FETCHED, req, res);
        }
        throw constants.REVIEWS.INVALID_ID
    } catch (error) {
        return response.failed(null, `${error}`, req, res)
    }
}

exports.getAllReviews = async (req, res) => {
    try {
        let query = { _id: { $ne: null } };
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let { search, sortBy, isDeleted, type, user_id, rate_to, contract_id } = req.query;
        skipNo = (Number(page - 1)) * Number(count);
        if (search) {
            query.$or = [
                { review: { $regex: search, '$options': 'i' } },
                { type: { $regex: search, '$options': 'i' } },
            ]
        };

        if (isDeleted) {
            query.isDeleted = isDeleted ? isDeleted === 'true' : true ? isDeleted : false;
        } else {
            query.isDeleted = false;
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

        if (type) {
            query.type = type;
        };

        if (user_id) {
            query.user_id = ObjectId(user_id);
        };

        if (rate_to) {
            query.rate_to = ObjectId(rate_to);
        };

        if (contract_id) {
            query.contract_id = ObjectId(contract_id);
        };

        let pipeline = [
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user_id_details"
                }
            },
            {
                $unwind: {
                    path: '$user_id_details',
                    preserveNullAndEmptyArrays: true
                }
            },
        ];
        let projection = {
            $project: {
                id: "$_id",
                rating: "$rating",
                review: "$review",
                contract_id: "$contract_id",
                user_id: "$user_id",
                rate_to: "$rate_to",
                type: "$type",
                addedBy: "$addedBy",
                updatedBy: "$updatedBy",
                deletedBy: "$deletedBy",
                isDeleted: "$isDeleted",
                createdAt: "$createdAt",
                updatedAt: "$updatedAt",
                name: "$user_id_details.fullName",
                logo: "$user_id_details.logo",
                image: "$user_id_details.image",
            }
        };
        pipeline.push(projection);
        pipeline.push({
            $match: query
        });
        pipeline.push({
            $sort: sortquery
        });
        db.collection('reviews').aggregate(pipeline).toArray((err, totalresult) => {
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            db.collection("reviews").aggregate(pipeline).toArray((err, result) => {
                let resData = {
                    data: result ? result : [],
                    total_count: totalresult ? totalresult.length : 0
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalresult ? totalresult : [];
                }
                return response.success(resData, constants.REVIEWS.FETCHED, req, res);
            })
        });
    } catch (error) {
        return response.failed(null, `${error}`, req, res)
    }
}

exports.deleteReviews = async (req, res) => {
    try {
        const id = req.param("id")
        if (!id) {
            throw constants.REVIEWS.ID_REQUIRED;
        }

        let get_review = await Reviews.findOne({ id: id });
        if (get_review) {
            if (req.identity.role == "admin" || get_review.user_id == req.identity.id) {
                req.body.deletedBy = req.identity.id;
                let delete_reviews = await Reviews.updateOne({ id: id }, { isDeleted: true, updatedBy: req.identity.id })
                if (delete_reviews) {
                    let avg_rating = await Services.CommonServices.avg_rating(delete_reviews.type, delete_reviews.rate_to);
                    let update_payload = { avg_rating: avg_rating };
                    let Model;
                    let query = {};

                    if (delete_reviews.type == "contract") {
                        Model = sails.models["users"];
                        query.id = delete_reviews.rate_to;
                    }

                    let get_review_count_data = await Model.findOne(query);
                    if (get_review_count_data && get_review_count_data.total_reviews > 0) {
                        if (delete_reviews.review) {
                            update_payload.total_reviews = Number(get_review_count_data.total_reviews) - 1;
                        }
                    }

                    let review_update = await Model.updateOne(query, update_payload);
                    if (review_update) {
                        return response.success(null, constants.REVIEWS.DELETED, req, res);
                    }
                }
                throw constants.REVIEWS.INVALID_ID;
            }
            throw constants.REVIEWS.UNAUTHORIZED;
        }
        throw constants.REVIEWS.INVALID_ID;
    } catch (error) {
        console.log(error);
        return response.failed(null, `${error}`, req, res);

    }
}

exports.getReviewByContractId = async (req, res) => {
    try {
        let { contract_id } = req.query;
        let query = { type: "contract", isDeleted: false };
        if (!contract_id) {
            throw constants.REVIEWS.CONTRACT_ID_REQUIRED;
        };
        query.contract_id = contract_id;


        if (req.identity.role == "brand") {
            query.user_id = req.identity.id;
        } else if (req.identity.role == "influencers") {
            query.rate_to = req.identity.id;
        };

        let view_reviews = await Reviews.findOne(query);
        if (view_reviews) {
            return response.success(view_reviews, constants.REVIEWS.FETCHED, req, res);
        }
        return response.success(null, constants.REVIEWS.FETCHED, req, res);         // on frontend demand
    } catch (error) {
        return response.failed(null, `${error}`, req, res)
    }
}
