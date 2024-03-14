/**
 * AffiliateLinkController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const Services = require('../services/index');
const constants = require('../../config/constants').constants;
const response = require("../services/Response")


exports.generateLink = async (req, res) => {
    try {

        // Generate affiliate link
        const { base_url, parameters } = req.body;


        let get_link = await Services.generateAffiliateLink.generateLink({
            baseUrl: base_url,
            parameters: parameters
        })

        let query = {
            affiliate_id: req.identity.id
        }
        let isExist = await AffiliateLink.findOne(query);
        if (!isExist) {
            let create_link = await AffiliateLink.create({ affiliate_id: req.identity.id, link: get_link })
        } else {
            let update_link = await AffiliateLink.updateOne({ id: isExist.id, isDeleted: false }, { link: get_link })
        }
        return response.success(get_link, constants.TRACKING.LINK, req, res);

    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}

exports.generateLinkOfAffiliate = async (req, res) => {
    try {


        let query = {
            affiliate_id: req.identity.id,
            isDeleted: false
        }
        let get_affilaite_link = await AffiliateLink.findOne(query);
        return response.success(get_affilaite_link, constants.TRACKING.LINK, req, res);

    } catch (err) {
        return response.failed(null, `${err}`, req, res);
    }
}



