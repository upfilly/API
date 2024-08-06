/**
 * CountriesController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */


const response = require('../services/Response')
const constants = require('../../config/constants').constants;
const db = sails.getDatastore().manager
const ObjectId = require('mongodb').ObjectId;
const Services = require('../services/index');

exports.getAllCountries = async (req, res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let { search, sortBy } = req.query;

        skipNo = (Number(page - 1)) * Number(count);

        if (search) {
            search = Services.Utils.make_starts_with_regex(search)
            query.$or = [
                { name: { $regex: search, '$options': 'i' } },
            ]
        }
        let sortquery = {};
        if (sortBy) {
            let typeArr = [];
            typeArr = sortBy.split(" ");
            let sortType = typeArr[1];
            let field = typeArr[0];
            sortquery[field ? field : 'name'] = sortType ? (sortType == 'desc' ? -1 : 1) : -1;
        } else {
            sortquery = { name: 1 }
        }

        let pipeline = [];

        let projection = {
            $project: {
                id: "$_id",
                name: "$name"
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

        let totalresult=await   db.collection('countries').aggregate(pipeline).toArray();
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            let result=await  db.collection("countries").aggregate(pipeline).toArray();
                let resData = {
                    data: result ? result : [],
                    total_count: totalresult ? totalresult.length : 0
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalresult ? totalresult : [];
                }
                return response.success(resData, constants.COMMON.SUCCESS, req, res);

    }
    catch (error) {
        return response.failed(null, `${error}`, req, res)
    }
}

