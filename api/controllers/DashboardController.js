/**
 * DashboardController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const response = require("../services/Response");
const constants = require('../../config/constants').constants;
const db = sails.getDatastore().manager

exports.totalUsers = async (req, res) => {
    try {

        let query1 = { isDeleted: false, status: "active", role: "affiliate" };
        let query2 = { isDeleted: false, status: "active", role: "brand" };

        let get_total_affiliate = await Users.count(query1);
        let get_total_brands = await Users.count(query2);

        return res.status(200).json({
            sucess: true,
            totalAffiliates: get_total_affiliate ? get_total_affiliate : 0,
            totalBrands: get_total_brands ? get_total_brands : 0
        })

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.myTotalUsers = async (req, res) => {
    try {

        let query1 = { isDeleted: false, status: "active", role: "affiliate", addedBy: req.identity.id };
        let query2 = { isDeleted: false, status: "active", role: "brand", addedBy: req.identity.id };


        let get_my_affiliate = await Users.count(query1);
        let get_my_brands = await Users.count(query2);

        return res.status(200).json({
            sucess: true,
            myTotalAffiliates: get_my_affiliate ? get_my_affiliate : 0,
            myTotalBrands: get_my_brands ? get_my_brands : 0
        })

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.totalCampaigns = async (req, res) => {
    try {

        let get_total_campaigns = await Campaign.count({isDeleted: false});
        let get_my_total_campaigns = 0;
        let associated_affiliates_count = 0;
        if(req.param('brand_id')) {
            get_my_total_campaigns = await Campaign.count({ isDeleted: false, brand_id: req.param('brand_id') });
            let campaigns = await PublicPrivateCampaigns.find({
                isActive: true,
                brand_id: req.param('brand_id')
            }).populate('affiliate_id');
            
            let filteredCampaigns = campaigns.filter(c => c.affiliate_id && !c.affiliate_id.isDeleted);
            associated_affiliates_count = filteredCampaigns.length;
        }
            

        return res.status(200).json({
            sucess: true,
            totalCampaigns: get_total_campaigns ? get_total_campaigns : 0,
            myTotalCampaigns: get_my_total_campaigns ? get_my_total_campaigns : 0,
            associatedAffiliatesCount: associated_affiliates_count? associated_affiliates_count: 0
        });

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.recentUser = async (req, res) => {
    try {
        let page = req.param('page') || 1;
        let count = req.param('count') || 10;
        let { status, sortBy, lat, lng } = req.query;
        let skipNo = (Number(page) - 1) * Number(count);
        let query = { isDeleted: false };

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

        if (req.identity.role == 'admin') {
            query.role = { $nin: ['admin',] };
        } else {
            query.role = { $nin: ['admin'] };
        }

        query.status = "active";

        var currentDate = new Date();
        query.createdAt = {
            $gte: new Date(currentDate.setUTCHours(0, 0, 0, 0)),
            $lte: new Date(currentDate.setUTCHours(23, 59, 59, 59)),
        }

        // console.log(JSON.stringify(query), '===========query');
        let pipeline = [

        ];

        let projection = {
            $project: {
                id: "$_id",
                firstName: "$firstName",
                lastName: "$lastName",
                fullName: "$fullName",
                email: "$email",
                role: "$role",
                image: "$image",
                status: "$status",
                createdAt: "$createdAt",
                updatedAt: "$updatedAt",
                isDeleted: "$isDeleted",
                addedBy: "$addedBy"
            }
        };
        pipeline.push(projection);
        pipeline.push({
            $match: query
        });
        pipeline.push({
            $sort: sortquery
        });
        if (lat && lng) {
            pipeline.unshift({
                $geoNear: {
                    near: { type: "Point", coordinates: [Number(lng), Number(lat)] },
                    distanceField: "dist.calculated",
                    maxDistance: 200 * 1000,                // in km to meter
                    distanceMultiplier: 1 / 1000,           // in km
                    query: { isDeleted: false },
                    spherical: true
                }
            })
        }
        let totalResult= await db.collection('users').aggregate(pipeline).toArray();
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });

            let result = await db.collection('users').aggregate(pipeline).toArray();
                let resData = {
                    total: totalResult ? totalResult.length : 0,
                    data: result ? result : []
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalResult ? totalResult : []
                }
                return response.success(resData, constants.user.FETCHED_ALL, req, res);
          

    } catch (error) {
        // console.log(error, "---err");
        return response.failed(null, `${error}`, req, res)
    }
}

exports.totalCampaignsRequests = async (req, res) => {
    try {
        let acceptedRequestsCount = await PublicPrivateCampaigns.count({isDeleted: false, status: 'accepted', affiliate_id: req.param('affiliate_id')});
        let rejectedRequestsCount = await PublicPrivateCampaigns.count({isDeleted: false, status: 'rejected', affiliate_id: req.param('affiliate_id')});
        let pendingRequestsCount = await PublicPrivateCampaigns.count({isDeleted: false, status: 'pending', affiliate_id: req.param('affiliate_id'), source: "campaign"});
        let brandsAssociatedCount = await PublicPrivateCampaigns.count({isDeleted: false, isActive: true, affiliate_id: req.param('affiliate_id')});
        return res.status(200).json({
            sucess: true,
            acceptedRequestCount: acceptedRequestsCount? acceptedRequestsCount: 0,
            rejectedRequestsCount: rejectedRequestsCount? rejectedRequestsCount: 0,
            pendingRequestsCount: pendingRequestsCount? pendingRequestsCount: 0,
            brandsAssociatedCount: brandsAssociatedCount? brandsAssociatedCount: 0
        });

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}




