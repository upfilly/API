/**
 * UsersController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const bcrypt = require("bcrypt-nodejs");
var constantObj = sails.config.constants;
var constant = require("../../config/local.js");
const db = sails.getDatastore().manager;
const ObjectId = require("mongodb").ObjectId;
const constants = require("../../config/constants").constants;
const Emails = require("../Emails/index");
const response = require("../services/Response");
const credentials = require("../../config/local");
const Services = require("../services/index");
const Validations = require("../Validations/index");
const excel = require("exceljs");
const fs = require("fs");
const readXlsxFile = require("read-excel-file/node");
const { google } = require("googleapis");
const OAuth2Client = google.auth.OAuth2;

async function string_ids_toObjectIds_array(string) {
  // console.log(string, "string");
  if (string) {
    let string_arr = string.split(",");
    let string_arr2 = [];
    for await (let item of string_arr) {
      string_arr2.push(new ObjectId(item));
    }
    console.log(string_arr2);
    return string_arr2;
  }
  return [];
}

function generatePassword() {
  // action are perform to generate VeificationCode for user
  var length = 4;
  var charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var retVal = "";

  for (var i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }

  var lowercase = "abcdefghijklmnopqrstuvwxyz";
  var lowercaseCharacterLength = 2;
  for (var i = 0, n = lowercase.length; i < lowercaseCharacterLength; ++i) {
    retVal += lowercase.charAt(Math.floor(Math.random() * n));
  }

  let specialCharacter = "@%$#&-!";
  let specialCharacterLength = 1;

  for (
    var i = 0, n = specialCharacter.length;
    i < specialCharacterLength;
    ++i
  ) {
    retVal += specialCharacter.charAt(Math.floor(Math.random() * n));
  }
  var numeric = "0123456789";
  var numericLength = 2;
  for (var i = 0, n = numeric.length; i < numericLength; ++i) {
    retVal += numeric.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
}

generateRandom8DigitNumber = function () {
  const min = 10000000; // 8-digit number starts at 10000000
  const max = 99999999; // 8-digit number ends at 99999999
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// const findUniqueObjects = (arr, key) => {
//   const uniqueObjects = [];
//   const uniqueKeys = new Set();

//   for (const obj of arr) {
//     const keyValue = obj[key];

//     if (!uniqueKeys.has(keyValue)) {
//       uniqueKeys.add(keyValue);
//       uniqueObjects.push(obj);
//     }
//   }

//   return uniqueObjects;
// };

// function groupBy(array, key) {
//   return array.reduce((result, current) => {
//     (result[current[key]] = result[current[key]] || []).push(current);
//     return result;
//   }, {});
// }

module.exports = {
  /**
   *
   * @param {*} req
   * @param {*} res
   * @returns
   * @description Used to register User
   */

  register: async (req, res) => {
    try {
      let validation_result = await Validations.UserValidations.register(
        req,
        res
      );

      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }

      let { firstName, lastName, fullName, email, brand_name, role } = req.body;
      if (req.body.firstName) {
        req.body.firstName = firstName.toLowerCase();
      }

      if (req.body.lastName) {
        req.body.lastName = lastName.toLowerCase();
      }

      if (req.body.email) {
        req.body.email = email.toLowerCase();
      }

      if (req.body.brand_name) {
        req.body.brand_name = brand_name.toLowerCase();
      }

      let get_user = await Users.findOne({
        email: req.body.email.toLowerCase(),
        isDeleted: false,
      });
      if (get_user) {
        throw constants.user.EMAIL_EXIST;
      }

      if (req.body.firstName && req.body.lastName) {
        req.body["fullName"] = `${req.body.firstName} ${req.body.lastName}`;
      } else if (req.body.fullName) {
        req.body["firstName"] = req.body.fullName;
      }

      if (role == "brand") {
        req.body.isVerified = "Y";
      }
      //----------saving location------------//
      // if (req.body.lat && req.body.lng) {
      //   req.body.lat = Number(req.body.lat);
      //   req.body.lng = Number(req.body.lng);
      //   if ((req.body.lat >= -90 && req.body.lat <= 90) && (req.body.lat >= -180 && req.body.lat <= 180)) {
      //     req.body.location = {
      //       type: "Point",
      //       coordinates: [req.body.lng, req.body.lat]
      //     }
      //   } else {
      //     throw constants.COMMON.INVALID_COORDINATES;
      //   }
      // }
      //----------saving location------------//
      req.body.my_code = Services.Referral.generate_referal_code();
      // if (["affiliate"].includes(role)) {
      //   let default_affiliate_group = await AffiliateManagement.findOne({ isDefaultAffiliateGroup: true, isDeleted: false, status: "active" });
      //   if (default_affiliate_group) {
      //     req.body.affiliate_group = default_affiliate_group.id;
      //   }
      // }

      let add_user = await Users.create(req.body).fetch();
      if (add_user) {
        if (req.body.email) {
          let get_invites = await Invite.findOne({
            email: req.body.email.toLowerCase(),
            isDeleted: false,
          });
          if (get_invites) {
            let update_user = await Invite.updateOne(
              { id: get_invites.id },
              { invite_status: "onboard" }
            );
          }
        }
        await Emails.OnboardingEmails.userVerifyLink({
          email: add_user.email,
          fullName: add_user.fullName,
          id: add_user.id,
        });

        return response.success(
          add_user,
          constants.user.SUCCESSFULLY_REGISTERED,
          req,
          res
        );
      }
    } catch (err) {
      console.log(err, "-------err");
      return response.failed(null, `${err}`, req, res);
    }
  },

  /**
   *
   * @reqBody  : {email,password}
   * @param {*} res
   * @returns
   */
  adminSignin: async (req, res) => {
    try {
      let validation_result = await Validations.UserValidations.adminSignin(
        req,
        res
      );

      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }

      let { email, password, device_token } = req.body;

      let user = await Users.findOne({
        email: req.body.email.toLowerCase(),
        isDeleted: false,
        role: { in: ["admin", "team"] },
      });

      if (!user) {
        throw constants.user.INVALID_USER;
      }

      if (user && user.status == "deactive") {
        throw constants.user.USERNAME_INACTIVE;
      }

      if (user && user.status != "active" && user.isVerified != "Y") {
        throw constants.user.USERNAME_INACTIVE;
      }

      if (!bcrypt.compareSync(req.body.password, user.password)) {
        throw constants.user.WRONG_PASSWORD;
      } else {
        var token = jwt.sign(
          { user_id: user.id, firstName: user.firstName },
          { issuer: "upfilly", subject: user.email, audience: "public" }
        );

        user.access_token = token;

        let new_date = new Date();
        let updated_payload = {
          last_login: new_date,
        };

        if (device_token) {
          updated_payload.device_token = device_token;
        }

        await Users.updateOne({ id: user.id }).set(updated_payload);

        delete user.stripe_customer_id;
        delete user.isVerified;
        delete user.status;

        return response.success(
          user,
          constants.user.SUCCESSFULLY_LOGGEDIN,
          req,
          res
        );
      }
    } catch (error) {
      return response.failed(null, `${error}`, req, res);
    }
  },

  /*
   *changePassword
   */
  changePassword: async function (req, res) {
    try {
      let validation_result = await Validations.UserValidations.changePassword(
        req,
        res
      );

      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }

      let { newPassword, confirmPassword, currentPassword } = req.body;

      let query = {};
      query.id = req.identity.id;

      let get_user = await Users.findOne(query);
      if (!get_user) {
        throw constant.user.USER_NOT_FOUND;
      }

      if (!bcrypt.compareSync(currentPassword, get_user.password)) {
        throw constants.user.CURRENT_PASSWORD;
      }

      let encryptedPassword = bcrypt.hashSync(
        newPassword,
        bcrypt.genSaltSync(10)
      );
      let update_user = await Users.updateOne(
        { id: req.identity.id },
        { password: encryptedPassword }
      );

      if (update_user) {
        return response.success(
          null,
          constants.user.PASSWORD_CHANGED,
          req,
          res
        );
      }
      throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
      console.log(error);
      return response.failed(null, `${error}`, req, res);
    }
  },

  /**
   * SignIn api for brand and affiliate only.
   * @param {*} req
   * @param {*} res
   * @returns
   */

  userSignin: async (req, res) => {
    try {
      let validation_result = await Validations.UserValidations.userSignin(
        req,
        res
      );
      let listOfOtherUsers = [];
      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }

      let { device_token } = req.body;

      let user = await Users.findOne({
        where: {
          email: req.body.email.toLowerCase(),
          isDeleted: false,
          role: {
            in: [
              "brand",
              "affiliate",
              "team",
              "operator",
              "analyzer",
              "publisher",
              "users",
              "super_user",
              "staff"
            ],
          },
        },
      });

      if (!user) {
        throw constants.user.INVALID_CRED;
      }

      if (user && user.status != "active") {
        throw constants.user.USERNAME_INACTIVE;
      }

      if (!bcrypt.compareSync(req.body.password, user.password)) {
        throw constants.user.INVALID_CRED;
      }

      if (user.isVerified == "N") {
        // if user not verified then sent code to verify email
        throw constants.user.UNVERIFIED;
        // let get_otp = await Services.CommonServices.generateOTP();
        // if (get_otp) {
        //   await Users.updateOne({ id: user.id }).set({ verificationCode: get_otp, last_vc_updated_at: new Date() });
        //   await Emails.OnboardingEmails.send_verification_code({
        //     email: user.email,
        //     id: user.id,
        //     verificationCode: get_otp
        //   });
        //   return response.success(user, constants.user.VERIFICATION_SENT, req, res);
        // }

        // throw constants.COMMON.SERVER_ERROR;
      }

      var token = jwt.sign(
        { user_id: user.id, firstName: user.firstName },
        { issuer: "upfilly", subject: user.email, audience: "upfilly" }
      );
      const refreshToken = jwt.sign(
        { user_id: user.id },
        { issuer: "refresh", subject: "user", audience: "upfilly" }
      );

      // if(user.role === "users"){
      // let active_user = user;
      user = await Users.findOne({ id: user.id, isDeleted: false })
        .populate("activeUser")
        .populate("addedBy");

      if (user.role === "operator" || user.role === "analyzer") {
        await Users.updateOne({ id: user.id }, { activeUser: user.id });
        user.activeUser = req.identity;
        let listOfUsers = await InviteUsers.find({
          email: user.email,
          isDeleted: false,
        });
        // console.log(listOfUsers)
        for (let otherUsers of listOfUsers) {
          // console.log("=============>",otherUsers);
          let parentUser = await Users.findOne({
            id: otherUsers.addedBy,
            isDeleted: false,
          });
          listOfOtherUsers.push(parentUser);
        }
      } else {
        //throw msg here if not exists then throw brand not exists
        await Users.updateOne({ id: user.id }, { activeUser: user.id });

        listOfOtherUsers = await InviteUsers.find({
          addedBy: user.id,
          isDeleted: false,
        });
      }
      let current_user = {};

      current_user.createdAt = user.createdAt;
      current_user.updatedAt = user.updatedAt;
      current_user.id = user.id;
      current_user.firstName = user.firstName;
      current_user.lastName = user.lastName;
      current_user.email = user.email;
      current_user.role = user.role;
      current_user.isDeleted = user.isDeleted;
      current_user.user_id = user.id;
      current_user.addedBy = user.addedBy;
      current_user.updatedBy = user.updatedBy;

      user.listOfOtherUsers = listOfOtherUsers;

      user.listOfOtherUsers.push(current_user);

      // user.activeUser = user;
      user.access_token = token;
      user.refresh_token = refreshToken;

      let new_date = new Date();
      let updated_payload = {
        last_login: new_date,
      };

      if (device_token) {
        updated_payload.device_token = device_token;
      }

      let currentUser = await Users.updateOne({ id: user.id }).set(
        updated_payload
      );

      delete user.stripe_customer_id;
      delete user.status;

      let permission_query = {}

      if (['affiliate', 'brand','staff'].includes(user.role)) {
        permission_query.role = user.role
      } else if (['operator', 'analyzer', 'publisher', 'super_user'].includes(user.role)) {
        // console.log(user, "==user");
        if (user.addedBy.id) {
          let get_account_manager_detail = await Users.findOne({ id: user.addedBy.id, isDeleted: false });
          if (get_account_manager_detail.role) {
            permission_query.role = user.role
            permission_query.account_manager = get_account_manager_detail.role
          }

        }
      }

      let get_permission = await Permissions.findOne(permission_query);

      if (get_permission) {
        user.permission_detail = get_permission;
      }

      return response.success(
        user,
        constants.user.SUCCESSFULLY_LOGGEDIN,
        req,
        res
      );
    } catch (error) {
      console.log(error);
      return response.failed(null, `${error}`, req, res);
    }
  },

  /**
   * Verify user email.
   * @param {*} req
   * @param {*} res
   * @returns
   */

  verifyUserEmail: async (req, res) => {
    try {
      let validation_result = await Validations.UserValidations.verifyUserEmail(
        req,
        res
      );

      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }

      const { id, verificationCode } = req.body;
      let get_user = await Users.findOne({ id: id });
      if (get_user) {
        if (get_user.verificationCode) {
          if (get_user.verificationCode === verificationCode) {
            let update_user = await Users.updateOne(
              { id: id },
              {
                isVerified: "Y",
                verificationCode: null,
                last_login: new Date(),
              }
            );
            let token = jwt.sign(
              { user_id: get_user.id, firstName: get_user.firstName },
              {
                issuer: "upfilly",
                subject: get_user.email,
                audience: "upfilly",
              }
            );
            const refreshToken = jwt.sign(
              { user_id: get_user.id },
              { issuer: "refresh", subject: "user", audience: "upfilly" }
            );

            get_user.access_token = token;
            get_user.refresh_token = refreshToken;

            return response.success(
              get_user,
              constants.user.SUCCESSFULLY_LOGGEDIN,
              req,
              res
            );
          }

          throw constants.user.INVALID_VERIFICATION_CODE;
        }
        throw constants.user.INVALID_VERIFICATION_CODE;
      }

      throw constants.user.INVALID_ID;
    } catch (error) {
      console.log(error, "err");
      return response.failed(null, `${error}`, req, res);
    }
  },

  /**
   * Api for resend OTP
   * @param {*} req
   * @param {*} res
   * @returns
   */

  resendOtp: async (req, res) => {
    try {
      let validation_result = await Validations.UserValidations.resendOtp(
        req,
        res
      );

      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }
      const { id } = req.body;
      let get_user = await Users.findOne({ id: id });
      if (get_user) {
        let get_otp = await Services.CommonServices.generateOTP();
        if (get_otp) {
          let update_otp = await Users.updateOne(
            { id: get_user.id },
            { verificationCode: get_otp, last_vc_updated_at: new Date() }
          );
          await Emails.OnboardingEmails.send_verification_code_for_mobile({
            email: get_user.email,
            id: get_user.id,
            verificationCode: get_otp,
          });

          return response.success(null, constants.user.OPT_SENT, req, res);
        }

        throw constants.COMMON.SERVER_ERROR;
        k;
      }

      throw constants.user.INVALID_ID;
    } catch (error) {
      return response.failed(null, `${error}`, req, res);
    }
  },

  /*For Get User Details
   * Get Record from Login User Id
   */
  userDetails: async function (req, res) {
    var id = req.param("id");
    if (!id || typeof id == undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "Id is required" },
      });
    }

    var userDetail = await Users.find({ where: { id: id } });

    console.log(userDetail);
    let get_permission = await Permissions.findOne({ role: userDetail.role });

    if (get_permission) {
      userDetail.permission_detail = get_permission;
    }

    return res.status(200).json({
      success: true,
      code: 200,
      data: userDetail,
    });
  },

  /**
   * Get All Users.
   */

  getAllAffiliateForBrand: async (req, res) => {
    try {
      let page = req.param("page") || 1;
      let count = req.param("count") || 10;
      let {
        search,
        role,
        isDeleted,
        status,
        sortBy,
        lat,
        lng,
        isTrusted,
        isFeatured,
        createBybrand_id,
        start_date,
        end_date,
        affiliate_group_id,
        cat_type,
        affiliate_type,
        invite_status,
        sub_category_id,
        category_id,
        sub_child_category_id,
        addedBy,
      } = req.query;
      let skipNo = (Number(page) - 1) * Number(count);
      let query = { isDeleted: false };

      if (search) {
        search = await Services.Utils.remove_special_char_exept_underscores(
          search
        );
        query.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { affiliate_code: { $regex: search, $options: "i" } },
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { mobileNo: { $regex: search, $options: "i" } },
          { work_phone: { $regex: search, $options: "i" } },
        ];
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

      if (status) {
        query.status = status;
      }

      if (invite_status) {
        query.invite_status = invite_status;
      }
      if (role) {
        // console.log(role);
        query.role = role;
      } else {
        if (req.identity.role == "admin") {
          query.role = { $nin: ["admin"] };
        } else {
          query.role = { $nin: ["admin", "team", ""] };
        }
      }
      if (affiliate_type) {
        query.affiliate_type = affiliate_type;
      }

      if (isDeleted) {
        query.isDeleted = isDeleted
          ? isDeleted === "true"
          : true
            ? isDeleted
            : false;
      }

      if (isTrusted) {
        query.isTrusted = isTrusted
          ? isTrusted === "true"
          : true
            ? isTrusted
            : false;
      }

      if (isFeatured) {
        query.isFeatured = isFeatured
          ? isFeatured === "true"
          : true
            ? isFeatured
            : false;
      }

      if (createBybrand_id) {
        query.createdByBrand = new ObjectId(createBybrand_id);
      }

      if (addedBy) {
        query.addedBy = new ObjectId(addedBy);
      }

      if (category_id) {
        query.category_id = new ObjectId(category_id);
      }
      if (sub_child_category_id) {
        query.sub_child_category_id = new ObjectId(sub_child_category_id);
      }
      if (sub_category_id) {
        query.sub_category_id = new ObjectId(sub_category_id);
      }

      if (cat_type) {
        query.cat_type = cat_type;
      }

      if (start_date && end_date) {
        var date = new Date(start_date);
        date.setDate(date.getDate());
        var Enddate = new Date(end_date);
        Enddate.setDate(Enddate.getDate() + 1);
        query.$and = [
          { createdAt: { $gte: date } },
          { createdAt: { $lte: Enddate } },
        ];
      }

      if (affiliate_group_id) {
        query.affiliate_group = {
          $in: await string_ids_toObjectIds_array(affiliate_group_id),
        };
      }
      // if (role != "users") {
      //   query.addedBy = { $eq: null };
      // }

      let pipeline = [
        {
          $lookup: {
            from: "affiliatemanagement",
            localField: "affiliate_group",
            foreignField: "_id",
            as: "affiliate_group_details",
          },
        },
        {
          $unwind: {
            path: "$affiliate_group_details",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "commoncategories",
            localField: "category_id",
            foreignField: "_id",
            as: "categories_details",
          },
        },
        {
          $unwind: {
            path: "$categories_details",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "affiliateinvite",
            let: {
              affiliate_id: "$_id",
              isDeleted: false,
              addedBy: new ObjectId(req.identity.id),
            },
            // let: { user_id: "$req.identity.id", fav_user_id: new ObjectId("64d076e86ecebee01af09d8c") },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$addedBy", "$$addedBy"] },
                      { $eq: ["$isDeleted", "$$isDeleted"] },
                      { $eq: ["$affiliate_id", "$$affiliate_id"] },
                    ],
                  },
                },
              },
            ],
            as: "invite_affiliate_details",
          },
        },
        {
          $unwind: {
            path: "$invite_affiliate_details",
            preserveNullAndEmptyArrays: true,
          },
        },
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
          logo: "$logo",
          address: "$address",
          country: "$country",
          mobileNo: "$mobileNo",
          work_phone: "$work_phone",
          affiliate_code: "$affiliate_code",
          affiliate_type: "$affiliate_type",
          social_media_platforms: "$social_media_platforms",
          createdByBrand: "$createdByBrand",
          affiliate_group: "$affiliate_group",
          affiliate_group_name: "$affiliate_group_details.group_name",
          invite_affiliate_details: "$invite_affiliate_details",
          invite_status: {
            $cond: [
              { $ifNull: ["$invite_affiliate_details.status", false] },
              "$invite_affiliate_details.status",
              "not_invited",
            ],
          },
          invite_affiliate_details_status: "$invite_affiliate_details.status",
          status: "$status",
          createdAt: "$createdAt",
          updatedAt: "$updatedAt",
          isDeleted: "$isDeleted",
          addedBy: "$addedBy",
          location: "$location",
          isFeatured: "$isFeatured",
          isTrusted: "$isTrusted",
          category_id: "$category_id",
          cat_type: "$categories_details.cat_type",
          sub_category_id: "$sub_category_id",
          sub_child_category_id: "$sub_child_category_id",
        },
      };
      pipeline.push(projection);
      pipeline.push({
        $match: query,
      });
      pipeline.push({
        $sort: sortquery,
      });
      if (lat && lng) {
        pipeline.unshift({
          $geoNear: {
            near: { type: "Point", coordinates: [Number(lng), Number(lat)] },
            distanceField: "dist.calculated",
            maxDistance: 200 * 1000, // in km to meter
            distanceMultiplier: 1 / 1000, // in km
            query: { isDeleted: false },
            spherical: true,
          },
        });
      }
      let totalResult = await db
        .collection("users")
        .aggregate(pipeline)
        .toArray();
      pipeline.push({
        $skip: Number(skipNo),
      });
      pipeline.push({
        $limit: Number(count),
      });

      let result = await db.collection("users").aggregate(pipeline).toArray();
      let resData = {
        total: totalResult ? totalResult.length : 0,
        data: result ? result : [],
      };
      if (!req.param("page") && !req.param("count")) {
        resData.data = totalResult ? totalResult : [];
      }
      return response.success(resData, constants.user.FETCHED_ALL, req, res);
    } catch (error) {
      // console.log(error, "---err");
      return response.failed(null, `${error}`, req, res);
    }
  },
  getAllBrandForAffiliate: async (req, res) => {
    try {
      let page = req.param("page") || 1;
      let count = req.param("count") || 10;
      let {
        search,
        role,
        isDeleted,
        status,
        sortBy,
        lat,
        lng,
        isTrusted,
        isFeatured,
        createBybrand_id,
        start_date,
        end_date,
        affiliate_group_id,
        cat_type,
        affiliate_type,
        invite_status,
        sub_category_id,
        category_id,
        sub_child_category_id,
        addedBy,
        request_status
      } = req.query;
      let skipNo = (Number(page) - 1) * Number(count);
      let query = { isDeleted: false };

      if (search) {
        search = await Services.Utils.remove_special_char_exept_underscores(
          search
        );
        query.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { affiliate_code: { $regex: search, $options: "i" } },
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { mobileNo: { $regex: search, $options: "i" } },
          { work_phone: { $regex: search, $options: "i" } },
        ];
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

      if (status) {
        query.status = status;
      }

      if (invite_status) {
        query.invite_status = invite_status;
      }
      if (role) {
        // console.log(role);
        query.role = role;
      } else {
        if (req.identity.role == "admin") {
          query.role = { $nin: ["admin"] };
        } else {
          query.role = { $nin: ["admin", "team", ""] };
        }
      }
      if (affiliate_type) {
        query.affiliate_type = affiliate_type;
      }

      if (isDeleted) {
        query.isDeleted = isDeleted
          ? isDeleted === "true"
          : true
            ? isDeleted
            : false;
      }

      if (isTrusted) {
        query.isTrusted = isTrusted
          ? isTrusted === "true"
          : true
            ? isTrusted
            : false;
      }

      if (isFeatured) {
        query.isFeatured = isFeatured
          ? isFeatured === "true"
          : true
            ? isFeatured
            : false;
      }

      if (createBybrand_id) {
        query.createdByBrand = new ObjectId(createBybrand_id);
      }

      if (addedBy) {
        query.addedBy = new ObjectId(addedBy);
      }

      if (category_id) {
        query.category_id = new ObjectId(category_id);
      }
      if (sub_child_category_id) {
        query.sub_child_category_id = new ObjectId(sub_child_category_id);
      }
      if (sub_category_id) {
        query.sub_category_id = new ObjectId(sub_category_id);
      }

      if (cat_type) {
        query.cat_type = cat_type;
      }

      if (start_date && end_date) {
        var date = new Date(start_date);
        date.setDate(date.getDate());
        var Enddate = new Date(end_date);
        Enddate.setDate(Enddate.getDate() + 1);
        query.$and = [
          { createdAt: { $gte: date } },
          { createdAt: { $lte: Enddate } },
        ];
      }

      if (affiliate_group_id) {
        query.affiliate_group = {
          $in: await string_ids_toObjectIds_array(affiliate_group_id),
        };
      }
      if (role != "users") {
        query.addedBy = { $eq: null };
      }

      if (request_status) {
        query.request_status = request_status
      }
      let pipeline = [
        {
          $lookup: {
            from: "affiliatemanagement",
            localField: "affiliate_group",
            foreignField: "_id",
            as: "affiliate_group_details",
          },
        },
        {
          $unwind: {
            path: "$affiliate_group_details",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "commoncategories",
            localField: "category_id",
            foreignField: "_id",
            as: "categories_details",
          },
        },
        {
          $unwind: {
            path: "$categories_details",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "affiliatebrandinvite",
            let: {
              affiliate_id: new ObjectId(req.identity.id),
              isDeleted: false,
              brand_id: "$_id",
            },
            // let: { user_id: "$req.identity.id", fav_user_id: new ObjectId("64d076e86ecebee01af09d8c") },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$brand_id", "$$brand_id"] },
                      { $eq: ["$isDeleted", "$$isDeleted"] },
                      { $eq: ["$affiliate_id", "$$affiliate_id"] },
                    ],
                  },
                },
              },
            ],
            as: "invite_affiliate_details",
          },
        },
        {
          $unwind: {
            path: "$invite_affiliate_details",
            preserveNullAndEmptyArrays: true,
          },
        },
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
          logo: "$logo",
          address: "$address",
          country: "$country",
          mobileNo: "$mobileNo",
          work_phone: "$work_phone",
          affiliate_code: "$affiliate_code",
          affiliate_type: "$affiliate_type",
          social_media_platforms: "$social_media_platforms",
          createdByBrand: "$createdByBrand",
          affiliate_group: "$affiliate_group",
          affiliate_group_name: "$affiliate_group_details.group_name",
          invite_status: {
            $cond: [
              { $ifNull: ["$invite_affiliate_details.status", false] },
              "$invite_affiliate_details.status",
              "not_invited",
            ],
          },
          invite_affiliate_details: "$invite_affiliate_details",
          invite_affiliate_details_status: "$invite_affiliate_details.status",
          status: "$status",
          createdAt: "$createdAt",
          updatedAt: "$updatedAt",
          isDeleted: "$isDeleted",
          addedBy: "$addedBy",
          location: "$location",
          isFeatured: "$isFeatured",
          isTrusted: "$isTrusted",
          category_id: "$category_id",
          cat_type: "$categories_details.cat_type",
          sub_category_id: "$sub_category_id",
          sub_child_category_id: "$sub_child_category_id",
          request_status: "$request_status"
        },
      };
      pipeline.push(projection);
      pipeline.push({
        $match: query,
      });
      pipeline.push({
        $sort: sortquery,
      });
      if (lat && lng) {
        pipeline.unshift({
          $geoNear: {
            near: { type: "Point", coordinates: [Number(lng), Number(lat)] },
            distanceField: "dist.calculated",
            maxDistance: 200 * 1000, // in km to meter
            distanceMultiplier: 1 / 1000, // in km
            query: { isDeleted: false },
            spherical: true,
          },
        });
      }
      console.log(query);
      let totalResult = await db.collection("users")
        .aggregate(pipeline)
        .toArray();
      pipeline.push({
        $skip: Number(skipNo),
      });
      pipeline.push({
        $limit: Number(count),
      });

      let result = await db.collection("users")
        .aggregate(pipeline)
        .toArray();
      let resData = {
        total: totalResult ? totalResult.length : 0,
        data: result ? result : [],
      };
      if (!req.param("page") && !req.param("count")) {
        resData.data = totalResult ? totalResult : [];
      }
      return response.success(
        resData,
        constants.user.FETCHED_ALL,
        req,
        res
      );

    } catch (error) {
      // console.log(error, "---err");
      return response.failed(null, `${error}`, req, res);
    }
  },

  /**
   * Api for Invited users
   */

  getAllInvitedUsers: async (req, res) => {
    try {
      let page = req.param("page") || 1;
      let count = req.param("count") || 10;
      let {
        search,
        role,
        isDeleted,
        status,
        sortBy,
        lat,
        lng,
        start_date,
        end_date,
        affiliate_group_id,
        three_role,
        affiliate_type,
        invite_status,
      } = req.query;
      let skipNo = (Number(page) - 1) * Number(count);
      let query = { isDeleted: false };

      if (search) {
        search = await Services.Utils.remove_special_char_exept_underscores(
          search
        );
        query.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { affiliate_code: { $regex: search, $options: "i" } },
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { mobileNo: { $regex: search, $options: "i" } },
          { work_phone: { $regex: search, $options: "i" } },
        ];
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

      if (role) {
        query.role = role;
      } else {
        query.role = { $nin: ["users", "brand"] };
      }

      if (status) {
        query.status = status;
      }
      if (invite_status) {
        query.invite_status = invite_status;
      }

      if (affiliate_type) {
        query.affiliate_type = affiliate_type;
      }

      if (isDeleted) {
        query.isDeleted = isDeleted
          ? isDeleted === "true"
          : true
            ? isDeleted
            : false;
      }

      query.addedBy = new ObjectId(req.identity.id);

      if (start_date && end_date) {
        var date = new Date(start_date);
        date.setDate(date.getDate());
        var Enddate = new Date(end_date);
        Enddate.setDate(Enddate.getDate() + 1);
        query.$and = [
          { createdAt: { $gte: date } },
          { createdAt: { $lte: Enddate } },
        ];
      }

      if (affiliate_group_id) {
        query.affiliate_group = {
          $in: await string_ids_toObjectIds_array(affiliate_group_id),
        };
      }

      let pipeline = [
        // {
        //   $lookup: {
        //     from: "affiliatemanagement",
        //     localField: "affiliate_group",
        //     foreignField: "_id",
        //     as: "affiliate_group_details"
        //   }
        // },
        // {
        //   $unwind: {
        //     path: '$affiliate_group_details',
        //     preserveNullAndEmptyArrays: true
        //   }
        // },
        // {
        //   $lookup:
        //   {
        //     from: "affiliateinvite",
        //     let: { affiliate_id: "$_id", isDeleted: false, addedBy: new ObjectId(req.identity.id) },
        //     // let: { user_id: "$req.identity.id", fav_user_id: new ObjectId("64d076e86ecebee01af09d8c") },
        //     pipeline: [
        //       {
        //         $match:
        //         {
        //           $expr:
        //           {
        //             $and:
        //               [
        //                 { $eq: ["$affiliate_id", "$$affiliate_id"] },
        //                 { $eq: ["$isDeleted", "$$isDeleted"] },
        //                 { $eq: ["$addedBy", "$$addedBy"] }
        //               ]
        //           }
        //         }
        //       }
        //     ],
        //     as: "invite_affiliate_details"
        //   }
        // },
        // {
        //   $unwind: {
        //     path: '$invite_affiliate_details',
        //     preserveNullAndEmptyArrays: true
        //   }
        // },
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
          logo: "$logo",
          address: "$address",
          country: "$country",
          mobileNo: "$mobileNo",
          work_phone: "$work_phone",
          affiliate_code: "$affiliate_code",
          affiliate_type: "$affiliate_type",
          social_media_platforms: "$social_media_platforms",
          createdByBrand: "$createdByBrand",
          affiliate_group: "$affiliate_group",
          affiliate_group_name: "$affiliate_group_details.group_name",
          invite_status: {
            $cond: [
              { $ifNull: ["$invite_affiliate_details.status", false] },
              "$invite_affiliate_details.status",
              "not_invited",
            ],
          },
          status: "$status",
          createdAt: "$createdAt",
          updatedAt: "$updatedAt",
          isDeleted: "$isDeleted",
          addedBy: "$addedBy",
          location: "$location",
        },
      };
      pipeline.push(projection);
      pipeline.push({
        $match: query,
      });
      pipeline.push({
        $sort: sortquery,
      });
      if (lat && lng) {
        pipeline.unshift({
          $geoNear: {
            near: { type: "Point", coordinates: [Number(lng), Number(lat)] },
            distanceField: "dist.calculated",
            maxDistance: 200 * 1000, // in km to meter
            distanceMultiplier: 1 / 1000, // in km
            query: { isDeleted: false },
            spherical: true,
          },
        });
      }
      let totalResult = await db.collection("users")
        .aggregate(pipeline)
        .toArray();
      pipeline.push({
        $skip: Number(skipNo),
      });
      pipeline.push({
        $limit: Number(count),
      });

      let result = await db.collection("users")
        .aggregate(pipeline)
        .toArray();
      let resData = {
        total: totalResult ? totalResult.length : 0,
        data: result ? result : [],
      };
      if (!req.param("page") && !req.param("count")) {
        resData.data = totalResult ? totalResult : [];
      }
      return response.success(
        resData,
        constants.user.FETCHED_ALL,
        req,
        res
      );

    } catch (error) {
      // console.log(error, "---err");
      return response.failed(null, `${error}`, req, res);
    }
  },

  /*
   *For Check Email Address Exit or not
   */
  checkEmail: async function (req, res) {
    var email = req.param("email");
    if (!email || typeof email == undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "Email is required" },
      });
    }
    Users.findOne({ email: email }).then((user) => {
      if (user) {
        return res.status(200).json({
          success: false,
          error: { code: 400, message: "Email already taken" },
        });
      } else {
        return res.status(200).json({
          success: true,
          code: 200,
          message: "you can use this email",
        });
      }
    });
  },

  userProfileData: (req, res, next) => {
    let query = {};
    query.id = req.identity.id;
    Users.findOne(query).exec((err, userDetail) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: { code: 400, message: "" + err },
        });
      } else {
        return res.status(200).json({
          success: true,
          code: 200,
          data: userDetail,
        });
      }
    });
  },

  userDetail: async (req, res, next) => {
    try {
      let id = req.param("id");
      let listOfOtherUsers = [];
      let get_user = await Users.findOne({ id: id }).populate("activeUser");
      if (get_user) {
        // console.log(get_user.role);
        if (get_user.role === "brand" || get_user.role === "affiliate") {
          let active_user = get_user;
          // get_user = await Users.findOne({id:get_user.addedBy,isDeleted:false});
          //throw msg here if not exists then throw brand not exists
          await Users.updateOne({ id: get_user.id }, { activeUser: id });
          console.log(get_user.id);
          listOfOtherUsers = await InviteUsers.find({
            addedBy: get_user.id,
            isDeleted: false,
          });
          let current_user = {};

          current_user.createdAt = get_user.createdAt;
          current_user.updatedAt = get_user.updatedAt;
          current_user.id = get_user.id;
          current_user.firstName = get_user.firstName;
          current_user.lastName = get_user.lastName;
          current_user.email = get_user.email;
          current_user.role = get_user.role;
          current_user.isDeleted = get_user.isDeleted;
          current_user.user_id = get_user.id;
          current_user.addedBy = get_user.addedBy;
          current_user.updatedBy = get_user.updatedBy;
          // listOfOtherUsers.push(current_user);
          // console.log("===========>",listOfOtherUsers);
          get_user.listOfOtherUsers = listOfOtherUsers;

          get_user.listOfOtherUsers.push(current_user);
          // get_user.activeUser = active_user;
        } else {
          // listOfOtherUsers = await InviteUsers.find({addedBy:get_user.addedBy,isDeleted:false});
          let listOfUsers = await InviteUsers.find({
            email: get_user.email,
            isDeleted: false,
          });
          // console.log(listOfUsers)
          for (let otherUsers of listOfUsers) {
            // console.log("=============>",otherUsers);
            let parentUser = await Users.findOne({
              id: otherUsers.addedBy,
              isDeleted: false,
            });
            let currentparentUser = {};
            currentparentUser.createdAt = parentUser.createdAt;
            currentparentUser.updatedAt = parentUser.updatedAt;
            currentparentUser.id = parentUser.id;
            currentparentUser.firstName = parentUser.firstName;
            currentparentUser.lastName = parentUser.lastName;
            currentparentUser.email = parentUser.email;
            currentparentUser.role = parentUser.role;
            currentparentUser.isDeleted = parentUser.isDeleted;
            currentparentUser.user_id = parentUser.id;
            currentparentUser.addedBy = parentUser.addedBy;
            currentparentUser.updatedBy = parentUser.updatedBy;

            listOfOtherUsers.push(currentparentUser);
          }

          let current_user = {};

          current_user.createdAt = get_user.createdAt;
          current_user.updatedAt = get_user.updatedAt;
          current_user.id = get_user.id;
          current_user.firstName = get_user.firstName;
          current_user.lastName = get_user.lastName;
          current_user.email = get_user.email;
          current_user.role = get_user.role;
          current_user.isDeleted = get_user.isDeleted;
          current_user.user_id = get_user.id;
          current_user.addedBy = get_user.addedBy;
          current_user.updatedBy = get_user.updatedBy;

          get_user.listOfOtherUsers = listOfOtherUsers ? listOfOtherUsers : [];
          // get_user.activeUser = req.identity;

          get_user.listOfOtherUsers.push(current_user);
        }

        if (get_user && get_user.category_id && get_user.category_id != "") {
          // console.log(get_user.category_id, "---------get_user.category_id");
          let get_category = await CommonCategories.findOne({
            id: get_user.category_id,
          });
          if (get_category) {
            // console.log(get_category, "------------get_category");
            get_user.category_name = get_category.name;
          }
        }

        if (
          get_user &&
          get_user.affiliate_group &&
          get_user.affiliate_group != ""
        ) {
          let get_affiliate_group = await AffiliateManagement.findOne({
            id: get_user.affiliate_group,
          });
          if (get_affiliate_group) {
            // console.log(get_affiliate_group,"get_affiliate_group");
            get_user.affiliate_group_name = get_affiliate_group.group_name;
          }
        }

        // if (get_user && get_user.parter_manager_id && get_user.parter_manager_id != "") {
        //   let get_parter_manager = await Users.findOne({ id: get_user.parter_manager_id });
        //   if (get_parter_manager) {
        //     // console.log(get_affiliate_group,"get_affiliate_group");
        //     get_user.parter_manager_name = get_parter_manager.fullName;
        //   }
        // }
        // if (get_user && get_user.account_executive_id && get_user.account_executive_id != "") {
        //   let get_account_executive = await Users.findOne({ id: get_user.account_executive_id });
        //   if (get_account_executive) {
        //     // console.log(get_affiliate_group,"get_affiliate_group");
        //     get_user.account_executive_name = get_account_executive.fullName;
        //   }
        // }

        if (
          get_user &&
          get_user.createdByBrand &&
          get_user.createdByBrand != ""
        ) {
          let get_brand = await Users.findOne({ id: get_user.createdByBrand });
          if (get_brand) {
            get_user.brand_name = get_brand.fullName;
          }
        }

        let get_tax = await Tax.findOne({ user_id: get_user.id });

        if (get_tax) {
          get_user.tax_detail = get_tax;
        }

        // let get_permission = await Permissions.findOne({ role: get_user.role });

        // if (get_permission) {
        //   get_user.permission_detail = get_permission;

        // }

        // if (get_user) {
        //   let get_campaign = await Campaign.find({ affiliate_id: id });
        //   if (get_campaign) {
        //     for await (let track of get_campaign) {
        //       let get_track = await TrackingManagement.find({ campaign_unique_id: track.campaign_unique_id }).groupBy('campaign_unique_id');
        //       // const groupedRecords = groupBy(get_track, 'campaign_unique_id');
        //       console.log(get_track,"----------get_track");
        //       // for await (let trackObj of get_track) {
        //       //   // const uniqueObjectsById = findUniqueObjects(get_track, trackObj.campaign_unique_id);
        //       //   // console.log(uniqueObjectsById, "----uniqueObjectsById");
        //       // }
        //       get_user.tracking_list = get_track;
        //     }
        //   }
        // }
        let permission_query = {}

        if (['affiliate', 'brand', 'staff'].includes(get_user.role)) {
          permission_query.role = get_user.role
        } else if (['operator', 'analyzer', 'publisher', 'super_user'].includes(get_user.role)) {
          if (get_user.addedBy) {
            let get_account_manager_detail = await Users.findOne({ id: get_user.addedBy, isDeleted: false });
            if (get_account_manager_detail.role) {
              permission_query.role = get_user.role
              permission_query.account_manager = get_account_manager_detail.role
            }

          }
        }

        if (get_user.role != "admin") {
          let get_permission = await Permissions.findOne(permission_query);

          if (get_permission) {
            get_user.permission_detail = get_permission;
          }
        } else {
          delete get_user.listOfOtherUsers
        }

        return response.success(get_user, constants.user.FETCHED, req, res);
      }
      throw constants.user.INVALID_ID;
    } catch (error) {
      console.log(error, "----errr");
      return response.failed(null, `${error}`, req, res);
    }
  },

  forgotPassword: async (req, res) => {
    try {
      let validation_result = await Validations.UserValidations.forgotPassword(
        req,
        res
      );

      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }

      let { email } = req.body;

      let get_user = await Users.findOne({
        email: email.toLowerCase(),
        isDeleted: false,
        role: { in: ["admin", "team"] },
      });

      if (!get_user) {
        throw constants.user.INVALID_USER;
      }
      let verificationCode =
        await Services.CommonServices.generateVeificationCode();

      let update_user = await Users.updateOne(
        { email: email.toLowerCase(), isDeleted: false },
        {
          verificationCode: verificationCode,
        }
      );

      if (update_user) {
        let currentTime = new Date();
        let email_payload = {
          email: update_user.email,
          verificationCode: verificationCode,
          fullName: update_user.fullName,
          id: update_user.id,
          time: currentTime.toISOString(),
        };
        await Emails.OnboardingEmails.forgotPasswordEmail(email_payload);

        return response.success(
          null,
          constants.user.VERIFICATION_SENT,
          req,
          res
        );
      }
      throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
      return response.failed(null, `${error}`, req, res);
    }
  },

  forgotPasswordFrontend: async (req, res) => {
    try {
      let validation_result = await Validations.UserValidations.forgotPassword(
        req,
        res
      );

      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }

      let { email } = req.body;

      let get_user = await Users.findOne({
        email: email.toLowerCase(),
        isDeleted: false,
        role: { in: ['brand', 'admin', 'affiliate', 'team', 'super_user', 'operator', 'analyzer', 'publisher', 'customer', 'users'] },
      });

      if (!get_user) {
        throw constants.user.INVALID_USER;
      }
      let verificationCode =
        await Services.CommonServices.generateVeificationCode();

      let update_user = await Users.updateOne(
        { email: email.toLowerCase(), isDeleted: false },
        {
          verificationCode: verificationCode,
        }
      );

      if (update_user) {
        let currentTime = new Date();
        let email_payload = {
          email: update_user.email,
          verificationCode: verificationCode,
          fullName: update_user.fullName,
          id: update_user.id,
          time: currentTime.toISOString(),
        };
        await Emails.OnboardingEmails.forgotPasswordEmail(email_payload);

        return response.success(
          null,
          constants.user.VERIFICATION_SENT,
          req,
          res
        );
      }

      throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
      return response.failed(null, `${error}`, req, res);
    }
  },

  resetPassword: async (req, res) => {
    try {
      let validation_result = await Validations.UserValidations.resetPassword(
        req,
        res
      );

      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }
      let { code, newPassword, confirmPassword } = req.body;

      let user = await Users.findOne({
        verificationCode: code,
        isDeleted: false,
      });

      if (!user || user.verificationCode !== code) {
        throw constants.user.INVALID_VERIFICATION_CODE;
      }

      const encryptedPassword = bcrypt.hashSync(
        newPassword,
        bcrypt.genSaltSync(10)
      );
      let update_user = await Users.updateOne(
        { id: user.id },
        { password: encryptedPassword }
      );
      if (update_user) {
        return response.success(
          null,
          constants.user.PASSWORD_CHANGED,
          req,
          res
        );
      }

      throw constants.COMMON.SERVER_ERROR;
    } catch (err) {
      return response.failed(null, `${err}`, req, res);
    }
  },

  verifyUser: async (req, res) => {
    try {
      let id = req.param("id");
      if (!id) {
        throw constants.user.ID_REQUIRED;
      }
      let get_user = await Users.findOne({ id: id });
      if (!get_user) {
        throw constants.user.INVALID_ID;
      }
      if (get_user.isVerified == "Y" && get_user.role == "brand") {
        // if (get_user.subscription_id && get_user.subscription_id != "") {
        //   return res.redirect(
        //     `${credentials.FRONT_WEB_URL}/dashboard?id=${get_user.id}`
        //   );
        // } else {
        //   return res.redirect(
        //     `${credentials.FRONT_WEB_URL}/pricing?id=${get_user.id}`
        //   );
        // }
        return res.redirect(`${credentials.FRONT_WEB_URL}/pricing?id=${get_user.id}`);
      } else if (get_user.isVerified == "Y" && get_user.role == "affiliate") {
        return res.redirect(`${credentials.FRONT_WEB_URL}`);
      } else if (get_user.isVerified == "Y" && get_user.role == "team") {
        return res.redirect(`${credentials.FRONT_WEB_URL}`);
      } else if (get_user.isVerified == "Y" && get_user.role == "customer") {
        return res.redirect(`${credentials.FRONT_WEB_URL}`);
      } else if (get_user.isVerified == "Y" && get_user.role == "operator") {
        return res.redirect(`${credentials.FRONT_WEB_URL}`);
      } else if (get_user.isVerified == "Y" && get_user.role == "analyzer") {
        return res.redirect(`${credentials.FRONT_WEB_URL}`);
      } else if (get_user.isVerified == "Y" && get_user.role == "publisher") {
        return res.redirect(`${credentials.FRONT_WEB_URL}`);
      } else if (get_user.isVerified == "Y" && get_user.role == "staff") {
        return res.redirect(`${credentials.FRONT_WEB_URL}`);
      }

      update_user = await Users.updateOne({ id: id }, { isVerified: "Y" });
      if (update_user) {
        if (update_user && update_user.role == "brand") {
          if (update_user.subscription_id != "") {
            return res.redirect(
              `${credentials.FRONT_WEB_URL}/dashboard?id=${get_user.id}`
            );
          } else {
            return res.redirect(
              `${credentials.FRONT_WEB_URL}/pricing?id=${get_user.id}`
            );
          }
        } else if (update_user && update_user.role == "affiliate") {
          return res.redirect(
            `${credentials.FRONT_WEB_URL}/dashboard?id=${get_user.id}`
          );
        } else if (update_user && update_user.role == "team") {
          return res.redirect(`${credentials.FRONT_WEB_URL}?id=${get_user.id}`);
        } else if (update_user && update_user.role == "customer") {
          return res.redirect(`${credentials.FRONT_WEB_URL}/marketplace`);
        } else if (update_user && update_user.role == "operator") {
          return res.redirect(
            `${credentials.FRONT_WEB_URL}/dashboard?id=${get_user.id}`
          );
        } else if (update_user && update_user.role == "analyzer") {
          return res.redirect(
            `${credentials.FRONT_WEB_URL}/dashboard?id=${get_user.id}`
          );
        } else if (update_user && update_user.role == "publisher") {
          return res.redirect(
            `${credentials.FRONT_WEB_URL}/dashboard?id=${get_user.id}`
          );
        } else if (update_user && update_user.role == "staff") {
          return res.redirect(
            `${credentials.FRONT_WEB_URL}/dashboard?id=${get_user.id}`
          );
        } else {
          return res.redirect(
            `${credentials.FRONT_WEB_URL}`
          );
        }
      }
      throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
      return response.failed(null, `${error}`, req, res);
    }
  },

  reverifyUser: async (req, res) => {
    try {
      let email = req.param("email");
      if (!email) {
        throw constants.user.EMAIL_REQUIRED;
      }
      let get_user = await Users.findOne({ email: email });

      if (get_user) {
        if (get_user.isVerified == "N") {
          await Emails.OnboardingEmails.userVerifyLink({
            email: get_user.email,
            fullName: get_user.fullName,
            id: get_user.id,
          });
        } else {
          throw constants.user.ALREADY_VERIFIED;
        }
        return response.success(null, constants.user.CHECK_EMAIL, req, res);
      }
      throw constants.user.INVALID_USER;
    } catch (error) {
      console.log(error, "==err");
      return response.failed(null, `${error}`, req, res);
    }
  },

  verifyEmail: (req, res) => {
    var id = req.param("id");
    Users.findOne({ id: id }).then((user) => {
      if (user) {
        Users.update({ id: id }, { contact_information: "Yes" }).then(
          (verified) => {
            return res.redirect(constant.FRONT_WEB_URL);
          }
        );
      } else {
        return res.redirect(constant.FRONT_WEB_URL);
      }
    });
  },

  editProfile: async (req, res) => {
    try {
      let validation_result = await Validations.UserValidations.editProfile(
        req,
        res
      );

      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }

      let {
        id,
        email,
        permissions,
        social_security_number,
        tax_classification,
        tax_name,
        federal_text_classification,
        ein,
        consent_agreed,
        trade_name,
        is_us_citizen,
        signature,
        signature_date,
      } = req.body;

      let get_user = await Users.findOne({ id: id, isDeleted: false });

      if (!get_user) {
        throw constants.user.INVALID_ID;
      }

      if (email) {
        req.body.email = email.toLowerCase();
        let email_exist = await Users.findOne({
          email: email.toLowerCase(),
          isDeleted: false,
          id: { "!=": get_user.id },
        });

        if (email_exist) {
          throw constants.user.EMAIL_EXIST;
        }
      }

      req.body.updatedBy = req.identity.id;

      /**Creating fullName of User using firstName and lastName */
      if (req.body.firstName && req.body.lastName) {
        req.body.fullName = req.body.firstName + " " + req.body.lastName;
      } else if (req.body.firstName) {
        req.body.fullName = req.body.firstName;
      }
      /**Creating fullName of User using firstName and lastName */

      //----------saving location of store------------//
      if (
        req.body.lat &&
        req.body.lng &&
        (req.body.lat != get_user.lat || req.body.lng != get_user.lng)
      ) {
        req.body.lat = Number(req.body.lat);
        req.body.lng = Number(req.body.lng);
        if (
          req.body.lat >= -90 &&
          req.body.lat <= 90 &&
          req.body.lng >= -180 &&
          req.body.lng <= 180
        ) {
          req.body.location = {
            type: "Point",
            coordinates: [req.body.lng, req.body.lat],
          };
        } else {
          throw "Invalid Coordinates";
        }
      }
      //----------saving location of store------------//

      if (req.body.dob) {
        req.body.dob = new Date(req.body.dob);
      }

      delete req.body.role;
      // delete req.body.email;

      //---------------- Updating permissions -----------//
      if (permissions) {
        permissions = await Services.Permission.set_permissions(permissions);

        let get_user_permissions = await Permissions.findOne({
          id: permissions.id,
          user_id: id,
        });
        if (get_user_permissions) {
          permissions.updatedBy = req.identity.id;
          let update_permissions = await Permissions.updateOne(
            { id: permissions.id, user_id: id },
            permissions
          );
          if (["brand", "affiliate"].includes(req.identity.role)) {
            await Services.AuditTrial.create_audit_trial(
              req.identity.id,
              "permissions",
              "updated",
              update_permissions,
              get_user_permissions
            );
          }
        } else {
          permissions.user_id = get_user.id;
          permissions.role = get_user.role;
          permissions.addedBy = req.identity.id;
          let valid_roles = ["team"];
          if (valid_roles.includes(get_user.role)) {
            let create_permissions = await Permissions.create(
              permissions
            ).fetch();
          }
        }
      }
      //---------------- Updating permissions -----------//

      //------------Updating password if present in payload------------------//

      if (req.body.updated_password && req.identity.role == "admin") {
        const encryptedPassword = bcrypt.hashSync(
          req.body.updated_password,
          bcrypt.genSaltSync(10)
        );
        req.body.password = encryptedPassword;

        // let emailPayload = {
        //   email: email,
        //   fullName: user.fullName,
        //   password: password,
        // };

        // await Emails.updatePasswordEmail(emailPayload);
      }

      let update_user = await Users.updateOne({ id: id }, req.body);
      if (update_user) {
        var tax_payload = {
          social_security_number: social_security_number,
          tax_classification: tax_classification,
          tax_name: tax_name,
          ein: ein,
          federal_text_classification: federal_text_classification,
          trade_name: trade_name,
          consent_agreed: consent_agreed,
          is_us_citizen: is_us_citizen,
          signature: signature,
          signature_date: new Date(signature_date),
        };

        let update_tax = await Tax.updateOne({ user_id: id }, tax_payload);

        if (req.body.updated_password) {
          await Emails.OnboardingEmails.update_password_by_admin({
            email: get_user.email,
            updated_password: req.body.updated_password,
            fullName: get_user.fullName,
          });
        }

        // if (["brand", "affiliate"].includes(req.identity.role)) {
        //   await Services.AuditTrial.create_audit_trial(
        //     req.identity.id,
        //     "users",
        //     "updated",
        //     update_user,
        //     get_user
        //   );
        // }

        //Now we story logs in activity history api.
        if (['brand', 'affiliate'].includes(req.identity.role)) {

          //----------------get main account manager---------------------
          let get_all_admin = await Services.UserServices.get_users_with_role(["admin"])
          let get_account_manager = get_all_admin[0].id
          await Services.activityHistoryServices.create_activity_history(req.identity.id, 'users', 'updated', update_user, get_user, get_account_manager ? get_account_manager : null)

        }

        return response.success(null, constants.user.UPDATED_USER, req, res);
      }

      throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
      console.log(error, "==err");
      return response.failed(null, `${error}`, req, res);
    }
  },

  addUser: async (req, res) => {
    try {
      let validation_result = await Validations.UserValidations.addUser(
        req,
        res
      );

      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }

      let date = new Date();

      let {
        email,
        role,
        password,
        permissions,
        createdByBrand,
        affiliate_group,
        social_security_number,
        tax_classification,
        tax_name,
        federal_text_classification,
        ein,
        consent_agreed,
        trade_name,
        is_us_citizen,
        signature,
        signature_date,
      } = req.body;
      if (req.body.email) {
        req.body.email = req.body.email.toLowerCase();
      }

      let query = {};
      query.isDeleted = false;
      query.email = email;
      // query.role = role;

      let get_user = await Users.findOne(query);
      if (get_user) {
        throw constants.user.EMAIL_EXIST;
      }

      req.body["date_registered"] = date;
      req.body["createdAt"] = date;
      req.body["updatedAt"] = date;
      req.body["status"] = req.body.status ? req.body.status : "active";
      req.body["addedBy"] = req.identity.id;

      // const password = await Services.CommonServices.generatePassword();
      // req.body.password = password;
      // req.body.isVerified = 'Y';
      req.body.terms_and_conditions = true;

      if (req.body.firstName && req.body.lastName) {
        req.body["fullName"] = req.body.firstName + " " + req.body.lastName;
      } else if (req.body.firstName) {
        req.body["fullName"] = req.body.firstName;
      }

      if (!req.body.password) {
        password = await generatePassword();
        req.body.password = password;
      }

      delete req.body.confirmpassword;

      //----------saving location of store------------//
      if (req.body.lat && req.body.lng) {
        req.body.lat = Number(req.body.lat);
        req.body.lng = Number(req.body.lng);
        if (
          req.body.lat >= -90 &&
          req.body.lat <= 90 &&
          req.body.lng >= -180 &&
          req.body.lng <= 180
        ) {
          req.body.location = {
            type: "Point",
            coordinates: [req.body.lng, req.body.lat],
          };
        } else {
          throw "Invalid Coordinates";
        }
      }
      //----------saving location of store------------//

      if (req.body.dob) {
        req.body.dob = new Date(req.body.dob);
      }

      if (!req.body.affiliate_code) {
        req.body.affiliate_code = Services.Referral.generate_referal_code();
      }

      if (createdByBrand) {
        var find_brand = await Users.findOne({
          id: createdByBrand,
          isDeleted: false,
        });
        req.body.reffering_affiliate = find_brand.email;
      }

      // if (!affiliate_group && ["affiliate"].includes(role)) {
      //   let default_affiliate_group = await AffiliateManagement.findOne({ isDefaultAffiliateGroup: true, isDeleted: false });
      //   if (default_affiliate_group) {
      //     req.body.affiliate_group = default_affiliate_group.id;
      //   }
      // }

      if (role == "affiliate") {
        req.body.affilaite_unique_id = generateRandom8DigitNumber();
      }

      var tax_payload = {
        social_security_number: social_security_number,
        tax_classification: tax_classification,
        tax_name: tax_name,
        ein: ein,
        federal_text_classification: federal_text_classification,
        trade_name: trade_name,
        consent_agreed: consent_agreed,
        is_us_citizen: is_us_citizen,
        signature: signature,
        signature_date: new Date(signature_date),
      };

      if (req.identity.role == "admin") {
        req.body.request_status = "accepted"
      }
      var newUser = await Users.create(req.body).fetch();
      if (newUser) {
        if (newUser.role == "affiliate") {
          tax_payload.user_id = newUser.id;
          let create_tax = await Tax.create(tax_payload).fetch();
        }
        // let affiliate_link = credentials.FRONT_WEB_URL + "/affiliate/status/" + newUser.id + "?" + newUser.affilaite_unique_id
        // let update_user = await Users.updateOne({ id: newUser.id }, { affiliate_link: affiliate_link });
        // -------------- Create Permissions -------------//
        if (["team"].includes(newUser.role)) {
          permissions.user_id = newUser.id;
          permissions.role = newUser.role;
          permissions.addedBy = req.identity.id;
          permissions = await Services.Permission.set_permissions(permissions);
          if (permissions) {
            let create_permissions = await Permissions.create(
              permissions
            ).fetch();
          }
        }

        // -------------- Create Permissions -------------//

        // let email_roles = ['brand'];
        // if (email_roles.includes(newUser.role)) {

        if (newUser.createdByBrand == null) {
          let email_payload = {
            email: newUser.email,
            firstName: newUser.firstName,
            fullName: newUser.fullName,
            password: password,
            id: newUser.id,
            added_by: req.identity.id,
          };
          await Emails.OnboardingEmails.add_user_email(email_payload);
        }

        if (
          newUser &&
          newUser.isSendActivationEmail &&
          newUser.isSendActivationEmail == true
        ) {
          let email_payload_new = {
            email: newUser.email,
            firstName: newUser.firstName,
            fullName: newUser.fullName,
            password: password,
            id: newUser.id,
            added_by: req.identity.id,
          };
          await Emails.OnboardingEmails.add_user_email(email_payload_new);
        }

        return response.success(newUser, constants.user.USER_ADD, req, res);
      }

      throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
      return response.failed(null, `${error}`, req, res);
    }
  },

  deleteUser: async (req, res) => {
    try {
      const id = req.param("id");

      if (!id || id == undefined) {
        return res.status(400).json({
          success: false,
          error: { code: 400, message: constants.user.INVALID_ID },
        });
      }

      const deletedUSer = await Users.update({ id: id }, { isDeleted: true });

      return res.status(200).json({
        success: true,
        message: constants.user.USER_DELETED,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "" + err },
      });
    }
  },

  userAutoLogin: async function (req, res) {
    try {
      let validation_result = await Validations.UserValidations.userAutoLogin(
        req,
        res
      );

      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }

      const { id, device_token } = req.body;

      let get_user = await Users.findOne({
        where: { id: id, isDeleted: false },
        select: [
          "email",
          "role",
          "status",
          "isVerified",
          "firstName",
          "lastName",
          "fullName",
          "image",
          "isDeleted",
          "addedBy",
        ],
      });

      if (!get_user) {
        throw constants.user.INVALID_ID;
      }

      if (get_user && get_user.status == "deactive") {
        throw constants.user.USERNAME_INACTIVE;
      }

      if (get_user.role === "users") {
        let superUser = await Users.findOne({
          id: get_user.addedBy,
          isDeleted: false,
        });
        if (!superUser) {
          throw constants.user.BRAND_NOT_EXISTS;
        }

        let listOfUserExceptActive = await Users.find({
          id: { "!=": get_user.id },
          addedBy: get_user.addedBy,
          isDeleted: false,
          role: "users",
        });

        console.log(
          listOfUserExceptActive,
          "------------------- listOfUserExceptActive"
        );

        let active_user = get_user;

        get_user = await Users.findOne({ id: get_user.addedBy });

        get_user.listOfUserExceptActive = listOfUserExceptActive;

        get_user.active_user = active_user;

        console.log(get_user, "-------------- [get_user]");
      }

      const new_date = new Date();
      const token = jwt.sign(
        { user_id: get_user.id, firstName: get_user.firstName },
        { issuer: "Jcsoftware", subject: get_user.email, audience: "upfilly" }
      );

      let updated_payload = {
        last_login: new_date,
      };

      if (device_token) {
        updated_payload.device_token = device_token;
      }

      let update_user = await Users.updateOne({ id: get_user.id }).set(
        updated_payload
      );

      update_user.listOfUserExceptActive = get_user.listOfUserExceptActive;

      update_user.active_user = get_user.active_user;

      update_user.access_token = token;

      // ---------- To Check User Have Any Active Subscriptions --------//
      let get_active_subscription = await Subscriptions.findOne({
        user_id: update_user.id,
        status: "active",
      });

      update_user.subscribe_status = get_active_subscription
        ? "active"
        : "cancelled";
      // ---------- To Check User Have Any Active Subscriptions --------//

      delete update_user.stripe_customer_id;
      delete update_user.isVerified;
      delete update_user.status;

      let permission_query = {};

      if (['affiliate', 'brand', 'staff'].includes(update_user.role)) {
        permission_query.role = update_user.role
      } else if (['operator', 'analyzer', 'publisher', 'super_user'].includes(update_user.role)) {
        if (update_user.addedBy) {
          let get_account_manager_detail = await Users.findOne({ id: update_user.addedBy, isDeleted: false });
          if (get_account_manager_detail.role) {
            permission_query.role = update_user.role
            permission_query.account_manager = get_account_manager_detail.role
          }

        }
      }

      let get_permission = await Permissions.findOne(permission_query);

      if (get_permission) {
        update_user.permission_detail = get_permission;
      }


      return response.success(
        update_user,
        constants.user.SUCCESSFULLY_LOGGEDIN,
        req,
        res
      );
    } catch (error) {
      return response.failed(null, `${error}`, req, res);
    }
  },

  sampleFile: async (req, res) => {
    try {
      let excelData = [];
      let role = req.param("role");
      if (!role) {
        throw constants.user.ROLE_REQUIRED;
      }
      if (role == "brand") {
        let brandData = {
          brandName: "Brand Name",
          email: "brand@yopmail.com",
          dialCode: "+91",
          mobileNo: "7856236963",
        };
        excelData.push(brandData);
      }
      if (role == "influencers") {
        let influencersData = {
          name: "influencers",
          // lastName: "name",
          email: "influencers@yopmail.com",
          // dialCode: "+91",
          // mobileNo: "7856236963",

          gender: "male",
          // address: "123, texas USA",
          country: "US",
          // state: "texas",
          // city: "texas",
          // pincode: "12345",
          cultures: "architectural,aussie, western dance",
          // social_media_platforms: "youtube,tiktok,twitter,facebook,instagram",

          youtube_email: "culture@yopmail.com",
          youtube_username: "culture",
          youtube_profile_link: "culture.youtube",
          youtube_followers: "1.5K",

          tiktok_email: "culture@yopmail.com",
          tiktok_username: "culture",
          tiktok_profile_link: "culture.youtube",
          tiktok_followers: "1.5K",

          twitter_email: "culture@yopmail.com",
          twitter_username: "culture",
          twitter_profile_link: "culture.twitter",
          twitter_followers: "1K",

          facebook_email: "culture@yopmail.com",
          facebook_username: "culture",
          facebook_profile_link: "culture.facebook",
          facebook_followers: "1.5K",

          instagram_email: "culture@yopmail.com",
          instagram_username: "culture",
          instagram_profile_link: "culture.insta",
          instagram_followers: "1T",

          pinterest_email: "culture@yopmail.com",
          pinterest_username: "culture",
          pinterest_profile_link: "culture.pinterest",
          pinterest_followers: "2.5B",

          linkedin_email: "culture@yopmail.com",
          linkedin_username: "culture",
          linkedin_profile_link: "culture.linkedin",
          linkedin_followers: "2M",

          snapchat_email: "culture@yopmail.com",
          snapchat_username: "culture",
          snapchat_profile_link: "culture.insta",
          snapchat_followers: "1.5K",
        };
        excelData.push(influencersData);
      }

      let workbook = new excel.Workbook();
      let worksheet = workbook.addWorksheet("excelData");

      if (role == "brand") {
        worksheet.columns = [
          { header: "Brand Name", key: "brandName", width: 20 },
          { header: "Email", key: "email", width: 30 },
          { header: "DialCode", key: "dialCode", width: 25 },
          { header: "MobileNo", key: "mobileNo", width: 25 },
        ];
      }
      if (role == "influencers") {
        worksheet.columns = [
          // { header: "Name", key: "name", width: 20 },
          { header: "full name", key: "name", width: 20 },

          // { header: "LastName", key: "lastName", width: 20 },

          // { header: "Email", key: "email", width: 30 },
          { header: "email", key: "email", width: 30 },

          // { header: "DialCode", key: "dialCode", width: 25 },
          // { header: "MobileNo", key: "mobileNo", width: 25 },

          // { header: "Gender", key: "gender", width: 25 },
          { header: "gender", key: "gender", width: 25 },

          // { header: "Address", key: "address", width: 25 },

          // { header: "Country", key: "country", width: 20 },
          { header: "country", key: "country", width: 20 },

          // { header: "State", key: "state", width: 30 },
          // { header: "City", key: "city", width: 25 },
          // { header: "Pincode", key: "pincode", width: 25 },

          // { header: "Cultures", key: "cultures", width: 25 },
          { header: "culture", key: "cultures", width: 25 },

          // { header: "Social_Media_Platforms", key: "social_media_platforms", width: 30 },

          // { header: "Youtube Email", key: "youtube_email", width: 25 },
          { header: "youtube email", key: "youtube_email", width: 25 },
          // { header: "Youtube Username", key: "youtube_username", width: 25 },
          { header: "youtube id", key: "youtube_username", width: 25 },
          // { header: "Youtube Profile Link", key: "youtube_profile_link", width: 25 },
          { header: "youtube link", key: "youtube_profile_link", width: 25 },
          // { header: "Youtube Followers", key: "youtube_followers", width: 25 },
          { header: "youtube followers", key: "youtube_followers", width: 25 },

          // { header: "Tiktok Email", key: "tiktok_email", width: 25 },
          { header: "tiktok email", key: "tiktok_email", width: 25 },
          // { header: "Tiktok Username", key: "tiktok_username", width: 25 },
          { header: "tiktok id", key: "tiktok_username", width: 25 },
          // { header: "Tiktok Profile Link", key: "tiktok_profile_link", width: 25 },
          { header: "tiktok link", key: "tiktok_profile_link", width: 25 },
          // { header: "Tiktok Followers", key: "tiktok_followers", width: 25 },
          { header: "tiktok followers", key: "tiktok_followers", width: 25 },

          // { header: "Twitter Email", key: "twitter_email", width: 25 },
          { header: "twitter email", key: "twitter_email", width: 25 },
          // { header: "Twitter Username", key: "twitter_username", width: 25 },
          { header: "twitter id", key: "twitter_username", width: 25 },
          // { header: "Twitter Profile Link", key: "twitter_profile_link", width: 25 },
          { header: "twitter link", key: "twitter_profile_link", width: 25 },
          // { header: "Twitter Followers", key: "twitter_followers", width: 25 },
          { header: "twitter followers", key: "twitter_followers", width: 25 },

          // { header: "Facebook Email", key: "facebook_email", width: 25 },
          { header: "facebook email", key: "facebook_email", width: 25 },
          // { header: "Facebook Username", key: "facebook_username", width: 25 },
          { header: "facebook id", key: "facebook_username", width: 25 },
          // { header: "Facebook Profile Link", key: "facebook_profile_link", width: 25 },
          { header: "facebook link", key: "facebook_profile_link", width: 25 },
          // { header: "Facebook Followers", key: "facebook_followers", width: 25 },
          {
            header: "facebook followers",
            key: "facebook_followers",
            width: 25,
          },

          // { header: "Instagram Email", key: "instagram_email", width: 25 },
          { header: "instagram email", key: "instagram_email", width: 25 },
          // { header: "Instagram Username", key: "instagram_username", width: 25 },
          { header: "instagram id", key: "instagram_username", width: 25 },
          // { header: "Instagram Profile Link", key: "instagram_profile_link", width: 25 },
          {
            header: "instagram link",
            key: "instagram_profile_link",
            width: 25,
          },
          // { header: "Instagram Followers", key: "instagram_followers", width: 25 },
          {
            header: "instagram followers",
            key: "instagram_followers",
            width: 25,
          },

          // { header: "Pinterest Email", key: "pinterest_email", width: 25 },
          { header: "pinterest email", key: "pinterest_email", width: 25 },
          // { header: "Pinterest Username", key: "pinterest_username", width: 25 },
          { header: "pinterest id", key: "pinterest_username", width: 25 },
          // { header: "Pinterest Profile Link", key: "pinterest_profile_link", width: 25 },
          {
            header: "pinterest link",
            key: "pinterest_profile_link",
            width: 25,
          },
          // { header: "Pinterest Followers", key: "pinterest_followers", width: 25 },
          {
            header: "pinterest followers",
            key: "pinterest_followers",
            width: 25,
          },

          // { header: "LinkedIn Email", key: "linkedin_email", width: 25 },
          { header: "linkedin email", key: "linkedin_email", width: 25 },
          // { header: "LinkedIn Username", key: "linkedin_username", width: 25 },
          { header: "linkedin id", key: "linkedin_username", width: 25 },
          // { header: "LinkedIn Profile Link", key: "linkedin_profile_link", width: 25 },
          { header: "linkedin link", key: "linkedin_profile_link", width: 25 },
          // { header: "LinkedIn Followers", key: "linkedin_followers", width: 25 },
          {
            header: "linkedin followers",
            key: "linkedin_followers",
            width: 25,
          },

          // { header: "Snapchat Email", key: "snapchat_email", width: 25 },
          { header: "snapchat email", key: "snapchat_email", width: 25 },
          // { header: "Snapchat Username", key: "snapchat_username", width: 25 },
          { header: "snapchat id ", key: "snapchat_username", width: 25 },
          // { header: "Snapchat Profile Link", key: "snapchat_profile_link", width: 25 },
          { header: "snapchat link", key: "snapchat_profile_link", width: 25 },
          // { header: "Snapchat Followers", key: "snapchat_followers", width: 25 },
          {
            header: "snapchat followers",
            key: "snapchat_followers",
            width: 25,
          },
        ];
      }

      worksheet.addRows(excelData);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=" + "SampleUserExcel.xlsx"
      );

      return workbook.xlsx.write(res).then(function () {
        res.status(200).end();
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "" + error },
      });
    }
  },

  importInfluencers: async (req, res) => {
    try {
      req
        .file("file")
        .upload(
          { maxBytes: 10485760, dirname: "../../assets/csv" },
          async (err, file) => {
            if (err) {
              if (err.code == "E_EXCEEDS_UPLOAD_LIMIT") {
                return res.status(404).json({
                  success: false,
                  error: {
                    code: 404,
                    message: "Image size must be less than 10 MB",
                  },
                });
              }
            }

            var responseData = {};

            file.forEach(async (element, index) => {
              typeArr = element.type.split("/");
              fileExt = typeArr[1];
              if (
                fileExt ==
                "vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                fileExt == "vnd.ms-excel"
              ) {
                let name = `${file[index].fd.split("/csv")[1]}`;
                fs.readFile(file[index].fd, async (err, data) => {
                  if (err) {
                    return res.status(403).json({
                      success: false,
                      error: {
                        code: 403,
                        message: err,
                      },
                    });
                  } else {
                    if (data) {
                      var path = file[index].fd;

                      if (
                        fileExt ==
                        "vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      ) {
                        fileExt = "xlsx";
                      }

                      responseData.fullpath = `${name}`;
                      const csvFilePath = `assets/csv${name}`;
                      readXlsxFile(csvFilePath).then(async (rows) => {
                        // `rows` is an array of rows
                        // each row being an array of cells.
                        totalRecords = 0;
                        imported = 0;
                        existed = 0;
                        var counter = 0;
                        var labels = [];
                        let influencers_ids_arr = [];
                        if (rows && rows.length > 0) {
                          for await (let itm of rows) {
                            if (counter == 0) {
                              labels = itm;
                            } else {
                              if (itm && itm.length > 0) {
                                var index = 0;
                                totalRecords++;
                                var obj = {};
                                for await (let data of itm) {
                                  let keyLabel = labels[index];
                                  if (
                                    ["full name", "Full Name", "Name"].includes(
                                      keyLabel
                                    )
                                  ) {
                                    obj.firstName = data;
                                  } // new
                                  if (["email", "Email"].includes(keyLabel)) {
                                    obj.email = data;
                                  } // new
                                  if (["gender", "Gender"].includes(keyLabel)) {
                                    obj.gender = data;
                                  } // new
                                  if (
                                    ["Country", "country"].includes(keyLabel)
                                  ) {
                                    obj.country = data;
                                  }
                                  if (
                                    [
                                      "Cultures",
                                      "Culture",
                                      "culture",
                                      "cultures",
                                    ].includes(keyLabel)
                                  ) {
                                    obj.cultures = data;
                                  }

                                  if (
                                    [
                                      "Youtube Username",
                                      "youtube username",
                                      "youtube id",
                                      "Youtube Id",
                                    ].includes(keyLabel)
                                  ) {
                                    obj.youtube_username = data;
                                  }
                                  if (
                                    [
                                      "Youtube Profile Link",
                                      "youtube profile link",
                                      "youtube link",
                                      "Youtube Link",
                                    ].includes(keyLabel)
                                  ) {
                                    obj.youtube_profile_link = data;
                                  }

                                  if (
                                    [
                                      "Tiktok Username",
                                      "tiktok username",
                                      "tiktok id",
                                      "Tiktok Id",
                                    ].includes(keyLabel)
                                  ) {
                                    obj.tiktok_username = data;
                                  }
                                  if (
                                    [
                                      "Tiktok Profile Link",
                                      "tiktok profile link",
                                      "tiktok link",
                                      "Tiktok Link",
                                    ].includes(keyLabel)
                                  ) {
                                    obj.tiktok_profile_link = data;
                                  }

                                  if (
                                    ["Twitter Id", "twitter id"].includes(
                                      keyLabel
                                    )
                                  ) {
                                    obj.twitter_username = data;
                                  }
                                  if (
                                    [
                                      "Twitter Profile Link",
                                      "twitter profile link",
                                      "Twitter Link",
                                      "twitter link",
                                    ].includes(keyLabel)
                                  ) {
                                    obj.twitter_profile_link = data;
                                  }

                                  if (
                                    [
                                      "Facebook Username",
                                      "facebook username",
                                      "Facebook Id",
                                      "facebook id",
                                    ].includes(keyLabel)
                                  ) {
                                    obj.facebook_username = data;
                                  }
                                  if (
                                    [
                                      "Facebook Profile Link",
                                      "facebook profile link",
                                      "Facebook Link",
                                      "facebook link",
                                    ].includes(keyLabel)
                                  ) {
                                    obj.facebook_profile_link = data;
                                  }

                                  if (
                                    [
                                      "Instagram Username",
                                      "instagram username",
                                      "Instagram Id",
                                      "instagram id",
                                    ].includes(keyLabel)
                                  ) {
                                    obj.instagram_username = data;
                                  }
                                  if (
                                    [
                                      "Instagram Profile Link",
                                      "instagram profile link",
                                      "Instagram Link",
                                      "instagram link",
                                    ].includes(keyLabel)
                                  ) {
                                    obj.instagram_profile_link = data;
                                  }

                                  if (
                                    [
                                      "Pinterest Username",
                                      "pinterest username",
                                      "Pinterest Id",
                                      "pinterest id",
                                    ].includes(keyLabel)
                                  ) {
                                    obj.pinterest_username = data;
                                  }
                                  if (
                                    [
                                      "Pinterest Profile Link",
                                      "pinterest profile link",
                                      "Pinterest Link",
                                      "pinterest link",
                                    ].includes(keyLabel)
                                  ) {
                                    obj.pinterest_profile_link = data;
                                  }

                                  if (
                                    [
                                      "LinkedIn Username",
                                      "linkedIn username",
                                      "Linkedin Username",
                                      "linkedin username",
                                      "Linkedin Id",
                                      "linkedin id",
                                    ].includes(keyLabel)
                                  ) {
                                    obj.linkedin_username = data;
                                  }
                                  if (
                                    [
                                      "LinkedIn Profile Link",
                                      "linkedIn profile link",
                                      "Linkedin Link",
                                      "linkedin link",
                                    ].includes(keyLabel)
                                  ) {
                                    obj.linkedin_profile_link = data;
                                  }

                                  if (
                                    [
                                      "Snapchat Username",
                                      "snapchat username",
                                      "Snapchat Id",
                                      "snapchat id",
                                    ].includes(keyLabel)
                                  ) {
                                    obj.snapchat_username = data;
                                  }
                                  if (
                                    [
                                      "Snapchat Profile Link",
                                      "snapchat profile link",
                                      "Snapchat Link",
                                      "snapchat link",
                                    ].includes(keyLabel)
                                  ) {
                                    obj.snapchat_profile_link = data;
                                  }

                                  index++;
                                }
                                try {
                                  delete obj.fullName;
                                  let culture = obj.cultures;
                                  // let social_media_platforms = obj.social_media_platforms;
                                  if (culture) {
                                    let culture_arr = culture.split(",");
                                    let culture_arr2 = [];
                                    for await (let item of culture_arr) {
                                      let get_cultures =
                                        await CommonCategories.findOne({
                                          name: item.toLowerCase(),
                                          isDeleted: false,
                                          type: "culture",
                                        });

                                      if (get_cultures) {
                                        culture_arr2.push(get_cultures.id);
                                      }
                                    }
                                    obj.cultures = culture_arr2;
                                  }

                                  obj.social_media_platforms =
                                    await Services.UserServices.get_social_media_for_import(
                                      obj
                                    );
                                  if (obj.gender) {
                                    obj.gender =
                                      await Services.Utils.remove_whitespace_from_string(
                                        obj.gender
                                      );
                                    if (
                                      ["M", "m", "Male", "male"].includes(
                                        obj.gender
                                      )
                                    ) {
                                      obj.gender = "male";
                                    } else if (
                                      ["F", "f", "Female", "female"].includes(
                                        obj.gender
                                      )
                                    ) {
                                      obj.gender = "female";
                                    } else if (
                                      [
                                        "T",
                                        "t",
                                        "Transgender",
                                        "transgender",
                                      ].includes(obj.gender)
                                    ) {
                                      obj.gender = "transgender";
                                    } else if (
                                      ["O", "o", "others", "others"].includes(
                                        obj.gender
                                      )
                                    ) {
                                      obj.gender = "others";
                                    } else {
                                      delete obj.gender;
                                    }
                                  }

                                  Object.keys(obj).forEach((key) => {
                                    if (obj[key] === null) {
                                      delete obj[key];
                                    }
                                  });

                                  if (obj) {
                                    obj.is_imported = "Y";
                                    Object.keys(obj).forEach((key) => {
                                      if (obj[key] === null) {
                                        delete obj[key];
                                      }
                                    });

                                    try {
                                      if (obj.firstName && obj.email) {
                                        obj.email = obj.email.toLowerCase();
                                        obj.email =
                                          await Services.Utils.remove_whitespace_from_string(
                                            obj.email
                                          );

                                        if (obj.youtube_username) {
                                          obj.youtube_username =
                                            Services.Utils.make_valid_social_media_username(
                                              obj.youtube_username
                                            );
                                        }

                                        if (obj.tiktok_username) {
                                          obj.tiktok_username =
                                            Services.Utils.make_valid_social_media_username(
                                              obj.tiktok_username
                                            );
                                        }

                                        if (obj.twitter_username) {
                                          obj.twitter_username =
                                            Services.Utils.make_valid_social_media_username(
                                              obj.twitter_username
                                            );
                                        }

                                        if (obj.facebook_username) {
                                          obj.facebook_username =
                                            Services.Utils.make_valid_social_media_username(
                                              obj.facebook_username
                                            );
                                        }

                                        if (obj.instagram_username) {
                                          obj.instagram_username =
                                            Services.Utils.make_valid_social_media_username(
                                              obj.instagram_username
                                            );
                                        }

                                        if (obj.pinterest_username) {
                                          obj.pinterest_username =
                                            Services.Utils.make_valid_social_media_username(
                                              obj.pinterest_username
                                            );
                                        }

                                        if (obj.linkedin_username) {
                                          obj.linkedin_username =
                                            Services.Utils.make_valid_social_media_username(
                                              obj.linkedin_username
                                            );
                                        }

                                        if (obj.snapchat_username) {
                                          obj.snapchat_username =
                                            Services.Utils.make_valid_social_media_username(
                                              obj.snapchat_username
                                            );
                                        }

                                        let query = {};
                                        query.email = obj.email;
                                        query.isDeleted = false;
                                        let get_users = await Users.findOne(
                                          query
                                        );

                                        if (!get_users) {
                                          obj.addedBy = req.identity.id;
                                          obj.role = "influencers";
                                          obj.fullName = obj.firstName;
                                          let create_users = await Users.create(
                                            obj
                                          ).fetch();
                                          if (create_users) {
                                            if (
                                              ["influencers"].includes(
                                                create_users.role
                                              )
                                            ) {
                                              influencers_ids_arr.push(
                                                create_users.id
                                              );
                                            }
                                          }
                                          imported++;
                                        }
                                      }
                                    } catch (err) {
                                      console.log(err, "err");
                                    }
                                  }
                                } catch (err) {
                                  // return res.status(404).json({
                                  //   success: false,
                                  //   error: {
                                  //     code: 404,
                                  //     message: constants.COMMON.SERVER_ERROR,
                                  //   },
                                  // });
                                  console.log(err, "err2222");
                                }
                              }
                            }
                            counter++;
                          }
                          let msg = `${imported}/${totalRecords} records imported successfully.`;
                          // Services.UserServices.updating_influencer_social_media_data_with_chunks(influencers_ids_arr);
                          if (csvFilePath) {
                            fs.unlink(csvFilePath, (err, data) => {
                              return res.status(200).json({
                                success: true,
                                message: msg,
                              });
                            });
                          } else {
                            return res.status(200).json({
                              success: true,
                              message: msg,
                            });
                          }
                        } else {
                          let msg = "No record found in file.";
                          if (csvFilePath) {
                            fs.unlink(csvFilePath, (err, data) => {
                              return res.status(200).json({
                                success: true,
                                message: msg,
                              });
                            });
                          } else {
                            return res.status(200).json({
                              success: true,
                              message: msg,
                            });
                          }
                        }
                      });
                    }
                  }
                }); //end of loop
              } else {
                return res.status(404).json({
                  success: false,
                  error: {
                    code: 404,
                    message: constants.user.INVALID_FILE_TYPE,
                  },
                });
              }
            });
          }
        );
    } catch (err) {
      console.log(err);
      return res
        .status(500)
        .json({ success: false, error: { code: 500, message: "" + err } });
    }
  },

  importBrand: async (req, res) => {
    try {
      req
        .file("file")
        .upload(
          { maxBytes: 10485760, dirname: "../../assets/csv" },
          async (err, file) => {
            if (err) {
              if (err.code == "E_EXCEEDS_UPLOAD_LIMIT") {
                return res.status(404).json({
                  success: false,
                  error: {
                    code: 404,
                    message: "Image size must be less than 10 MB",
                  },
                });
              }
            }

            var responseData = {};

            file.forEach(async (element, index) => {
              typeArr = element.type.split("/");
              fileExt = typeArr[1];

              // console.log(fileExt, '================fileExt');
              if (
                fileExt ==
                "vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                fileExt == "vnd.ms-excel"
              ) {
                let name = `${file[index].fd.split("/csv")[1]}`;
                fs.readFile(file[index].fd, async (err, data) => {
                  if (err) {
                    return res.status(403).json({
                      success: false,
                      error: {
                        code: 403,
                        message: err,
                      },
                    });
                  } else {
                    if (data) {
                      var path = file[index].fd;

                      if (
                        fileExt ==
                        "vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      ) {
                        fileExt = "xlsx";
                      }

                      responseData.fullpath = `${name}`;
                      const csvFilePath = `assets/csv${name}`;
                      readXlsxFile(csvFilePath).then(async (rows) => {
                        // `rows` is an array of rows
                        // each row being an array of cells.
                        totalRecords = 0;
                        imported = 0;
                        existed = 0;
                        var counter = 0;
                        var labels = [];

                        if (rows && rows.length > 0) {
                          for await (let itm of rows) {
                            if (counter == 0) {
                              labels = itm;
                            } else {
                              if (itm && itm.length > 0) {
                                var index = 0;
                                totalRecords++;
                                var obj = {};
                                for await (let data of itm) {
                                  let keyLabel = labels[index];

                                  if (keyLabel == "Brand Name") {
                                    obj.fullName = data;
                                  }
                                  if (keyLabel == "Email") {
                                    obj.email = data;
                                  }
                                  if (keyLabel == "DialCode") {
                                    obj.dialCode = data;
                                  }
                                  if (keyLabel == "MobileNo") {
                                    obj.mobileNo = data;
                                  }

                                  index++;
                                }

                                try {
                                  Object.keys(obj).forEach((key) => {
                                    if (obj[key] === null) {
                                      delete obj[key];
                                    }
                                  });

                                  if (obj) {
                                    obj.is_imported = "Y";
                                    Object.keys(obj).forEach((key) => {
                                      if (obj[key] === null) {
                                        delete obj[key];
                                      }
                                    });
                                    if (obj.dialCode && obj.mobileNo) {
                                      let get_country_data =
                                        await Services.CommonServices.get_country_code_with_dial_code(
                                          obj.dialCode
                                        );

                                      if (get_country_data) {
                                        obj.phone = {
                                          countryCode: get_country_data.a2,
                                          dialCode: obj.dialCode
                                            ? `+${obj.dialCode}`
                                            : "",
                                          number: `${obj.mobileNo}`,
                                        };
                                      }
                                    }

                                    obj.dialCode = obj.dialCode
                                      ? `+${obj.dialCode}`
                                      : "";
                                    obj.email = obj.email.toLowerCase();
                                    try {
                                      if (obj.email && obj.fullName) {
                                        let query = {};
                                        query.email = obj.email;
                                        query.isDeleted = false;
                                        let get_users = await Users.findOne(
                                          query
                                        );
                                        if (!get_users) {
                                          obj.addedBy = req.identity.id;
                                          obj.role = "brand";
                                          const password =
                                            await Services.CommonServices.generatePassword();
                                          obj.password = password;
                                          obj.isVerified = "Y";
                                          obj.my_code =
                                            Services.Referral.generate_referal_code();
                                          let create_users = await Users.create(
                                            obj
                                          ).fetch();
                                          if (create_users) {
                                            let email_roles = ["brand"];
                                            if (
                                              email_roles.includes(
                                                create_users.role
                                              )
                                            ) {
                                              let email_payload = {
                                                email: create_users.email,
                                                firstName:
                                                  create_users.firstName,
                                                password: password,
                                                user_id: create_users.id,
                                              };
                                              await Emails.OnboardingEmails.add_user_email(
                                                email_payload
                                              );
                                            }
                                            imported++;
                                          }
                                        }
                                      }
                                    } catch (err) {
                                      console.log(err, "err");
                                    }
                                  }
                                } catch (err) {
                                  console.log(err);
                                }
                              }
                            }
                            counter++;
                          }
                          let msg = `${imported}/${totalRecords} records imported successfully.`;
                          if (csvFilePath) {
                            fs.unlink(csvFilePath, (err, data) => {
                              return res.status(200).json({
                                success: true,
                                message: msg,
                              });
                            });
                          } else {
                            return res.status(200).json({
                              success: true,
                              message: msg,
                            });
                          }
                        } else {
                          let msg = "No record found in file.";
                          if (csvFilePath) {
                            fs.unlink(csvFilePath, (err, data) => {
                              return res.status(200).json({
                                success: true,
                                message: msg,
                              });
                            });
                          } else {
                            return res.status(200).json({
                              success: true,
                              message: msg,
                            });
                          }
                        }
                      });
                    }
                  }
                }); //end of loop
              } else {
                return res.status(404).json({
                  success: false,
                  error: {
                    code: 404,
                    message: constants.user.INVALID_FILE_TYPE,
                  },
                });
              }
            });
          }
        );
    } catch (err) {
      console.log(err);
      return res
        .status(500)
        .json({ success: false, error: { code: 500, message: "" + err } });
    }
  },

  updateBasicDetails: async (req, res) => {
    try {
      let validation_result =
        await Validations.UserValidations.updateBasicDetails(req, res);

      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }

      req.body.updatedBy = req.identity.id;
      let update_user = await Users.updateOne({ id: req.body.id }, req.body);
      if (update_user) {
        return response.success(null, constants.user.UPDATED_USER, req, res);
      }
      throw constants.user.INVALID_ID;
    } catch (error) {
      return response.failed(null, `${error}`, req, res);
    }
  },

  getUserByEmail: async (req, res) => {
    try {
      if (!req.query.email) {
        throw constants.user.EMAIL_REQUIRED;
      }

      let get_user = await Users.findOne({
        where: {
          email: req.query.email.toLowerCase(),
          isDeleted: false,
          role: { in: ["influencers"] },
        },
        select: [
          "email",
          "role",
          "firstName",
          "lastName",
          "fullName",
          "image",
          "logo",
          "banner_image",
        ],
      });

      if (get_user) {
        return response.success(get_user, constants.COMMON.SUCCESS, req, res);
      }

      throw constants.user.USER_NOT_FOUND;
    } catch (error) {
      return response.failed(null, `${error}`, req, res);
    }
  },

  userSocialLogin: async (req, res) => {
    try {
      let validation_result = await Validations.UserValidations.userSocialLogin(
        req,
        res
      );

      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }

      let new_date = new Date();
      let { email, role, facebook_auth_id, google_auth_id, device_token } =
        req.body;
      let query = { isDeleted: false };
      if (email) {
        query.email = email.toLowerCase();
        req.body.email = email.toLowerCase();
      } else if (facebook_auth_id) {
        query.facebook_auth_id = facebook_auth_id;
      } else if (google_auth_id) {
        query.google_auth_id = google_auth_id;
        if (!email) {
          throw constants.user.EMAIL_REQUIRED;
        }
      }

      query.role = role;

      let get_user = await Users.findOne(query);

      // -------------- If user found then login user -----------//
      if (get_user) {
        if (get_user && get_user.status == "deactive") {
          throw constants.user.USERNAME_DEACTIVE;
        }

        let token = jwt.sign(
          { user_id: get_user.id, firstName: get_user.firstName },
          { issuer: "upfilly", subject: get_user.email, audience: "upfilly" }
        );
        let refreshToken = jwt.sign(
          { user_id: get_user.id },
          { issuer: "refresh", subject: "user", audience: "upfilly" }
        );

        get_user.access_token = token;
        get_user.refresh_token = refreshToken;

        let updated_payload = {
          last_login: new_date,
        };

        if (device_token) {
          updated_payload.device_token = device_token;
        }

        delete get_user.stripe_customer_id;
        delete get_user.isVerified;
        delete get_user.status;

        return response.success(
          get_user,
          constants.user.SUCCESSFULLY_LOGGEDIN,
          req,
          res
        );
      }
      // -------------- If user found then login user -----------//

      // -------------- If user not found then creating users -----------//

      req.body.date_registered = new_date;
      req.body.status = "active";
      req.body.isVerified = "Y";
      req.body.my_code = Services.Referral.generate_referal_code();

      if (req.body.firstName && req.body.lastName) {
        req.body["fullName"] = req.body.firstName + " " + req.body.lastName;
      } else if (req.body.name) {
        req.body["fullName"] = req.body.name;
      }

      let newUser = await Users.create(req.body).fetch();
      if (newUser) {
        let token = jwt.sign(
          { user_id: newUser.id, firstName: newUser.firstName },
          { issuer: "upfilly", subject: newUser.email, audience: "upfilly" }
        );
        let refreshToken = jwt.sign(
          { user_id: newUser.id },
          { issuer: "refresh", subject: "user", audience: "upfilly" }
        );

        newUser.access_token = token;
        newUser.refresh_token = refreshToken;

        let updated_payload = {
          last_login: new_date,
        };

        if (device_token) {
          updated_payload.device_token = device_token;
        }

        delete newUser.stripe_customer_id;
        delete newUser.isVerified;
        delete newUser.status;

        return response.success(
          newUser,
          constants.user.SUCCESSFULLY_LOGGEDIN,
          req,
          res
        );
      }
      // -------------- If user not found then creating users -----------//

      throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
      return response.failed(null, `${error}`, req, res);
    }
  },

  deleteUserWithoutAuth: async (req, res) => {
    try {
      let id = req.param("id");
      if (!id) {
        throw constants.user.ID_REQUIRED;
      }

      const delete_user = await Users.updateOne(
        { id: id },
        { isDeleted: true }
      );
      if (delete_user) {
        return response.success(null, constants.user.USER_DELETED, req, res);
      }
      throw constants.user.INVALID_ID;
    } catch (err) {
      return response.failed(null, `${err}`, req, res);
    }
  },

  googleLoginAuthentication: async (req, res) => {
    try {
      let oAuth2Client = new OAuth2Client({
        clientId: constant.GOOGLE_LOGIN.GOOGLE_CLIENT_ID,
        clientSecret: constant.GOOGLE_LOGIN.GOOGLE_CLIENT_SECRET,
        redirectUri: constant.GOOGLE_LOGIN.GOOGLE_LOGIN_REDIRECT,
      });
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/userinfo.email",
        ],
        prompt: "consent",
      });
      return res.status(200).json({
        success: true,
        data: authUrl,
      });
    } catch (err) {
      console.log(err, "err");
      return res.status(500).json({
        success: false,
        error: { code: 500, message: "" + err },
      });
    }
  },

  googleLogin: async (req, res) => {
    try {
      let oAuth2Client = new OAuth2Client({
        clientId: constant.GOOGLE_LOGIN.GOOGLE_CLIENT_ID,
        clientSecret: constant.GOOGLE_LOGIN.GOOGLE_CLIENT_SECRET,
        redirectUri: req.header("Referer")
          ? req.header("Referer") + "login"
          : constant.GOOGLE_LOGIN.GOOGLE_LOGIN_REDIRECT,
      });
      const { tokens } = await oAuth2Client.getToken(req.query.authCode);
      const accessToken = tokens.access_token;
      // Set the access token obtained from the authorization step
      let oauth2Client = new google.auth.OAuth2(); // create new auth client
      oauth2Client.setCredentials({ access_token: accessToken }); // use the new auth client with the access_token
      let oauth2 = google.oauth2({
        auth: oauth2Client,
        version: "v2",
      });

      let { data } = await oauth2.userinfo.get();

      // let userQuery = {}
      // userQuery.isDeleted = false
      // userQuery.$or = [
      //   { googleLoginId: { $regex: data.id, $options: 'i' } },
      //   { email: { $regex: data.email, $options: 'i' } }
      //   // Add more fields as needed
      // ];

      let new_date = new Date();
      let { campaign_unique_id, device_token } = req.body;
      let query = { isDeleted: false };
      if (data.email) {
        query.email = data.email.toLowerCase();
        req.body.email = data.email.toLowerCase();
      } else if (data.id) {
        query.google_auth_id = data.id;
      }

      if (campaign_unique_id && campaign_unique_id != "") {
        req.body.role = "affiliate";
      } else {
        req.body.role = "brand";
      }

      query.role = req.body.role;

      let get_user = await Users.findOne(query);

      // -------------- If user found then login user -----------//
      if (get_user) {
        if (get_user && get_user.status == "deactive") {
          throw constants.user.USERNAME_DEACTIVE;
        }

        let token = jwt.sign(
          { user_id: get_user.id, firstName: get_user.firstName },
          { issuer: "upfilly", subject: get_user.email, audience: "upfilly" }
        );
        let refreshToken = jwt.sign(
          { user_id: get_user.id },
          { issuer: "refresh", subject: "user", audience: "upfilly" }
        );

        get_user.access_token = token;
        get_user.refresh_token = refreshToken;

        let updated_payload = {
          last_login: new_date,
        };

        if (device_token) {
          updated_payload.device_token = device_token;
        }

        delete get_user.stripe_customer_id;
        delete get_user.isVerified;
        delete get_user.status;

        return response.success(
          get_user,
          constants.user.SUCCESSFULLY_LOGGEDIN,
          req,
          res
        );
      }
      // -------------- If user found then login user -----------//

      // -------------- If user not found then creating users -----------//

      req.body.date_registered = new_date;
      req.body.status = "active";
      req.body.isVerified = "Y";
      req.body.my_code = Services.Referral.generate_referal_code();
      req.body.firstName = data.given_name;
      req.body.lastName = data.family_name;

      if (data.given_name && data.family_name) {
        req.body["fullName"] = data.given_name + " " + data.family_name;
      } else if (req.body.fullName) {
        req.body["fullName"] = data.given_name;
      }

      if (["affiliate"].includes(req.body.role)) {
        let default_affiliate_group = await AffiliateManagement.findOne({
          isDefaultAffiliateGroup: true,
          isDeleted: false,
          status: "active",
        });
        if (default_affiliate_group) {
          req.body.affiliate_group = default_affiliate_group.id;
        }
      }

      let newUser = await Users.create(req.body).fetch();
      if (newUser) {
        let token = jwt.sign(
          { user_id: newUser.id, firstName: newUser.firstName },
          { issuer: "upfilly", subject: newUser.email, audience: "upfilly" }
        );
        let refreshToken = jwt.sign(
          { user_id: newUser.id },
          { issuer: "refresh", subject: "user", audience: "upfilly" }
        );

        newUser.access_token = token;
        newUser.refresh_token = refreshToken;

        let updated_payload = {
          last_login: new_date,
        };

        if (device_token) {
          updated_payload.device_token = device_token;
        }

        delete newUser.stripe_customer_id;
        delete newUser.isVerified;
        delete newUser.status;

        return response.success(
          newUser,
          constants.user.SUCCESSFULLY_LOGGEDIN,
          req,
          res
        );
      }

      /**---------------------------------------------------------------------------------------- */

      // let user = await db.users.findOne(userQuery).populate('role').populate('subRole')
      // if (user) {
      //   const token = jwt.sign(
      //     { id: user.id, role: user.role },
      //     process.env.JWT_SECRET,
      //     {
      //       expiresIn: '3000h',
      //     }
      //   );
      //   var userdata;
      //   userdata = Object.assign({}, user._doc);
      //   userdata['access_token'] = token;
      //   const updatedUser = await db.users.updateOne(
      //     { _id: userdata.id },
      //     { lastLogin: new Date() }
      //   );
      //   return res.status(200).json({
      //     success: true,
      //     message: constants.onBoarding.LOGIN_SUCCESS,
      //     data: userdata,
      //   });
      // } else {
      //   let newUser = {}
      //   const date = new Date();
      //   newUser['status'] = 'active';
      //   newUser['role'] = "64b15102b14de6c28838f7d2"
      //   newUser.firstName = data.given_name
      //   newUser.lastName = data.family_name
      //   if (data.name) {
      //     newUser.fullName = data.name
      //   }
      //   const password = data.id
      //   newUser.password = await bcrypt.hashSync(
      //     password,
      //     bcrypt.genSaltSync(10)
      //   );
      //   newUser.isVerified = 'Y';
      //   newUser.createdAt = new Date();
      //   newUser.updatedAt = new Date();
      //   newUser.isDeleted = false;
      //   newUser.email = data.email.toLowerCase();
      //   newUser.googleLoginId = data.id

      //   let createdUser = await db.users.create(newUser)
      //   var registeredUser = await Users.findById(createdUser.id ? createdUser.id : createdUser._id).populate('role').populate('subRole')
      //   const token = jwt.sign(
      //     { id: registeredUser.id, role: registeredUser.role },
      //     process.env.JWT_SECRET,
      //     {
      //       expiresIn: '3000h',
      //     }
      //   );
      //   var userdata;
      //   userdata = Object.assign({}, registeredUser._doc);
      //   userdata['access_token'] = token;
      //   userdata["social_login"] = true
      //   const updatedUser = await db.users.updateOne(
      //     { _id: userdata.id },
      //     { lastLogin: new Date() }
      //   );
      //   return res.status(200).json({
      //     success: true,
      //     message: constants.onBoarding.LOGIN_SUCCESS,
      //     data: userdata,
      //   });
      // }
    } catch (err) {
      console.log(err, "err");
      return res.status(500).json({
        success: false,
        error: { code: 500, message: "" + err },
      });
    }
  },
  getAllUsers: async (req, res) => {
    try {
      let page = req.param("page") || 1;
      let count = req.param("count") || 10;
      let {
        search,
        role,
        isDeleted,
        status,
        sortBy,
        lat,
        lng,
        isTrusted,
        isFeatured,
        createBybrand_id,
        start_date,
        end_date,
        affiliate_group_id,
        cat_type,
        affiliate_type,
        invite_status,
        sub_category_id,
        category_id,
        sub_child_category_id,
        addedBy,
        request_status
      } = req.query;
      let skipNo = (Number(page) - 1) * Number(count);
      let query = { isDeleted: false };

      if (search) {
        search = await Services.Utils.remove_special_char_exept_underscores(
          search
        );
        query.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { affiliate_code: { $regex: search, $options: "i" } },
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { mobileNo: { $regex: search, $options: "i" } },
          { work_phone: { $regex: search, $options: "i" } },
        ];
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

      if (req.identity.role == "admin") {
        query.role = { $nin: ["admin"] };
      } else {
        query.role = { $nin: ["admin", "team", ""] };
      }

      if (role) {
        query.role = role;
        if (role === "affiliate") {
          var lookupPipelineForbrandoraffiliate = {
            $lookup: {
              from: "affiliatebrandinvite",
              let: {
                affiliate_id: "$_id",
                isDeleted: false,
                brand_id: new ObjectId(req.identity.id),
              },
              // let: { user_id: "$req.identity.id", fav_user_id: new ObjectId("64d076e86ecebee01af09d8c") },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$brand_id", "$$brand_id"] },
                        { $eq: ["$isDeleted", "$$isDeleted"] },
                        { $eq: ["$affiliate_id", "$$affiliate_id"] },
                      ],
                    },
                  },
                },
              ],
              as: "invite_affiliate_details",
            },
          };
          var upwindPipelineForBrandoraffiliate = {
            $unwind: {
              path: "$invite_affiliate_details",
              preserveNullAndEmptyArrays: true,
            },
          };
        } else {
          var lookupPipelineForbrandoraffiliate = {
            $lookup: {
              from: "affiliatebrandinvite",
              let: {
                affiliate_id: new ObjectId(req.identity.id),
                isDeleted: false,
                brand_id: "$_id",
              },
              // let: { user_id: "$req.identity.id", fav_user_id: new ObjectId("64d076e86ecebee01af09d8c") },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$brand_id", "$$brand_id"] },
                        { $eq: ["$isDeleted", "$$isDeleted"] },
                        { $eq: ["$affiliate_id", "$$affiliate_id"] },
                      ],
                    },
                  },
                },
              ],
              as: "invite_affiliate_details",
            },
          };
          var upwindPipelineForBrandoraffiliate = {
            $unwind: {
              path: "$invite_affiliate_details",
              preserveNullAndEmptyArrays: true,
            },
          };
        }
      }
      if (status) {
        query.status = status;
      }
      if (invite_status) {
        query.invite_status = invite_status;
      }

      if (affiliate_type) {
        query.affiliate_type = affiliate_type;
      }

      if (request_status) {
        query.request_status = request_status;
      }


      if (isDeleted) {
        query.isDeleted = isDeleted
          ? isDeleted === "true"
          : true
            ? isDeleted
            : false;
      }

      if (isTrusted) {
        query.isTrusted = isTrusted
          ? isTrusted === "true"
          : true
            ? isTrusted
            : false;
      }

      if (isFeatured) {
        query.isFeatured = isFeatured
          ? isFeatured === "true"
          : true
            ? isFeatured
            : false;
      }

      if (createBybrand_id) {
        query.createdByBrand = new ObjectId(createBybrand_id);
      }

      if (addedBy) {
        query.addedBy = new ObjectId(addedBy);
      }

      if (category_id) {
        query.category_id = new ObjectId(category_id);
      }
      if (sub_child_category_id) {
        query.sub_child_category_id = new ObjectId(sub_child_category_id);
      }
      if (sub_category_id) {
        query.sub_category_id = new ObjectId(sub_category_id);
      }

      if (cat_type) {
        query.cat_type = cat_type;
      }

      // if (start_date && end_date) {
      //   query.createdAt = {
      //     $gte: new Date(start_date),
      //     $lte: new Date(end_date)
      //   }
      // }

      if (start_date && end_date) {
        var date = new Date(start_date);
        date.setDate(date.getDate());
        var Enddate = new Date(end_date);
        Enddate.setDate(Enddate.getDate() + 1);
        query.$and = [
          { createdAt: { $gte: date } },
          { createdAt: { $lte: Enddate } },
        ];
      }

      if (affiliate_group_id) {
        query.affiliate_group = {
          $in: await string_ids_toObjectIds_array(affiliate_group_id),
        };
      }
      // if (role != "users") {
      //   query.addedBy = { $eq: null };
      // }
      // console.log(JSON.stringify(query), '===========query');
      let pipeline = [
        {
          $lookup: {
            from: "affiliatemanagement",
            localField: "affiliate_group",
            foreignField: "_id",
            as: "affiliate_group_details",
          },
        },
        {
          $unwind: {
            path: "$affiliate_group_details",
            preserveNullAndEmptyArrays: true,
          },
        },

        role && role === "brand"
          ? {
            $lookup: {
              from: "affiliatebrandinvite",
              let: {
                affiliate_id: "$_id",
                isDeleted: false,
                brand_id: new ObjectId(req.identity.id),
              },
              // let: { user_id: "$req.identity.id", fav_user_id: new ObjectId("64d076e86ecebee01af09d8c") },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$brand_id", "$$brand_id"] },
                        { $eq: ["$isDeleted", "$$isDeleted"] },
                        { $eq: ["$affiliate_id", "$$affiliate_id"] },
                      ],
                    },
                  },
                },
              ],
              as: "invite_affiliate_details",
            },
          }
          : {
            $lookup: {
              from: "affiliatebrandinvite",
              let: {
                affiliate_id: new ObjectId(req.identity.id),
                isDeleted: false,
                brand_id: "$_id",
              },
              // let: { user_id: "$req.identity.id", fav_user_id: new ObjectId("64d076e86ecebee01af09d8c") },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$brand_id", "$$brand_id"] },
                        { $eq: ["$isDeleted", "$$isDeleted"] },
                        { $eq: ["$affiliate_id", "$$affiliate_id"] },
                      ],
                    },
                  },
                },
              ],
              as: "invite_affiliate_details",
            },
          },
        {
          $unwind: {
            path: "$invite_affiliate_details",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $lookup: {
            from: "commoncategories",
            localField: "category_id",
            foreignField: "_id",
            as: "categories_details",
          },
        },
        {
          $unwind: {
            path: "$categories_details",
            preserveNullAndEmptyArrays: true,
          },
        },
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
          logo: "$logo",
          address: "$address",
          country: "$country",

          canChangeProjectStatus: "$canChangeProjectStatus",
          mobileNo: "$mobileNo",
          work_phone: "$work_phone",
          affiliate_code: "$affiliate_code",
          affiliate_type: "$affiliate_type",
          social_media_platforms: "$social_media_platforms",
          createdByBrand: "$createdByBrand",
          affiliate_group: "$affiliate_group",
          affiliate_group_name: "$affiliate_group_details.group_name",
          invite_status: {
            $cond: [
              { $ifNull: ["$invite_affiliate_details.status", false] },
              "$invite_affiliate_details.status",
              "not_invited",
            ],
          },
          invite_affiliate_details_status: "$invite_affiliate_details.status",
          status: "$status",
          createdAt: "$createdAt",
          updatedAt: "$updatedAt",
          isDeleted: "$isDeleted",
          addedBy: "$addedBy",
          location: "$location",
          isFeatured: "$isFeatured",
          isTrusted: "$isTrusted",
          category_id: "$category_id",
          cat_type: "$categories_details.cat_type",
          sub_category_id: "$sub_category_id",
          sub_child_category_id: "$sub_child_category_id",
          request_status: "$request_status"
        },
      };
      pipeline.push(projection);
      pipeline.push({
        $match: query,
      });
      pipeline.push({
        $sort: sortquery,
      });
      if (lat && lng) {
        pipeline.unshift({
          $geoNear: {
            near: { type: "Point", coordinates: [Number(lng), Number(lat)] },
            distanceField: "dist.calculated",
            maxDistance: 200 * 1000, // in km to meter
            distanceMultiplier: 1 / 1000, // in km
            query: { isDeleted: false },
            spherical: true,
          },
        });
      }
      let totalResult = await db.collection("users")
        .aggregate(pipeline)
        .toArray();
      pipeline.push({
        $skip: Number(skipNo),
      });
      pipeline.push({
        $limit: Number(count),
      });

      let result = await db.collection("users")
        .aggregate(pipeline)
        .toArray();
      let resData = {
        total: totalResult ? totalResult.length : 0,
        data: result ? result : [],
      };
      if (!req.param("page") && !req.param("count")) {
        resData.data = totalResult ? totalResult : [];
      }
      return response.success(
        resData,
        constants.user.FETCHED_ALL,
        req,
        res
      );

    } catch (error) {
      // console.log(error, "---err");
      return response.failed(null, `${error}`, req, res);
    }
  },

  //This api is used in admin side because now affiliate and brand request is sent to admin
  updateRequestStatus: async (req, res) => {
    try {
      var id = req.param("id");
      var status = req.param("status");
      var reason = req.body.reason;

      if (!id) {
        throw constants.user.ID_REQUIRED;
      }

      let updateStatus = await Users.updateOne({ id: id }, { request_status: status, reason: reason });
      if (updateStatus) {
        let email_payload = {
          id: updateStatus.id,
          reason: updateStatus.reason,
          status: updateStatus.request_status,
        };

        await Emails.OnboardingEmails.changeRequestStatus(email_payload);

        return res.status(200).json({
          success: true,
          message: `Request ${updateStatus.request_status} successfully`,
          data: updateStatus
        });
      }
      throw constants.user.INVALID_ID;

    } catch (err) {
      console.log(err);
      return res.status(400).json({
        success: false,
        error: { message: err },
      });
    }
  }
};
