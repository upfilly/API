/**
 * InviteController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const constants = require("../../config/constants").constants;
const response = require("../services/Response");
const Validations = require("../Validations/index");
const db = sails.getDatastore().manager;
const Services = require("../services/index");
const ObjectId = require('mongodb').ObjectId;
const Emails = require("../Emails/index");

exports.addInvite = async (req, res) => {
  try {
    if (req.identity.role !== "brand") {
      throw constants.COMMON.UNAUTHORIZED;
    }

    let validation_result = await Validations.InviteValidation.addInvite(
      req,
      res
    );

    if (validation_result && !validation_result.success) {
      throw validation_result.message;
    }

    if (req.body.email) {
      req.body.email = req.body.email.toLowerCase();
    }

    let get_invite = await Invite.findOne({
      email: req.body.email,
      isDeleted: false,
    });
    if (get_invite) {
      throw constants.INVITE.ALREADY_EXIST;
    }

    req.body.addedBy = req.identity.id;

    let add_invite = await Invite.create(req.body).fetch();
    if (add_invite) {
      let email_payload = {
        brand_id: req.body.addedBy,
        email: add_invite.email,
        fullName: add_invite.fullName,
      };
      await Emails.OnboardingEmails.send_invite(email_payload);

      return response.success(null, constants.INVITE.ADDED, req, res);
    }
    throw constants.COMMON.SERVER_ERROR;
  } catch (error) {
    // console.log(error, "==error");
    return response.failed(null, `${error}`, req, res);
  }
};

exports.getById = async (req, res) => {
  try {
    let id = req.param("id");
    if (!id) {
      throw constants.INVITE.ID_REQUIRED;
    }

    let get_invite = await Invite.findOne({ id: id });
    if (get_invite) {
      if (get_invite.addedBy) {
        let get_brand = await Users.findOne({
          id: get_invite.addedBy,
          isDeleted: false,
        });
        get_invite.brand_name = get_brand.fullName;
        get_invite.brand_email = get_brand.email;
      }
      return response.success(get_invite, constants.INVITE.FETCHED, req, res);
    }
    throw constants.INVITE.INVALID_ID;
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};

exports.getAllInvite = async (req, res) => {
  try {
    let query = {};
    let count = req.param("count") || 10;
    let page = req.param("page") || 1;
    let { search, sortBy, isDeleted, addedBy, invite_status } = req.query;
    skipNo = Number(page - 1) * Number(count);
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (isDeleted) {
      query.isDeleted = isDeleted
        ? isDeleted == "true"
        : true
          ? isDeleted
          : false;
    } else {
      query.isDeleted = false;
    }

    let sortquery = {};
    if (sortBy) {
      let typeArr = [];
      typeArr = sortBy.split(" ");
      let sortType = typeArr[1];
      let field = typeArr[0];
      sortquery[field ? field : "createdAt"] = sortType
        ? sortType == "desc"
          ? -1
          : 1
        : -1;
    } else {
      sortquery = { updatedAt: -1 };
    }

    if (addedBy) {
      query.addedBy = new ObjectId(addedBy);
    }

    if (invite_status) {
      query.invite_status = invite_status;
    }

    let pipeline = [
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
    ];
    let projection = {
      $project: {
        id: "$_id",
        fullName: "$fullName",
        email: "$email",
        brand_name: "$addedBy_details.fullName",
        brand_email: "$addedBy_details.fullName",

        isDeleted: "$isDeleted",
        invite_status: "$invite_status",
        createdAt: "$createdAt",
        updatedAt: "$updatedAt",
        addedBy: "$addedBy",
      },
    };
    pipeline.push(projection);
    pipeline.push({
      $match: query,
    });
    pipeline.push({
      $sort: sortquery,
    });
    let totalresult = await db.collection("invite")
      .aggregate(pipeline)
      .toArray();
    pipeline.push({
      $skip: Number(skipNo),
    });
    pipeline.push({
      $limit: Number(count),
    });
    let result = await db.collection("invite")
      .aggregate(pipeline)
      .toArray();
    let resData = {
      data: result ? result : [],
      total_count: totalresult ? totalresult.length : 0,
    };
    if (!req.param("page") && !req.param("count")) {
      resData.data = totalresult ? totalresult : [];
    }
    return response.success(resData, constants.BLOG.FETCHED, req, res);

  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};

exports.getAllAffiliateListing = async (req, res) => {
  try {
    let brand_id = req.param('brand_id');
    let affiliates = await BrandAffiliateAssociation.find({isActive: true, brand_id: brand_id, isDeleted: false}).populate('affiliate_id');
    let ListOfAffiliates = affiliates;
    ListOfAffiliates = ListOfAffiliates.filter((c)=> c.affiliate_id && !c.affiliate_id.isDeleted).map((c) => c.affiliate_id);
    return response.success(ListOfAffiliates, "List of all affiliates fetched successfully", req, res);
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};

exports.getAllAssociatedBrandListing = async (req, res) => {
  try {
    let offerAffiliateListings = await MakeOffer.find({
      affiliate_id: req.identity.id,
      status: "accepted",
    });
    let affiliateBrandInvites = await AffiliateBrandInvite.find({
      affiliate_id: req.identity.id,
      status: "accepted",
    });
    let campaignListing = await Campaign.find({
      affiliate_id: req.identity.id,
      status: "accepted",
    });
    // let affiliateInviteListing = await AffiliateInvite.find({
    //   brand_id: req.identity.id,
    //   status: "accepted",
    // });

    const combinedResults = [
      ...offerAffiliateListings,
      ...affiliateBrandInvites,
      ...campaignListing,
    ];

    // Use a dictionary to remove duplicates and ensure unique affiliate_ids
    const uniquebrands = {};

    combinedResults.forEach((item) => {

      if (!uniquebrands[item.brand_id]) {

        uniquebrands[item.brand_id] = item;
      }
    });

    const uniquebrandsList = Object.values(uniquebrands);
    let ListOfbrands = [];
    // Print the combined and unique results
    for await (let affiliateId of uniquebrandsList) {
      user = await Users.findOne({ id: affiliateId.brand_id, isDeleted: false });
      ListOfbrands.push(user);
    }

    return response.success(ListOfbrands, "List of all brands fetched successfully", req, res);
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};
