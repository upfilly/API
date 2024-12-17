/**
 * AffiliateManagementController
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


exports.addAffiliateGroup = async (req, res) => {
    try {
        let validation_result = await Validations.AffiliateManagement.addAffiliateGroup(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { group_name, group_code, group_type, isDefaultAffiliateGroup } = req.body;

        if (!['admin', 'brand'].includes(req.identity.role)) {
            throw constants.COMMON.UNAUTHORIZED;
        }

        if (req.body.group_name) {
            req.body.group_name = req.body.group_name.toLowerCase();
        }

        if (req.body.group_type) {
            req.body.group_type = req.body.group_type.toLowerCase();
        }

        req.body.addedBy = req.identity.id;
        req.body.updatedBy = req.identity.id;


        let query = {
            group_name: req.body.group_name,
            group_type: req.body.group_type,
            isDeleted: false,
            addedBy: req.identity.id
        }
        let existed_group = await AffiliateManagement.findOne(query);

        if (existed_group) {
            throw constants.AFFLIATE_GROUP.ALREADY_EXIST;
        }

        if (!group_code) {
            req.body.group_code = Services.Referral.generate_referal_code();
        }
        let add_group = await AffiliateManagement.create(req.body).fetch();
        if (add_group) {

            if (['operator', 'super_user'].includes(req.identity.role)) {

                //----------------get main account manager---------------------
                let get_account_manager = await Users.findOne({ id: req.identity.addedBy, isDeleted: false })
                await Services.activityHistoryServices.create_activity_history(req.identity.id, 'affiliate_group', 'created', add_group, add_group, get_account_manager.id ? get_account_manager.id : null)

            } else if (['brand'].includes(req.identity.role)) {

                //----------------get main account manager---------------------
                let get_all_admin = await Services.UserServices.get_users_with_role(["admin"])
                let get_account_manager = get_all_admin[0].id
                await Services.activityHistoryServices.create_activity_history(req.identity.id, 'affiliate_group', 'created', add_group, add_group, get_account_manager ? get_account_manager.id : null)

            }

            if (isDefaultAffiliateGroup && isDefaultAffiliateGroup == true) {
                let update_Group = await AffiliateManagement.update({
                    isDefaultAffiliateGroup: true,
                    status: 'active',
                    isDeleted: false,
                    id: { "!=": add_group.id },
                },
                    {
                        isDefaultAffiliateGroup: false,
                    }).fetch();
            }
            return response.success(null, constants.AFFLIATE_GROUP.SAVED, req, res);
        }
    }
    catch (err) {
        return res.status(400).json({
            success: false,
            error: { message: err },
        });
    }
}

exports.editAffiliateGroup = async (req, res) => {
    try {
        let validation_result = await Validations.AffiliateManagement.editAffiliateGroup(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { id, isDefaultAffiliateGroup } = req.body;

        let get_affiliate_group = await AffiliateManagement.findOne({ id: id, isDeleted: false });
        if (!get_affiliate_group) {
            throw constants.AFFLIATE_GROUP.INVALID_ID;
        }

        let affiliate_group = await AffiliateManagement.findOne({
            addedBy: req.identity.id,
            name: req.body.name,
            isDeleted: false,
            id: { "!=": id }
        });

        req.body.updatedBy = req.identity.id;
        let edit_affiliate_group = await AffiliateManagement.updateOne({ id: id }, req.body);
        if (edit_affiliate_group) {

            if (['operator', 'super_user'].includes(req.identity.role)) {

                //----------------get main account manager---------------------
                let get_account_manager = await Users.findOne({ id: req.identity.addedBy, isDeleted: false })
                await Services.activityHistoryServices.create_activity_history(req.identity.id, 'affiliate_group', 'updated', edit_affiliate_group, get_affiliate_group, get_account_manager.id ? get_account_manager.id : null)

            } else if (['brand'].includes(req.identity.role)) {

                //----------------get main account manager---------------------
                let get_all_admin = await Services.UserServices.get_users_with_role(["admin"])
                let get_account_manager = get_all_admin[0].id
                await Services.activityHistoryServices.create_activity_history(req.identity.id, 'affiliate_group', 'updated', edit_affiliate_group, get_affiliate_group, get_account_manager ? get_account_manager.id : null)

            }

            if (isDefaultAffiliateGroup && isDefaultAffiliateGroup == true) {
                let update_Group = await AffiliateManagement.update({
                    isDefaultAffiliateGroup: true,
                    status: 'active',
                    isDeleted: false,
                    id: { "!=": edit_affiliate_group.id },
                },
                    {
                        isDefaultAffiliateGroup: false,
                    }).fetch();
            }
            return response.success(null, constants.AFFLIATE_GROUP.UPDATED, req, res);
        }
        throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.getAllAffiliateGroup = async (req, res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let {
            search,
            isDeleted,
            status,
            sortBy,
            addedBy,
            group_name,
            group_type,
        } = req.query;
        let skipNo = (Number(page) - 1) * Number(count);

        if (search) {
            search = Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { group_name: { $regex: search, '$options': 'i' } }
            ]
        }

        if (isDeleted) {
            query.isDeleted = isDeleted ? isDeleted === 'true' : true ? isDeleted : false;
        } else {
            query.isDeleted = false;
        }

        if (status) {
            query.status = status;
        }
        if (group_type) {
            query.group_type = group_type;
        }
        if (group_name) {
            query.group_name = group_name;
        }

        if (addedBy) {
            query.addedBy = new ObjectId(addedBy)
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
                $lookup:
                {
                    from: "users",
                    let: { affiliate_group: "$_id", isDeleted: false },
                    // let: { user_id: "$req.identity.id", fav_user_id: new ObjectId("64d076e86ecebee01af09d8c") },
                    pipeline: [
                        {
                            $match:
                            {
                                $expr:
                                {
                                    $and:
                                        [
                                            { $eq: ["$affiliate_group", "$$affiliate_group"] },
                                            { $eq: ["$isDeleted", "$$isDeleted"] }

                                        ]
                                }
                            }
                        }
                    ],
                    as: "affiliate_group_details"
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

            // {
            //     $lookup: {
            //         from: "users",
            //         localField: "_id",
            //         foreignField: "affiliate_group",
            //         as: "affiliate_group_details"
            //     },
            // },

        ];

        let projection = {
            $project: {
                id: "$_id",
                group_name: "$group_name",
                group_code: "$group_code",
                isDefaultAffiliateGroup: "$isDefaultAffiliateGroup",
                isArchive: "$isArchive",
                commision: "$commision",
                status: "$status",
                group_type: "$group_type",
                isPreRegisterLeads: "$isPreRegisterLeads",
                affiliate_group_details: "$affiliate_group_details._id",
                number_of_affiliate_added: { $size: "$affiliate_group_details" },
                addedBy: "$addedBy",
                addedBy_name: "$addedBy_details.fullName",
                updatedBy: "$updatedBy",
                isDeleted: "$isDeleted",
                createdAt: "$createdAt",
                updatedAt: "$updatedAt"
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
        let totalresult = await db.collection('affiliatemanagement').aggregate(pipeline).toArray();
        pipeline.push({
            $skip: Number(skipNo)
        });
        pipeline.push({
            $limit: Number(count)
        });
        let result = await db.collection("affiliatemanagement").aggregate(pipeline).toArray();
        let resData = {
            total_count: totalresult ? totalresult.length : 0,
            data: result ? result : [],
        }
        if (!req.param('page') && !req.param('count')) {
            resData.data = totalresult ? totalresult : [];
        }
        return response.success(resData, constants.CAMPAIGN.FETCHED_ALL, req, res);


    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}

exports.getAffiliateGroupById = async (req, res) => {
    try {
        let id = req.param("id")
        if (!id) {
            throw constants.AFFLIATE_GROUP.ID_REQUIRED;
        }
        let get_group = await AffiliateManagement.findOne({ id: id, isDeleted: false });
        var userArr = [];
        if (get_group) {
            let get_affiliate_details = await Users.find({ affiliate_group: get_group.id });
            if (get_affiliate_details) {
                for await (var UsersObj of get_affiliate_details) {
                    userArr.push(UsersObj.fullName);
                }
            }
            get_group.addedAffiliates = userArr
            return response.success(get_group, constants.AFFLIATE_GROUP.GET_DATA, req, res);
        }
        throw constants.AFFLIATE_GROUP.INVALID_ID;

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.getDefaultAffiliateGroup = async (req, res) => {
    try {
        const get_default_group = await AffiliateManagement.find({ isDefaultAffiliateGroup: true, isDeleted: false, status: 'active' });
        if (get_default_group && get_default_group.length > 0) {
            return res.status(400).json({
                success: false,
                error: { "code": 400 }
            });
        } else {
            return res.status(200).json({
                success: true,
            });
        }
    } catch (error) {
        // console.log(error);
        return response.failed(null, `${error}`, req, res)
    }
}




