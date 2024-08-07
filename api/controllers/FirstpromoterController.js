const constant = require("../../config/local");
const axios = require("axios");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const puppeteer = require('puppeteer');

const response = require("../services/Response");
const constants = require("../../config/constants").constants;
const db = sails.getDatastore().manager;
const Validations = require("../Validations/index");
const ObjectId = require('mongodb').ObjectId;
const Services = require('../services/index');

// const path = require('path');
// const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const csv = require('csv-parser');
/**
 * FirstpromoterController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

  exports.removeFirstPromoter= async function (req, res) {
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
  };
  exports.updateFirstPromoter= async function (req, res) {
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
  exports.exportFirstPromoterData= async function (req, res) {
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
  };
  exports.exportScalenutData= async function (req, res) {
    // Define the download directory
    try{
      const user_password = req.body.password;
      const user_email = req.body.email;
      const url = req.body.url;
       var rootpath = process.cwd();
    var fullpath = rootpath + "/assets/downloads/"
    const downloadPath = fullpath;

    // Create the download directory if it doesn't exist
    if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath);
    }

    // Generate a unique file name using UUID
    const uniqueId = uuidv4();
    const newFileName = `file_${uniqueId}.csv`; // Adjust file extension as needed

    // Launch the browser
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });
    const page = await browser.newPage();

    // Set up download behavior
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath,
    });

    // Navigate to the login page
    await page.goto( `${url}`, { waitUntil: 'networkidle2' });

    // Set the viewport size
    await page.setViewport({ width: 1080, height: 1024 });

    // Fill in the email and password fields
    await page.type('#puser_email', user_email);
    const password = user_password;
    await page.type('#puser_password', password);

    // Submit the form
    await page.click('.btn-default');

    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Navigate to the "Rewards" tab
    await page.click('a[href="/my-rewards"]');

    // Wait for the "Rewards" page to load
    await page.waitForSelector('a[href="/my-rewards/export"]');

    // Click on the export link to start the download
    await page.click('a[href="/my-rewards/export"]');

    // Wait for the download to complete
    let files;
    do {
        await new Promise(resolve => setTimeout(resolve, 1000));
        files = fs.readdirSync(downloadPath);
    } while (!files.find(file => file.startsWith('rewards')));

    // Find the downloaded file
    const downloadedFile = files.find(file => file.startsWith('rewards')); // Adjust prefix if needed

    if (downloadedFile) {
        const oldPath = path.join(downloadPath, downloadedFile);
        const newPath = path.join(downloadPath, newFileName);

        try {
            fs.renameSync(oldPath, newPath);
            console.log('File renamed successfully to', newPath);

            // Process the CSV file
            fs.createReadStream(`${newPath}`)
              .pipe(csv())
              .on('data', (row) => {
                return res.status(200).json({
                  success: true,
                  message: "Data fetched successfully." ,
                  data:row,
                });
              })
              .on('end', () => {
                return res.status(200).json({
                  success: true,
                  message: "Data fetched successfully." ,
                  data:[],
                });
              });
        } catch (error) {
            console.error('Error processing the file:', error);
        }
    } else {
        console.log('No file found to rename.');
    }

    await browser.close();
  }catch(error){
    console.error("Error:", error);
    return res.status(400).json({
      success: false,
      error: { message: `An error occurred while exporting Scalenut data.${error}` },
    });
  }
  };
exports.addFirstPromoter = async (req, res) => {
    try {
        let validation_result = await Validations.FirstPromoterValidations.addFirstPromoter(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }
        let data = req.body;

        const existedPromoter = await FirstPromoter.findOne({ email: data.email, isDeleted: false });

        if (existedPromoter) {
            throw constants.FIRST_PROMOTER.ALREADY_EXIST;
        }

        const date = new Date();
        data.createdAt = date;
        data.updatedAt = date;
        data.addedBy = req.identity.id;
        data.updatedBy = req.identity.id;
        const createdPromoter = await FirstPromoter.create(data).fetch();
        if (createdPromoter) {
            let filePath = await Services.scalenutServices.exportScalenutData(data);
            console.log(filePath);
            let updatedPromoter = await FirstPromoter.updateOne({id:createdPromoter.id},{filePath:filePath});
            return response.success(updatedPromoter, constants.FIRST_PROMOTER.CREATED, req, res);
        }
        throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
      console.log(error)
        return response.failed(null, `${error}`, req, res);
    }
}

exports.editFirstPromoter = async (req, res) => {
    try {
        let validation_result = await Validations.FirstPromoterValidations.editFirstPromoter(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }
        const id = req.body.id;

        if (!req.body.email) {
            throw constants.FIRST_PROMOTER.EMAIL_REQUIRED;
        }

        const existedPromoter = await FirstPromoter.findOne({
            id: { "!=": id },
            email: req.body.email,
            url:req.body.url,
            isDeleted: false
        });

        if (existedPromoter) {
            throw constants.FIRST_PROMOTER.ALREADY_EXIST;
        }

        let check_promoter = await FirstPromoter.findOne({ id: id });
        if (!check_promoter) {
            throw constants.FIRST_PROMOTER.INVALID_ID;
        }
        req.body.updatedBy = req.identity.id;
        req.body.updatedAt = new Date();
        const data = await FirstPromoter.updateOne({ id: id }, req.body);

        if (data) {
            return response.success(null, constants.FIRST_PROMOTER.UPDATED, req, res);
        }
        throw constants.FIRST_PROMOTER.INVALID_ID;
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.firstPromoterDetail = async (req, res) => {
    try {
        const id = req.param("id");
        if (!id) {
            throw constants.FIRST_PROMOTER.ID_REQUIRED;
        }
        const data = await FirstPromoter.findOne({ id: id });
        if (data) {
            return response.success(data, constants.FIRST_PROMOTER.FETCHED, req, res);
        }
        throw constants.FIRST_PROMOTER.INVALID_ID;
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.getAllFirstPromoters = async (req, res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let { search, isDeleted, status, sortBy, addedBy } = req.query;
        let skipNo = (Number(page) - 1) * Number(count);

        if (search) {
            search = await Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { email: { $regex: search, '$options': 'i' } },
                { url: { $regex: search, '$options': 'i' } },
            ];
        }

        if (isDeleted) {
            query.isDeleted = isDeleted === 'true';
        } else {
            query.isDeleted = false;
        }

        if (status) {
            query.status = status;
        }

        let sortquery = {};
        if (sortBy) {
            let typeArr = sortBy.split(" ");
            let sortType = typeArr[1];
            let field = typeArr[0];
            sortquery[field ? field : 'createdAt'] = sortType ? (sortType === 'desc' ? -1 : 1) : -1;
        } else {
            sortquery = { updatedAt: -1 };
        }

        if (addedBy) {
            query.addedBy = new ObjectId(addedBy);
        }

        // Pipeline Stages
        let pipeline = [
            {
                $lookup: {
                    from: 'users',
                    localField: 'addedBy',
                    foreignField: '_id',
                    as: "addedBy_details"
                }
            },
            {
                $unwind: {
                    path: '$addedBy_details',
                    preserveNullAndEmptyArrays: true
                }
            },
        ];

        let projection = {
            $project: {
                id: "$_id",
                email: "$email",
                url: "$url",
                status: "$status",
                addedBy: "$addedBy",
                addedBy_name: "$addedBy_details.fullName",
                updatedBy: "$updatedBy",
                updatedAt: "$updatedAt",
                isDeleted: "$isDeleted",
                createdAt: "$createdAt",
                updatedAt: "$updatedAt",
            }
        };

        pipeline.push(projection);
        pipeline.push({
            $match: query
        });
        pipeline.push({
            $sort: sortquery
        });

        let totalresult = await db.collection('firstpromoter').aggregate(pipeline).toArray();
        pipeline.push({
            $skip: Number(skipNo)
        });
        pipeline.push({
            $limit: Number(count)
        });
        let result = await db.collection("firstpromoter").aggregate(pipeline).toArray();
        let resData = {
            total_count: totalresult ? totalresult.length : 0,
            data: result ? result : [],
        };
        if (!req.param('page') && !req.param('count')) {
            resData = totalresult ? totalresult : [];
        }
        return response.success(resData, constants.FIRST_PROMOTER.FETCHED_ALL, req, res);

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.deleteFirstPromoter = async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) {
            throw constants.FIRST_PROMOTER.ID_REQUIRED;
        }
        const data = await FirstPromoter.updateOne({ id: id }, { isDeleted: true, updatedBy: req.identity.id });
        return response.success(null, constants.FIRST_PROMOTER.DELETED, req, res);
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

