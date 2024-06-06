/**
 * CsvImportControllerController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const response = require("../services/Response");
const constants = require("../../config/constants").constants;
const db = sails.getDatastore().manager;
const ObjectId = require("mongodb").ObjectId;
const fs = require("fs"); 
const xlsx = require("xlsx");
const excel = require("exceljs");

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
                fs.readFile(name, "utf8", async(err, data) => {
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
              } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
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
      response.success(student_arr,constants.CSVDATA.IMPORTED_SUCCESSFULLY,req,res);    
    }catch(err){
        console.log(err);
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: err,
          },
        }); 
    }
}
async function parseCSV(csvData) {
    // Split the CSV data by lines
    const lines = csvData.trim().split('\n');
    const result = [];
    
    // Extract headers from the first line
    const headers = lines[0].split(',');
    
    // Iterate through each line, starting from the second line
    for (let i = 1; i < lines.length; i++) {
        const obj = {};
        const values = lines[i].split(',');
        
        // Create an object for each row, using the headers as keys
        headers.forEach((header, index) => {
            obj[header.trim()] = values[index].trim();
        });
        
        result.push(obj);
    }
  
    return result;
}