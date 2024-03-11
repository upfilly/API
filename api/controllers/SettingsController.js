/**
 * SettingsController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const constants = require('../../config/constants').constants
const response = require('../services/Response');
const Validations = require("../Validations/index");
const Services = require('../services/index');
const Emails = require('../Emails/index');


exports.getSettings = async (req, res) => {
    try {

        let get_settings = await Settings.findOne({ isDeleted: false });

        if (get_settings) {
            return response.success(get_settings, constants.SETTINGS.FETCHED, req, res);
        }

        throw constants.SETTINGS.INVALID_ID;
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
};

exports.editSettings = async (req, res) => {
    try {

        if (!['admin', 'team'].includes(req.identity.role)) {
            throw constants.COMMON.UNAUTHORIZED;
        }

        let validation_result = await Validations.Settings.editSettings(req, res);
        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        };
        let { id } = req.body;

        let get_settings = await Settings.findOne({ id: id, isDeleted: false });
        if (!get_settings) {
            throw constants.SETTINGS.INVALID_ID;
        }
        req.body.updatedBy = req.identity.id;
        let update_setting = await Settings.updateOne({ id: id, isDeleted: false }, req.body);
        if (update_setting) {
            // console.log(update_setting,"-----------update_setting");
            let email_payload = {
                email: update_setting.website_email
            };
            await Emails.OnboardingEmails.edit_website_email(email_payload);
            if (['team'].includes(req.identity.role)) {
                await Services.AuditTrial.create_audit_trial(req.identity.id, 'settings', 'updated', update_setting, get_settings);
            }
            return response.success(null, constants.SETTINGS.UPDATED, req, res);
        };
        throw constants.SETTINGS.INVALID_ID;
    } catch (error) {
        // console.log(error, '=======error');
        return response.failed(null, `${error}`, req, res);
    }
};
