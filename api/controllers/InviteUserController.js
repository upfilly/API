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
      let validation_result = await Validations.InviteUserValidation.addInvite(req, res);
      if (validation_result && !validation_result.success) {
        throw validation_result.message;
    }
      const { firstName, lastName, email, role, description, language } =
        req.body;

      // Check if an invite already exists
      const existingInvite = await InviteUsers.findOne({
        email:email,
        addedBy:req.identity.id,
        isDeleted: false,
      });

      if (existingInvite) {
        throw constants.USERINVITE.INVITE_ALREADY_EXISTS;
      }

      // Check if user already exists
      const existingUser = await Users.findOne({ email, isDeleted: false });
      if (existingUser) {
        // throw constants.user.EMAIL_EXIST;
        const oldUserInvite = await InviteUsers.create({
          firstName:firstName,
          lastName:lastName,
          email:email,
          role:role,
          description:description,
          user_id:newUser.id,
          language:language,
          addedBy:req.identity.id,
          updatedBy:req.identity.id
        }).fetch();
      }else{
      let password = await generatePassword()
      // Create new user
      const newUser = await Users.create({
        firstName,
        lastName,
        email,
        role: role,
        password:password,
        isVerified:"Y",
        addedBy:req.identity.id,
        updatedBy:req.identity.id
      }).fetch();

      const newInvite = await InviteUsers.create({
        firstName:firstName,
        lastName:lastName,
        email:email,
        role:role,
        description:description,
        user_id:newUser.id,
        language:language,
        addedBy:req.identity.id,
        updatedBy:req.identity.id
      }).fetch();

      const emailpayload = {
        email: email,
        full_name: firstName+" "+lastName,
        password:password,
        logged_in_user: newUser,
      };

      await Emails.InviteUser.invite_user_email(emailpayload);

      return response.success(newInvite, constants.USERINVITE.USERINVITED, req, res);
      }
    } catch (error) {
      console.log(error)
      return response.failed(null, `${error}`, req, res);
    }
  },

  changeActiveUser: async (req, res) => {
    try {
      const id = req.body.id;

      if (!id || id == undefined) {
        return res.status(400).json({
          success: false,
          error: { code: 400, message: constants.user.INVALID_ID },
        });
      }

      let userExists = await Users.findOne({id:id,isDeleted:false});
      // const deletedUSer = await Users.update({ id: id }, { isDeleted: true });
      
      if(!userExists){
        throw constants.user.USER_NOT_FOUND;
      }
      let activeUser = {};
      if(userExists.role === "brand"){
        activeUser = await Users.updateOne({id:id},{activeUser:id});
      }else{

      let superUser = await Users.findOne({id:userExists.addedBy,isDeleted:false});
      
      if(!superUser){
        throw constants.user.BRAND_NOT_EXISTS;
      }

      activeUser = await Users.updateOne({id:superUser.id},{activeUser:userExists.id});
    }
      return res.status(200).json({
        success: true,
        message: constants.user.ACTIVE_USER_CHANGED,
        data:activeUser
      });

    } catch (err) {
      console.log(err)
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "" + err },
      });
    }
  },

  deleteInviteUser: async (req,res)=>{
    try{
    const id = req.query.id;

      if (!id || id == undefined) {
        return res.status(400).json({
          success: false,
          error: { code: 400, message: constants.user.INVALID_ID },
        });
      }
      // console.log(id);
      let userExists = await Users.findOne({id:id,isDeleted:false});
      
      if(!userExists){
        throw constants.user.USER_NOT_FOUND;
      }
      let deletedUser = {};

      deletedUser = await InviteUsers.updateOne({user_id:id,addedBy:req.identity.id},{isDeleted:true});
    
      await Users.update({activeUser:id},{activeUser:null}); //here we are removing that active user from every other brand where it is active

      return res.status(200).json({
        success: true,
        message: constants.user.INVITED_USER_DELETED,
      });

    } catch (err) {
      console.log(err)
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "" + err },
      });
  }
  }
};
