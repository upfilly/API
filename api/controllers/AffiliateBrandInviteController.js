const response = require("../services/Response");
const { constants } = require("../../config/constants");
const db = sails.getDatastore().manager;
const Validations = require("../Validations/index");
const ObjectId = require("mongodb").ObjectId;
const Services = require("../services/index");
const Emails = require("../Emails/index");

exports.sendApplyRequest = async (req, res) => {
  try {
    let inviteCreated = {};
    let find_brand = await Users.findOne({ id: req.body.brand_id });
    if (find_brand) {
      let isRequestExists = await AffiliateBrandInvite.findOne({
        brand_id: find_brand.id,
        affiliate_id: req.identity.id,
      });
      if (isRequestExists) {
        if (
          isRequestExists.status === "accepted" ||
          isRequestExists.status === "pending"
        ) {
          throw "Invitation is already there for this brand";
        } else {
          req.body.affiliate_id = req.identity.id;
          req.body.addedBy = req.identity.id;
          req.body.updatedBy = req.identity.id;
          inviteCreated = await AffiliateBrandInvite.create(req.body).fetch();
        }
      } else {
        req.body.affiliate_id = req.identity.id;
        req.body.addedBy = req.identity.id;
        req.body.updatedBy = req.identity.id;
        inviteCreated = await AffiliateBrandInvite.create(req.body).fetch();
      }

      if (inviteCreated) {
        let data = await Users.findOne({ id: req.body.brand_id });
        let get_afiliate = await Users.findOne({
          id: req.identity.id,
          isDeleted: false,
        });
        const emailpayload = {
          email: data.email,
          name: data.fullName,
          affiliate_name: get_afiliate.fullName,
        };
        await Emails.OnboardingEmails.send_request_mail_to_brand(emailpayload);
        return response.success(
          inviteCreated,
          constants.AFFILIATE_BRAND_INVITE.REQUEST_SEND,
          req,
          res
        );
      }
    }
    throw constants.user.BRAND_NOT_EXISTS;
  } catch (error) {
    console.log(error);
    return response.failed(null, `${error}`, req, res);
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    let query = { isDeleted: false };
    let count = req.param("count") || 10;
    let page = req.param("page") || 1;
    let {
      search,
      isDeleted,
      sortBy,
      brand_id,
      brand_name,
      affiliate_id,
      affiliate_name,
      status,
    } = req.query;

    if (search) {
      search = await Services.Utils.remove_special_char_exept_underscores(
        search
      );
      query.$or = [
        { status: { $regex: search, $options: "i" } },
        { brand_name: { $regex: search, $options: "i" } },
        { affiliate_name: { $regex: search, $options: "i" } },
      ];
    }

    if (isDeleted) {
      query.isDeleted = isDeleted
        ? isDeleted === "true"
        : true
        ? isDeleted
        : false;
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

    if (brand_id) {
      query.brand_id = ObjectId(brand_id);
    } else {
      query.brand_id = ObjectId(req.identity.id);
    }
    if (affiliate_id) {
      query.affiliate_id = ObjectId(affiliate_id);
    }
    if (status) {
      query.status = status;
    }

    // Pipeline Stages
    let pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "brand_id",
          foreignField: "_id",
          as: "brand_id_details",
        },
      },
      {
        $unwind: {
          path: "$brand_id_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "affiliate_id",
          foreignField: "_id",
          as: "affiliate_id_details",
        },
      },
      {
        $unwind: {
          path: "$affiliate_id_details",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    let projection = {
      $project: {
        _id: "$_id",
        brand_id: "$brand_id",
        brand_name: "$brand_id_details.fullName",
        brand_id_details: "$brand_id_details",
        affiliate_id: "$affiliate_id",
        affiliate_name: "$affiliate_id_details.fullName",
        affiliate_id_details: "$affiliate_id_details",
        status: "$status",
        isDeleted: "$isDeleted",
        createdAt: "$createdAt",
        updatedAt: "$updatedAt",
      },
    };

    pipeline.push(projection);
    pipeline.push({
      $match: query,
    });

    pipeline.push({
      $sort: sortquery,
    });
    console.log(query, "--------------->");
    db.collection("affiliatebrandinvite")
      .aggregate(pipeline)
      .toArray((err, totalResult) => {
        if (err) {
          return response.failed(null, `${err}`, req, res);
        }

        let result = [];
        if (totalResult && totalResult.length > 0) {
          result = Services.Utils.paginate(totalResult, count, page);
        }

        let resData = {
          total: totalResult ? totalResult.length : 0,
          data: totalResult ? totalResult : [],
        };
        // if (!req.param("page") && !req.param("count")) {
        //   resData.data = totalResult ? totalResult : [];
        // }
        return response.success(
          resData,
          constants.AFFILIATE_BRAND_INVITE.ALL_FETCHED_SUCCESS,
          req,
          res
        );
      });
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};
exports.changeRequestStatus = async (req, res) => {
  try {
    // let validation_result =
    //   await Validations.CampaignProposals.changeProposalStatus(req, res);
    // if (validation_result && !validation_result.success) {
    //   throw validation_result.message;
    // }
    let { affiliate_id, status, message } = req.body;




    let get_request = await AffiliateBrandInvite.findOne({
      brand_id: req.identity.id,
      affiliate_id: affiliate_id,
      isDeleted: false,
    });

    if (!get_request) {
      throw constants.AFFILIATE_BRAND_INVITE.REQUEST_NOT_FOUND;
    }

    let update_status = await AffiliateBrandInvite.updateOne(
      { affiliate_id: req.body.affiliate_id , brand_id: req.identity.id },
      {status:status,message:message,updatedBy:req.identity.id}
    );


    if (update_status) {
    
        let get_afiliate = await Users.findOne({
          id: req.body.affiliate_id,
          isDeleted: false,
        });

        const emailpayload = {
             status : status,
             reason : message,
            email : get_afiliate.email
        };
        await Emails.OnboardingEmails.change_status_affiliateInvite(emailpayload);
    }

    if (update_status) {
      return response.success(
        update_status,
        constants.AFFILIATE_BRAND_INVITE.STATUS_UPDATE,
        req,
        res
      );
    }
    throw constants.COMMON.SERVER_ERROR;
  } catch (error) {
    console.log(error);
    return response.failed(null, `${error}`, req, res);
  }
};
