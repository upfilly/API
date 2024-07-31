const response = require("../services/Response");
const { constants } = require("../../config/constants");
const db = sails.getDatastore().manager;
const Validations = require("../Validations/index");
const ObjectId = require("mongodb").ObjectId;
const Services = require("../services/index");
const Emails = require("../Emails/index");

// exports.sendApplyRequest = async (req, res) => {
//   try {
//     let inviteCreated = {};
//     let find_brand = await Users.findOne({ id: req.body.brand_id });
//     if (find_brand) {
//       let isRequestExists = await AffiliateBrandInvite.findOne({
//         brand_id: find_brand.id,
//         affiliate_id: req.identity.id,
//       });
//       if (isRequestExists) {
//         if (
//           isRequestExists.status === "accepted" ||
//           isRequestExists.status === "pending"
//         ) {
//           throw "Invitation is already there for this brand";
//         } else {
//           req.body.affiliate_id = req.identity.id;
//           req.body.addedBy = req.identity.id;
//           req.body.updatedBy = req.identity.id;
//           inviteCreated = await AffiliateBrandInvite.create(req.body).fetch();
//         }
//       } else {
//         req.body.affiliate_id = req.identity.id;
//         req.body.addedBy = req.identity.id;
//         req.body.updatedBy = req.identity.id;
//         inviteCreated = await AffiliateBrandInvite.create(req.body).fetch();
//       }

//       if (inviteCreated) {
//         let data = await Users.findOne({ id: req.body.brand_id });
//         let get_afiliate = await Users.findOne({
//           id: req.identity.id,
//           isDeleted: false,
//         });
//         const emailpayload = {
//           email: data.email,
//           name: data.fullName,
//           affiliate_name: get_afiliate.fullName,
//         };
//         await Emails.OnboardingEmails.send_request_mail_to_brand(emailpayload);
//         return response.success(
//           inviteCreated,
//           constants.AFFILIATE_BRAND_INVITE.REQUEST_SEND,
//           req,
//           res
//         );
//       }
//     }
//     throw constants.user.BRAND_NOT_EXISTS;
//   } catch (error) {
//     console.log(error);
//     return response.failed(null, `${error}`, req, res);
//   }
// };
exports.sendApplyRequest = async (req, res) => {
  try {
    let { brand_ids } = req.body;
    let affiliate_id = req.identity.id;
    let invitations = [];
    delete req.body.brand_ids;
    for (let brand_id of brand_ids) {
      let inviteCreated = {};
      let find_brand = await Users.findOne({ id: brand_id });

      if (find_brand) {
        let isRequestExists = await AffiliateBrandInvite.findOne({
          brand_id: find_brand.id,
          affiliate_id,
        });

        if (isRequestExists) {
          if (
            isRequestExists.status === "accepted" ||
            isRequestExists.status === "pending"
          ) {
            throw `Invitation is already there for the brand: ${find_brand.fullName}`;
          } else {
            affiliate_id = affiliate_id;
            addedBy = affiliate_id;
            updatedBy = affiliate_id;
            brand_id = brand_id;
            inviteCreated = await AffiliateBrandInvite.create({ affiliate_id, addedBy, updatedBy, brand_id }).fetch();
          }
        } else {
          affiliate_id = affiliate_id;
          addedBy = affiliate_id;
          updatedBy = affiliate_id;
          brand_id = brand_id;
          inviteCreated = await AffiliateBrandInvite.create({ affiliate_id, addedBy, updatedBy, brand_id }).fetch();
        }

        if (inviteCreated) {
          let data = await Users.findOne({ id: brand_id });
          let get_afiliate = await Users.findOne({
            id: affiliate_id,
            isDeleted: false,
          });

          const emailpayload = {
            email: data.email,
            name: data.fullName,
            affiliate_name: get_afiliate.fullName,
          };

          await Emails.OnboardingEmails.send_request_mail_to_brand(
            emailpayload
          );
          invitations.push(inviteCreated);
        }
      } else {
        throw `Brand with ID: ${brand_id} does not exist.`;
      }


      //-------------------- Send Notification ------------------//
      let notification_payload = {};
      // notification_payload.send_to = add_campaign.affiliate_id;
      notification_payload.title = `Affiliate Request | ${await Services.Utils.title_case(find_brand.fullName)} | ${await Services.Utils.title_case(req.identity.fullName)}`;
      notification_payload.message = `You have a new affiliate request from ${await Services.Utils.title_case(req.identity.fullName)}`;
      notification_payload.type = "affilite_request"
      notification_payload.addedBy = req.identity.id;
      notification_payload.send_to = find_brand.id;
      let create_notification = await Notifications.create(notification_payload).fetch();

      let brand_detail = await Users.findOne({ id: find_brand.id })
      if (create_notification && brand_detail.device_token) {
        let fcm_payload = {
          device_token: brand_detail.device_token,
          title: req.identity.fullName,
          message: create_notification.message,
        }

        await Services.FCM.send_fcm_push_notification(fcm_payload)
      }
    }



    return response.success(
      invitations,
      constants.AFFILIATE_BRAND_INVITE.REQUEST_SEND,
      req,
      res
    );
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
      { affiliate_id: req.body.affiliate_id, brand_id: req.identity.id },
      { status: status, message: message, updatedBy: req.identity.id }
    );

    if (update_status) {
      let get_afiliate = await Users.findOne({
        id: req.body.affiliate_id,
        isDeleted: false,
      });

      const emailpayload = {
        status: status,
        reason: message,
        email: get_afiliate.email,
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
exports.getRequestDetail = async (req, res) => {
  try {
    // console.log("asdfsadf")
    const id = req.param("id");
    if (!id) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: constants.user.ID_REQUIRED,
      });
    } else {
      let requestDetail = await AffiliateBrandInvite.findOne({ id: id, isDeleted: false })
        .populate("brand_id")
        .populate("affiliate_id")
        .populate("addedBy");
      if (!requestDetail) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: constants.AFFILIATEINVITE.INVALID_ID,
        });
      }
      return res.status(200).json({
        success: true,
        message: constants.AFFILIATEINVITE.FETCHED,
        data: requestDetail,
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(400).json({ success: false, code: 400, error: err });
  }
}
