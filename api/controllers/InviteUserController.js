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
      // console.log(req.identity.id);
      console.log("in invite");
      console.log(req.identity,"=========identity");
      const { firstName, lastName, email, role, description, language } =
        req.body;

      // Check if an invite already exists
      const existingInvite = await InviteUsers.findOne({
        email:email,
        isDeleted: false,
        invitationAccepted:true
      });
      if (existingInvite) {
        throw "An invite has already been sent to this email.";
      }

      // Check if user already exists
      const existingUser = await Users.findOne({ email, isDeleted: false });
      if (existingUser) {
        throw "A user with this email already exists.";
      }
      let password = await generatePassword()
      // // Create new user
      const newUser = await Users.create({
        firstName,
        lastName,
        email,
        role: role,
        password:password
      }).fetch();

      // Store invite details in InviteUser model
      const newInvite = await InviteUsers.create({
        firstName:firstName,
        lastName:lastName,
        email:email,
        role:role,
        description:description,
        language:language,
        addedBy:req.identity.id,
        updatedBy:req.identity.id
      }).fetch();
      
      // console.log(req.identity); 
      let loggedInUser = await Users.findOne({ id: req.identity.id });
      
      var token = jwt.sign(
        { user_id: req.identity.id, firstName: loggedInUser.firstName },
        { issuer: "upfilly", subject: loggedInUser.email, audience: "public" }
      );

      const emailpayload = {
        email: email,
        full_name: firstName+" "+lastName,
        password:password,
        logged_in_user: loggedInUser,
      };

      await Emails.send_mail_to_invite_user.invite_user_email(emailpayload);

      return response.success(newInvite, constants.USERINVITE.USERINVITED, req, res);
    } catch (error) {
      console.log(error)
      return response.failed(null, `${error}`, req, res);
    }
  },

  changeInviteUserStatus: async (req, res) => {
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
};
