/**
 * PostbackUrlController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const constants = require("../../config/constants").constants;
const response = require("../services/Response");
const db = sails.getDatastore().manager;
const ObjectId = require("mongodb").ObjectId;

/**
 * @POST /postback-url/add
 * @desc Create a new postback URL configuration
 */
exports.addPostbackUrl = async (req, res) => {
  try {
    const {
      postback_url,
      method,
      format,
      selected_keys,
      include_sub_ids,
      custom_keys,
      all_keys,
    } = req.body;

    if (!postback_url) {
      throw constants.POSTBACK_URL.URL_REQUIRED;
    }
    if (!method) {
      throw constants.POSTBACK_URL.METHOD_REQUIRED;
    }
    if (!format) {
      throw constants.POSTBACK_URL.FORMAT_REQUIRED;
    }

    // Check for existing active postback URL for this user
    const existing = await PostbackUrl.findOne({
      addedBy: req.identity.id,
      isDeleted: false,
    });

    if (existing) {
      throw constants.POSTBACK_URL.ALREADY_EXIST;
    }

    const payload = {
      postback_url,
      method,
      format,
      selected_keys: selected_keys || [],
      include_sub_ids: include_sub_ids || false,
      custom_keys: custom_keys || [],
      all_keys: all_keys || [],
      addedBy: req.identity.id,
    };

    const created = await PostbackUrl.create(payload).fetch();

    return response.success(created, constants.POSTBACK_URL.ADDED, req, res);
  } catch (error) {
    console.log(error, "==addPostbackUrl error");
    return response.failed(null, `${error}`, req, res);
  }
};

/**
 * @GET /postback-url/detail
 * @desc Get a single postback URL by id
 */
exports.getPostbackUrlById = async (req, res) => {
  try {
    const id = req.param("id");
    if (!id) {
      throw constants.POSTBACK_URL.ID_REQUIRED;
    }

    const record = await PostbackUrl.findOne({ id, isDeleted: false }).populate(
      "addedBy"
    );

    if (!record) {
      throw constants.POSTBACK_URL.NOT_FOUND;
    }

    return response.success(record, constants.POSTBACK_URL.FETCHED, req, res);
  } catch (error) {
    console.log(error, "==getPostbackUrlById error");
    return response.failed(null, `${error}`, req, res);
  }
};

/**
 * @GET /postback-url/list
 * @desc Get all postback URLs with pagination, search, and filters
 */
exports.getAllPostbackUrls = async (req, res) => {
  try {
    let query = { isDeleted: false };

    let count = Number(req.param("count")) || 10;
    let page = Number(req.param("page")) || 1;
    let skipNo = (page - 1) * count;

    const { search, status, addedBy, method, format, sortBy } = req.query;

    if (search) {
      query.$or = [
        { postback_url: { $regex: search, $options: "i" } },
        { method: { $regex: search, $options: "i" } },
        { format: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (addedBy) {
      query.addedBy = new ObjectId(addedBy);
    }

    if (method) {
      query.method = method;
    }

    if (format) {
      query.format = format;
    }

    // Sort
    let sortquery = {};
    if (sortBy && typeof sortBy === "string") {
      const [rawField, rawOrder] = sortBy.trim().split(/\s+/);
      const field = rawField || "createdAt";
      const sortType = rawOrder?.toLowerCase() === "asc" ? 1 : -1;
      sortquery[field] = sortType;
    } else {
      sortquery = { createdAt: -1 };
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
        $project: {
          id: "$_id",
          postback_url: 1,
          method: 1,
          format: 1,
          selected_keys: 1,
          include_sub_ids: 1,
          custom_keys: 1,
          all_keys: 1,
          status: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
          addedBy: 1,
          "addedBy_details.firstName": 1,
          "addedBy_details.lastName": 1,
          "addedBy_details.email": 1,
          "addedBy_details.role": 1,
        },
      },
      { $match: query },
      { $sort: sortquery },
    ];

    const totalResult = await db
      .collection("postbackurl")
      .aggregate([...pipeline])
      .toArray();

    pipeline.push({ $skip: skipNo });
    pipeline.push({ $limit: count });

    const result = await db
      .collection("postbackurl")
      .aggregate(pipeline)
      .toArray();

    const totalCount = totalResult ? totalResult.length : 0;
    const totalPages = Math.ceil(totalCount / count);

    const resData = {
      data: result || [],
      total_count: totalCount,
      page: page,
      count: count,
      total_pages: totalPages,
      has_next_page: page < totalPages,
    };

    // If no pagination params, return all records
    if (!req.param("page") && !req.param("count")) {
      resData.data = totalResult || [];
      resData.total_count = totalCount;
      delete resData.page;
      delete resData.count;
      delete resData.total_pages;
      delete resData.has_next_page;
    }

    return response.success(
      resData,
      constants.POSTBACK_URL.FETCHED_ALL,
      req,
      res
    );
  } catch (error) {
    console.log(error, "==getAllPostbackUrls error");
    return response.failed(null, `${error}`, req, res);
  }
};

/**
 * @PUT /postback-url/update
 * @desc Update an existing postback URL configuration
 */
exports.updatePostbackUrl = async (req, res) => {
  try {
    const {
      id,
      postback_url,
      method,
      format,
      selected_keys,
      include_sub_ids,
      custom_keys,
      all_keys,
      status,
    } = req.body;

    if (!id) {
      throw constants.POSTBACK_URL.ID_REQUIRED;
    }

    const existing = await PostbackUrl.findOne({ id, isDeleted: false });
    if (!existing) {
      throw constants.POSTBACK_URL.NOT_FOUND;
    }

    const updatePayload = { updatedBy: req.identity.id };

    if (postback_url !== undefined) updatePayload.postback_url = postback_url;
    if (method !== undefined) updatePayload.method = method;
    if (format !== undefined) updatePayload.format = format;
    if (selected_keys !== undefined) updatePayload.selected_keys = selected_keys;
    if (include_sub_ids !== undefined) updatePayload.include_sub_ids = include_sub_ids;
    if (custom_keys !== undefined) updatePayload.custom_keys = custom_keys;
    if (all_keys !== undefined) updatePayload.all_keys = all_keys;
    if (status !== undefined) updatePayload.status = status;

    const updated = await PostbackUrl.updateOne({ id }).set(updatePayload);

    return response.success(
      updated,
      constants.POSTBACK_URL.UPDATED,
      req,
      res
    );
  } catch (error) {
    console.log(error, "==updatePostbackUrl error");
    return response.failed(null, `${error}`, req, res);
  }
};

/**
 * @DELETE /postback-url/delete
 * @desc Soft-delete a postback URL configuration
 */
exports.deletePostbackUrl = async (req, res) => {
  try {
    const id = req.param("id") || req.query.id;
    if (!id) {
      throw constants.POSTBACK_URL.ID_REQUIRED;
    }

    const existing = await PostbackUrl.findOne({ id, isDeleted: false });
    if (!existing) {
      throw constants.POSTBACK_URL.NOT_FOUND;
    }

    await PostbackUrl.updateOne({ id }).set({
      isDeleted: true,
      updatedBy: req.identity.id,
    });

    return response.success(null, constants.POSTBACK_URL.DELETED, req, res);
  } catch (error) {
    console.log(error, "==deletePostbackUrl error");
    return response.failed(null, `${error}`, req, res);
  }
};

/**
 * @GET /postback-url/my
 * @desc Get the logged-in user's own postback URL configuration
 */
exports.getMyPostbackUrl = async (req, res) => {
  try {
    const record = await PostbackUrl.findOne({
      addedBy: req.identity.id,
      isDeleted: false,
    });

    if (!record) {
      throw constants.POSTBACK_URL.NOT_FOUND;
    }

    return response.success(record, constants.POSTBACK_URL.FETCHED, req, res);
  } catch (error) {
    console.log(error, "==getMyPostbackUrl error");
    return response.failed(null, `${error}`, req, res);
  }
};
