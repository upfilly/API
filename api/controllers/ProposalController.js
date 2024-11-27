/**
 * ProposalController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

// const response = require("../services/Response");
// const constants = require("../../config/constants").constants;
// const db = sails.getDatastore().manager;
// const Validations = require("../Validations/index");
// const Services = require("../services/index");
// const ObjectId = require("mongodb").ObjectId;
// const Emails = require("../Emails/index");

// module.exports = {
//   addproposal: async (req, res) => {
//     try {
//       let validation_result = await Validations.ProposalValidations.addProposal(
//         req,
//         res
//       );

//       if (validation_result && !validation_result.success) {
//         throw validation_result.message;
//       }

//       if (!["affiliate"].includes(req.identity.role)) {
//         throw constants.COMMON.UNAUTHORIZED;
//       }

//       let data = req.body;
//       data.addedBy = req.identity.id;
//       data.updatedBy = req.identity.id;

//       let query = {
//         description: data.description,
//         brand_id: data.brand_id,
//         isDeleted: false,
//       };
//       let existed_proposal = await Proposal.findOne(query);
//       if (existed_proposal) {
//         throw constants.PROPOSAL.ALREADY_EXIST;
//       }
//       let create_proposal = await Proposal.create(data).fetch();
//       if (create_proposal) {
//         let email_payload = {
//           brand_id: create_proposal.brand_id,
//           affiliate_id_id: req.identity.id,
//         };
//         await Emails.ProposalEmails.AddProposal(email_payload);
//         return res.status(200).json({
//           success: true,
//           message: constants.PROPOSAL.SAVED,
//         });
//       }
//     } catch (err) {
//       console.log(err, "===err");
//       return res.status(400).json({
//         success: false,
//         error: { message: err },
//       });
//     }
//   },

//   findSingleProposal: async (req, res) => {
//     try {
//       let id = req.param("id");
//       if (!id) {
//         throw constants.PROPOSAL.ID_REQUIRED;
//       }

//       let get_data = await Proposal.findOne({ id: id });

//       if (get_data) {
//         if (get_data.addedBy) {
//           let get_added_by_details = await Users.findOne({
//             id: get_data.addedBy,
//           });
//           if (get_added_by_details) {
//             get_data.addedBy_name = get_added_by_details.fullName;
//           }
//         }
//         if (get_data.updatedBy) {
//           let get_updated_by_details = await Users.findOne({
//             id: get_data.updatedBy,
//           });
//           if (get_updated_by_details) {
//             get_data.updatedBy_name = get_updated_by_details.fullName;
//           }
//         }
//         if (get_data.brand_id) {
//           let get_brand_details = await Users.findOne({
//             id: get_data.brand_id,
//           });
//           if (get_brand_details) {
//             get_data.brand_name = get_brand_details.fullName;
//           }
//         }
//         return res.status(200).json({
//           success: true,
//           message: constants.PROPOSAL.GET_DATA,
//           data: get_data,
//         });
//       }
//       throw constants.PROPOSAL.INVALID_ID;
//     } catch (err) {
//       console.log(err, "err");
//       return res.status(400).json({
//         success: false,
//         error: { message: err },
//       });
//     }
//   },

//   getAllProposals: async (req, res) => {
//     try {
//       let query = {};
//       let count = req.param("count") || 10;
//       let page = req.param("page") || 1;
//       let { search, isDeleted, status, sortBy, brand_id, affiliate_id } =
//         req.query;
//       let skipNo = (Number(page) - 1) * Number(count);

//       if (search) {
//         search = await Services.Utils.remove_special_char_exept_underscores(
//           search
//         );
//         query.$or = [
//           { name: { $regex: search, $options: "i" } },
//           // { brand_name: { $regex: search, '$options': 'i' } },
//           { addedBy_name: { $regex: search, $options: "i" } },
//         ];
//       }

//       if (isDeleted) {
//         query.isDeleted = isDeleted
//           ? isDeleted === "true"
//           : true
//           ? isDeleted
//           : false;
//       } else {
//         query.isDeleted = false;
//       }

//       if (status) {
//         query.status = status;
//       }

//       if (brand_id) {
//         query.brand_id = new ObjectId(brand_id);
//       }

//       if (affiliate_id) {
//         query.addedBy = new ObjectId(affiliate_id);
//       }

//       let sortquery = {};
//       if (sortBy) {
//         let typeArr = [];
//         typeArr = sortBy.split(" ");
//         let sortType = typeArr[1];
//         let field = typeArr[0];
//         sortquery[field ? field : "createdAt"] = sortType
//           ? sortType == "desc"
//             ? -1
//             : 1
//           : -1;
//       } else {
//         sortquery = { updatedAt: -1 };
//       }

//       // console.log(JSON.stringify(query), '==========query');
//       // Pipeline Stages
//       let pipeline = [
//         {
//           $lookup: {
//             from: "users",
//             localField: "addedBy",
//             foreignField: "_id",
//             as: "addedBy_details",
//           },
//         },
//         {
//           $unwind: {
//             path: "$addedBy_details",
//             preserveNullAndEmptyArrays: true,
//           },
//         },
//         {
//           $lookup: {
//             from: "users",
//             localField: "brand_id",
//             foreignField: "_id",
//             as: "brand_id_details",
//           },
//         },
//         {
//           $unwind: {
//             path: "$brand_id_details",
//             preserveNullAndEmptyArrays: true,
//           },
//         },
//       ];

//       let projection = {
//         $project: {
//           id: "$_id",
//           description: "$description",
//           brand_id: "$brand_id",
//           brand_name: "$brand_id_details.fullName",
//           status: "$status",
//           reason: "$reason",
//           addedBy: "$addedBy",
//           addedBy_name: "$addedBy_details.fullName",
//           updatedBy: "$updatedBy",
//           isDeleted: "$isDeleted",
//           createdAt: "$createdAt",
//           updatedAt: "$updatedAt",
//         },
//       };

//       pipeline.push(projection);
//       pipeline.push({
//         $match: query,
//       });

//       pipeline.push({
//         $sort: sortquery,
//       });

//       // Pipeline Stages
//       let totalresult = await db
//         .collection("proposal")
//         .aggregate(pipeline)
//         .toArray();
//       pipeline.push({
//         $skip: Number(skipNo),
//       });
//       pipeline.push({
//         $limit: Number(count),
//       });
//       let result = await db
//         .collection("proposal")
//         .aggregate(pipeline)
//         .toArray();
//       let resData = {
//         total_count: totalresult ? totalresult.length : 0,
//         data: result ? result : [],
//       };
//       if (!req.param("page") && !req.param("count")) {
//         resData.data = totalresult ? totalresult : [];
//       }
//       return response.success(resData, constants.PROPOSAL.GET_DATA, req, res);
//     } catch (err) {
//       return response.failed(null, `${err}`, req, res);
//     }
//   },

//   changeStatus: async (req, res) => {
//     try {
//       let validation_result =
//         await Validations.ProposalValidations.changeCampaignStatus(req, res);
//       if (validation_result && !validation_result.success) {
//         throw validation_result.message;
//       }

//       let { id } = req.body;

//       let get_proposal = await Proposal.findOne({ id: id, isDeleted: false });

//       if (!get_proposal) {
//         throw constants.PROPOSAL.INVALID_ID;
//       }

//       if (
//         req.body.status == "accepted" &&
//         ["accepted"].includes(get_proposal.status)
//       ) {
//         throw constants.CAMPAIGN.CANNOT_ACCEPT;
//       }

//       if (!["brand"].includes(req.identity.role)) {
//         throw constants.COMMON.UNAUTHORIZED;
//       }

//       switch (req.body.status) {
//         case "accepted":
//           req.body.accepted_at = new Date();
//           break;
//         default:
//           break;
//       }

//       req.body.updatedBy = req.identity.id;
//       let update_status = await Proposal.updateOne(
//         { id: req.body.id },
//         req.body
//       );

//       if (update_status) {
//         let email_payload = {
//           affiliate_id: get_proposal.addedBy,
//           brand_id: get_proposal.brand_id,
//           status: update_status.status,
//           reason: update_status.reason,
//         };
//         await Emails.ProposalEmails.changeStatus(email_payload);
//         return response.success(
//           null,
//           constants.CAMPAIGN.STATUS_UPDATE,
//           req,
//           res
//         );
//       }
//       throw constants.COMMON.SERVER_ERROR;
//     } catch (error) {
//       console.log(error);
//       return response.failed(null, `${error}`, req, res);
//     }
//   },
// };
