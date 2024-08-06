/**
 * FavouritesController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */


const response = require('../services/Response')
const constants = require('../../config/constants').constants;
const db = sails.getDatastore().manager
const Validations = require("../Validations/index");
const ObjectId = require('mongodb').ObjectId;
const Services = require('../services/index');

exports.addFavourite = async (req, res) => {
    try {

        let validation_result = await Validations.FavouritesValidations.addFavourite(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { type, fav_user_id } = req.body;

        let query = {
            user_id: req.identity.id,
        };

        if (type == "user") {
            query.fav_user_id = fav_user_id;
        }

        req.body.updatedBy = req.identity.id;

        let get_favourite = await Favourites.findOne(query);
        if (get_favourite) {
            if (get_favourite.isFavourite) {
                req.body.isFavourite = false;
                req.body.time_clicked = get_favourite.time_clicked + 1;
                req.body.last_date_removed = new Date();
                let un_favourite = await Favourites.updateOne({ id: get_favourite.id }, req.body);
                if (un_favourite) {
                    return response.success(null, constants.FAVOURITE.REMOVED, req, res)
                }
                throw constants.COMMON.SERVER_ERROR

            }
            req.body.isFavourite = true;
            req.body.time_clicked = get_favourite.time_clicked + 1;
            req.body.last_date_saved = new Date();
            let favourite = await Favourites.updateOne({ id: get_favourite.id }, req.body);
            if (favourite) {
                return response.success(null, constants.FAVOURITE.ADDED, req, res)
            }
            throw constants.COMMON.SERVER_ERROR
        }

        req.body.user_id = req.identity.id;
        req.body.last_date_saved = new Date();
        let create_favourite = await Favourites.create(req.body).fetch();
        if (create_favourite) {

            // ----------- Updating User Points ---------------//
            // let get_like_points = await Services.Points.get_point("like");
            // let get_user_points = await Points.findOne({ user_id: create_favourite.user_id, isTemplate: false });
            // if (get_user_points) {
            //     if (get_user_points.like <= 0) {
            //         let update_points = await Points.updateOne({ id: get_user_points.id }, { like: get_like_points });
            //     }
            // } else {
            //     let add_points = await Services.Points.create_points({
            //         user_id: create_favourite.user_id,
            //         like: get_like_points > 0 ? get_like_points : 0
            //     });
            // }

            let update_like_points = await Services.Points.add_user_points(create_favourite.user_id, "like");

            // ----------- Updating User Points ---------------//

            return response.success(null, constants.FAVOURITE.ADDED, res, res)
        }

        throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
        // console.log(error);
        return response.failed(null, `${error}`, req, res)
    }

}

exports.getAllfavourite = async (req, res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let { isFavourite, search, sortBy, updatedBy, fav_user_id, type } = req.query;

        skipNo = (Number(page - 1)) * Number(count);

        if (search) {
            query.$or = [
                { type: { $regex: search, '$options': 'i' } },
                { fav_user_id_name: { $regex: search, '$options': 'i' } },
            ]
        }

        if (isFavourite) {
            if (isFavourite === 'true') {
                isFavourite = true;
            } else {
                isFavourite = false;
            }
            query.isFavourite = isFavourite;
        } else {
            query.isFavourite = true;
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

        if (updatedBy) {
            query.updatedBy = new ObjectId(updatedBy);
        }

        query.user_id = new ObjectId(req.identity.id);

        if (fav_user_id) {
            query.fav_user_id = new ObjectId(fav_user_id);
        }

        if (type) {
            query.type = type
        }

        // api/controllers/ContentManagementController.js (query);
        let pipeline = [
            {
                $lookup: {
                    from: "users",
                    localField: "updatedBy",
                    foreignField: "_id",
                    as: "updatedBy_details"
                }
            },
            {
                $unwind: {
                    path: '$updatedBy_details',
                    preserveNullAndEmptyArrays: true
                }
            },
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
            {
                $lookup: {
                    from: "users",
                    localField: "fav_user_id",
                    foreignField: "_id",
                    as: "fav_user_id_details"
                }
            },
            {
                $unwind: {
                    path: '$fav_user_id_details',
                    preserveNullAndEmptyArrays: true
                }
            },
        ];

        let projection = {
            $project: {
                id: "$_id",
                type: "$type",
                user_id: "$user_id",
                fav_user_id: "$fav_user_id",
                fav_user_id_name: "$fav_user_id_details.fullName",
                fav_user_id_image: "$fav_user_id_details.image",
                fav_user_id_banner_image: "$fav_user_id_details.banner_image",
                fav_user_id_social_media_platforms: "$fav_user_id_details.social_media_platforms",
                isFavourite: "$isFavourite",
                time_clicked: "$time_clicked",
                last_date_saved: "$last_date_saved",
                last_date_removed: "$last_date_removed",
                createdAt: "$createdAt",
                updatedAt: "$updatedAt",
                updatedBy: "$updatedBy",
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

        db.collection('favourites').aggregate(pipeline).toArray((err, totalresult) => {
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            db.collection("favourites").aggregate(pipeline).toArray((err, result) => {
                let resData = {
                    data: result ? result : [],
                    total_count: totalresult ? totalresult.length : 0
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalresult ? totalresult : [];
                }
                return response.success(resData, constants.FAVOURITE.FETCHED, req, res);

            })
        })

    }
    catch (error) {
        return response.failed(null, `${error}`, req, res)
    }
}

exports.getById = async (req, res) => {
    try {
        const id = req.param("id")
        if (!id) {
            throw constants.FAVOURITE.ID_REQUIRED
        }
        const get_favourite = await Favourites.findOne({ id: id }).populate("user_id").populate("fav_user_id");
        if (get_favourite) {
            return response.success(get_favourite, constants.FAVOURITE.FETCHED, req, res);
        }
        throw constants.FAVOURITE.INVALID_ID;
    } catch (error) {
        return response.failed(null, `${error}`, req, res)
    }
}