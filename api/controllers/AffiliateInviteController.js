/**
 * AffiliateInviteController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const constants = require("../../config/constants").constants;
const db = sails.getDatastore().manager;
const  ObjectId = require("mongodb").ObjectId;
const Services = require("../services/index");
const Joi = require("joi");
const Validations = require("../Validations/AffiliateInviteValidations.js");
const response = require("../services/Response");
const Emails = require("../Emails/index");

module.exports = {

  addInvite: async (req, res) => {
    try {
      let validation_result = await Validations.addinvite(req, res);

      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }

      req.body.addedBy = req.identity.id;

      let data = req.body;

      let result = await AffiliateInvite.find({
        affiliate_id: { in: data.affiliate_id },
        brand_id: data.brand_id,
        isDeleted: false,
      });
      
      if (result.length === 0) {
        let brand_detail = await Users.findOne({
          id: data.brand_id,
          isDeleted: false,
        });
        let associations = await Promise.all(data.affiliate_id.map((affiliate_id) => {
          return BrandAffiliateAssociation.create({
            campaign_id: data.campaign_id,
            affiliate_id: affiliate_id,
            brand_id: data.brand_id, 
            addedBy: req.identity.id,
            source: "invite"
          }).fetch();
        }));

        let mp = new Map();

        for(let i = 0;i < associations.length; i++) {
          mp[associations[i].affiliate_id.toString()] = associations[i].id.toString();  
        }

        for await (let affiliate_id of data.affiliate_id) {
          let result1 = await AffiliateInvite.create({
            affiliate_id: affiliate_id,                                                                                                                                                                                                                                                                                        
            message: data.message,
            campaign_id: data.campaign_id,
            brand_id: data.brand_id,
            tags: data.tags,
            addedBy: data.addedBy,
            association: mp[affiliate_id]
          }).fetch();

          // await AffiliateBrandInvite.create({
          //   affiliate_id: affiliate_id,
          //   brand_id: req.identity.id,
          //   addedBy:req.identity.id
          // });

          if (result1) {
            
            if (['operator', 'super_user'].includes(req.identity.role)) {
              let get_account_manager = await Users.findOne({ addedBy: req.identity.id, isDeleted: false })
              await Services.activityHistoryServices.create_activity_history(req.identity.id, 'affiliate_invite', 'created', result1, result1, get_account_manager.id ? get_account_manager.id : null)

          } else if (['brand'].includes(req.identity.role)) {

              let get_all_admin = await Services.UserServices.get_users_with_role(["admin"])
              let get_account_manager = get_all_admin[0].id
              await Services.activityHistoryServices.create_activity_history(req.identity.id, 'affiliate_invite', 'created', result1, result1, get_account_manager ? get_account_manager.id : null)
          }

            
            let affiliateInfo = await Users.findOne({
              id: result1.affiliate_id,
              isDeleted: false,
            });
            const emailpayload = {
              email: affiliateInfo.email,
              brand_name: brand_detail.fullName,
              affiliate_name: affiliateInfo.fullName,
            };
            Emails.OnboardingEmails.send_mail_to_affiliate(emailpayload);
          }
        }
        
        return response.success(
          null,
          constants.AFFILIATEINVITE.ADDED,
          req,
          res
        );
      } else {
        throw constants.AFFILIATEINVITE.ALREADY_EXIST;
      }
    } catch (error) {
      console.log(error);
      return response.failed(null, `${error}`, req, res);
    }
  },

  getInviteById: async (req, res) => {
    try {
      let validation_result = await Validations.getinvite(req, res);

      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }

      let result = await AffiliateInvite.findOne({
        id: req.query.id,
        isDeleted: false,
      })
        .populate("affiliate_id")
        .populate("addedBy")
        .populate("campaign_id")
        .populate('brand_id');
      if (result) {
        return response.success(
          result,
          constants.AFFILIATEINVITE.FETCHED,
          req,
          res
        );
      } else {
        throw constants.AFFILIATEINVITE.INVALID_ID;
      }
    } catch (error) {
      return response.failed(null, `${error}`, req, res);
    }
  },

  updateInvite: async (req, res) => {
    try {
      let validation_result = await Validations.updateinvite(req, res);

      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }

      let { id } = req.body;
      let result = await AffiliateInvite.updateOne({ id: id }).set(req.body);
      if (result) {
        return response.success(
          null,
          constants.AFFILIATEINVITE.UPDATED,
          req,
          res
        );
      } else {
        throw constants.AFFILIATEINVITE.INVALID_ID;
      }
    } catch (error) {
      return response.failed(null, `${error}`, req, res);
    }
  },

  deleteInvite: async (req, res) => {
    try {
      let { id } = req.query;
      let existingInvite = await AffiliateInvite({id: id, isDeleted: false, status: 'pending'}); //assuming only pending invitation can be deleted
      if(!existingInvite) {
        return response.failed(null, constants.AFFILIATEINVITE.INVALID_ID, req, res);
      }
      let result = await AffiliateInvite.updateOne({ id: id }).set({ isDeleted: true });
      await BrandAffiliateAssociation.updateOne({id: result.association}).set({isDeleted: true, isActive: false, isDefault: false});
      if (result) {
        return response.success(
          null,
          constants.AFFILIATEINVITE.DELETED,
          req,
          res
        );
      } else {
        throw constants.AFFILIATEINVITE.INVALID_ID;
      }
    } catch (error) {
      return response.failed(null, `${error}`, req, res);
    }
  },

  getAllInviteDetails: async (req, res) => {
    try {
      let { search, sortBy, status, addedBy, brand_id, affiliate_id } = req.query;
      let page = req.param("page") || 1;
      let count = req.param("count") || 10;

      var query = {};
      if (search) {
        search = Services.Utils.remove_special_char_exept_underscores(
          search
        );
        query.$or = [
          { "affiliate_details.fullName": { $regex: search, $options: "i" } },
          { "addedBy_details.fullName": { $regex: search, $options: "i" } },
          { "brand_details.fullName": { $regex: search, $options: "i" } },
        ];
      }
      query.isDeleted = false;

      var sortquery = {};
      if (sortBy) {
        var order = sortBy.split(" ");
        var field = order[0];
        var sortType = order[1];
      }

      let skip = (Number(page) - 1) * Number(count);
      sortquery[field ? field : "createdAt"] = sortType
        ? sortType == "desc"
          ? -1
          : 1
        : -1;
      if (status) {
        query.status = status;
      }

      if (addedBy) {
        query["addedBy_details._id"] = new ObjectId(addedBy);
      }

      if (affiliate_id) {
        query["affiliate_details._id"] = new ObjectId(affiliate_id);
      }

      if (brand_id) {
        query["brand_details._id"] = new ObjectId(brand_id);
      }

      const pipeline = [
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
          $lookup: {
            from: "users",
            localField: "affiliate_id",
            foreignField: "_id",
            as: "affiliate_details",
          },
        },
        {
          $unwind: {
            path: "$affiliate_details",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "campaign",
            localField: "campaign_id",
            foreignField: "_id",
            as: "campaign_details",
          },
        },
        {
          $unwind: {
            path: "$campaign_details",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "brand_id",
            foreignField: "_id",
            as: "brand_details",
          },
        },
        {
          $unwind: {
            path: "$brand_details",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            affiliate_id: "$affiliate_id",
            campaign_id: "$campaign_id",
            message: "$message",
            // commission: "$commission",
            tags: "$tags",
            affiliate_details: "$affiliate_details",
            addedBy: "$addedBy_details",
            campaign_detail: "$campaign_details",
            brand_details: "$brand_details",
            updatedBy: "$updatedBy",
            isDeleted: "$isDeleted",
            status: "$status",
            createdAt: "$createdAt",
            updatedAt: "$updatedAt",
            commission: "$commission",
          },
        },
        {
          $match: query,
        },
        {
          $sort: sortquery,
        },
      ];

      let totalResult = await db
        .collection("affiliateinvite")
        .aggregate(pipeline)
        .toArray();
      pipeline.push({
        $skip: Number(skip),
      });

      pipeline.push({
        $limit: Number(count),
      });

      let result = await db
        .collection("affiliateinvite")
        .aggregate(pipeline)
        .toArray();
      let resData = {
        total: totalResult ? totalResult.length : 0,
        data: result ? result : [],
      };
      if (!req.param("page") && !req.param("count")) {
        resData.data = totalResult ? totalResult : [];
      }
      return res.status(200).json({
        success: true,
        total: totalResult.length,
        data: result,
      });
    } catch (error) {
      return response.failed(null, `${error}`, req, res);
    }
  },

  changeStatus: async (req, res) => {
    try {
      let validation_result = await Validations.changeStatus(req, res);
      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }

      let { id } = req.body;

      let data = await AffiliateInvite.findOne({ id: id, isDeleted: false, status: "pending" });
      if (!data) {
        throw constants.AFFILIATEINVITE.INVALID_ID;
      }

      if (req.body.status == "accepted" && ["accepted"].includes(data.status)) {
        throw constants.AFFILIATEINVITE.CANNOT_ACCEPT;
      }

      req.body.updatedBy = req.identity.id;
      let update_status = await AffiliateInvite.updateOne({ id: req.body.id }).set(req.body);
      if(req.body.status === 'accepted') {
        await BrandAffiliateAssociation.update({brand_id: data.brand_id, affiliate_id: data.affiliate_id}).set({isActive: false});
        await BrandAffiliateAssociation.updateOne({id: update_status.association}).set({status: 'accepted', isActive: true});
      } else {
        await BrandAffiliateAssociation.updateOne({id: update_status.association}).set({status: 'rejected', isActive: false});
      }
      
      if (update_status.addedBy) {
        let data1 = await Users.findOne({
          id: update_status.addedBy,
          isDeleted: false,
        });
        if (update_status) {
          let email_payload = {
            status: update_status.status,
            reason: update_status.reason,
            email: data1.email,
          };
          Emails.OnboardingEmails.change_status_affiliateInvite(
            email_payload
          );
          return response.success(
            null,
            constants.AFFILIATEINVITE.STATUS_UPDATE,
            req,
            res
          );
        }
      }
      throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
      console.log(error);
      return response.failed(null, `${error}`, req, res);
    }
  },
};
