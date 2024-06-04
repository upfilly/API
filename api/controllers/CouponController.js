/**
 * CouponController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const response = require("../services/Response");
const constants = require("../../config/constants").constants;
const db = sails.getDatastore().manager;
const ObjectId = require("mongodb").ObjectId;
const Services = require("../services/index");
const Validations = require("../Validations/index");

exports.addCoupon = async (req, res) => {
  try {
    let {media,couponCode,couponType,startDate,expirationDate,commissionType,applicable,visibility,status,url,couponCommission} = req.body;
    let validation_result = await Validations.CouponValidations.addCoupon(
      req,
      res
    );

    if (validation_result && !validation_result.success) {
      throw validation_result.message;
    }

    let couponExists = await Coupon.findOne({couponCode:req.body.couponCode,isDeleted:false})

    if(couponExists){
        throw constants.COUPON.ALREADY_EXISTS;
    }
    let user;
    if(req.body.visibility!="Public"){
        user = await Users.findOne({id:req.body.media,isDeleted:false}) //here media refers to affiliate 
        if(!user){
            throw constants.user.USER_NOT_FOUND;
        }
    }
    

    if(new Date(startDate)> new Date(expirationDate)){
        throw constants.COUPON.START_DATE_OVERLAPED;
    }

    req.body.addedBy = req.identity.id;

    const coupon = await Coupon.create(req.body).fetch();

    if (coupon) {
      return response.success(coupon, constants.COUPON.CREATED, req, res);
    }

    throw constants.COMMON.SERVER_ERROR;
  } catch (error) {
    console.log(error)
    return response.failed(null, `${error}`, req, res);
  }
};
exports.editCoupon = async function (req, res) {
  try {
    let {media,couponCode,couponType,startDate,expirationDate,commissionType,applicable,visibility,status,url,couponCommission} = req.body;
    let validation_result = await Validations.CouponValidations.editCoupon(
        req,
        res
      );
  
      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }
      let couponExists = await Coupon.findOne({id:req.body.id,isDeleted:false})

    if(!couponExists){
        throw constants.COUPON.NOT_EXISTS;
    }

    let user = await Users.findOne({id:req.body.media,isDeleted:false}) //here media refers to affiliate 

    if(!user){
        throw constants.user.USER_NOT_FOUND;
    }

    if(new Date(startDate)> new Date(expirationDate)){
        throw constants.COUPON.START_DATE_OVERLAPED;
    }

    const coupon = await Coupon.updateOne({id:req.body.id},req.body)

    if (coupon) {
      return response.success(coupon, constants.COUPON.UPDATED, req, res);
    }

    throw constants.COMMON.SERVER_ERROR;
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};
exports.deleteCoupon = async function (req, res) {
    try {
    //   let validation_result = await Validations.CouponValidations.editCoupon(
    //       req,
    //       res
    //     );
    
    //     if (validation_result && !validation_result.success) {
    //       throw validation_result.message;
    //     }
        let couponExists = await Coupon.findOne({id:req.query.id,isDeleted:false})
  
      if(!couponExists){
          throw constants.COUPON.NOT_EXISTS;
      }
  
      const coupon = await Coupon.updateOne({id:req.query.id},{isDeleted:true})
  
      if (coupon) {
        return response.success(null, constants.COUPON.DELETED, req, res);
      }
  
      throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
        console.log(error)
      return response.failed(null, `${error}`, req, res);
    }
};
exports.getAllCoupon = async (req, res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let skipNo = (Number(page) - 1) * Number(count);
        let { search, sortBy, status, isDeleted, plan_type,addedBy,media } = req.query;
        let sortquery = {};

        if (search) {
            search = await Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { name: { $regex: search, '$options': 'i' } }
            ]
        }

        if (isDeleted) {
            query.isDeleted = isDeleted ? isDeleted === 'true' : true ? isDeleted : false;
        } else {
            query.isDeleted = false;
        }

        if (sortBy) {
            let typeArr = [];
            typeArr = sortBy.split(" ");
            let sortType = typeArr[1];
            let field = typeArr[0];
            sortquery[field ? field : 'createdAt'] = sortType ? (sortType == 'desc' ? -1 : 1) : -1;
        } else {
            sortquery = { createdAt: -1 }
        }

        if (status) {
            query.status = status;
        }
        if (media) {
            query.media = ObjectId(media);
        }

        if (plan_type) {
            query.plan_type = plan_type;
        }
        if (addedBy) {
            query.addedBy =ObjectId( addedBy);
        }

        // console.log(sortquery, "-----------------sortquery");
        let pipeline = [

        ];
        let projection = {
            $project: {
                id: '$_id',
                media: '$media',
                couponCode:"$couponCode",
                couponType:"$couponType",
                startDate:"$startDate",
                expirationDate:"$expirationDate",
                commissionType:"$commissionType",
                applicable:"$applicable",
                visibility:"$visibility",
                url:"$url",
                couponCommission:"$couponCommission",
                isDeleted: "$isDeleted",
                deletedAt: "$deletedAt",
                status: "$status",
                addedBy: "$addedBy",
                updatedBy: "$updatedBy",
                updatedAt: "$updatedAt",
                createdAt: "$createdAt",
            }
        };
        pipeline.push(projection);
        pipeline.push({
            $match: query
        });
        // pipeline.push({
        //     $sort: sortquery
        // });

        pipeline.push({
            $sort: sortquery
        });

        // let unset_stage = {
        //     $unset: ['_id']
        // }
        // pipeline.push(unset_stage)

        db.collection('coupon').aggregate(pipeline).toArray((err, totalresult) => {
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            db.collection('coupon').aggregate(pipeline).toArray((err, result) => {
                let resData = {
                    total_count: totalresult ? totalresult.length : 0,
                    data: result ? result : [],
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalresult ? totalresult : [];
                }
                return response.success(resData, constants.COUPON.FETCHED, req, res);
            })
        })
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}
exports.getByIdCoupon = async (req, res) => {
    try {
        const id = req.param("id")
        if (!id) {
            throw constants.COUPON.ID_REQUIRED
        }
        const get_Coupon = await Coupon.findOne({ id: id });
        if (get_Coupon) {
            return response.success(get_Coupon, constants.COUPON.FETCHED, req, res);
        }
        throw constants.COUPON.INVALID_ID;
    } catch (error) {
        return response.failed(null, `${error}`, req, res)
    }
}
