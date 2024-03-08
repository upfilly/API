/**
 * BlogController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const constants = require('../../config/constants').constants
const response = require('../services/Response');
const Validations = require("../Validations/index");
const db = sails.getDatastore().manager;
const Services = require('../services/index');
const ObjectId = require('mongodb').ObjectId;

exports.addBlog = async (req, res) => {
    try {
        let validation_result = await Validations.BlogValidations.addBlog(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { isTrending, isPublished } = req.body;
        // req.body.slug = await Services.CommonServices.generate_Blog_title_slug({ Blog_title: req.body.title });
        req.body.addedBy = req.identity.id;
        req.body.title = req.body.title.toLowerCase()
        let get_Blog = await Blogs.findOne({ title: req.body.title, isDeleted: false })
        if (get_Blog) {
            throw constants.BLOG.ALREADY_EXIST;
        }

        if (isTrending) {
            req.body.trendingAt = new Date();
        }

        if (isPublished) {
            req.body.publishAt = new Date();
        }

        let add_Blog = await Blogs.create(req.body).fetch();
        if (add_Blog) {
            return response.success(null, constants.BLOG.ADDED, req, res);

        }
        throw constants.COMMON.SERVER_ERROR

    } catch (error) {
        console.log(error);
        return response.failed(null, `${error}`, req, res)
    }
}

exports.editBlog = async (req, res) => {
    try {
        let validation_result = await Validations.BlogValidations.editBlog(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { id, isTrending, isPublished } = req.body;

        let get_Blog = await Blogs.findOne({ id: id });
        if (!get_Blog) {
            throw constants.BLOG.INVALID_ID;
        }

        req.body.title = req.body.title.toLowerCase();
        let Blog_exist = await Blogs.findOne({
            title: req.body.title,
            isDeleted: false,
            id: { "!=": id }
        })

        if (Blog_exist) {
            throw constants.BLOG.ALREADY_EXIST;
        }

        if (isTrending) {
            if (get_Blog.isTrending != isTrending) {
                req.body.trendingAt = new Date()
            }
        }

        if (isPublished) {
            if (get_Blog.isPublished != isPublished) {
                req.body.publishAt = new Date()
            }
        }

        // if (req.body.title != get_Blog.title) {
        //     req.body.slug = await Services.CommonServices.generate_Blog_title_slug({ Blog_title: req.body.title });
        // }
        req.body.updatedBy = req.identity.id;
        let edit_Blog = await Blogs.updateOne({ id: id }, req.body);
        if (edit_Blog) {
            return response.success(null, constants.BLOG.UPDATED, req, res);
        }
        throw constants.BLOG.INVALID_ID;
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.getById = async (req, res) => {
    try {
        let id = req.param("id");
        if (!id) {
            throw constants.BLOG.ID_REQUIRED;
        };

        let get_Blog = await Blogs.findOne({ id: id }).populate('blog_type_id');
        if (get_Blog) {
            return response.success(get_Blog, constants.BLOG.FETCHED, req, res);
        }
        throw constants.BLOG.INVALID_ID
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.getAllBlogs = async (req, res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let { search, sortBy, isDeleted, blog_type_id, isTrending, isPublished } = req.query;
        skipNo = (Number(page - 1)) * Number(count);
        if (search) {
            query.$or = [
                { title: { $regex: search, '$options': 'i' } },
            ]
        }

        if (isDeleted) {
            query.isDeleted = isDeleted ? isDeleted == 'true' : true ? isDeleted : false;
        } else {
            query.isDeleted = false;
        }

        if (isTrending) {
            query.isTrending = isTrending ? isTrending == 'true' : true ? isTrending : false;
        }

        if (isPublished) {
            query.isPublished = isPublished ? isPublished == 'true' : true ? isPublished : false;
        } 

        let sortquery = {};
        if (sortBy) {
            let typeArr = [];
            typeArr = sortBy.split(" ");
            let sortType = typeArr[1];
            let field = typeArr[0];
            sortquery[field ? field : 'createdAt'] = sortType ? (sortType == 'desc' ? -1 : 1) : -1;
        } else {
            sortquery = { updatedAt: -1 }
        }

        if (blog_type_id) {
            query.blog_type_id = ObjectId(blog_type_id);
        }

        let pipeline = [
            {
                $lookup: {
                    from: "users",
                    localField: "updatedBy",
                    foreignField: "_id",
                    as: "updatedBy_details"
                }
            },
            {
                $unwind: {
                    path: '$updatedBy_details',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "commoncategories",
                    localField: "blog_type_id",
                    foreignField: "_id",
                    as: "blog_type_id_details"
                }
            },
            {
                $unwind: {
                    path: '$blog_type_id_details',
                    preserveNullAndEmptyArrays: true
                }
            },
        ];
        let projection = {
            $project: {
                id: "$_id",
                title: "$title",
                sub_title: "$sub_title",
                image: "$image",
                description: "$description",
                meta_title: "$meta_title",
                meta_name: "$meta_name",
                meta_description: "$meta_description",
                meta_keywords: "$meta_keywords",
                alt_tag: "$alt_tag",
                updatedBy: "$updatedBy",
                addedBy: "$addedBy",
                deletedBy: "$deletedBy",
                trendingAt: "$trendingAt",
                publishAt: "$publishAt",
                createdAt: "$createdAt",
                updatedAt: "$updatedAt",
                isTrending: "$isTrending",
                isPublished: "$isPublished",
                isDeleted: "$isDeleted",
                blog_type_id: "$blog_type_id",
                category_name: "$blog_type_id_details.name",
            }

        };
        pipeline.push(projection);
        pipeline.push({
            $match: query
        });
        pipeline.push({
            $sort: sortquery
        });
        db.collection('blogs').aggregate(pipeline).toArray((err, totalresult) => {
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            db.collection("blogs").aggregate(pipeline).toArray((err, result) => {
                let resData = {
                    data: result ? result : [],
                    total_count: totalresult ? totalresult.length : 0
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalresult ? totalresult : [];
                }
                return response.success(resData, constants.BLOG.FETCHED, req, res);
            })
        });
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.publishBlog = async (req, res) => {

    try {
        let validation_result = await Validations.BlogValidations.publishBlog(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }
        let { type, id } = req.body;

        let get_Blog = await Blogs.findOne({ id: id });
        if (get_Blog) {
            let update_payload = {
                updatedBy: req.identity.id
            };
            let message;
            if (type == "trending") {
                if (get_Blog.isTrending) {
                    update_payload.isTrending = false;
                    message = constants.BLOG.REMOVED_TRENDING;
                } else {
                    update_payload.isTrending = true;
                    update_payload.trendingAt = new Date();
                    message = constants.BLOG.ADDED_TRENDING;
                }
            }

            if (type == "publish") {
                if (get_Blog.isPublished) {
                    update_payload.isPublished = false;
                    message = constants.BLOG.REMOVED_PUBLISH;
                } else {
                    update_payload.isPublished = true;
                    update_payload.publishAt = new Date();
                    message = constants.BLOG.ADDED_PUBLISH;
                }
            }

            let update_Blog = await Blogs.updateOne({ id: get_Blog.id }, update_payload);
            if (update_Blog) {
                return response.success(null, message, req, res)
            }
            throw constants.COMMON.SERVER_ERROR;
        }
        throw constants.BLOG.INVALID_ID;
    } catch (error) {
        return response.failed(null, `${error}`, req, res)
    }
}

exports.deleteBlog = async (req, res) => {
    try {
        const id = req.param("id")
        if (!id) {
            throw constants.BLOG.ID_REQUIRED;
        }
        let delete_Blog = await Blogs.updateOne({ id: id }, { isDeleted: true, updatedBy: req.identity.id })
        return response.success(null, constants.BLOG.DELETED, req, res);
    } catch (error) {
        console.log(error);
        return response.failed(null, `${error}`, req, res);
    }
}

