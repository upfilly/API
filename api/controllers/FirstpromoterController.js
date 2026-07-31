const constant = require("../../config/local");
const axios = require("axios");
const xlsx = require("xlsx");
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
      return res.status(200).json({
        success: true,
        message: "First promoter removed successfully",
        data: response.data,
      });
    } catch (error) {
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
      return res.status(200).json({
        success: true,
        message: "First promoter updated successfully",
        data: response.data,
      });
    } catch (error) {
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

      const cookies = loginResponse.headers["set-cookie"][0];
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
      const responseData = res
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
        
        console.log(data,"jkjkjkjkkjkj")

        const existedPromoter = await FirstPromoter.findOne({ email: data.email, isDeleted: false });

        if (existedPromoter) {
            throw constants.FIRST_PROMOTER.ALREADY_EXIST;
        }

        const date = new Date();
        data.createdAt = date;
        data.updatedAt = date;
        data.addedBy = req.identity.id;
        data.updatedBy = req.identity.id;
       
      // if (createdPromoter) {
        let filePath = await Services.scalenutServices.exportScalenutData(data);
        console.log(filePath, "kjkjkjk")
        let updatedPromoter = {};

        if (filePath && filePath.success === true) {
          const createdPromoter = await FirstPromoter.create(data).fetch();

          // Create Brand and Campaign for this FirstPromoter
          const brandCampaignResult = await createBrandAndCampaignForFirstPromoter(data, req.identity.id);
          
          let updateFields = { filePath: filePath.msg };
          if (brandCampaignResult && brandCampaignResult.brandUser) {
            updateFields.brand_id = brandCampaignResult.brandUser.id;
          }
          if (brandCampaignResult && brandCampaignResult.campaign) {
            updateFields.campaign_id = brandCampaignResult.campaign.id;
          }

          updatedPromoter = await FirstPromoter.updateOne({ id: createdPromoter.id }, updateFields);

          // Store the data in firstpromoterdata collection
          if (filePath.data && filePath.data.length > 0) {
            try {
            const firstPromoterDataRecords = filePath.data.map(record => ({
              lead_email: record.lead_email || '',
                lead_id: record.lead_id || '',
                sub_id: (record.sub_id && ObjectId.isValid(record.sub_id)) ? new ObjectId(record.sub_id) : (record.sub_id || ''),
              earnings: record.earnings ? parseFloat(record.earnings.replace('$', '')) || 0 : 0, // Convert "$15.75" to 15.75
              status: record.status || 'approved',
              created_at: record.created_at ? new Date(record.created_at) : new Date(),
                firstPromoterId: createdPromoter.id, // Reference to the parent FirstPromoter
                addedBy: req.identity.id,
                updatedBy: req.identity.id,
                status: 'active',
                isDeleted: false,
                createdAt: new Date(),
                updatedAt: new Date()
              }));

              // Insert into firstpromoterdata collection
              await db.collection('firstpromoterdata').insertMany(firstPromoterDataRecords);

              console.log(`Successfully inserted ${firstPromoterDataRecords.length} records into firstpromoterdata collection`);
            } catch (insertError) {
              console.error('Error inserting data into firstpromoterdata:', insertError);
              // You might want to handle this error differently - maybe not fail the entire request
            }
          }
        } else {
          return response.failed(null, filePath.msg, req, res);
        }
        console.log(updatedPromoter, "0909009")
        return response.success(updatedPromoter, constants.FIRST_PROMOTER.CREATED, req, res);
      // }
        throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
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
            search = Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { email: { $regex: search, '$options': 'i' } },
                { url: { $regex: search, '$options': 'i' } },
                { campaignName: { $regex: search, '$options': 'i' } },
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
    if (sortBy && typeof sortBy === "string") {
      const [rawField, rawOrder] = sortBy.trim().split(/\s+/);
      const field = rawField || "createdAt";
      const sortType = rawOrder?.toLowerCase() === "asc" ? 1 : -1;
      sortquery[field] = sortType;
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
                campaignName: "$campaignName",
                status: "$status",
                addedBy: "$addedBy",
                addedBy_name: "$addedBy_details.fullName",
                updatedBy: "$updatedBy",
                updatedAt: "$updatedAt",
                isDeleted: "$isDeleted",
                createdAt: "$createdAt",
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

exports.importFirstPromoter = async (req, res) => {
  let duplicate = 0;
  let createdCount = 0;
  const errors = []; // To collect errors
  let uploadedFile = "";
  try {
    const firstPromoter = await new Promise((resolve, reject) => {
      req.file("file").upload(
        { maxBytes: 10485760, dirname: "../../assets" }, // Change the directory
        function whenDone(err, files) {
          if (err && err.code === "E_EXCEEDS_UPLOAD_LIMIT") {
            return reject(new Error("File size must be less than 10 MB"));
          } else if (err) {
            return reject(new Error("File upload error"));
          }

          if (!files || files.length === 0) {
            return reject(new Error("No files were uploaded"));
          }

          uploadedFile = files[0];
          const filename = uploadedFile.filename;
          const name = uploadedFile.fd;

          if (filename.endsWith(".csv")) {
            // CSV file
            const results = [];
            fs.createReadStream(name)
              .pipe(csv())
              .on('data', (data) => results.push(data))
              .on('end', () => resolve(results))
              .on('error', (error) => reject(new Error("Error reading CSV file")));
          } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
            // Excel file
            const workbook = xlsx.readFile(name);
            const sheetName = workbook.SheetNames[0];
            const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
            resolve(data);
          } else {
            reject(new Error("Unsupported file format"));
          }
        }
      );
    });

    if (firstPromoter && firstPromoter.length > 0) {
      for await (let product of firstPromoter) {
        let isExists = await FirstPromoter.findOne({ email: product.email, password: product.password });
        if (!isExists) {
          product.addedBy = req.identity.id;
          let newProduct = await FirstPromoter.create(product).fetch();
          let responseData = await Services.scalenutServices.exportScalenutData({ email: newProduct.email, password: newProduct.password, url: newProduct.url });
          
          const brandCampaignResult = await createBrandAndCampaignForFirstPromoter(product, req.identity.id);
          
          let updateFields = { filePath: responseData ? responseData.msg : "" };
          if (brandCampaignResult && brandCampaignResult.brandUser) {
            updateFields.brand_id = brandCampaignResult.brandUser.id;
          }
          if (brandCampaignResult && brandCampaignResult.campaign) {
            updateFields.campaign_id = brandCampaignResult.campaign.id;
          }

          await FirstPromoter.updateOne({ id: newProduct.id }, updateFields);
          createdCount++;
        } else {
          duplicate++;
        }
      }
    }

    // Remove the uploaded file if no errors
    if (uploadedFile.fd) {
      fs.unlink(uploadedFile.fd, (err) => {
        if (err) {
          console.error(`Error deleting file: ${uploadedFile.fd}`, err);
        }
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some first-promoters could not be imported",
        errors: errors,
      });
    }

    return res.status(200).json({
      success: true,
      message: `${createdCount} first-promoter imported successfully`,
      duplicates: duplicate,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: {
        code: 500,
        message: err.message,
      },
    });
  }
};
exports.firstPromoterDataListing = async (req, res) => {
  try {
    let query = {};
    let count = req.param('count') || 10;
    let page = req.param('page') || 1;
    let { search, isDeleted, status, sortBy, addedBy, sub_id, lead_email, lead_id } = req.query;
    let skipNo = (Number(page) - 1) * Number(count);

    if (search) {
      search = Services.Utils.remove_special_char_exept_underscores(search);
      query.$or = [
        { lead_email: { $regex: search, '$options': 'i' } },
        { lead_id: { $regex: search, '$options': 'i' } },
        { sub_id: { $regex: search, '$options': 'i' } },
      ];
    }

    if (lead_email) {
      query.lead_email = { $regex: lead_email, '$options': 'i' };
    }

    if (lead_id) {
      query.lead_id = lead_id;
    }

    if (sub_id) {
      query.sub_id = sub_id;
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
      sortquery = { createdAt: -1 };
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
      // Convert sub_id string to ObjectId and lookup
      {
        $addFields: {
          sub_id_objectId: {
            $cond: {
              if: { $ne: ["$sub_id", null] },
              then: { $toObjectId: "$sub_id" },
              else: null
            }
          },
          firstPromoterId_objectId: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$firstPromoterId", null] },
                  { $ne: ["$firstPromoterId", ""] }
                ]
              },
              then: { $toObjectId: "$firstPromoterId" },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'sub_id_objectId',
          foreignField: '_id',
          as: "sub_id_details"
        }
      },
      {
        $unwind: {
          path: '$sub_id_details',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'firstpromoter',
          localField: 'firstPromoterId_objectId',
          foreignField: '_id',
          as: "firstPromoter_details"
        }
      },
      {
        $unwind: {
          path: '$firstPromoter_details',
          preserveNullAndEmptyArrays: true
        }
      },
    ];

    let projection = {
      $project: {
        lead_email: "$lead_email",
        lead_id: "$lead_id",
        sub_id: "$sub_id", // Keep original string sub_id
        earnings: "$earnings",
        original_status: "$status",
        current_status: "$status",
        created_at: "$created_at",
        firstPromoterId: "$firstPromoterId",
        firstPromoter_name: "$firstPromoter_details.name",
        campaignName: "$firstPromoter_details.campaignName",
        addedBy: "$addedBy",
        addedBy_name: "$addedBy_details.name",
        // Add populated sub_id user data
        sub_id_user: {
          $cond: {
            if: { $ne: ["$sub_id_details", null] },
            then: {
              fullName: "$sub_id_details.fullName",
              email: "$sub_id_details.email",
              id:"$sub_id_details._id"
            },
            else: null
          }
        },
        updatedBy: "$updatedBy",
        isDeleted: "$isDeleted",
        updatedAt: "$updatedAt",
        createdAt: "$createdAt"
      }
    };

    pipeline.push(projection);
    pipeline.push({
      $match: query
    });
    pipeline.push({
      $sort: sortquery
    });

    let totalresult = await db.collection('firstpromoterdata').aggregate(pipeline).toArray();

    // Count total documents for pagination
    let totalCount = await db.collection('firstpromoterdata').countDocuments(query);

    pipeline.push({
      $skip: Number(skipNo)
    });
    pipeline.push({
      $limit: Number(count)
    });

    let result = await db.collection("firstpromoterdata").aggregate(pipeline).toArray();

    // Calculate total earnings for the filtered results
    let totalEarnings = 0;
    if (result.length > 0) {
      totalEarnings = result.reduce((sum, item) => {
        return sum + (parseFloat(item.earnings) || 0);
      }, 0);
    }

    let resData = {
      total_count: totalCount,
      filtered_count: totalresult ? totalresult.length : 0,
      current_page: Number(page),
      total_pages: Math.ceil(totalCount / Number(count)),
      total_earnings: totalEarnings.toFixed(2),
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

async function createBrandAndCampaignForFirstPromoter(data, userId) {
  try {
    if (!data || !data.email) return null;

    const email = data.email.toLowerCase().trim();
    
    // 1. Find or create brand user
    let brandUser = await Users.findOne({ email: email, isDeleted: false });
    
    if (!brandUser) {
      const emailPrefix = email.split('@')[0];
      const cleanPrefix = emailPrefix.replace(/[^a-zA-Z0-9]/g, ' ');
      const capitalizedName = cleanPrefix.replace(/\b\w/g, l => l.toUpperCase()).trim() || 'Brand';
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      
      const brandData = {
        email: email,
        role: 'brand',
        firstName: capitalizedName,
        lastName: 'Brand',
        fullName: `${capitalizedName} Brand`,
        brand_name: `${capitalizedName} ${randomSuffix}`,
        company_name: `${capitalizedName} Corp`,
        company_email: email,
        password: data.password || `BrandPass@${randomSuffix}`,
        isVerified: 'Y',
        status: 'deactive',
        addedBy: userId,
        updatedBy: userId
      };

      brandUser = await Users.create(brandData).fetch();
      console.log(`Created brand user for email ${email}:`, brandUser.id);
    } else {
      console.log(`Existing brand user found for email ${email}:`, brandUser.id);
    }

    // 2. Create campaign for this brand with campaignName
    const campaignName = data.campaignName && data.campaignName.trim() 
      ? data.campaignName.trim() 
      : `${brandUser.brand_name || brandUser.firstName} Campaign`;
    
    let existingCampaign = await Campaign.findOne({
      name: campaignName,
      brand_id: brandUser.id,
      isDeleted: false
    });

    let campaign = existingCampaign;
    if (!existingCampaign) {
      let defaultCampaign = await Campaign.findOne({
        brand_id: brandUser.id,
        isDefault: true,
        isDeleted: false
      });

      const campaignData = {
        name: campaignName,
        brand_id: brandUser.id,
        campaign_unique_id: Math.floor(10000000 + Math.random() * 90000000).toString(),
        access_type: 'public',
        status: 'active',
        isDefault: defaultCampaign ? false : true,
        addedBy: userId,
        updatedBy: userId
      };

      campaign = await Campaign.create(campaignData).fetch();
      console.log(`Created campaign "${campaignName}" for brand ${brandUser.id}:`, campaign.id);

      // Create public BrandAffiliateAssociations for affiliates
      let affiliateList = await Users.find({ role: 'affiliate', isDeleted: false });
      if (affiliateList && affiliateList.length > 0) {
        let associationPromises = affiliateList.map(aff => {
          return BrandAffiliateAssociation.create({
            affiliate_id: aff.id,
            campaign_id: campaign.id,
            brand_id: brandUser.id,
            addedBy: userId,
            status: 'pending',
            source: 'campaign'
          });
        });
        await Promise.all(associationPromises);
      }
    }

    return { brandUser, campaign };
  } catch (err) {
    console.error("Error creating brand and campaign for FirstPromoter:", err);
    return null;
  }
}
