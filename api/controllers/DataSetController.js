const response = require("../services/Response");
const constants = require("../../config/constants").constants;
const constant = require("../../config/local");
const db = sails.getDatastore().manager;
const ObjectId = require('mongodb').ObjectId;
const fs = require("fs");
const xlsx = require("xlsx");
const excel = require("exceljs");
const Validations = require("../Validations/index");
const Emails = require("../Emails");
// const EmailMessageTemplate = require("../models/EmailMessageTemplate");
const https = require('https');
// const FileType = require('file-type');

const Services = require('../services/index');
const Papa = require('papaparse');
const axios = require("axios")
const { Builder } = require("xml2js");
const xml2js = require("xml2js");

const csv = require("csvtojson");


// Function to sanitize object keys for XML
function sanitizeKeys(obj) {
  const sanitizedObj = {};
  for (const key in obj) {
    const newKey = key.replace(/\s+/g, "_"); // Replace spaces with underscores
    sanitizedObj[newKey] = obj[key]; // Assign value to new key
  }
  return sanitizedObj;
}


 // Function to convert CSV to XML
 async function convertCSVtoXML(csvFilePath) {
  try {
    let rootpath = process.cwd()
    let xmlPath = rootpath + "/assets/documents/"
    xmlPath = xmlPath + generateName() + ".xml"

    // Convert CSV to JSON
    let jsonArray = await csv().fromFile(csvFilePath);
    jsonArray = jsonArray.map(sanitizeKeys);

    // Convert JSON to XML format
    const builder = new Builder({ headless: true, rootName: "Root" });
    const xmlData = builder.buildObject({ Record: jsonArray });

    // Write XML to file
    if (!fs.existsSync(xmlPath)) {
      // fs.mkdirSync("assets"); 
    }
    fs.writeFileSync(xmlPath, xmlData);
    console.log(`✅ XML file saved at: ${xmlPath}`);
    return xmlPath
  } catch (error) {
    console.error("❌ Error converting CSV to XML:", error);
  }
}

// Define input CSV file and output XML file paths
// const csvFilePath = "input.csv";
// const xmlFilePath = "output.xml";

// // Run the conversion
// convertCSVtoXML(csvFilePath, xmlFilePath).catch(console.error);
 
async function fetchAndUpdateXML(url, xmlFilePath,id) {
  try {
    // Fetch XML data from the URL
    const response = await axios.get(url);
    const xmlData = response.data;

    // Parse XML to JSON
    const parser = new xml2js.Parser();
    const builder = new xml2js.Builder({ headless: true });

    const jsonData = await parser.parseStringPromise(xmlData);
    
    let existingRecords = jsonData?.Root?.Record;
    
    const lastProductURL = existingRecords.length > 0 ? existingRecords[existingRecords.length - 1]["Product_URL"]?.[0] : "https://default-url.com";
    const newRecord = {
      Share_URL : [`https://upfilly.com/?affiliate_id=${id}&url=${lastProductURL}`]
    }

    // Ensure "Root" exists and has "Record" array
    if (!jsonData.Root) {
      jsonData.Root = { Record: [] };
    }

    // If there's only one record, convert it into an array
    if (!Array.isArray(jsonData.Root.Record)) {
      jsonData.Root.Record = [jsonData.Root.Record];
    }

    // Add the new record
    jsonData.Root.Record.push(newRecord);

    // Convert JSON back to XML
    const updatedXml = builder.buildObject(jsonData);
    xmlFilePath = xmlFilePath + generateName() + ".xml"
    // Save the updated XML to a file
    fs.writeFileSync(xmlFilePath, updatedXml);
    console.log(`✅ New record added and XML saved at: ${xmlFilePath}`);
    return xmlFilePath
  } catch (error) {
    console.error("❌ Error fetching or updating XML:", error);
  }
}


generateName = function () {
  // action are perform to generate random name for every file
  var uuid = require('uuid');
  var randomStr = uuid.v4();
  var date = new Date();
  var currentDate = date.valueOf();

  retVal = randomStr + currentDate;
  return retVal;
};

async function downloadCSV(url) {
  try {
    const { data } = await axios.get(url);
    
    // ✅ Check if response contains unwanted metadata
  if (data.includes("google.visualization.Query.setResponse")) {
    const jsonMatch = data.match(/google\.visualization\.Query\.setResponse\((.*)\);/);
    
    if (jsonMatch && jsonMatch[1]) {
      const jsonData = JSON.parse(jsonMatch[1]);

      // ✅ Extract column headers from JSON
      const headers = jsonData.table.cols.map(col => col.label || ""); // Handle empty labels

      // ✅ Extract row values
      const rows = jsonData.table.rows.map(row => row.c.map(cell => (cell ? cell.v : "")));

      // ✅ Combine headers and rows into CSV format
      return [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    }
  }

  // ✅ Return empty CSV format if parsing fails
  return "";
  } catch (error) {
    console.error("Error downloading CSV:", error);
    return null;
  }
}

function saveCSVToFile(csvData, filename) {
  // const filePath = path.join(__dirname, "assets", filename);
  let rootpath = process.cwd()
  let csvPath = rootpath + "/assets/url_docs/"
  csvPath = csvPath + generateName() + ".csv"
  if (!fs.existsSync(csvPath)) {
    // fs.mkdirSync("assets");
    
  }

  try {
    fs.writeFileSync(csvPath, csvData);
    
    csvPath = csvPath.split("/")
    csvPath = constant.BACK_WEB_URL + "/"+csvPath[6]+"/"+csvPath[7]
    console.log(csvPath,'csvPatddsfdsfdh')
    return csvPath
  } catch (error) {
    console.error("Error writing CSV file:", error);
  }
}


async function processCSVAndRespond(csvFilePath, newColumnName, affliate_id) {
  try {
    let resolvedPath = csvFilePath //path.resolve(csvFilePath);
    
    const csvData = fs.readFileSync(resolvedPath, 'utf8');

    const results = Papa.parse(csvData, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });

    const data = results.data;

    data.forEach(row => {
      if (row['Product ID'] && row['Product URL']) {
        row[newColumnName] = `https://upfilly.com/?affiliate_id=${affliate_id}&url=${row['Product URL']}`;
      } else {
        row[newColumnName] = "Missing Data";
      }
    });

    const csv = Papa.unparse(data, { header: true });

    // Optional: Save the updated CSV
    // console.log(resolvedPath,'resolvedPath')
    
    fs.writeFileSync(resolvedPath, csv, 'utf8');
    
    resolvedPath = resolvedPath.split("/")
    resolvedPath = "/"+ resolvedPath[6]+"/"+resolvedPath[7] //constant.BACK_WEB_URL + 
    return resolvedPath; // Return the CSV data

  } catch (error) {
    console.error('Error processing CSV:', error);
    throw error; // Re-throw the error for the caller to handle
  }
}



let Unique = (arr) => {
  //To store the unique sub arrays
  let uniques = [];

  //To keep track of the sub arrays
  let itemsFound = {};

  for (let val of arr) {
    //convert the sub array to the string
    let stringified = JSON.stringify(val);

    //If it is already added then skip to next element
    if (itemsFound[stringified]) {
      continue;
    }

    //Else add the value to the unique list
    uniques.push(val);

    //Mark it as true so that it can tracked
    itemsFound[stringified] = true;
  }

  //Return the unique list
  return uniques;
}

exports.importCsvData = async (req, res) => {
  let duplicate = 0;
  let createdCount = 0;
  try {
    const student_arr = await new Promise((resolve, reject) => {
      req.file("file").upload(
        { maxBytes: 10485760, dirname: "../../assets" }, // Change the directory
        function whenDone(err, files) {
          if (err && err.code == "E_EXCEEDS_UPLOAD_LIMIT") {
            reject({
              success: false,
              error: {
                code: 404,
                message: "File size must be less than 10 MB",
              },
            });
          } else {
            // Assuming you want to do something with the first uploaded file
            const uploadedFile = files[0];
            // checking file type
            if (
              uploadedFile.type !==
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
              uploadedFile.type !== "text/csv"
            ) {
              reject({
                success: false,
                error: {
                  code: 404,
                  message: "Invalid file type",
                },
              });
            }
            // Access file properties
            const filename = uploadedFile.filename;
            const fileByteSize = uploadedFile.size;
            const name = uploadedFile.fd; // No need to replace here
            // Read the file based on file extension
            if (filename.endsWith(".csv")) {
              // CSV file
              fs.readFile(name, "utf8", async (err, data) => {
                if (err) {
                  reject({
                    success: false,
                    error: {
                      code: 500,
                      message: "Error reading CSV file",
                    },
                  });
                } else {
                  // Process CSV data
                  const parsedData = await parseCSV(data); // Implement parseCSV function
                  resolve(parsedData);
                }
              });
            } else if (
              filename.endsWith(".xlsx") ||
              filename.endsWith(".xls")
            ) {
              // Excel file
              const workbook = xlsx.readFile(name);
              const sheetName = workbook.SheetNames[0];
              const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
              resolve(data);
            } else {
              reject({
                success: false,
                error: {
                  code: 404,
                  message: "Unsupported file format",
                },
              });
            }
          }
        }
      );
    });
    response.success(
      student_arr,
      constants.CSVDATA.IMPORTED_SUCCESSFULLY,
      req,
      res
    );
  } catch (err) {
    res.status(400).json({
      success: false,
      error: {
        code: 400,
        message: err,
      },
    });
  }
};




exports.importCsvDataHttp = async (req, res) => {
  let duplicate = 0;
  let createdCount = 0;
  try {
    let user_id = req.query.id;
    let isExists = await DataSet.find({ user_id: user_id });
    if (!isExists) {
      throw "No data found";
    }
    let listOfData = [];
    for await (let data of isExists) {
      const url = constant.BACK_WEB_URL + "/" + data.filePath; // assume the URL is sent in the request body
      // console.log(url);
      const { fileType1, fileBuffer } = await getFileFromUrl(url);
      let fileType = url.substr(url.lastIndexOf(".") + 1)
      if (fileType !== 'csv' && fileType !== 'xlsx' && fileType !== 'xls') {
        throw {
          success: false,
          error: {
            code: 404,
            message: 'Invalid file type',
          },
        };
      }
      var student_arr;
      if (fileType === 'csv') {
        student_arr = await parseCSV(fileBuffer.toString('utf8'), data.addedBy);
      } else {
        student_arr = await parseExcelFile(fileBuffer, data.addedBy);
      }
      listOfData.push(student_arr);
    }
    //  console.log(listOfData);
    response.success(
      listOfData,
      constants.CSVDATA.IMPORTED_SUCCESSFULLY,
      req,
      res
    );
  } catch (err) {
    res.status(400).json({
      success: false,
      error: {
        code: 400,
        message: err,
      },
    });
  }
};

async function getFileFromUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const fileType = res.headers['content-type'];
      const chunks = [];
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      res.on('end', () => {
        const fileBuffer = Buffer.concat(chunks);
        resolve({ fileType, fileBuffer });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// async function getFileType(fileBuffer) {
//   const fileType = await FileType.fromBuffer(fileBuffer);
//   return fileType.ext;
// }

async function parseExcelFile(fileBuffer, addedBy) {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  return data;
}

async function parseCSV(csvData, addedBy) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvData, {
      header: true, // Automatically uses the first row as headers
      skipEmptyLines: true, // Skips empty rows
      complete: function (results) {
        const parsedData = results.data.map((row) => ({
          ...row,
          addedBy, // Add the `addedBy` field to each row
        }));
        resolve(parsedData);
      },
      error: function (error) {
        reject(error);
      },
    });
  });
}
/*
async function parseCSV(csvData, addedBy) {
  // Split the CSV data by lines
  const lines = csvData.trim().split("\n");
  const result = [];

  // Extract headers from the first line
  const headers = lines[0].split(",");

  // Iterate through each line, starting from the second line
  for (let i = 1; i < lines.length; i++) {
    const obj = {};
    const values = lines[i].split(",");

    // Create an object for each row, using the headers as keys
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index].trim();
    });
    obj["addedBy"] = addedBy;
    result.push(obj);
  }

  return result;
}
*/
exports.sendDataSets = async (req, res) => {
  try {
    let validation_result = await Validations.DataSetValidation.addDataSet(
      req,
      res
    );

    if (validation_result && !validation_result.success) {
      throw validation_result.message;
    }

    let data = req.body;

    query1 = {
      addedBy: req.identity.id,
      status: "accepted",
      isDeleted: false,
    };
    query2 = {
      brand_id: req.identity.id,
      status: "accepted",
      isDeleted: false,
    };


    let BrandAffiliateAssociations = await BrandAffiliateAssociation.find({
      brand_id: req.body.brand_id,
      status: "accepted",
      isDeleted: false,
      isActive: true
    });
    listOfAcceptedInvites = BrandAffiliateAssociations;

    for (let invite of listOfAcceptedInvites) {
      let findUser = await Users.findOne({
        id: invite.affiliate_id,
        // status: data.affiliateStatus,
        isDeleted: false,
      });
      let emailPayload = {
        brandFullName: req.identity.fullName,
        affiliateFullName: findUser.fullName,
        affiliateEmail: findUser.email,
      };

      await Emails.DataSet.sendDataSet(emailPayload);
    }
    // console.log(listOfAcceptedInvites,'listOfAcceptedInvites')

    let payload = {
      addedBy: req.identity.id,
      filePath: data.filePath || "",
      url : data.url || "",
    }

    await DataSet.create(payload);

    if(data.type == "url"){
      const url = data.url
      if(url.endsWith("xml")){
        console.log("under xml")
        let rootpath = process.cwd()
        const xmlFilePath = rootpath + "/assets/documents/"
        let id = req.identity.id
        let xml = await fetchAndUpdateXML(url, xmlFilePath,id);

        xml = xml.split("/")
        xml = xml.splice(-2)
        xml = xml.join("/")
        // console.log(listOfAcceptedInvites.length,"listOfAcceptedInvites")
        // for await (let itm of listOfAcceptedInvites ){
          console.log("here")
          payload = {
            brand_id: req.identity.id,
            url: urlData || "",//data.url
            xml : xml,
            type:data.type
          }
          let existingData = await DataFeeds.findOne({
            url :data.url,
            brand_id: req.identity.id,
            xml : xml
          });
          
          if (!existingData) {
            await DataFeeds.create(payload);
          } else {
            await DataFeeds.updateOne({ url :data.url, brand_id: req.identity.id,xml : xmlPath,type: data.type }, payload);
          }
        // }
        return response.success(student_arr, constants.DATASET.ADDED, req, res);
      }

      const googleSheetURL = url;

      // Convert Google Sheets URL to CSV export URL
      const csvExportURL = googleSheetURL.replace('/edit', '/gviz/tq?tqx=out:csv');
      const csvData = await downloadCSV(csvExportURL);
      if (csvData) {
        // Specify the filename to save the data
        const filename = 'output_with_new_column.csv';

        // Save the downloaded CSV data to a file
        var urlData = saveCSVToFile(csvData, filename);
        
        let csv_url = urlData
        // console.log(csv_url,'=====')
        csv_url = csv_url.split("/") // on server 
        csv_url = csv_url.splice(-2)
        csv_url = csv_url.join("/")
        
        var rootpath = process.cwd();
        const csvPath = rootpath + "/assets/"+ csv_url //path.join(__dirname, 'data.csv'); // Path relative to script
        
        const newColumn = "Share URL";
        urlData = await processCSVAndRespond(csvPath,newColumn,req.identity.id)
        urlData =csv_url // urlData.split("/") //[1] + "/" + urlData.split("/")[2]
        
        // convert csv into xml
        let xmlPath = await convertCSVtoXML(csvPath)
        xmlPath = xmlPath.split("/")
        xmlPath = xmlPath.splice(-2)
        xmlPath = xmlPath.join("/")
        
        // for await (let itm of listOfAcceptedInvites ){
          payload = {
            brand_id: req.identity.id,
            url: urlData,//data.url
            xml : xmlPath,
            type:data.type

          }
          let existingData = await DataFeeds.findOne({
            url :data.url,
            brand_id: req.identity.id,
            xml : xmlPath,
            type:data.type,

          });
          
          if (!existingData) {
            await DataFeeds.create(payload);
          } else {
            await DataFeeds.updateOne({ url :data.url, brand_id: req.identity.id,xml : xmlPath }, payload);
          }
        // }
      return response.success(student_arr, constants.DATASET.ADDED, req, res);
      } else {
        console.error('Failed to download CSV data');
      }
    }else {
      var rootpath = process.cwd();
      const csvPath = rootpath + "/assets"+ data.filePath //path.join(__dirname, 'data.csv'); // Path relative to script
      
      const newColumn = "Affiliate Link";
      let updatedCSV = await processCSVAndRespond(csvPath,newColumn,req.identity.id)
      // converting csv file into xml

      let xmlPath = await convertCSVtoXML(csvPath)
      xmlPath = xmlPath.split("/")
      xmlPath = xmlPath.splice(-2)
      xmlPath = xmlPath.join("/")
      // console.log(listOfAcceptedInvites.length,"listOfAcceptedInvites")

      // for await (let itm of listOfAcceptedInvites ){
        console.log('data.filePath')
        payload = {
          brand_id: req.identity.id,
          filePath: updatedCSV, //data.filePath   contain file path + new column which is added
          xml : xmlPath,
          type:data.type

        }
        let existingData = await DataFeeds.findOne({
          filePath :data.filePath,
          brand_id: req.identity.id
        });
        
        if (!existingData) {
          await DataFeeds.create(payload);
        } else {
          await DataFeeds.updateOne({ url :data.filePath, brand_id: req.identity.id,xml : xmlPath }, payload);
        }
      // }

      return response.success(student_arr, constants.DATASET.ADDED, req, res);

    }

    // here we are storing data feeds
    

    let duplicate = 0;
    let createdCount = 0;
    const url = constant.BACK_WEB_URL + "/" + data.filePath; // assume the URL is sent in the request body
    

    const { fileType1, fileBuffer } = await getFileFromUrl(url);
    
    
    let fileType = url.substr(url.lastIndexOf(".") + 1)
    console.log(fileType,'fileType')
    if (fileType !== 'csv' && fileType !== 'xlsx' && fileType !== 'xls') {
      throw {
        success: false,
        error: {
          code: 404,
          message: 'Invalid file type',
        },
      };
    }
    var student_arr;
    if (fileType === 'csv') {
      student_arr = await parseCSV(fileBuffer.toString('utf8'));
    } else {
      student_arr = await parseExcelFile(fileBuffer);
    }


    for await (let item of student_arr) {
      payload = {
        ID: item["Product ID"],
        type: item.Type,
        SKU: item.SKU,
        Name: item.Name,
        productURL: item["Product URL"],
        price: item["Price"],
        retailPrice: item["Retail Price"],
        thumbnailURL: item["Thumbnail URL"],
        searchKeywords: item["Search Keywords"],
        description: item["Description"],
        category: item["Category"],
        categoryId: item["Category ID"],
        brand: item["Brand"],
        childSKU: item["Child SKU"],
        childPrice: item["Child Price"],
        color: item["Color"],
        colorFamily: item["Color Family"],
        colorSwatches: item["Color Swatches"],
        size: item["Size"],
        shoeSize: item["Shoe Size"],
        pantSize: item["Pants Size"],
        occasion: item["Occassion"],
        season: item["Season"],
        badges: item["Badges"],
        ratingAvg: item["Rating Avg"],
        ratingCount: item["Rating Count"],
        inventoryCount: item["Inventory Count"],
        dateCreated: item["Date Created"],
        brand_name: req.identity.name,
        brand_id: req.identity.id
        //
        // Published: Boolean(Number(item.Published)),
        // isFeatured: Boolean(Number(item.Is_Featured)),
        // isVisible: Boolean(Number(item.Is_Visible)),
        // shortDescription: item.Short_Description,
        // longDescription: item.Long_Description,
        
        // url: item.url
      }

      let existingData = await DataFeeds.findOne({
        ID: item["Product ID"],
        SKU: item.SKU,
        brand_id: req.identity.id
      });

      if (!existingData) {
        await DataFeeds.create(payload);
      } else {
        await DataFeeds.updateOne({ ID: item["Product ID"], SKU: item.SKU, brand_id: req.identity.id }, payload);
      }

    }
    return response.success(student_arr, constants.DATASET.ADDED, req, res);
  } catch (err) {
    console.log(err,'============errr')
    return response.failed(err, `${err}`, req, res);
  }
};

exports.listOfDataSet = async (req, res) => {
  try {
    var search = req.param("search");
    var isDeleted = req.param("isDeleted");
    var page = req.param("page");
    var count = parseInt(req.param("count"));
    let sortBy = req.param("sortBy");
    let addedBy = req.param("addedBy");
    // let user_id = req.param("user_id");
    let startDate = req.param("startDate");
    let endDate = req.param("endDate");
    let affiliate_id = req.param("affiliate_id");
    let brand_id = req.param("brand_id");
    //Get all brands associated with this affiliate
    var date = new Date();

    var query = {};

    if (search) {
      query.$or = [{ event: { $regex: search, $options: "i" } }];
    }
    let sortquery = {};
    if (sortBy) {
      let typeArr = [];
      typeArr = sortBy.split(" ");
      let sortType = typeArr[1];
      let field = typeArr[0];
      sortquery[field ? field : "updatedAt"] = sortType
        ? sortType == "desc"
          ? -1
          : 1
        : -1;
    } else {
      sortquery = { updatedAt: -1 };
    }

    query.isDeleted = false;

    // if (user_id) {
    //   query.user_id = new ObjectId(user_id);
    // }

    if (addedBy) {
      query.addedBy = new ObjectId(addedBy);
    }

    if (startDate && endDate) {
      startDate = new Date(startDate);
      endDate = new Date(endDate);

      query.$and = [
        { assignDateAndTime: { $gte: startDate } },
        { submitDateAndTime: { $lte: endDate } },
      ];
    }
    if (startDate && !endDate) {
      startDate = new Date(startDate);

      query.assignDateAndTime = { $gte: startDate };
    }
    if (!startDate && endDate) {
      endDate = new Date(endDate);
      query.submitDateAndTime = { $lte: endDate };
    }
    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "addedBy",
          foreignField: "_id",
          as: "addedBy_details",
        },
      },
      {
        $unwind: {
          path: "$addedBy_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "brand_id",
          foreignField: "_id",
          as: "brand_details",
        },
      },
      {
        $unwind: {
          path: "$brand_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          user_id: "$user_id",
          filePath: "$filePath",
          brand_details: "$brand_details",
          addedBy_details: "$addedBy_details",
          url:"$url",
          xml :"$xml",// its path in docuemnts
          status: "$status",
          isDeleted: "$isDeleted",
          addedBy: "$addedBy",
          updatedBy: "$updatedBy",
          createdAt: "$createdAt",
          updatedAt: "$updatedAt",
        },
      },
      {
        $match: query,
      },
      {
        $sort: sortquery,
      },
    ];
    let totalResult = await db.collection("dataset")
      .aggregate([...pipeline])
      .toArray();
    if (page && count) {
      var skipNo = (page - 1) * count;
      pipeline.push(
        {
          $skip: Number(skipNo),
        },
        {
          $limit: Number(count),
        }
      );
    }

    let result = await db.collection("dataset")
      .aggregate([...pipeline])
      .toArray();

    return res.status(200).json({
      success: true,
      data: result,
      total: totalResult.length,
    });

  } catch (err) {
    // (err)
    console.log(err);
    return res.status(400).json({
      success: false,
      error: { code: 400, message: "" + err },
    });
  }
};

exports.sendEmailMessage = async (req, res) => {
  try {
    // let validation_result = await Validations.SendEmailMessage.sendEmailMessage(
    //   req,
    //   res
    // );

    // if (validation_result && !validation_result.success) {
    //   throw validation_result.message;
    // }
    let query1 = {};
    let query2 = {};

    let data = req.body;
    if (data.isAllJoined) {

      query1 = {
        addedBy: req.identity.id,
        status: "accepted",
        isDeleted: false,
      };
      query2 = {
        brand_id: req.identity.id,
        status: "accepted",
        isDeleted: false,
      };

      // console.log(query1);
      // let listOfAcceptedInvites = await AffiliateInvite.find(query1);
      // let listOfBrandInvite = await AffiliateBrandInvite.find(query2);

      let BrandAffiliateAssociations = await BrandAffiliateAssociation.find({
        brand_id: req.identity.id,
        status: "accepted",
        isDeleted: false,
        isActive: true
      });
      listOfAcceptedInvites = BrandAffiliateAssociations;

      function removeDuplicates(array, key) {
        const seen = new Set();
        return array.filter((item) => {
          const keyValue = item[key];
          if (seen.has(keyValue)) {
            return false;
          }
          seen.add(keyValue);
          return true;
        });
      }

      // Combine the two lists
      // let combinedList = [...listOfBrandInvite, ...listOfAcceptedInvites];
      // // console.log(combinedList);
      // // Remove duplicates based on the 'id' key
      // listOfAcceptedInvites = removeDuplicates(combinedList, "affiliate_id");
      // console.log(listOfAcceptedInvites, "==listOfAcceptedInvites");

      for await (let invites of listOfAcceptedInvites) {
        let findUser = await Users.findOne({
          id: invites.affiliate_id,
          // status: data.affiliateStatus,
          isDeleted: false,
        });
        if (findUser) {
          // console.log(findUser, "===findUser");

          data.addedBy = req.identity.id;
          data.affiliate_id = findUser.id
          let saved_payload = {
            addedBy: req.identity.id,
            affiliate_id: findUser.id,
            title: data.title,
            description: data.description,
            isAllJoined: data.isAllJoined
          }

          let emailMessage = await EmailMessageTemplate.create(saved_payload).fetch();
          if (emailMessage) {
            if (['operator', 'analyzer', 'publisher', 'customer'].includes(req.identity.role)) {
              await Services.activityHistoryServices.create_activity_history(req.identity.id, 'emailmessagetemplate', 'created', emailMessage, emailMessage)
            }
          }

          // if (!emailMessage) {
          //   throw constants.EMAILMESSAGE.ERROR_SENDING_EMAIL;
          // }

          let emailPayload = {
            brandFullName: req.identity.fullName,
            affiliateFullName: findUser.fullName,
            affiliateEmail: findUser.email,
            emailMessage: data.description,
          };

          await Emails.EmailMessageTemplate.sendEmailMessageTemplate(
            emailPayload
          );
        }
      }
    }
    // if(data.groups && data.groups.length>0){

    // }
    if (data.acceptedDate) {
      let time_interval_payload = {};

      if (data.timeInterval === "before") {
        let updatedAt = {
          "<=": new Date(new Date(data.acceptedDate).setHours(0, 0, 0))
        }
        query1 = {
          addedBy: req.identity.id,
          status: "accepted",
          isDeleted: false,
          updatedAt: updatedAt,
        };
        query2 = {
          brand_id: req.identity.id,
          status: "accepted",
          isDeleted: false,
          updatedAt: updatedAt,
        };

        time_interval_payload = {
          title: data.title,
          description: data.description,
          timeInterval: "before"

        }


      }
      if (data.timeInterval === "after") {
        let updatedAt = {
          ">=": new Date(new Date(data.acceptedDate).setHours(0, 0, 0))
        }
        query1 = {
          addedBy: req.identity.id,
          status: "accepted",
          isDeleted: false,
          updatedAt: updatedAt,
        };
        query2 = {
          brand_id: req.identity.id,
          status: "accepted",
          isDeleted: false,
          updatedAt: updatedAt,
        };

        time_interval_payload = {
          title: data.title,
          description: data.description,
          timeInterval: "after"
        }


      }
      // console.log(query1);
      let listOfAcceptedInvites = await AffiliateInvite.find(query1);
      let listOfBrandInvite = await AffiliateBrandInvite.find(query2);

      function removeDuplicates(array, key) {
        const seen = new Set();
        return array.filter((item) => {
          const keyValue = item[key];
          if (seen.has(keyValue)) {
            return false;
          }
          seen.add(keyValue);
          return true;
        });
      }

      // Combine the two lists
      let combinedList = [...listOfBrandInvite, ...listOfAcceptedInvites];
      // console.log(combinedList);
      // Remove duplicates based on the 'id' key
      listOfAcceptedInvites = removeDuplicates(combinedList, "affiliate_id");

      for (let invites of listOfAcceptedInvites) {
        let findUser = await Users.findOne({
          id: invites.affiliate_id,
          // status: data.affiliateStatus,
          isDeleted: false,
        });
        if (findUser) {

          data.addedBy = req.identity.id;
          data.affiliate_id = findUser.id

          time_interval_payload.addedBy = req.identity.id
          time_interval_payload.affiliate_id = findUser.id

          let emailMessage = await EmailMessageTemplate.create(time_interval_payload).fetch();
          if (emailMessage) {
            if (['operator', 'analyzer', 'publisher', 'customer'].includes(req.identity.role)) {
              await Services.activityHistoryServices.create_activity_history(req.identity.id, 'emailmessagetemplate', 'created', emailMessage, emailMessage)
            }
          }

          let emailPayload = {
            brandFullName: req.identity.fullName,
            affiliateFullName: findUser.fullName,
            affiliateEmail: findUser.email,
            emailMessage: data.description,
          };

          await Emails.EmailMessageTemplate.sendEmailMessageTemplate(
            emailPayload
          );
        }
      }
    }

    if (data.affiliateStatus) {
      query2 = {
        brand_id: req.identity.id,
        // status: "accepted",
        isDeleted: false,
        // status: data.affiliateStatus,
      };
      query1 = {
        addedBy: req.identity.id,
        // status: "accepted",
        isDeleted: false,
        // status: data.affiliateStatus,
      };

      // console.log(query1);
      let listOfAcceptedInvites = await AffiliateInvite.find(query1);
      let listOfBrandInvite = await AffiliateBrandInvite.find(query2);

      function removeDuplicates(array, key) {
        const seen = new Set();
        return array.filter((item) => {
          const keyValue = item[key];
          if (seen.has(keyValue)) {
            return false;
          }
          seen.add(keyValue);
          return true;
        });
      }

      // Combine the two lists
      let combinedList = [...listOfBrandInvite, ...listOfAcceptedInvites];
      // console.log(combinedList);
      // Remove duplicates based on the 'id' key
      listOfAcceptedInvites = removeDuplicates(combinedList, "affiliate_id");

      for (let invites of listOfAcceptedInvites) {
        let findUser = await Users.findOne({ id: invites.affiliate_id, status: data.affiliateStatus, isDeleted: false });
        if (findUser) {
          let emailPayload = {
            brandFullName: req.identity.fullName,
            affiliateFullName: findUser.fullName,
            affiliateEmail: findUser.email,
            emailMessage: data.description,
          };

          await Emails.EmailMessageTemplate.sendEmailMessageTemplate(
            emailPayload
          );
        }
      }
    }
    // let isExists = await Users.findOne({ id: data.user_id, isDeleted: false });

    // if (!isExists) {
    //   throw constants.user.USER_NOT_FOUND;
    // }

    response.success(null, constants.EMAILMESSAGE.ADDED, req, res);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: { code: 400, message: "" + error },
    });
  }
};

exports.listOfEmailMessage = async (req, res) => {
  try {
    var search = req.param("search");
    var isDeleted = req.param("isDeleted");
    var page = req.param("page");
    var count = parseInt(req.param("count"));
    let sortBy = req.param("sortBy");
    let addedBy = req.param("addedBy");
    let affiliate_id = req.param("user_id");

    var date = new Date();

    var query = {};

    if (search) {
      query.$or = [{ event: { $regex: search, $options: "i" } }];
    }
    let sortquery = {};
    if (sortBy) {
      let typeArr = [];
      typeArr = sortBy.split(" ");
      let sortType = typeArr[1];
      let field = typeArr[0];
      sortquery[field ? field : "updatedAt"] = sortType
        ? sortType == "desc"
          ? -1
          : 1
        : -1;
    } else {
      sortquery = { updatedAt: -1 };
    }

    query.isDeleted = false;

    if (affiliate_id) {
      query.affiliate_id = new ObjectId(affiliate_id);
    }

    if (addedBy) {
      query.addedBy = new ObjectId(addedBy);
    }

    // if (startDate && endDate) {
    //   startDate = new Date(startDate);
    //   endDate = new Date(endDate);

    //   query.$and = [
    //     { assignDateAndTime: { $gte: startDate } },
    //     { submitDateAndTime: { $lte: endDate } },
    //   ];
    // }
    // if (startDate && !endDate) {
    //   startDate = new Date(startDate);

    //   query.assignDateAndTime = { $gte: startDate };
    // }
    // if (!startDate && endDate) {
    //   endDate = new Date(endDate);
    //   query.submitDateAndTime = { $lte: endDate };
    // }

    // console.log(query);

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "addedBy",
          foreignField: "_id",
          as: "addedBy_details",
        },
      },
      {
        $unwind: {
          path: "$addedBy_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "affiliate_id",
          foreignField: "_id",
          as: "user_details",
        },
      },
      {
        $unwind: {
          path: "$user_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          title: "$title",
          affiliate_id: "$affiliate_id",
          description: "$description",
          user_details: "$user_details",
          addedBy_details: "$addedBy_details",

          isAllJoined: "$isAllJoined",
          timeInterval: "$timeInterval",

          status: "$status",
          isDeleted: "$isDeleted",
          addedBy: "$addedBy",
          updatedBy: "$updatedBy",
          createdAt: "$createdAt",
          updatedAt: "$updatedAt",
        },
      },
      {
        $match: query,
      },
      {
        $sort: sortquery,
      },
    ];
    let totalResult = await db.collection("emailmessagetemplate")
      .aggregate([...pipeline])
      .toArray();
    if (page && count) {
      var skipNo = (page - 1) * count;
      pipeline.push(
        {
          $skip: Number(skipNo),
        },
        {
          $limit: Number(count),
        }
      );
    }
    let result = await db.collection("emailmessagetemplate")
      .aggregate([...pipeline])
      .toArray();
    return res.status(200).json({
      success: true,
      data: result,
      total: totalResult.length,
    });

  } catch (err) {
    // (err)
    return res.status(400).json({
      success: false,
      error: { code: 400, message: "" + err },
    });
  }
};

exports.getDataSets = async (req, res) => {
  try {
    let id = req.identity.id;

  } catch (error) {
    response.failed(null, `Some thing went wrong`, req, res);
  }
}
exports.getEmailMessage = async (req, res) => {
  try {
    const id = req.param("id");
    if (!id) {
      throw constants.EMAILMESSAGE.ID_REQUIRED;
    }
    const get_Email = await EmailMessageTemplate.findOne({ id: id })
      .populate("addedBy")
      .populate("affiliate_id");

    if (get_Email) {
      return response.success(
        get_Email,
        constants.EMAILMESSAGE.FETCHED,
        req,
        res
      );
    }

    throw constants.EMAILMESSAGE.INVALID_ID;
  } catch (err) {
    // (err)
    return res.status(400).json({
      success: false,
      error: { code: 400, message: "" + err },
    });
  }
};

exports.ListDataSetsBrand = async (req, res) => {
  try {
    let affiliate_id = req.identity.id;
    if (affiliate_id) {
      let listAffiliateInvite = await AffiliateInvite.find({ affiliate_id: affiliate_id, isDeleted: false });
      if (listAffiliateInvite) {
        var findBrandList = await DataFeeds.find({ brand_id: listAffiliateInvite.brand_id, isDeleted: false })
      }

      let listOfAffiliateBrandInvite = await AffiliateBrandInvite.find({ affiliate_id: affiliate_id, isDeleted: false });
      if (listOfAffiliateBrandInvite) {
        var findAffiliateBrandInvite = await DataFeeds.find({ brand_id: listOfAffiliateBrandInvite.addedBy, isDeleted: false })
      }

      let listAllAffiliate
      if (findBrandList && findAffiliateBrandInvite) {
        listAllAffiliate = [...findBrandList, ...findAffiliateBrandInvite];
      } else if (findBrandList) {
        listAllAffiliate = findBrandList
      } else if (findAffiliateBrandInvite) {
        listAllAffiliate = findAffiliateBrandInvite
      } else {
        listAllAffiliate = []
      }


      let uniquelistAllAffiliate = Unique(listAllAffiliate);

      return res.status(200).json({
        success: true,
        data: uniquelistAllAffiliate,
        total: uniquelistAllAffiliate.length,
      });

    }

  } catch (err) {
    return res.status(400).json({
      success: false,
      error: { code: 400, message: "" + err },
    });
  }

}


exports.ListDataFeedsBrand = async (req, res) => {
  try {
    let affiliate_id = req.param('affiliate_id');
    let brand_id = req.param('brand_id');
    let BrandAffiliateAssociations = await BrandAffiliateAssociation.find({
      affiliate_id: affiliate_id,
      status: "accepted",
      isDeleted: false,
      isActive: true
    });
    let listOfBrandIds = BrandAffiliateAssociations.map((cur)=>String(cur.brand_id));
    // console.log(listOfBrandIds);
    let dataFeeds;
    if(brand_id) {
      if(listOfBrandIds.includes(brand_id)) {
        // previous code ----> dataFeeds = await DataFeeds.find({brand_id: brand_id})
        dataFeeds = await DataFeeds.find({brand_id: brand_id}).select(["url","xml","filePath","brand_id"]).populate("brand_id").sort("createdAt Desc");
      } else {
        dataFeeds = [];
      }
    } else {
        // previous code ----> dataFeeds = await DataFeeds.find({brand_id: brand_id})
      dataFeeds = await DataFeeds.find({brand_id: listOfBrandIds}).select(["url","xml","filePath","brand_id"]).populate("brand_id").sort("createdAt Desc");
    }

      return res.status(200).json({
        success: true,
        data: dataFeeds,
        total: dataFeeds.length,
      });

    } catch (err) {
      console.log(err);
    return res.status(400).json({
      success: false,
      error: { code: 400, message: "" + err },
    });
  }

}

exports.viewCSVAffiliate = async(req,res) => {
  try {
    
    const {csv_url} = req.query
    if(!csv_url){
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "CSV file require"  },
      });
    }
    
  var rootpath = process.cwd();
  const csvPath = rootpath + "/assets"+ csv_url //path.join(__dirname, 'data.csv'); // Path relative to script
  
  const newColumn = "Share URL";
  let updatedCSV = await processCSVAndRespond(csvPath,newColumn,req.identity.id)
  return res.status(200).json({
    success: true,
    data: updatedCSV,
    message : "Data fetch successfully"
  });
} catch (error) {
  return res.status(400).json({
    success: false,
    error: { code: 400, message: "" + error },
  });
}
      
}