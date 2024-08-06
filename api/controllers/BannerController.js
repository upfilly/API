/**
 * BannerController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const response = require("../services/Response");
const constants = require("../../config/constants").constants;
const db = sails.getDatastore().manager;
const Validations = require("../Validations/index");
const Services = require("../services/index");
const ObjectId = require("mongodb").ObjectId;
const Emails = require("../Emails/index");

exports.addBanner = async (req, res) => {
  try {

    let validation_result = await Validations.Banner.addBanner(req, res);

    if (validation_result && !validation_result.success) {
      throw validation_result.message;
    }

    let {
      title,
      activation_date,
      availability_date,
      expiration_date,
      category_id,
      access_type,
      affiliate_id
    } = req.body;

    let query = {};
    query.title = title.toLowerCase();
    query.isDeleted = false;

    let get_banner = await Banner.findOne(query);

    if (get_banner) {
      throw constants.BANNER.ALREADY_EXIST;
    }

    if (category_id) {

      let get_category = await CommonCategories.findOne({ id: category_id });

      if (!get_category) {
        throw constants.BANNER.INVALID_CATEGORY;
      }
    }

    let query1 = {
      addedBy: req.identity.id,
      status: "accepted",
      isDeleted: false,
    };

    let query2 = {
      brand_id: req.identity.id,
      status: "accepted",
      isDeleted: false,
    };

    let listOfAcceptedInvites = await AffiliateInvite.find(query1);

    let listOfBrandInvite = await AffiliateBrandInvite.find(query2);

    function removeDuplicates(array, key) {
      const seen = new Set();
      return array.filter((item) => {
        const keyValue = item[key];
        if (seen.has(keyValue)) {
          return false;
        }
        seen.add(keyValue);
        return true;
      });
    }

    let combinedList = [...listOfBrandInvite, ...listOfAcceptedInvites];

    listOfAcceptedInvites = removeDuplicates(combinedList, "affiliate_id");

    req.body.addedBy = req.identity.id;

    req.body.title = req.body.title.toLowerCase();

    if (activation_date) {
      req.body.activation_date = new Date(activation_date);
    }

    if (availability_date) {
      req.body.availability_date = new Date(availability_date);
    }

    if (expiration_date) {
      req.body.expiration_date = new Date(expiration_date);
    }

    let add_detail = await Banner.create(req.body).fetch();

    if(access_type === "public"){

    for (let affiliate of listOfAcceptedInvites) {
      let findUser = await Users.findOne({
        id: affiliate.affiliate_id,
        isDeleted: false,
      });
  
      let emailPayload = {
        brandFullName: req.identity.fullName,
        affiliateFullName: findUser.fullName,
        affiliateEmail: findUser.email,
      };

      await Emails.AffiliateBanner.sendEmailAffiliateBanner(emailPayload);

      await AffiliateBanners.create({
        affiliate_id: affiliate.affiliate_id,
        banner_id: add_detail.id,
        addedBy: req.identity.id,
        updatedBy: req.identity.id,
        access_type:req.body.access_type
      });

    }
  }else{
    
    let findUser = await Users.findOne({
      id: affiliate_id,
      isDeleted: false,
    });

    let emailPayload = {
      brandFullName: req.identity.fullName,
      affiliateFullName: findUser.fullName,
      affiliateEmail: findUser.email,
    };

    await Emails.AffiliateBanner.sendEmailAffiliateBanner(emailPayload);

    await AffiliateBanners.create({
      affiliate_id: findUser.id,
      banner_id: add_detail.id,
      addedBy: req.identity.id,
      updatedBy: req.identity.id,
      access_type:req.body.access_type
    });
  
  }
    if (add_detail) {
      return response.success(add_detail, constants.BANNER.ADDED, req, res);
    }
    throw constants.COMMON.SERVER_ERROR;
  } catch (err) {
    console.log(err, "err");
    return response.failed(null, `${err}`, req, res);
  }
};

exports.editBanner = async (req, res) => {
  try {
    let validation_result = await Validations.Banner.editBanner(req, res);

    if (validation_result && !validation_result.success) {
      throw validation_result.message;
    }

    let { title, id, activation_date, availability_date, expiration_date } =
      req.body;

    let query = {
      title: title.toLowerCase(),
      isDeleted: false,
      id: { "!=": id },
    };

    let name_exist = await Banner.findOne(query);
    if (name_exist) {
      throw constants.BANNER.ALREADY_EXIST;
    }

    req.body.updatedBy = req.identity.id;
    req.body.title = req.body.title.toLowerCase();

    if (activation_date) {
      req.body.activation_date = new Date(activation_date);
    }

    if (availability_date) {
      req.body.availability_date = new Date(availability_date);
    }

    if (expiration_date) {
      req.body.expiration_date = new Date(expiration_date);
    }

    let get_banner = await Banner.findOne({ id: id, isDeleted: false });
    if (!get_banner) {
      throw constants.BANNER.INVALID_ID;
    }

    await AffiliateBanners.update({ banner_id: id }, { isDeleted: true });

    let query1 = {
      addedBy: req.identity.id,
      status: "accepted",
      isDeleted: false,
    };
    let query2 = {
      brand_id: req.identity.id,
      status: "accepted",
      isDeleted: false,
    };

    // console.log(query1);
    let listOfAcceptedInvites = await AffiliateInvite.find(query1);
    let listOfBrandInvite = await AffiliateBrandInvite.find(query2);

    function removeDuplicates(array, key) {
      const seen = new Set();
      return array.filter((item) => {
        const keyValue = item[key];
        if (seen.has(keyValue)) {
          return false;
        }
        seen.add(keyValue);
        return true;
      });
    }

    let combinedList = [...listOfBrandInvite, ...listOfAcceptedInvites];
    listOfAcceptedInvites = removeDuplicates(combinedList, "affiliate_id");

    req.body.addedBy = req.identity.id;
    req.body.updatedBy = req.identity.id;

    let update_detail = await Banner.updateOne({ id: id }, req.body);
    if (update_detail) {
      for (let affiliate of listOfAcceptedInvites) {
        let findUser = await Users.findOne({
          id: affiliate.affiliate_id,
          isDeleted: false,
        });
        let emailPayload = {
          brandFullName: req.identity.fullName,
          affiliateFullName: findUser.fullName,
          affiliateEmail: findUser.email,
        };

        await Emails.AffiliateBanner.sendEmailAffiliateBanner(emailPayload);

        await AffiliateBanners.create({
          affiliate_id: affiliate.affiliate_id,
          banner_id: update_detail.id,
          addedBy: req.identity.id,
          updatedBy: req.identity.id,
        });
      }

      return response.success(
        update_detail,
        constants.BANNER.UPDATED,
        req,
        res
      );
    }
    throw constants.BANNER.INVALID_ID;
  } catch (err) {
    console.log(err);
    return response.failed(null, `${err}`, req, res);
  }
};

exports.getAllBanner = async (req, res) => {
  try {
    let query = {};
    let count = req.param("count") || 10;
    let page = req.param("page") || 1;

    let {
      search,
      isDeleted,
      status,
      sortBy,
      is_animation,
      is_deep_linking,
      mobile_creative,
      addedBy,
    } = req.query;
    let skipNo = (Number(page) - 1) * Number(count);

    if (search) {
      search = await Services.Utils.remove_special_char_exept_underscores(
        search
      );
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { destination_url: { $regex: search, $options: "i" } },
      ];
    }

    if (isDeleted) {
      if (isDeleted === "true") {
        isDeleted = true;
      } else {
        isDeleted = false;
      }
      query.isDeleted = isDeleted;
    } else {
      query.isDeleted = false;
    }
    if (is_animation) {
      if (is_animation === "true") {
        is_animation = true;
      } else {
        is_animation = false;
      }
      query.is_animation = is_animation;
    }
    if (is_deep_linking) {
      if (is_deep_linking === "true") {
        is_deep_linking = true;
      } else {
        is_deep_linking = false;
      }
      query.is_deep_linking = is_deep_linking;
    }
    if (mobile_creative) {
      if (mobile_creative === "true") {
        mobile_creative = true;
      } else {
        mobile_creative = false;
      }
      query.mobile_creative = mobile_creative;
    }
    if (status) {
      query.status = status;
    }

    if (addedBy) {
      query.addedBy = new ObjectId(addedBy);
    } else {
      query.addedBy = new ObjectId(req.identity.id);
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

    // Pipeline Stages
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
        title: "$title",
        destination_url: "$destination_url",
        description: "$description",
        activation_date: "$activation_date",
        availability_date: "$availability_date",
        expiration_date: "$expiration_date",
        image: "$image",
        is_animation: "$is_animation",
        is_deep_linking: "$is_deep_linking",
        is_deep_linking: "$is_deep_linking",
        mobile_creative: "$mobile_creative",
        seo_attributes: "$seo_attributes",
        category_id: "$category_id",
        categories_details: "$categories_details",
        status: "$status",
        addedBy: "$addedBy",
        addedBy_name: "$addedBy_details.fullName",
        updatedBy: "$updatedBy",
        updatedAt: "$updatedAt",
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
    // Pipeline Stages
    db.collection("banner")
      .aggregate(pipeline)
      .toArray((err, totalresult) => {
        pipeline.push({
          $skip: Number(skipNo),
        });
        pipeline.push({
          $limit: Number(count),
        });
        db.collection("banner")
          .aggregate(pipeline)
          .toArray((err, result) => {
            let resData = {
              total_count: totalresult ? totalresult.length : 0,
              data: result ? result : [],
            };
            if (!req.param("page") && !req.param("count")) {
              resData.data = totalresult ? totalresult : [];
            }
            return response.success(
              resData,
              constants.BANNER.FETCHED_ALL,
              req,
              res
            );
          });
      });
  } catch (err) {
    return response.failed(null, `${err}`, req, res);
  }
};

exports.getById = async (req, res) => {
  try {
    let id = req.param("id");
    if (!id) {
      throw constants.BANNER.ID_REQUIRED;
    }
    let get_detail = await Banner.findOne({ id: id }).populate("category_id");
    if (get_detail) {
      return response.success(get_detail, constants.BANNER.FETCHED, req, res);
    }
    throw constants.BANNER.INVALID_ID;
  } catch (err) {
    return response.failed(null, `${err}`, req, res);
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    let id = req.param("id");
    if (!id) {
      throw constants.BANNER.ID_REQUIRED;
    }

    const delete_detail = await Banner.updateOne(
      { id: id },
      { isDeleted: true, updatedBy: req.identity.id }
    );
    if (delete_detail) {
      return response.success(null, constants.BANNER.DELETED, req, res);
    }
    throw constants.COMMON_CATEGORIES.INVALID_ID;
  } catch (err) {
    return response.failed(null, `${err}`, req, res);
  }
};

exports.getAllAffiliateBanner = async (req, res) => {
  try {
    let query = {};
    let count = req.param("count") || 10;
    let page = req.param("page") || 1;

    let { search, isDeleted, status, sortBy, affiliate_id, addedBy } =
      req.query;
    let skipNo = (Number(page) - 1) * Number(count);

    if (search) {
      search = await Services.Utils.remove_special_char_exept_underscores(
        search
      );
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { destination_url: { $regex: search, $options: "i" } },
      ];
    }

    if (isDeleted) {
      if (isDeleted === "true") {
        isDeleted = true;
      } else {
        isDeleted = false;
      }
      query.isDeleted = isDeleted;
    } else {
      query.isDeleted = false;
    }

    // if (is_animation) {
    //   if (is_animation === "true") {
    //     is_animation = true;
    //   } else {
    //     is_animation = false;
    //   }
    //   query.is_animation = is_animation;
    // }

    // if (is_deep_linking) {
    //   if (is_deep_linking === "true") {
    //     is_deep_linking = true;
    //   } else {
    //     is_deep_linking = false;
    //   }
    //   query.is_deep_linking = is_deep_linking;
    // }

    // if (mobile_creative) {
    //   if (mobile_creative === "true") {
    //     mobile_creative = true;
    //   } else {
    //     mobile_creative = false;
    //   }
    //   query.mobile_creative = mobile_creative;
    // }

    if (status) {
      query.status = status;
    }

    if (affiliate_id) {
      query.affiliate_id = new ObjectId(affiliate_id);
    }

    if (addedBy) {
      query.addedBy = new ObjectId(addedBy);
    } else {
      query.addedBy = new ObjectId(req.identity.id);
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

    // Pipeline Stages
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
          from: "banner",
          localField: "banner_id",
          foreignField: "_id",
          as: "banner_details",
        },
      },
      {
        $unwind: {
          path: "$banner_details",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    let projection = {
      $project: {
        id: "$_id",
        affiliate_id: "$affiliate_id",
        affiliate_details: "$affiliate_details",
        addedBy_details: "$addedBy_details",
        banner_details: "$banner_details",
        banner_id: "$banner_id",
        addedBy: "$addedBy",
        updatedBy: "$updatedBy",
        updatedAt: "$updatedAt",
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
    // Pipeline Stages
    db.collection("affiliatebanners")
      .aggregate(pipeline)
      .toArray((err, totalresult) => {
        pipeline.push({
          $skip: Number(skipNo),
        });
        pipeline.push({
          $limit: Number(count),
        });
        db.collection("affiliatebanners")
          .aggregate(pipeline)
          .toArray((err, result) => {
            let resData = {
              total_count: totalresult ? totalresult.length : 0,
              data: result ? result : [],
            };
            if (!req.param("page") && !req.param("count")) {
              resData.data = totalresult ? totalresult : [];
            }
            return response.success(
              resData,
              constants.BANNER.FETCHED_ALL,
              req,
              res
            );
          });
      });
  } catch (err) {
    return response.failed(null, `${err}`, req, res);
  }
};
