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
            if (req.body.pass) {
                req.body.pass = req.body.pass.replace(/\s+/g, '');
            }
            if (req.body.user) {
                req.body.user = req.body.user.trim();
            }
            let update_smtp = await Smtp.updateOne({ id: req.body.id }, req.body);
            if (update_smtp) {
                let get_credintails = await Services.Smtp.test_smtp("test@yopmail.com", 'Test SMTP', "<b>Test SMTP<b>", res);
                if (['team'].includes(req.identity.role)) {
                    await Services.AuditTrial.create_audit_trial(req.identity.id, 'smtp', 'updated', update_smtp, get_smtp);
                }

                if (get_credintails) {
                    return response.success(null, constants.COMMON.SUCCESS, req, res);
                } else {
                    return response.failed(null, "SMTP credentials verification failed. Please ensure App Password or valid credentials are provided.", req, res);
                }
            }
            return response.failed(null, constants.COMMON.INVALID_ID, req, res);
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
        let data = req.body;
        let port = Number(data.port) || 587;
        let transport = nodemailer.createTransport(smtpTransport({
            host: data.host,
            port: port,
            secure: port === 465,
            debug: true,
            auth: {
                user: data.user ? data.user.trim() : data.user,
                pass: data.pass ? data.pass.replace(/\s+/g, '') : data.pass
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
            });
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
                });
            } else {
                return res.status(200).json({
                    "success": true,
                    "code": 200,
                    "message": "SMTP working successfully."
                });
            }
        });
    },

    sendEmail: ((to, subject, message, brandName, next) => {
        Smtp.find({}).then(smtp => {
            console.log(smtp, '==========smtp');
            if (smtp.length > 0) {
                let port = Number(smtp[0].port) || 587;
                let transport = nodemailer.createTransport(smtpTransport({
                    host: smtp[0].host,
                    port: port,
                    secure: port === 465,
                    debug: true,
                    auth: {
                        user: smtp[0].user ? smtp[0].user.trim() : smtp[0].user,
                        pass: smtp[0].pass ? smtp[0].pass.replace(/\s+/g, '') : smtp[0].pass
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                }));
                transport.sendMail({
                    from: `${brandName || "Upfilly"} ${'<' + smtp[0].user + '>'}`,
                    to: to,
                    subject: subject,
                    html: message
                }, function (err, info) {
                    console.log('err', err, info);
                });
            }
        });
    })



};
