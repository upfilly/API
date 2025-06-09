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
const geoip = require('geoip-lite');
const iso3166 = require("iso-3166-1");
const axios = require("axios")
const credentials = require("../../config/local")

const getDeviceInfo = async function (req) {
    const ua = req.headers["user-agent"] || "Unknown";
      const deviceLanguage = req.headers["accept-language"] || "Unknown";
      
      let deviceType = "Unknown";
      let os = "Unknown";
  
      if (/android/i.test(ua)) {
        os = "Android";
        deviceType = "Mobile";
      } else if (/iPad|iPhone|iPod/.test(ua)) {
        os = "iOS";
        deviceType = "Mobile";
      } else if (/Windows NT/.test(ua)) {
        os = "Windows " + (ua.match(/Windows NT (\d+\.\d+)/) || [])[1];
        deviceType = "Desktop/Laptop";
      } else if (/Macintosh/.test(ua)) {
        os = "Mac OS";
        deviceType = "Desktop/Laptop";
      } else if (/Linux/.test(ua)) {
        os = "Linux";
        deviceType = "Desktop/Laptop";
      }
  
      let browser = "Unknown Browser";
      if (ua.includes("Firefox")) {
        browser = "Firefox";
      } else if (ua.includes("Edge")) {
        browser = "Edge";
      } else if (ua.includes("Chrome")) {
        browser = "Chrome";
      } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
        browser = "Safari";
      } else if (ua.includes("Opera") || ua.includes("OPR")) {
        browser = "Opera";
      } else if (ua.includes("Trident") || ua.includes("MSIE")) {
        browser = "Internet Explorer";
      }
  
      return {
          deviceType,
          os,
          userAgent: ua,
          browser,
          deviceLanguage}
  }
exports.savedCookies = async (req, res) => {
    try {
        let { affiliate_id, affiliate_link, ip_address,brand_id } = req.body;
      console.log("Reached")
        var trackQuery = {};

        let get_affiliate = await Users.findOne({ id: affiliate_id, isDeleted: false, status: "active" });
        if (get_affiliate) {
            let query = {
                affiliate_id: affiliate_id,
                affiliate_link: affiliate_link,
                isDeleted: false,
                ip_address: ip_address,
                brand_id:brand_id,
                // isSet: true,
            }
            let alraedy_exist_cookies = await Cookies.findOne(query);
            if (alraedy_exist_cookies) {
                // console.log("in if condition------------------------");

                let clicks = 0;

                let already_exist = await TrackCustomer.findOne({ affiliate_id: affiliate_id, affiliate_link: affiliate_link, type: "returning_customer", isDeleted: false });
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


                // let already_exist_customer = await TrackCustomer.findOne({ affiliate_id: affiliate_id, affiliate_link: affiliate_link, type: "new_customer", isDeleted: false });
                // if (already_exist_customer) {
                //     let add_track_customer = await TrackCustomer.updateOne({ id: already_exist_customer.id }, { clicks: Number(already_exist_customer.clicks) + 1 });
                // } else {
                //     trackQuery.affiliate_id = affiliate_id;
                //     trackQuery.affiliate_link = affiliate_link;
                //     trackQuery.clicks = clicks + 1;
                //     trackQuery.track_to = "customer"
                //     trackQuery.type = "new_customer";
                //     let add_track_customer = await TrackCustomer.create(trackQuery);
                // }

            } else {
                var save_cookies = await Cookies.create(req.body).fetch();
                if (save_cookies) {
                    let clicks = 0;
                    let already_exist_customer = await TrackCustomer.findOne({ affiliate_id: affiliate_id, affiliate_link: affiliate_link, type: "new_customer", isDeleted: false });
                    if (already_exist_customer) {
                        let add_track_customer = await TrackCustomer.updateOne({ id: already_exist_customer.id }, { clicks: Number(already_exist_customer.clicks) + 1 });
                    } else {
                        trackQuery.affiliate_id = affiliate_id;
                        trackQuery.affiliate_link = affiliate_link;
                        trackQuery.clicks = clicks + 1;
                        trackQuery.track_to = "customer"
                        trackQuery.type = "new_customer";
                        let add_track_customer = await TrackCustomer.create(trackQuery);
                    }
                    // console.log("in eklse condition------------------------");

                    // trackQuery.affiliate_id = affiliate_id;
                    // trackQuery.affiliate_link = affiliate_link;
                    // trackQuery.clicks = clicks + 1;
                    // trackQuery.track_to = "customer"
                    // trackQuery.type = "new_customer";
                    // let add_track_customer = await TrackCustomer.create(trackQuery);
                }
            }
        }

        return response.success(null, constants.TRACK_CUSTOMER.SAVED, req, res);

    } catch (err) {
        console.log(err, "====================err");
        return response.failed(null, `${err}`, req, res);
    }
}

exports.getLink = async (req, res) => {
  try {
    let redirectLink = req.param("link");
    const params = new URLSearchParams(redirectLink);
    const paramObj = Object.fromEntries(params.entries());

    // Extract known/static keys
    const affiliate_id = paramObj.affiliate_id;
    const merchant_id = paramObj.merchant_id;
    const campaign_id = paramObj.campaign_id;
    const url = paramObj.url;
    const ext = paramObj.ext;
    const hUrl = paramObj.hUrl;

    // Construct base URL
    const baseUrl = hUrl ? `https://${hUrl}.${url}.${ext}` : `https://${url}.${ext}`;

    // Exclude static keys to get dynamic ones
    const excludedKeys = ['affiliate_id', 'merchant_id', 'campaign_id', 'url', 'ext', 'hUrl'];
    const dynamicParams = Object.entries(paramObj)
      .filter(([key]) => !excludedKeys.includes(key))
      .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
      .join('&');

    // Construct final redirect link
    let redirectURL = `${baseUrl}?affiliate_id=${affiliate_id}&merchant_id=${merchant_id}&campaign_id=${campaign_id}`;
    if (dynamicParams) {
      redirectURL += `&${dynamicParams}`;
    }

    // Get IP and location info
    let get_ip = req.headers['x-forwarded-for']?.split(',')[0]
      || req.headers['cf-connecting-ip']
      || req.headers['x-real-ip']
      || req.connection.remoteAddress;

    let ipResponse = geoip.lookup(get_ip) || {};
    const lat = ipResponse?.ll?.[0] || null;
    const lng = ipResponse?.ll?.[1] || null;
    ipResponse.country_name = iso3166.whereAlpha2(ipResponse.country)?.country || "Unknown";

    const userAgentString = await getDeviceInfo(req);

    const paylaodDetail = {
      affiliate_id: affiliate_id,
      affiliate_link: baseUrl,
      brand_id: merchant_id,
      lat: lat,
      lng: lng,
      ip_address: get_ip,
      device: userAgentString.deviceType,
      os: userAgentString.os,
      browser: userAgentString.browser,
      country: ipResponse.country_name,
      city: ipResponse.city,
      timezone: ipResponse.timezone,
    };

    await axios.post(`${credentials.BACK_WEB_URL}/saved-cookies`, paylaodDetail);

    return res.redirect(redirectURL);
  } catch (error) {
    console.log("Error in getLink:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
