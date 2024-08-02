const constants = require("../../config/local");
const axios = require("axios");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
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
      "X-Api-Key": `${constants.FIRST_PROMOTER_KEY}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await axios.delete(url, { headers });
      console.log(response.response);
      return res.status(200).json({
        success: true,
        message: "First promoter removed successfully",
        data: response.data,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        success: false,
        error: { message: error },
      });
    }
  },

  updateFirstPromoter: async function (req, res) {
    const url = `${constants.FIRST_PROMOTER_UPDATE}`;
    const headers = {
      "X-Api-Key": `${constants.FIRST_PROMOTER_KEY}`,
      "Content-Type": "application/json",
    };
    let data = req.body;
    try {
      const response = await axios.put(url, data, { headers });
      console.log(response);
      return res.status(200).json({
        success: true,
        message: "First promoter updated successfully",
        data: response.data,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        success: false,
        error: { message: error },
      });
    }
  },
  exportFirstPromoterData: async function (req, res) {
    const loginUrl = `https://aiseo.firstpromoter.com/login?puser[email]=akshaysharma@jcsoftwaresolution.com&puser[password]=Akshay@123`;
    const exportUrl = constants.FIRST_PROMOTER_EXPORT;

    try {
      // Log in to the first promoter
      const loginResponse = await axios.get(loginUrl, null, {
        headers: {
          "User-Agent": " PostmanRuntime/7.37.3",
          Accept: "*/*",
          "Postman-Token": "d705d377-505c-47df-b46c-62fb52ced28e",
          Host: "aiseo.firstpromoter.com",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Content-Length": "0",
        },
      });

      console.log("Login Response Status:", loginResponse.status);
      console.log("Login Response Headers:", loginResponse.headers);
      console.log("Login Response Data:", loginResponse.data);

      const cookies = loginResponse.headers["set-cookie"][0];
      console.log(cookies, "========================++>");
      if (!cookies) {
        throw new Error("Login failed: No cookies returned");
      }

      // Fetch the export data using the cookies from login
      const exportResponse = await axios.get(
        "https://aiseo.firstpromoter.com/my-rewards/export",
        {
          headers: {
            "User-Agent": "PostmanRuntime/7.37.3",
            Accept: "*/*",
            // "Postman-Token": "2e53a7f8-bc64-4207-966e-bb26f18dbe43",
            Host: "aiseo.firstpromoter.com",
            "Accept-Encoding": " gzip, deflate, br",
            Connection: "keep-alive",
            Cookie: "_fp_session_id=eb84b0936b7309eba5236e05c2054dcc",
            "Content-Length": "0",
          },
        }
      );

      console.log("Export Response Status:", exportResponse.status);
      console.log("Export Response Headers:", exportResponse.headers);
      console.log("Export Response Data:", exportResponse.data);

      const responseData = exportResponse.data;
      return res.status(200).json({
        responseData,
      });
    } catch (error) {
      console.error("Error:", error);
      if (error.response) {
        console.error("Error Response Data:", error.response.data);
        console.error("Error Response Status:", error.response.status);
        console.error("Error Response Headers:", error.response.headers);
      }
      return res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  },
};
