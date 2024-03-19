/**
 * CookiesController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const response = require("../services/Response")
const constants = require('../../config/constants').constants;
const db = sails.getDatastore().manager
const Validations = require("../Validations/index");
const Services = require('../services/index');
const ObjectId = require('mongodb').ObjectId;
const Emails = require('../Emails/index');

exports.savedCookies = async (req, res) => {
    try {
        let { affiliate_id, affiliate_link, ip_address } = req.body;

        var trackQuery = {};

        let get_affiliate = await Users.findOne({ id: affiliate_id, isDeleted: false, status: "active" });
        if (get_affiliate) {
            let query = {
                affiliate_id: affiliate_id,
                affiliate_link: affiliate_link,
                isDeleted: false,
                ip_address: ip_address,
                isSet: true,
            }
            let alraedy_exist_cookies = await Cookies.findOne(query);
            if (alraedy_exist_cookies) {
                // console.log("in if condition------------------------");

                let clicks = 0;
                let already_exist = await TrackCustomer.findOne({ affiliate_id: affiliate_id, type: "returning_customer", isDeleted: false });
                if (already_exist) {
                    let add_track_customer = await TrackCustomer.updateOne({ id: already_exist.id }, { clicks: Number(already_exist.clicks) + 1 });
                } else {
                    trackQuery.affiliate_id = affiliate_id;
                    trackQuery.affiliate_link = affiliate_link;
                    trackQuery.clicks = clicks + 1;
                    trackQuery.track_to = "customer"
                    trackQuery.type = "returning_customer";
                    let add_track_customer = await TrackCustomer.create(trackQuery);
                }

            } else {
                var save_cookies = await Cookies.create(req.body).fetch();
                if (save_cookies) {
                    // console.log("in eklse condition------------------------");
                    let clicks = 0;
                    trackQuery.affiliate_id = affiliate_id;
                    trackQuery.affiliate_link = affiliate_link;
                    trackQuery.clicks = clicks + 1;
                    trackQuery.track_to = "customer"
                    trackQuery.type = "new_customer";
                    let add_track_customer = await TrackCustomer.create(trackQuery);
                }
            }
        }

        return response.success(null, constants.TRACK_CUSTOMER.SAVED, req, res);

    } catch (err) {
        // console.log(err, "====================err");
        return response.failed(null, `${err}`, req, res);
    }
}
