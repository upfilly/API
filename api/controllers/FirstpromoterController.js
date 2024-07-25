const  constants  = require("../../config/local");
const axios = require('axios');

/**
 * FirstpromoterController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
module.exports = {
  
    removeFirstPromoter: async function (req, res) {
        const url = `${constants.FIRST_PROMOTER_DELETE}?id=${req.query.id}`;
        const headers = {
            'X-Api-Key': `${constants.FIRST_PROMOTER_KEY}`,
            'Content-Type': 'application/json'
        };

        try {
            const response = await axios.delete(url, { headers });
            console.log(response.response);
            return res.status(200).json({
                success: true,
                message: "First promoter removed successfully",
                data:response.reponse.data
            });
        } catch (error) {
            console.log(error.response.data);
            return res.status(400).json({
                success: false,
                error: { message: error },
            });
            
        }
    },

    updateFirstPromoter: async function (req, res) {
        const url = `${constants.FIRST_PROMOTER_UPDATE}`;
        const headers = {
            'X-Api-Key': `${constants.FIRST_PROMOTER_KEY}`,
            'Content-Type': 'application/json'
        };
        let data = req.body;
        try {
            const response = await axios.put(url,data ,{ headers });
            console.log(response);
            return res.status(200).json({
                success: true,
                message: "First promoter updated successfully",
                data:response
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: { message: error },
            });
            
        }
    },
    
};