/**
 * InviteUserController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const bcrypt = require("bcrypt-nodejs");
var constantObj = sails.config.constants;
var constant = require("../../config/local.js");
const db = sails.getDatastore().manager;
const ObjectId = require("mongodb").ObjectId;
const constants = require("../../config/constants.js").constants;
const Emails = require("../Emails/index");
const response = require("../services/Response.js");
const credentials = require("../../config/local.js");
const Services = require("../services/index");
const Validations = require("../Validations/index");
const { generatePassword } = require("../services/CommonServices.js");

module.exports = {
  addInviteUser: async (req, res) => {
    try {

      let id = req.identity.id;

      let loggedInUser = await Users.findOne({ id: id, isDeleted: false });

      let isPermissionExists = await Permissions.findOne({role:loggedInUser.role});

      if(!isPermissionExists){
          throw "Permission not exists";
      }   

      if(!isPermissionExists.user_add){
          throw "User not allowed to invite user";
      }
      let validation_result = await Validations.InviteUserValidation.addInvite(
        req,
        res
      );
      let user = {};
      if (validation_result && !validation_result.success) {
        throw validation_result.message;
      }
      const { firstName, lastName, email, role, description, language,brand_id } =
        req.body;

      // Check if an invite already exists
      const existingInvite = await InviteUsers.findOne({
        email: email,
        addedBy: req.identity.id,
        isDeleted: false,
      });

      if (existingInvite) {
        throw constants.USERINVITE.INVITE_ALREADY_EXISTS;
      }

      // Check if user already exists
      const existingUser = await Users.findOne({ email, isDeleted: false });
      if (existingUser) {
        // throw constants.user.EMAIL_EXIST;
        user = await InviteUsers.create({
          firstName: firstName,
          lastName: lastName,
          email: email,
          role: role,
          description: description,
          user_id: newUser.id,
          brand_id:brand_id,
          language: language,
          addedBy: req.identity.id,
          updatedBy: req.identity.id,
        }).fetch();
      } else {
        let password = await generatePassword();
        // Create new user
        let newUser = await Users.create({
          firstName,
          lastName,
          email,
          role: role,
          password: password,
          isVerified: "Y",
          addedBy: req.identity.id,
          updatedBy: req.identity.id,
        }).fetch();

        user = await InviteUsers.create({
          firstName: firstName,
          lastName: lastName,
          email: email,
          role: role,
          description: description,
          user_id: newUser.id,
          language: language,
          brand_id:brand_id,
          addedBy: req.identity.id,
          updatedBy: req.identity.id,
        }).fetch();
        const emailpayload = {
          email: email,
          full_name: firstName + " " + lastName,
          password: password,
          logged_in_user: user,
        };

        await Emails.InviteUser.invite_user_email(emailpayload);
      }

      return response.success(user, constants.USERINVITE.USERINVITED, req, res);
    } catch (error) {
      console.log(error);
      return response.failed(null, `${error}`, req, res);
    }
  },

  changeActiveUser: async (req, res) => {
    try {
      let user_id = req.identity.id;

      let loggedInUser = await Users.findOne({ id: user_id, isDeleted: false });

      let isPermissionExists = await Permissions.findOne({role:loggedInUser.role});

      if(!isPermissionExists){
          throw "Permission not exists";
      }   

      if(!isPermissionExists.user_edit){
          throw "User not allowed to change active user";
      }

      const id = req.body.id;

      if (!id || id == undefined) {
        return res.status(400).json({
          success: false,
          error: { code: 400, message: constants.user.INVALID_ID },
        });
      }

      let userExists = await Users.findOne({ id: id, isDeleted: false });
      // const deletedUSer = await Users.update({ id: id }, { isDeleted: true });

      if (!userExists) {
        throw constants.user.USER_NOT_FOUND;
      }
      let activeUser = {};
      if (userExists.role === "brand" ||userExists.role === "affiliate") {
        activeUser = await Users.updateOne({ id: id }, { activeUser: id });
      } else {
        let superUser = await Users.findOne({
          id: userExists.addedBy,
          isDeleted: false,
        });

        if (!superUser) {
          throw constants.user.BRAND_NOT_EXISTS;
        }

        activeUser = await Users.updateOne(
          { id: superUser.id },
          { activeUser: userExists.id }
        );
      }
      return res.status(200).json({
        success: true,
        message: constants.user.ACTIVE_USER_CHANGED,
        data: activeUser,
      });
    } catch (err) {
      console.log(err);
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "" + err },
      });
    }
  },

  deleteInviteUser: async (req, res) => {
    try {
      let user_id = req.identity.id;

      let loggedInUser = await Users.findOne({ id: user_id, isDeleted: false });

      let isPermissionExists = await Permissions.findOne({role:loggedInUser.role});

      if(!isPermissionExists){
          throw "Permission not exists";
      }   

      if(!isPermissionExists.user_delete){
          throw "User not allowed to delete invite user";
      }
      
      const id = req.query.id;

      if (!id || id == undefined) {
        return res.status(400).json({
          success: false,
          error: { code: 400, message: constants.user.INVALID_ID },
        });
      }
      // console.log(id);
      let userExists = await Users.findOne({ id: id, isDeleted: false });

      if (!userExists) {
        throw constants.user.USER_NOT_FOUND;
      }
      let deletedUser = {};

      deletedUser = await InviteUsers.updateOne(
        { user_id: id, addedBy: req.identity.id },
        { isDeleted: true }
      );

      await Users.update({ activeUser: id }, { activeUser: null }); //here we are removing that active user from every other brand where it is active

      return res.status(200).json({
        success: true,
        message: constants.user.INVITED_USER_DELETED,
      });
    } catch (err) {
      console.log(err);
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "" + err },
      });
    }
  },

  getAllActivities: async (req, res) => {
    try {
      let user_id = req.identity.id;

      let loggedInUser = await Users.findOne({ id: user_id, isDeleted: false });

      let isPermissionExists = await Permissions.findOne({role:loggedInUser.role});

      if(!isPermissionExists){
          throw "Permission not exists";
      }   

      if(!isPermissionExists.user_get){
          throw "User not allowed to view invite user";
      }

      let query = {};
      let count = req.param("count") || 10;
      let page = req.param("page") || 1;
      let { search, isDeleted, status, sortBy, addedBy, parentUserId } =
        req.query;
      let skipNo = (Number(page) - 1) * Number(count);

      if (search) {
        search = await Services.Utils.remove_special_char_exept_underscores(
          search
        );
        query.$or = [{ name: { $regex: search, $options: "i" } }];
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

      if (status) {
        query.status = status;
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
        query.user_id = ObjectId(addedBy);
      }

      if (parentUserId) {
        query.parentUserId = ObjectId(parentUserId);
      }
      // Pipeline Stages
      let pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "parentUserId",
            foreignField: "_id",
            as: "parent_details",
          },
        },
        {
          $unwind: {
            path: "$parent_details",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "user_details",
          },
        },
        {
          $unwind: {
            path: "$user_details",
            preserveNullAndEmptyArrays: true,
          },
        },
      ];

      let projection = {
        $project: {
          id: "$_id",
          user_id: "$user_id",
          message: "$message",
          method: "$method",
          parentUserId: "$parentUserId",
          response_data: "$data",
          status: "$status",
          addedBy: "$addedBy",
          user_details: "$user_details",
          parent_details: "$parent_details",
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
      db.collection("activitylogs")
        .aggregate(pipeline)
        .toArray((err, totalresult) => {
          pipeline.push({
            $skip: Number(skipNo),
          });
          pipeline.push({
            $limit: Number(count),
          });
          db.collection("activitylogs")
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
                constants.ACTIVITY_LOGS.FETCHED_ALL,
                req,
                res
              );
            });
        });
    } catch (error) {
      return response.failed(null, `${error}`, req, res);
    }
  },

  getAllAssociatedUsers: async (req, res) => {
    try {
      let id  = req.identity.id;
      let listOfOtherUsers=[];
      if(req.identity.role === "brand" || req.identity.role === "affiliate"){
        console.log(req.identity.id);
        listOfOtherUsers = await InviteUsers.find({addedBy:req.identity.id,isDeleted:false});
          let current_user  = {}
          current_user.createdAt=req.identity.createdAt
          current_user.updatedAt=req.identity.updatedAt
          current_user.id=req.identity.id
          current_user.firstName=req.identity.firstName
          current_user.lastName=req.identity.lastName
          current_user.email=req.identity.email
          current_user.role=req.identity.role
          current_user.isDeleted=req.identity.isDeleted
          current_user.user_id=req.identity.id
          current_user.addedBy=req.identity.addedBy
          current_user.updatedBy=req.identity.updatedBy

        listOfOtherUsers.push(current_user);
        return response.success(listOfOtherUsers, constants.user.ALL_OTHER_USERS_FETCHED, req, res);
      }else{
        let listOfUsers = await InviteUsers.find({email:req.identity.email,isDeleted:false});
        // console.log(listOfUsers.length)
        for(let otherUsers of listOfUsers){
          // console.log("=============>",otherUsers.addedBy);
          let parentUser = await Users.findOne({id:otherUsers.addedBy,isDeleted:false})
          let currentparentUser={};
          currentparentUser.createdAt=parentUser.createdAt
          currentparentUser.updatedAt=parentUser.updatedAt
          currentparentUser.id=parentUser.id
          currentparentUser.firstName=parentUser.firstName
          currentparentUser.lastName=parentUser.lastName
          currentparentUser.email=parentUser.email
          currentparentUser.role=parentUser.role
          currentparentUser.isDeleted=parentUser.isDeleted
          currentparentUser.user_id=parentUser.id
          currentparentUser.addedBy=parentUser.addedBy
          currentparentUser.updatedBy=parentUser.updatedBy

          listOfOtherUsers.push(currentparentUser);
        }
        let current_user  = {}
          current_user.createdAt=req.identity.createdAt
          current_user.updatedAt=req.identity.updatedAt
          current_user.id=req.identity.id
          current_user.firstName=req.identity.firstName
          current_user.lastName=req.identity.lastName
          current_user.email=req.identity.email
          current_user.role=req.identity.role
          current_user.isDeleted=req.identity.isDeleted
          current_user.user_id=req.identity.id
          current_user.addedBy=req.identity.addedBy
          current_user.updatedBy=req.identity.updatedBy

        listOfOtherUsers.push(current_user);
        return response.success(listOfOtherUsers, constants.user.ALL_OTHER_USERS_FETCHED, req, res);
        
      }
  } catch (error) {
    console.log(error)
      return response.failed(null, `${error}`, req, res);
  }
  },

  updateInviteUser: async (req, res) => {
    try {
      let user_id = req.identity.id;

      let loggedInUser = await Users.findOne({ id: user_id, isDeleted: false });

      let isPermissionExists = await Permissions.findOne({role:loggedInUser.role});

      if(!isPermissionExists){
          throw "Permission not exists";
      }   

      if(!isPermissionExists.user_edit){
          throw "User not allowed to edit invite user";
      }
      
      user_id = req.body.user_id;

      let userExists = await Users.findOne({ id: user_id, isDeleted: false });

      if (!userExists) {
        throw constants.user.USER_NOT_FOUND;
      }
      let updatedUser = {};
delete req.body.id;
      updatedUser = await InviteUsers.updateOne(
        { user_id: req.body.user_id, brand_id: req.body.brand_id },
        req.body
      );

      // await Users.update({ activeUser: id }, { activeUser: null }); //here we are removing that active user from every other brand where it is active

      return res.status(200).json({
        success: true,
        message: constants.user.INVITED_USER_UPDATED,
      });
    } catch (err) {
      console.log(err);
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "" + err },
      });
    }
  },
  getInviteUser: async (req, res) => {
    try {
      let user_id = req.identity.id;

      let loggedInUser = await Users.findOne({ id: user_id, isDeleted: false });

      let isPermissionExists = await Permissions.findOne({role:loggedInUser.role});

      if(!isPermissionExists){
          throw "Permission not exists";
      }   

      if(!isPermissionExists.user_edit){
          throw "User not allowed to edit invite user";
      }
      
      user_id = req.query.user_id;

      brand_id = req.query.brand_id;

      let userExists = await Users.findOne({ id: user_id, isDeleted: false });

      if (!userExists) {
        throw constants.user.USER_NOT_FOUND;
      }
      let updatedUser = {};

      updatedUser = await InviteUsers.findOne({ user_id: user_id, brand_id: brand_id ,isDeleted:false});

      // await Users.update({ activeUser: id }, { activeUser: null }); //here we are removing that active user from every other brand where it is active

      return res.status(200).json({
        success: true,
        message: constants.user.INVITED_USER_UPDATED,
        data:updatedUser
      });
    } catch (err) {
      console.log(err);
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "" + err },
      });
    }
  },
  getAllInvitedUsers: async (req, res) => {
    // getTasks: async (req, res) => {

      try {
          var search = req.param('search');
          var isDeleted = req.param('isDeleted');
          var page = req.param('page');
          var count = parseInt(req.param('count'));
          let sortBy = req.param("sortBy");
          let addedBy = req.param('addedBy');
          let brand_id = req.param('brand_id');
          

          var date = new Date();
          var current_date = date.toISOString().substring(0, 10);

          var query = {};

          if (search) {
              query.$or = [
                  { event: { $regex: search, '$options': 'i' } },
              ]
          }
          if(brand_id){
            query.brand_id = ObjectId(brand_id);
          }else{
            query.brand_id = ObjectId(req.identity.id);
          }

          let sortquery = {};  
          if (sortBy) {
              let typeArr = [];
              typeArr = sortBy.split(" ");
              let sortType = typeArr[1];
              let field = typeArr[0];
              sortquery[field ? field : 'updatedAt'] = sortType ? (sortType == 'desc' ? -1 : 1) : -1;
          } else {
          sortquery = { updatedAt: -1 }
          }

          query.isDeleted = false;

          const pipeline = [
              {
                  $lookup: {
                      from: "users",
                      localField: "user_id",
                      foreignField: "_id",
                      as: "user_details",
                  },
              },
              {
                  $unwind: {
                      path: "$user_details",
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
                     _id :"$_id",
    firstName :"$firstName" ,
    lastName :"$lastName" ,
    email :"$email" ,
    role :"$role" ,
    description :"$description" ,
    user_id: "$user_id",
    user_details:"$user_details",
    language :"$language" ,
    brand_details :"$brand_details" ,
    addedBy :"$addedBy" ,
    updatedBy :"$updatedBy" ,
    createdAt :"$createdAt" ,
    updatedAt :"$updatedAt" ,
    invitationAccepted :"$invitationAccepted",
    brand_id :"$brand_id" ,
    isDeleted :"$isDeleted",
                  }
              },
              {
                  $match: query
              },
              {
                  $sort: sortquery
              },
          ]
          db.collection('inviteusers').aggregate([...pipeline]).toArray((err, totalResult) => {
              if (page && count) {
                  var skipNo = (page - 1) * count;
                  pipeline.push(
                      {
                          $skip: Number(skipNo)
                      },
                      {
                          $limit: Number(count)
                      })
              }
              db.collection('inviteusers').aggregate([...pipeline]).toArray((err, result) => {
                  return res.status(200).json({
                      "success": true,
                      "data": result,
                      "total": totalResult.length,
                  });
              })
          })
      } catch (err) {
          return res.status(400).json({
              success: false,
              error: { code: 400, message: "" + err }
          })
      }
  },
};
