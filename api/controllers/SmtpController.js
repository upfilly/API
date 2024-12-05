/**
 * SmtpController
 *
 * @description :: Server-side logic for managing Smtp
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
const response = require("../services/Response")
const constants = require('../../config/constants').constants;
const Validations = require("../Validations/index");
const Services = require('../services/index');

module.exports = {

    /**
     * 
     * @param {*} req 
     * @param {*} res 
     * @description Used to get smtp detail
     * @createdAt 24/10/2021
     */
    smtp: (req, res) => {
        Smtp.find({}).then(smtp => {
            if (smtp.length > 0) {
                return res.status(200).json({
                    "success": true,
                    "code": 200,
                    "data": smtp[0],
                })
            } else {
                return res.status(200).json({
                    "success": true,
                    "code": 200,
                    "data": {},
                })
            }
        });
    },
    /**
     * 
     * @param {*} req {id:""}
     * @param {*} res 
     * @description Used to update the smtp details
     * @createdAt 24/10/2021
     * @returns {success:"",code:"",data:""}
     */

    edit: async (req, res) => {
        try {
            let validation_result = await Validations.Smtp.edit(req, res);

            if (validation_result && !validation_result.success) {
                throw validation_result.message;
            }

            let get_smtp = await Smtp.findOne({ id: req.body.id });
            if (!get_smtp) {
                throw constants.COMMON.INVALID_ID;
            }

            req.body.updatedBy = req.identity.id;
            let update_smtp = await Smtp.updateOne({ id: req.body.id }, req.body);
            if (update_smtp) {
                let get_credintails = await Services.Smtp.test_smtp("test@yopmail.com", 'Test SMTP', "<b>Test SMTP<b>", res)
                if (['team'].includes(req.identity.role)) {
                    await Services.AuditTrial.create_audit_trial(req.identity.id, 'smtp', 'updated', update_smtp, get_smtp)
                }

                if (get_credintails) {
                    return response.success(null, constants.COMMON.SUCCESS, req, res);
                }
            }
            // throw constants.COMMON.INVALID_ID;
        } catch (error) {
            // console.log(error, '=======error');
            return response.failed(null, `${error}`, req, res);
        }
    },

    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    testSMTP: (req, res) => {
        data = req.body
        transport = nodemailer.createTransport(smtpTransport({
            host: data.host,
            port: data.port,
            debug: true,
            sendmail: true,
            requiresAuth: true,
            auth: {
                user: data.user,
                pass: data.pass
            },
            tls: {
                rejectUnauthorized: false
            }
        }));

        var myVar;


        myVar = setTimeout(() => {
            // console.log("sending res")
            return res.status(400).json({
                success: false,
                "error": { "code": 400, "message": "SMTP credentials are not valid." }
            })

        }, 10000);



        transport.sendMail({
            from: 'Trenville  <' + data.user + '>',
            to: "test@yopmail.com",
            subject: "SMTP TESTING",
            html: "This is a test messege for SMTP check.SMTP credentials working fine."
        }, function (err, info) {


            clearTimeout(myVar);

            if (err) {
                return res.status(400).json({
                    success: false,
                    "error": { "code": 400, "message": "" + err }
                })
            } else {
                return res.status(200).json({
                    "success": true,
                    "code": 200,
                    "message": "SMTP working successfully."

                })

            }

        });
    },

    sendEmail: ((to, subject, message, next) => {

        Smtp.find({}).then(smtp => {
            if (smtp.length > 0) {
                transport = nodemailer.createTransport(smtpTransport({
                    host: smtp[0].host,
                    port: smtp[0].port,
                    debug: true,
                    sendmail: true,
                    requiresAuth: true,
                    auth: {
                        user: smtp[0].user,
                        pass: smtp[0].pass
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                }));
                transport.sendMail({
                    from: 'Upfilly  <' + smtp[0].user + '>',
                    to: to,
                    subject: subject,
                    html: message
                }, function (err, info) {
                    console.log('err', err, info)

                });
            }
        });

    })



};
