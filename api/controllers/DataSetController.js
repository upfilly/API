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


let Unique = (arr) => {
  //To store the unique sub arrays
  let uniques = [];

  //To keep track of the sub arrays
  let itemsFound = {};

  for(let val of arr) {
      //convert the sub array to the string
      let stringified = JSON.stringify(val);

      //If it is already added then skip to next element
      if(itemsFound[stringified]) { 
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
    console.log(err);
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
    let isExists = await DataSet.find({user_id:user_id});
    if(!isExists) {
      throw "No data found";
    }
    let listOfData = [];
    for await(let data of isExists){
      const url = constant.BACK_WEB_URL+"/"+data.filePath; // assume the URL is sent in the request body
      // console.log(url);
      const { fileType1, fileBuffer } = await getFileFromUrl(url);
      let fileType= url.substr(url.lastIndexOf(".")+1)
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
        student_arr = await parseCSV(fileBuffer.toString('utf8'),data.addedBy);
      } else {
        student_arr = await parseExcelFile(fileBuffer,data.addedBy);
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
    console.log(err);
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

async function parseExcelFile(fileBuffer,addedBy) {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  return data;
}



async function parseCSV(csvData,addedBy) {
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
      let emailPayload = {
        brandFullName: req.identity.fullName,
        affiliateFullName: findUser.fullName,
        affiliateEmail: findUser.email,
      };

      await Emails.DataSet.sendDataSet(emailPayload);
    }
    let payload = {
      addedBy: req.identity.id,
      filePath: data.filePath,
    }

    await DataSet.create(payload);

    // here we are storing data feeds

    let duplicate = 0;
    let createdCount = 0;
        const url = constant.BACK_WEB_URL+"/"+data.filePath; // assume the URL is sent in the request body
        console.log(url);
        const { fileType1, fileBuffer } = await getFileFromUrl(url);
        let fileType= url.substr(url.lastIndexOf(".")+1)
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
       
      
      for (let item of student_arr) {
          payload = {
            ID:item.ID,
            type:item.Type,
            SKU:item.SKU,
            Name:item.Name,
            Published:Boolean(Number(item.Published)),
            isFeatured:Boolean(Number(item.Is_Featured)),
            isVisible:Boolean(Number(item.Is_Visible)),
            shortDescription:item.Short_Description,
            longDescription:item.Long_Description,
            brand_name:req.identity.name,
            brand_id:req.identity.id,
            url:item.url
          }

          let existingData = await DataFeeds.findOne({
            SKU: item.SKU,
            brand_id: req.identity.id,
          });

          if (!existingData) {
            await DataFeeds.create(payload);
          }else{
            await DataFeeds.updateOne({ID:item.ID},payload);
          }

      }
      



      response.success(student_arr, constants.DATASET.ADDED, req, res);
  } catch (err) {
    console.log(err);
    response.failed(err, `${err}`, req, res);
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
    let user_id = req.param("user_id");
    let startDate = req.param("startDate");
    let endDate = req.param("endDate");

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

    if (user_id) {
      query.user_id = new ObjectId(user_id);
    }

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

    console.log(query);

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
          localField: "user_id",
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
          user_id: "$user_id",
          filePath: "$filePath",
          user_details: "$user_details",
          addedBy_details: "$addedBy_details",
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
        
        let result =await db.collection("dataset")
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
      console.log(combinedList);
      // Remove duplicates based on the 'id' key
      listOfAcceptedInvites = removeDuplicates(combinedList, "affiliate_id");

      for (let invites of listOfAcceptedInvites) {
        let findUser = await Users.findOne({
          id: invites.affiliate_id,
          // status: data.affiliateStatus,
          isDeleted: false,
        });
       if(findUser) {let emailPayload = {
          brandFullName: req.identity.fullName,
          affiliateFullName: findUser.fullName,
          affiliateEmail: findUser.email,
          emailMessage: data.description,
        };

        await Emails.EmailMessageTemplate.sendEmailMessageTemplate(
          emailPayload
        );}
      }
    }
    // if(data.groups && data.groups.length>0){

    // }
    if (data.acceptedDate) {
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
      console.log(combinedList);
      // Remove duplicates based on the 'id' key
      listOfAcceptedInvites = removeDuplicates(combinedList, "affiliate_id");

      for (let invites of listOfAcceptedInvites) {
        let findUser = await Users.findOne({
          id: invites.affiliate_id,
          // status: data.affiliateStatus,
          isDeleted: false,
        });
     if(findUser)  { let emailPayload = {
          brandFullName: req.identity.fullName,
          affiliateFullName: findUser.fullName,
          affiliateEmail: findUser.email,
          emailMessage: data.description,
        };

        await Emails.EmailMessageTemplate.sendEmailMessageTemplate(
          emailPayload
        );}
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
      console.log(combinedList);
      // Remove duplicates based on the 'id' key
      listOfAcceptedInvites = removeDuplicates(combinedList, "affiliate_id");

      for (let invites of listOfAcceptedInvites) {
        let findUser = await Users.findOne({ id: invites.affiliate_id, status: data.affiliateStatus, isDeleted: false });
        if(findUser){let emailPayload = {
          brandFullName: req.identity.fullName,
          affiliateFullName: findUser.fullName,
          affiliateEmail: findUser.email,
          emailMessage: data.description,
        };

        await Emails.EmailMessageTemplate.sendEmailMessageTemplate(
          emailPayload
        );}
      }
    }
    // let isExists = await Users.findOne({ id: data.user_id, isDeleted: false });

    // if (!isExists) {
    //   throw constants.user.USER_NOT_FOUND;
    // }

    data.addedBy = req.identity.id;

    let emailMessage = await EmailMessageTemplate.create(data).fetch();

    if (!emailMessage) {
      throw constants.EMAILMESSAGE.ERROR_SENDING_EMAIL;
    }


    response.success(emailMessage, constants.EMAILMESSAGE.ADDED, req, res);
  } catch (error) {
    console.log(error);
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
    let user_id = req.param("user_id");

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

    if (user_id) {
      query.user_id = new ObjectId(user_id);
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

    console.log(query);

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
          localField: "user_id",
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
          user_id: "$user_id",
          description: "$description",
          user_details: "$user_details",
          addedBy_details: "$addedBy_details",
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
    let totalResult=await db.collection("emailmessagetemplate")
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
        let result=await db.collection("emailmessagetemplate")
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
  try{
    let id = req.identity.id;
    
  }catch(error){
    response.failed(null,`Some thing went wrong`,req,res);
  }
}
exports.getEmailMessage = async (req, res) => {
  try {
    const id = req.param("id");
    if (!id) {
      throw constants.EMAIL_MESSAGE.ID_REQUIRED;
    }
    const get_Email = await EmailMessageTemplate.findOne({ id: id })
      .populate("addedBy")
      .populate("user_id");

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

exports.ListDataSetsBrand = async(req,res)=>{
  try{
       let affiliate_id = req.identity.id;

       if(affiliate_id){
        let listAffiliateInvite = await AffiliateInvite.find({affiliate_id:affiliate_id,isDeleted:false});
        if(listAffiliateInvite){
          var findBrandList = await DataFeeds.find({brand_id:listAffiliateInvite.brand_id,isDeleted:false})   
        }

        let listOfAffiliateBrandInvite = await AffiliateBrandInvite.find({affiliate_id:affiliate_id,isDeleted:false});
        if(listOfAffiliateBrandInvite){
          var findAffiliateBrandInvite = await DataFeeds.find({brand_id:listOfAffiliateBrandInvite.addedBy,isDeleted:false}) 
        }

        let listAllAffiliate
        if(findBrandList && findAffiliateBrandInvite )  {
           listAllAffiliate = [...findBrandList, ...findAffiliateBrandInvite];
        }else if(findBrandList){
          listAllAffiliate = findBrandList
         }else if(findAffiliateBrandInvite)  {
          listAllAffiliate = findAffiliateBrandInvite
         }else{
          listAllAffiliate = []
         }

        
         let uniquelistAllAffiliate = Unique(listAllAffiliate);

        return res.status(200).json({
          success: true,
          data: uniquelistAllAffiliate,
          total: uniquelistAllAffiliate.length,
        });
        
       }

          


    

  }catch(err){
    return res.status(400).json({
      success: false,
      error: { code: 400, message: "" + err },
    });
  }

}
