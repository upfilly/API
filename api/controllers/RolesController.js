/**
 * InfluencersController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const response = require('../services/Response')
const constants = require('../../config/constants').constants;
const db = sails.getDatastore().manager
const Services = require('../services/index');
const ObjectId = require('mongodb').ObjectId;

exports.getAllRoles = async (req, res) => {
    try {
        let page = req.param('page') || 1;
        let count = req.param('count') || 10;
        let { search, sortBy } = req.query;
        let skipNo = (Number(page) - 1) * Number(count);

        let query = {};

        if (search) {
            search = await Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { role: { $regex: search, '$options': 'i' } },
            ]
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


        let pipeline = [];

        let projection = {
            $project: {
                id: "$_id",
                role: "$role",
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
        let totalResult   = await db.collection('roles').aggregate(pipeline).toArray();
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });

            let result = await  db.collection('roles').aggregate(pipeline).toArray();
                let resData = {
                    total: totalResult ? totalResult.length : 0,
                    data: result ? result : []
                }
                return response.success(resData, constants.COMMON.SUCCESS, req, res);
          

    } catch (error) {
        return response.failed(null, `${error}`, req, res)
    }
}

exports.getRoleById = async (req, res) => {
    try {
        let { id } = req.query;
        if (!id) {
            throw constants.SPA.ID_REQUIRED;
        }

        let get_role = await Roles.findOne({ id: id });
        if (get_role) {
            return response.success(get_role, constants.COMMON.SUCCESS, req, res);
        }

        throw constants.COMMON.INVALID_ID;
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}
