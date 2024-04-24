/**
 * AffiliateLinkController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const Services = require('../services/index');
const constants = require('../../config/constants').constants;
const response = require("../services/Response");
const db = sails.getDatastore().manager;
const ObjectId = require('mongodb').ObjectId;
const {customAlphabet} = require('nanoid');
const nanoid = customAlphabet('1234567890abcdef', 6);
const baseUrl = 'https://upfilly.com';


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
},

exports.shorturl = async(req,res)=>{
    try {
      const shortCode = nanoid()
      const id = req.body.id;
  
      const updateResult = await AffiliateLink.updateOne({id:id, isDeleted:false},{shortUrl:`${baseUrl}/${shortCode}`})
      if(updateResult){
        return res.status(200).json({
          success: true,
          data: `${baseUrl}/${shortCode}`
        });
      }  
      else { 
        return res.status(404).json({
            success: false,
            message: "Invalid Id"
          });
      }
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            err: { message:""+ error }
        });
    }
}

exports.getOriginalUrl = async (req, res)=> {
    try {
      const shortUrl = req.params.shortUrl;
      const longUrlResult = await AffiliateLink.findOne({ shortUrl:shortUrl })
      if(longUrlResult){
        res.redirect(longUrlResult.link);
      } 
      else {
        res.status(404).send("Not found");
      }
    } 
    catch (error) {
        return res.status(400).json({
            success: false,
            err: { message:""+ error }
        });
    }
}







