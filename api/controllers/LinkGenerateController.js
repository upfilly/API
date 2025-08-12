/**
 * LinkGenerateController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const constants = require("../../config/constants").constants;
const response = require("../services/Response");
const Validations = require("../Validations/index");
const db = sails.getDatastore().manager;
const Services = require("../services/index");
const ObjectId = require("mongodb").ObjectId;
const Emails = require("../Emails/index");

exports.addLinkGenerate = async (req, res) => {
  try {
    let validation_result = await Validations.LinkGenerate.addLinkGenerate(
      req,
      res
    );

    if (validation_result && !validation_result.success) {
      throw validation_result.message;
    }

    if (req.body.linkName) {
      req.body.linkName = req.body.linkName.toLowerCase();
    }

    let get_link = await LinkGenerate.findOne({
      linkName: req.body.linkName,
      isDeleted: false,
    });
    if (get_link) {
      throw constants.LINKGENERATE.ALREADY_EXIST;
    }

    req.body.startDate = new Date(req.body.startDate);
    req.body.endDate = new Date(req.body.endDate);

    req.body.addedBy = req.identity.id;

    await LinkGenerate.create(req.body).fetch();

    return response.success(null, constants.LINKGENERATE.ADDED, req, res);
  } catch (error) {
    console.log(error, "==error");
    return response.failed(null, `${error}`, req, res);
  }
};

exports.getByIdLinkGenerate = async (req, res) => {
  try {
    let id = req.param("id");
    if (!id) {
      throw constants.LINKGENERATE.ID_REQUIRED;
    }

    let get_link = await LinkGenerate.findOne({ id: id }).populate("addedBy");
    if (!get_link) {
      throw constants.LINKGENERATE.NOT;
    }
    let categoryDetail = await CommonCategories.find({where:{id:{in:get_link.category}}})
    let uniqueValue = {...get_link,category:categoryDetail || []}
    return response.success(uniqueValue, constants.LINKGENERATE.FETCHED, req, res);
  } catch (error) {
    console.log("error", error);
    return response.failed(null, `${error}`, req, res);
  }
};

exports.updateLinkGenerate = async (req, res) => {
  try {
    let validation_result = await Validations.LinkGenerate.editLinkGenerate(
      req,
      res
    );

    if (validation_result && !validation_result.success) {
      throw validation_result.message;
    }

    let idCheck = await LinkGenerate.findOne({
      id: req.body.id,
      isDeleted: false,
    });

    if (!idCheck) {
      throw constants.LINKGENERATE.NOT;
    }

    if (req.body.linkName) {
      req.body.linkName = req.body.linkName.toLowerCase();
      let get_link = await LinkGenerate.findOne({
        linkName: req.body.linkName,
        isDeleted: false,
        id: { "!=": req.body.id },
      });
      if (get_link) {
        throw constants.LINKGENERATE.ALREADY_EXIST;
      }
    }
    if (req.body.startDate) {
      req.body.startDate = new Date(req.body.startDate);
    }
    if (req.body.endDate) {
      req.body.endDate = new Date(req.body.endDate);
    }

    req.body.updatedBy = req.identity.id;

    delete req.body.id;

    let linkUpdate = await LinkGenerate.updateOne({ id: idCheck.id }).set(
      req.body
    );

    return response.success(
      linkUpdate,
      constants.LINKGENERATE.UPDATED,
      req,
      res
    );
  } catch (error) {
    console.log(error, "==error");
    return response.failed(null, `${error}`, req, res);
  }
};

exports.deleteLinkGenerate = async (req, res) => {
  try {
    const id = req.param("id") || req.query.id;
    if (!id) {
      throw constants.LINKGENERATE.ID_REQUIRED;
    }
    let idCheck = await LinkGenerate.findOne({ id: id, isDeleted: false });

    if (!idCheck) {
      throw constants.LINKGENERATE.NOT;
    }

    await LinkGenerate.updateOne(
      { id: idCheck.id },
      { isDeleted: true, updatedBy: req.identity.id }
    );
    return response.success(null, constants.LINKGENERATE.DELETE, req, res);
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};

exports.getAllLinkGenerate = async (req, res) => {
  try {
    let query = {};
    let count = req.param("count") || 10;
    let page = req.param("page") || 1;

    let {
      search,
      sortBy,
      isDeleted,
      addedBy,
      startDate,
      endDate,
      seo,
      deepLink,
      category,
      status,
    } = req.query;

    let skipNo = Number(page - 1) * Number(count);

    if (search) {
      query.$or = [
        { linkName: { $regex: search, $options: "i" } },
        { destinationUrl: { $regex: search, $options: "i" } },
      ];
    }

    if (isDeleted) {
      query.isDeleted = isDeleted === "true";
    } else {
      query.isDeleted = false;
    }

    let sortquery = {};
    if (sortBy) {
      let [field, order] = sortBy.split(" ");
      sortquery[field || "createdAt"] = order === "desc" ? -1 : 1;
    } else {
      sortquery = { updatedAt: -1 };
    }

    if (addedBy) query.addedBy = new ObjectId(addedBy);
    if (seo) query.seo = seo === "true";
    if (deepLink) query.deepLink = deepLink === "true";
    if (category) query.category = { $in: [category] };

    let statusFilter = null;
    if (status) {
      statusFilter = status;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const endD = new Date(endDate);
      start.setUTCHours(0, 0, 0, 0);
      endD.setUTCHours(23, 59, 59, 999);
      query.startDate = { $gte: start };
      query.endDate = { $lte: endD };
    }

    let pipeline = [
      {
        $lookup: {
          from: "commoncategories",
          let: {
            category_ids: {
              $cond: {
                if: { $isArray: "$category" },
                then: {
                  $map: {
                    input: "$category",
                    as: "id",
                    in: { $toObjectId: "$$id" },
                  },
                },
                else: [],
              },
            },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$category_ids"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                cat_type: 1,
              },
            },
          ],
          as: "categoryDetails",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "addedBy",
          foreignField: "_id",
          as: "addedBy_details",
        },
      },
      {
        $unwind: {
          path: "$addedBy_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          isExpired: {
            $cond: [
              {
                $and: [
                  { $ne: ["$endDate", null] },
                  { $lt: ["$endDate", new Date()] },
                ],
              },
              true,
              false,
            ],
          },
          status: {
            $cond: [
              {
                $and: [
                  { $ne: ["$endDate", null] },
                  { $lt: ["$endDate", new Date()] },
                ],
              },
              "deactive",
              "$status",
            ],
          },
        },
      },
      {
        $project: {
          id: "$_id",
          linkName: "$linkName",
          destinationUrl: "$destinationUrl",
          description: "$description",
          startDate: "$startDate",
          endDate: "$endDate",
          seo: "$seo",
          deepLink: "$deepLink",
          category: "$category",
          categroyDetails: "$categoryDetails",
          isDeleted: "$isDeleted",
          createdAt: "$createdAt",
          updatedAt: "$updatedAt",
          addedBy: "$addedBy",
          status: "$status",
          isExpired: "$isExpired",
        },
      },
      {
        $match: query,
      },
    ];

    if (statusFilter) {
      pipeline.push({
        $match: { status: statusFilter },
      });
    }

    pipeline.push({ $sort: sortquery });

    let totalresult = await db
      .collection("linkgenerate")
      .aggregate([...pipeline])
      .toArray();

    pipeline.push({ $skip: Number(skipNo) });
    pipeline.push({ $limit: Number(count) });

    let result = await db
      .collection("linkgenerate")
      .aggregate(pipeline)
      .toArray();

    let resData = {
      data: result || [],
      total_count: totalresult ? totalresult.length : 0,
    };

    if (!req.param("page") && !req.param("count")) {
      resData.data = totalresult || [];
    }

    return response.success(
      resData,
      constants.LINKGENERATE.FETCHED,
      req,
      res
    );
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};

// exports.getAllLinkGenerate = async (req, res) => {
//   try {
//     let query = {};
//     let count = req.param("count") || 10;
//     let page = req.param("page") || 1;
//     let {
//       search,
//       sortBy,
//       isDeleted,
//       addedBy,
//       startDate,
//       endDate,
//       seo,
//       deepLink,
//       category,
//       status,
//     } = req.query;

//     skipNo = Number(page - 1) * Number(count);

//     if (search) {
//       query.$or = [
//         { linkName: { $regex: search, $options: "i" } },
//         { destinationUrl: { $regex: search, $options: "i" } },
//       ];
//     }

//     if (isDeleted) {
//       query.isDeleted = isDeleted
//         ? isDeleted == "true"
//         : true
//         ? isDeleted
//         : false;
//     } else {
//       query.isDeleted = false;
//     }

//     let sortquery = {};
//     if (sortBy) {
//       let typeArr = [];
//       typeArr = sortBy.split(" ");
//       let sortType = typeArr[1];
//       let field = typeArr[0];
//       sortquery[field ? field : "createdAt"] = sortType
//         ? sortType == "desc"
//           ? -1
//           : 1
//         : -1;
//     } else {
//       sortquery = { updatedAt: -1 };
//     }

//     if (addedBy) query.addedBy = new ObjectId(addedBy);

//     if (seo) query.seo = seo === "true";
//     if (deepLink) query.deepLink = deepLink === "true";

//     if (status) query.status = status;

//     if (category) {
//   query.category = { $in: [category] }; 
//     }

//     if (startDate && endDate) {
//       const start = new Date(startDate);
//       const end = new Date(endDate);

//       start.setUTCHours(0, 0, 0, 0);

//       end.setUTCHours(23, 59, 59, 999);

//       query.startDate = { $gte: start };
//       query.endDate = { $lte: end };
//     }

//     let pipeline = [
//       {
//         $lookup: {
//           from: "commoncategories",
//           let: {
//             category_ids: {
//               $cond: {
//                 if: { $isArray: "$category" },
//                 then: {
//                   $map: {
//                     input: "$category",
//                     as: "id",
//                     in: { $toObjectId: "$$id" },
//                   },
//                 },
//                 else: [],
//               },
//             },
//           },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $in: ["$_id", "$$category_ids"] },
//                     { $eq: ["$isDeleted", false] },
//                   ],
//                 },
//               },
//             },
//             {
//               $project: {
//                 _id: 1,
//                 name: 1,
//                 cat_type: 1,
//               },
//             },
//           ],
//           as: "categoryDetails",
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "addedBy",
//           foreignField: "_id",
//           as: "addedBy_details",
//         },
//       },
//       {
//         $unwind: {
//           path: "$addedBy_details",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//     ];
//     let projection = {
//       $project: {
//         id: "$_id",
//         linkName: "$linkName",
//         destinationUrl: "$destinationUrl",
//         description: "$description",
//         startDate: "$startDate",
//         endDate: "$endDate",
//         seo: "$seo",
//         deepLink: "$deepLink",
//         category: "$category",
//         categroyDetails: "$categoryDetails",
//         isDeleted: "$isDeleted",
//         createdAt: "$createdAt",
//         updatedAt: "$updatedAt",
//         addedBy: "$addedBy",
//         status: "$status",
//         isExpired: "$isExpired",
//       },
//     };
//        pipeline.push({ $addFields: {
//         isExpired: {
//           $cond: [
//             {
//               $and: [
//                 { $ne: ["$endDate", null] },
//                 { $lt: ["$endDate", new Date()] },
//               ],
//             },
//             true,
//             false,
//           ],
//         },
//         status: {
//           $cond: [
//             {
//               $and: [
//                 { $ne: ["$endDate", null] },
//                 { $lt: ["$endDate", new Date()] },
//               ],
//             },
//             "deactive", 
//             "$status",
//           ],
//         },
//       },})
//     pipeline.push(projection);
//     pipeline.push({
//       $match: query,
//     });
//     pipeline.push({
//       $sort: sortquery,
//     });
//     let totalresult = await db
//       .collection("linkgenerate")
//       .aggregate(pipeline)
//       .toArray();
//     pipeline.push({
//       $skip: Number(skipNo),
//     });
//     pipeline.push({
//       $limit: Number(count),
//     });
//     let result = await db
//       .collection("linkgenerate")
//       .aggregate(pipeline)
//       .toArray();
//     let resData = {
//       data: result ? result : [],
//       total_count: totalresult ? totalresult.length : 0,
//     };
//     if (!req.param("page") && !req.param("count")) {
//       resData.data = totalresult ? totalresult : [];
//     }
//     return response.success(resData, constants.LINKGENERATE.FETCHED, req, res);
//   } catch (error) {
//     return response.failed(null, `${error}`, req, res);
//   }
// };
