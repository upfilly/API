/**
 * AnalyticsController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */


const Services = require('../services/index');
const constants = require('../../config/constants').constants;
const response = require("../services/Response");
const db = sails.getDatastore().manager;
const ObjectId = require('mongodb').ObjectId;

// exports.salesAnalytics = async function (req, res) {
//     try {
//         let query = {};
//         let count = req.param('count') || 10;
//         let page = req.param('page') || 1;
//         let skipNo = (Number(page) - 1) * Number(count);
//         let { search, sortBy, status, isDeleted, format, addedBy } = req.query;
//         let sortquery = {};

//         // Handle search
//         if (search) {
//             search = Services.Utils.remove_special_char_exept_underscores(search);
//             query.$or = [
//                 { event: { $regex: search, '$options': 'i' } },
//                 { 'urlParams.page': { $regex: search, '$options': 'i' } },
//                 { 'data.page': { $regex: search, '$options': 'i' } }
//             ];
//         }

//         // Handle isDeleted
//         if (isDeleted) {
//             query.isDeleted = isDeleted === 'true';
//         } else {
//             query.isDeleted = false;
//         }

//         // Handle sorting
//         if (sortBy) {
//             let typeArr = sortBy.split(" ");
//             let sortType = typeArr[1];
//             let field = typeArr[0];
//             sortquery[field ? field : 'createdAt'] = sortType === 'desc' ? -1 : 1;
//         } else {
//             sortquery = { createdAt: -1 };
//         }

//         // Handle status
//         if (status) {
//             query.status = status;
//         }

//         if (brand_id) {
//             query.brand_id = new ObjectId(brand_id);
//         }

//         // Handle format
//         if (format) {
//             query.format = format;
//         }

//         let pipeline = [];

//         let projection = {
//             $project: {
//                 affiliate_id: "$affiliate_id",
//                 brand_id: "$brand_id",
//                 order_id: "$order_id",
//                 currency: "$currency",
//                 price: "$price",

//                 event: '$event',
//                 timestamp: '$timestamp',
//                 urlParams: '$urlParams',
//                 data: '$data',
//                 isDeleted: '$isDeleted',
//                 status: '$status',
//                 addedBy: '$addedBy',
//                 updatedBy: '$updatedBy',
//                 updatedAt: '$updatedAt',
//                 createdAt: '$createdAt',
//                 month: { $month: "$createdAt" },
//             }
//         };

//         pipeline.push(projection);
//         pipeline.push({
//             $match: query
//         });
//         pipeline.push({
//             $sort: sortquery
//         });

//         let totalresult = await db.collection('affiliatelink').aggregate(pipeline).toArray();


//         pipeline.push({
//             $skip: Number(skipNo)
//         });
//         pipeline.push({
//             $limit: Number(count)
//         });

//         let result = await db.collection('affiliatelink').aggregate(pipeline).toArray();


//         let resData = {
//             total_count: totalresult ? totalresult.length : 0,
//             data: result ? result : []
//         };

//         if (!req.param('page') && !req.param('count')) {
//             resData.data = totalresult ? totalresult : [];
//         }

//         return response.success(resData, constants.AFFILIATELINK.FETCHED, req, res);
//     } catch (error) {
//         return response.failed(null, `${error}`, req, res);
//     }
// };

exports.salesAnalytics = async (req, res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let skipNo = (Number(page) - 1) * Number(count);
        let { search, sortBy, status, isDeleted, format, brand_id, affiliate_id, campaignId, startDate, endDate } = req.query;
        let sortquery = {};

        // Handle search
        if (search) {
            search = Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { event: { $regex: search, '$options': 'i' } },
                { 'urlParams.page': { $regex: search, '$options': 'i' } },
                { 'data.page': { $regex: search, '$options': 'i' } }
            ];
        }

        // Handle isDeleted
        if (isDeleted) {
            query.isDeleted = isDeleted === 'true';
        } else {
            query.isDeleted = false;
        }

        // Handle sorting
        if (sortBy) {
            let typeArr = sortBy.split(" ");
            let sortType = typeArr[1];
            let field = typeArr[0];
            sortquery[field ? field : 'createdAt'] = sortType === 'desc' ? -1 : 1;
        } else {
            sortquery = { createdAt: -1 };
        }

        // Handle status
        if (status) {
            query.status = status;
        }

        let group_query = {};
        if (brand_id) {
            group_query.brand_id = "$brand_id";
            query.brand_id = {$in: brand_id.split(",").map(id=>new ObjectId(id))};
        }

        if (affiliate_id) {
            group_query.affiliate_id = "$affiliate_id";
            query.affiliate_id = {$in: affiliate_id.split(",").map(id=>new ObjectId(id))};
        }

        if(campaignId) {
            group_query.campaignId = "$campaignId";
            query.campaignId = {$in: campaignId.split(",").map(id=>new ObjectId(id))};;
        }

        // Handle format
        if (format) {
            query.format = format;
        }
        
        if(startDate && endDate) {
            startDate = new Date(startDate);
            endDate = new Date(endDate);
            query.createdAt = { $gte: startDate, $lte: endDate };
        }

        let pipeline = [

            {
                $project: {
                    id: "$_id",
                    affiliate_id: "$affiliate_id",
                    brand_id: "$brand_id",
                    order_id: "$order_id",
                    currency: "$currency",
                    price: "$price",
                    campaignId: "$campaignId",
                    discount: "$discount",
                    event: '$event',
                    timestamp: '$timestamp',
                    urlParams: '$urlParams',
                    data: '$data',
                    isDeleted: '$isDeleted',
                    status: '$status',
                    addedBy: '$addedBy',
                    updatedBy: '$updatedBy',
                    updatedAt: '$updatedAt',
                    createdAt: '$createdAt',
                    month: { $month: "$createdAt" },
                }
            },
            {
                $match: query
            },
            {
                $facet: {
                    total_docs: [
                        { $count: "total_docs" }
                    ],
                    headers: [
                        {
                            $group: {
                                _id: {
                                    month: "$month",
                                }
                            },
                            $group: {
                                _id: {
                                    month: "$month",
                                },

                                month: { $first: "$month" }

                            }
                        },
                        {
                            $unset: ['_id']
                        }
                    ],
                    data: [
                        {
                            $group: {
                                _id: {
                                    month: "$month"
                                },
                                price: { $sum: '$price' },
                                click_count: {$sum: 1}
                            },

                        },
                        // {
                        //     $unset: ['_id']
                        // },
                        {
                            $skip: Number(skipNo)
                        },
                        {

                            $limit: Number(count)
                        }
                    ],
                    summary: [
                        {
                            $group: {
                                _id: group_query,
                                price: { $sum: '$price' },
                                click_count: { $sum: 1}
                            }
                        },
                        // {
                        //     $unset: ['_id']
                        // }
                    ]

                }
            },
            {
                $addFields: {
                    total_docs: { $arrayElemAt: ["$total_docs", 0] }
                }
            }
        ];

        let projection = {
            $project: {
                _id: "$_id",
                headers: "$headers",
                data: "$data",
                summary: "$summary"

            }

        };

        pipeline.push(projection);

        pipeline.push({ $sort: sortquery });

        let totalResult = await db.collection('affiliatelink').aggregate(pipeline, { allowDiskUse: true }).toArray();
        // pipeline.push({
        //     $skip: Number(skipNo)
        // });
        // pipeline.push({
        //     $limit: Number(count)
        // });

        let result = await db.collection('affiliatelink').aggregate(pipeline, { allowDiskUse: true }).toArray()
        let resData = {
            total: totalResult ? totalResult.length : 0,
            data: result ? result : []
        }
        if (!req.param('page') && !req.param('count')) {
            resData.data = totalResult ? totalResult : []
        }
        return Response.success(resData, constants.COMMON.SUCCESS, req, res);
    } catch (error) {
        console.error(error, "=================err");
        return Response.failed(null, `${error}`, req, res);
    }
};

exports.reportAnalytics = async(req,res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let skipNo = (Number(page) - 1) * Number(count);
        let { search, sortBy, status, isDeleted,  brand_id, affiliate_id, startDate2, endDate2, startDate, endDate } = req.query;
        let sortquery = {};
        let new_query = {}

        // Handle search
        if (search) {
            search = Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { event: { $regex: search, '$options': 'i' } },
                { 'urlParams.page': { $regex: search, '$options': 'i' } },
                { 'data.page': { $regex: search, '$options': 'i' } }
            ];
        }

        // Handle isDeleted
        if (isDeleted) {
            query.isDeleted = isDeleted === 'true';
        } else {
            query.isDeleted = false;
        }

      

        // Handle status
        if (status) {
            query.status = status;
        }

        if(startDate && endDate) {
            startDate = new Date(startDate);
            endDate = new Date(endDate);
            query.createdAt = { $gte: startDate, $lte: endDate };
        }
        

        if(affiliate_id){
            query.affiliate_id = new ObjectId(affiliate_id)
        }

        if(brand_id){
            query.brand_id = new ObjectId(brand_id)
        }

        new_query = {...query}

        if(startDate2 && endDate2) {
            startDate2 = new Date(startDate2);
            endDate2 = new Date(endDate2);
            new_query.createdAt = { $gte: startDate2, $lte: endDate2 };
        }
        // console.log(query,'query')
        // console.log(new_query,'new_query')
        let pipeline = [

            {
                $project: {
                    id: "$_id",
                    affiliate_id: "$affiliate_id",
                    brand_id: "$brand_id",
                    order_id: {$cond : {if:"$order_id",then:"$order_id",else : null}},
                    currency: "$currency",
                    price: "$price",
                    campaignId: "$campaignId",
                    discount: "$discount",
                    event: '$event',
                    // timestamp: '$timestamp',
                    // urlParams: '$urlParams',
                    // data: '$data',
                    isDeleted: '$isDeleted',
                    status: '$status',
                    addedBy: '$addedBy',
                    updatedBy: '$updatedBy',
                    updatedAt: '$updatedAt',
                    createdAt: '$createdAt',
                    day: { $dayOfMonth: "$createdAt" },
                }
            },
            {
                $match: query
            },
            {
                $facet: {
                    total_docs: [
                        { $count: "total_docs" }
                    ],
                    revenue: [
                        {
                            // $group: {
                            //     _id: {
                            //         day: "$createdAt",
                            //     }
                            // },
                            $group: {
                                _id: {
                                    day: "$day",
                                },
                                price: { $sum: "$price" },
                                // affiliate_id:{$first:"$affiliate_id"},
                                createdAt : {$first:"$createdAt"},
                                // day: { $first: "$day" }

                            }
                        },
                        // {
                        //     $unset: ['_id']
                        // }
                    ],
                    actions: [
                        {
                            $group: {
                                _id: {
                                    day: "$day"
                                },
                                // price: { $sum: '$price' },
                                createdAt : {$first:"$createdAt"},
                                order_id : {$first:"$order_id"},
                                action: {$sum: { 
                                    $cond: { if: { $ne : ["$order_id", ""] }, then: 1, else: 0 } 
                                } }
                            },

                        },
                        // {
                        //     $unset: ['_id']
                        // },
                        {
                            $skip: Number(skipNo)
                        },
                        {

                            $limit: Number(count)
                        }
                    ],

                }
            },
            {
                $addFields: {
                    total_docs: { $arrayElemAt: ["$total_docs", 0] }
                }
            }
        ];

        let pipeline2 = [

            {
                $project: {
                    id: "$_id",
                    affiliate_id: "$affiliate_id",
                    brand_id: "$brand_id",
                    order_id: {$cond : {if:"$order_id",then:"$order_id",else : null}},
                    currency: "$currency",
                    price: "$price",
                    campaignId: "$campaignId",
                    discount: "$discount",
                    event: '$event',
                    // timestamp: '$timestamp',
                    // urlParams: '$urlParams',
                    // data: '$data',
                    isDeleted: '$isDeleted',
                    status: '$status',
                    addedBy: '$addedBy',
                    updatedBy: '$updatedBy',
                    updatedAt: '$updatedAt',
                    createdAt: '$createdAt',
                    day: { $dayOfMonth: "$createdAt" },
                }
            },
            {
                $match: new_query
            },
            {
                $facet: {
                    total_docs: [
                        { $count: "total_docs" }
                    ],
                    revenue: [
                        {
                            // $group: {
                            //     _id: {
                            //         day: "$createdAt",
                            //     }
                            // },
                            $group: {
                                _id: {
                                    day: "$day",
                                },
                                price: { $sum: "$price" },
                                // affiliate_id:{$first:"$affiliate_id"},
                                createdAt : {$first:"$createdAt"},
                                // day: { $first: "$day" }

                            }
                        },
                        // {
                        //     $unset: ['_id']
                        // }
                    ],
                    actions: [
                        {
                            $group: {
                                _id: {
                                    day: "$day"
                                },
                                // price: { $sum: '$price' },
                                createdAt : {$first:"$createdAt"},
                                order_id : {$first:"$order_id"},
                                action: {$sum: { 
                                    $cond: { if: { $ne : ["$order_id", ""] }, then: 1, else: 0 } 
                                } }
                            },

                        },
                        // {
                        //     $unset: ['_id']
                        // },
                        {
                            $skip: Number(skipNo)
                        },
                        {

                            $limit: Number(count)
                        }
                    ],

                }
            },
            {
                $addFields: {
                    total_docs: { $arrayElemAt: ["$total_docs", 0] }
                }
            }
        ];

        let projection = {
            $project: {
                _id: "$_id",
                revenue: "$revenue",
                actions: "$actions",
                // summary: "$summary"

            }

        };

        pipeline.push(projection);

        pipeline2.push(projection);

        let totalResult = await db.collection('affiliatelink').aggregate(pipeline, { allowDiskUse: true }).toArray();

        let totalResult2 = await db.collection('affiliatelink').aggregate(pipeline2, { allowDiskUse: true }).toArray();
        
      


        // let result = await db.collection('affiliatelink').aggregate(pipeline, { allowDiskUse: true }).toArray()

        // let result2 = await db.collection('affiliatelink').aggregate(pipeline2, { allowDiskUse: true }).toArray()

        // console.log(totalResult,"resultresultresultresultresult")
        let resData = {
            total: totalResult ? totalResult.length : 0,
            data: totalResult ? totalResult : [],
            total2 : totalResult2 ? totalResult2.length : 0,
            data2 : totalResult ? totalResult : 0
        }
        if (!req.param('page') && !req.param('count')) {
            resData.data = totalResult ? totalResult : []
        }

        return Response.success(resData, constants.COMMON.SUCCESS, req, res);

    } catch (error) {
        console.error(error, "=================err");
        return Response.failed(null, `${error}`, req, res);
    }
}

exports.clickAnalytics = async(req,res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let skipNo = (Number(page) - 1) * Number(count);
        let { search,  isDeleted,   affiliate_id, startDate2, endDate2, startDate, endDate } = req.query;
        let new_query = {}

        // Handle search
        if (search) {
            search = Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { event: { $regex: search, '$options': 'i' } },
                { 'urlParams.page': { $regex: search, '$options': 'i' } },
                { 'data.page': { $regex: search, '$options': 'i' } }
            ];
        }

        // Handle isDeleted
        if (isDeleted) {
            query.isDeleted = isDeleted === 'true';
        } else {
            query.isDeleted = false;
        }

        if(startDate && endDate) {
            startDate = new Date(startDate);
            endDate = new Date(endDate);
            query.createdAt = { $gte: startDate, $lte: endDate };
        }
    
        if(affiliate_id){
            query.affiliate_id = new ObjectId(affiliate_id)
        }

        // if(brand_id){
        //     query.brand_id = new ObjectId(brand_id)
        // }

        new_query = {...query}

        if(startDate2 && endDate2) {
            startDate2 = new Date(startDate2);
            endDate2 = new Date(endDate2);
            new_query.createdAt = { $gte: startDate2, $lte: endDate2 };
        }
        // console.log(query,'query')
        // console.log(new_query,'new_query')
        let pipeline = [
            {
                $project: {
                    id: "$_id",
                    affiliate_id: "$affiliate_id",
                    isDeleted: '$isDeleted',
                    updatedBy: '$updatedBy',
                    updatedAt: '$updatedAt',
                    createdAt: '$createdAt',
                    day: { $dayOfMonth: "$createdAt" },
                }
            },
            {
                $match: query
            },
            {
                $facet: {
                    total_docs: [
                        { $count: "total_docs" }
                    ],
                    clicks: [
                        {
                            $group: {
                                _id: {
                                    day: "$day"
                                },
                                // price: { $sum: '$price' },
                                createdAt : {$first:"$createdAt"},
                                count:  {$sum: { 
                                    $cond: { if: { $ne : ["$affiliate_id", ""] }, then: 1, else: 0 } 
                                } }
                            },

                        },
                       
                    ],

                }
            },
            {
                $addFields: {
                    total_docs: { $arrayElemAt: ["$total_docs", 0] }
                }
            }
        ];

        let pipeline2 = [
            {
                $project: {
                    id: "$_id",
                    affiliate_id: "$affiliate_id",
                    isDeleted: '$isDeleted',
                    updatedBy: '$updatedBy',
                    updatedAt: '$updatedAt',
                    createdAt: '$createdAt',
                    day: { $dayOfMonth: "$createdAt" },
                }
            },
            {
                $match: new_query
            },
            {
                $facet: {
                    total_docs: [
                        { $count: "total_docs" }
                    ],
                    clicks: [
                        {
                            $group: {
                                _id: {
                                    day: "$day"
                                },
                                // price: { $sum: '$price' },
                                createdAt : {$first:"$createdAt"},
                                count: {$sum: { 
                                    $cond: { if: { $ne : ["$affiliate_id", ""] }, then: 1, else: 0 } 
                                } }
                            },

                        },
                       
                    ],

                }
            },
            {
                $addFields: {
                    total_docs: { $arrayElemAt: ["$total_docs", 0] }
                }
            }
        ];

        let projection = {
            $project: {
                _id: "$_id",
                clicks: "$clicks",
            }

        };

        pipeline.push(projection);

        pipeline2.push(projection);

        let totalResult = await db.collection('cookies').aggregate(pipeline, { allowDiskUse: true }).toArray();

        let totalResult2 = await db.collection('cookies').aggregate(pipeline2, { allowDiskUse: true }).toArray();
        
      


        // let result = await db.collection('cookies').aggregate(pipeline, { allowDiskUse: true }).toArray()

        // let result2 = await db.collection('cookies').aggregate(pipeline2, { allowDiskUse: true }).toArray()

        // console.log(totalResult,"resultresultresultresultresult")
        let resData = {
            total: totalResult ? totalResult.length : 0,
            data: totalResult ? totalResult : [],
            total2 : totalResult2 ? totalResult2.length : 0,
            data2 : totalResult2 ? totalResult2 : 0
        }
        if (!req.param('page') && !req.param('count')) {
            resData.data = totalResult ? totalResult : []
        }

        return Response.success(resData, constants.COMMON.SUCCESS, req, res);

    } catch (error) {
        console.error(error, "=================err");
        return Response.failed(null, `${error}`, req, res);
    }
}

