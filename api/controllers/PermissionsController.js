/**
 * RolesController
 *
 * @description :: Server-side logic for managing Roles
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const db = sails.getDatastore().manager;
const response = require('../services/Response');
const constants = require('../../config/constants').constants;
const ObjectId = require('mongodb').ObjectId;
const Validations = require("../Validations/index");

exports.getAllPermissions = async (req, res) => {
    let sortBy = req.param('sortBy');
    let page = req.param('page') || 1;
    let count = req.param('count') || 10;
    let role = req.param('role');
    let user_id = req.param('user_id');
    let skipNo = (page - 1) * count;
    let query = {};

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

    query._id = { $ne: null }

    if (role) {
        query.role = role;
    }

    if (user_id) {
        query.user_id = new ObjectId(user_id);
    }

    query.role = { $nin: ["admin"] }

    // db.collection("permissions").aggregate([
    //     {
    //         $project: {
    //             id: "$_id",
    //             user_id: "$user_id",
    //             role: "$role",

    //             client_disabled: "$client_disabled",
    //             client_read: "$client_read",
    //             client_write: "$client_write",

    //             client_company_disabled: "$client_company_disabled",
    //             client_company_read: "$client_company_read",
    //             client_company_write: "$client_company_write",

    //             client_staff_disabled: "$client_staff_disabled",
    //             client_staff_read: "$client_staff_read",
    //             client_staff_write: "$client_staff_write",


    //             company_employees_disabled: "$company_employees_disabled",
    //             company_employees_read: "$company_employees_read",
    //             company_employees_write: "$company_employees_write",

    //             compliances_disabled: "$compliances_disabled",
    //             compliances_read: "$compliances_read",
    //             compliances_write: "$compliances_write",

    //             statelaw_disabled: "$statelaw_disabled",
    //             statelaw_read: "$statelaw_read",
    //             statelaw_write: "$statelaw_write",

    //             project_disabled: "$project_disabled",
    //             project_read: "$project_read",
    //             project_write: "$project_write",

    //             task_disabled: "$task_disabled",
    //             task_read: "$task_read",
    //             task_write: "$task_write",

    //             addedBy: "$addedBy",
    //             updatedBy: "$updatedBy",
    //             updatedAt: "$updatedAt",
    //             createdAt: "$createdAt",
    //         },
    //     },
    //     {
    //         $match: query,
    //     },
    //     {
    //         $sort: sortquery
    //     },
    // ]).toArray((err, totalResult) => {
    //     db.collection("permissions")
    //         .aggregate([
    //             {
    //                 $project: {
    //                     id: "$_id",
    //                     user_id: "$user_id",
    //                     role: "$role",

    //                     client_disabled: "$client_disabled",
    //                     client_read: "$client_read",
    //                     client_write: "$client_write",

    //                     client_company_disabled: "$client_company_disabled",
    //                     client_company_read: "$client_company_read",
    //                     client_company_write: "$client_company_write",

    //                     client_staff_disabled: "$client_staff_disabled",
    //                     client_staff_read: "$client_staff_read",
    //                     client_staff_write: "$client_staff_write",


    //                     company_employees_disabled: "$company_employees_disabled",
    //                     company_employees_read: "$company_employees_read",
    //                     company_employees_write: "$company_employees_write",

    //                     compliances_disabled: "$compliances_disabled",
    //                     compliances_read: "$compliances_read",
    //                     compliances_write: "$compliances_write",

    //                     statelaw_disabled: "$statelaw_disabled",
    //                     statelaw_read: "$statelaw_read",
    //                     statelaw_write: "$statelaw_write",

    //                     project_disabled: "$project_disabled",
    //                     project_read: "$project_read",
    //                     project_write: "$project_write", project_disabled: "$project_disabled",
    //                     project_read: "$project_read",
    //                     project_write: "$project_write",

    //                     task_disabled: "$task_disabled",
    //                     task_read: "$task_read",
    //                     task_write: "$task_write",

    //                     task_disabled: "$task_disabled",
    //                     task_read: "$task_read",
    //                     task_write: "$task_write",

    //                     addedBy: "$addedBy",
    //                     updatedBy: "$updatedBy",
    //                     updatedAt: "$updatedAt",
    //                     createdAt: "$createdAt",
    //                 },
    //             },
    //             {
    //                 $match: query,
    //             },
    //             {
    //                 $sort: sortquery
    //             },
    //             {
    //                 $skip: skipNo,
    //             },
    //             {
    //                 $limit: Number(count),
    //             },

    //         ])
    //         .toArray((err, result) => {
    //             if (err) {
    //                 return response.failed(null, `${err}`, req, res);
    //             } else {


    //                 let resData = {
    //                     total_count: totalResult.length,
    //                     data: result
    //                 }
    //                 return response.success(resData, constants.PERMISSIONS.FETCHED, req, res);
    //             }
    //         });
    // });


    // Pipeline Stages
    let pipeline = [];

    let projection = {
        $project: {
            id: "$_id",
            user_id: "$user_id",
            role: "$role",

            affiliate_disabled: "$affiliate_disabled",
            affiliate_read: "$affiliate_read",
            affiliate_write: "$affiliate_write",

            brand_disabled: "$brand_disabled",
            brand_read: "$brand_read",
            brand_write: "$brand_write",

            addedBy: "$addedBy",
            updatedBy: "$updatedBy",
            updatedAt: "$updatedAt",
            isDeleted: "$isDeleted",
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
    // Pipeline Stages
   let  totalresult  = await db.collection('permissions').aggregate(pipeline).toArray();
        pipeline.push({
            $skip: Number(skipNo)
        });
        pipeline.push({
            $limit: Number(count)
        });
        let result=await  db.collection("permissions").aggregate(pipeline).toArray();
            let resData = {
                total_count: totalresult ? totalresult.length : 0,
                data: result ? result : [],
            }
            if (!req.param('page') && !req.param('count')) {
                resData.data = totalresult ? totalresult : [];
            }
            return response.success(resData, constants.PERMISSIONS.FETCHED, req, res);

      

};

exports.editPermission = async (req, res) => {
    try {

        let validation_result = await Validations.Permission.editPermission(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        if (req.identity.role != "admin") {
            throw constants.COMMON.UNAUTHORIZED;
        }

        if (req.body.affiliate_disabled) {
            req.body.affiliate_read = false;
            req.body.affiliate_write = false;
        } else if (req.body.affiliate_write) {
            req.body.affiliate_read = true;
            req.body.affiliate_disabled = false;
        }

        if (req.body.brand_disabled) {
            req.body.brand_read = false;
            req.body.brand_write = false;
        } else if (req.body.brand_write) {
            req.body.brand_read = true;
            req.body.brand_disabled = false;
        }

        req.body.updatedBy = req.identity.id;
        let update_permission = await Permissions.updateOne({ id: req.body.id }, req.body);
        if (update_permission) {
            return response.success(null, constants.PERMISSIONS.UPDATED, req, res);
        }
        throw constants.PERMISSIONS.INVALID_ID;
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.getPermissionByUserId = async (req, res) => {
    try {

        let user_id = req.query.user_id
        if (!user_id) {
            throw constants.PERMISSIONS.USER_ID_REQUIRED;
        }

        let get_permission = await Permissions.findOne({ user_id: user_id });
        if (get_permission) {
            return response.success(get_permission, constants.PERMISSIONS.FETCHED, req, res);
        }
        throw constants.PERMISSIONS.INVALID_USER_ID;
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

