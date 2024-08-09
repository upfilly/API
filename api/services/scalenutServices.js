const { v4: uuidv4 } = require("uuid");
const csv = require("csv-parser");
const constant = require("../../config/local");
const axios = require("axios");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
exports.exportScalenutData = async (data) => {
  try {
    console.log(data.email);
    console.log(data.password);
    console.log(data.url);
    const user_password = data.password;
    const user_email = data.email;
    const url = data.url;
    var rootpath = process.cwd();
    var fullpath = rootpath + "/assets/downloads/";
    const downloadPath = fullpath;

    // Create the download directory if it doesn't exist
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath);
    }
    let rowData=[{
      id:"",
      status:"",
      earnings:"",
      created_at:new Date(),
      sub_id:"",
      lead_id:"",
      lead_email:"",
    }];
    // Generate a unique file name using UUID
    const uniqueId = uuidv4();
    const newFileName = `file_${uniqueId}.csv`; // Adjust file extension as needed

    // Launch the browser
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });
    const page = await browser.newPage();

    // Set up download behavior
    const client = await page.target().createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadPath,
    });

    // Navigate to the login page
    await page.goto(`${url}`, { waitUntil: "networkidle2" });

    // Set the viewport size
    await page.setViewport({ width: 1080, height: 1024 });

    // Fill in the email and password fields
    await page.type("#puser_email", user_email);
    const password = user_password;
    await page.type("#puser_password", password);

    // Submit the form
    await page.click(".btn-default");

    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    // Navigate to the "Rewards" tab
    await page.click('a[href="/my-rewards"]');

    // Wait for the "Rewards" page to load
    await page.waitForSelector('a[href="/my-rewards/export"]');

    // Click on the export link to start the download
    await page.click('a[href="/my-rewards/export"]');

    // Wait for the download to complete
    let files;
    let newPath = "";
    do {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      files = fs.readdirSync(downloadPath);
    } while (!files.find((file) => file.startsWith("rewards")));

    // Find the downloaded file
    const downloadedFile = files.find((file) => file.startsWith("rewards")); // Adjust prefix if needed

    if (downloadedFile) {
      const oldPath = path.join(downloadPath, downloadedFile);
      newPath = path.join(downloadPath, newFileName);

      try {
        fs.renameSync(oldPath, newPath);
        console.log("File renamed successfully to", newPath);
        
        // Process the CSV file
        fs.createReadStream(`${newPath}`)
          .pipe(csv())
          .on("data", (row) => {
            // console.log("Processing row:", row);
            rowData = row;
            return newPath;
          })
          .on("end", () => {
            
            console.log(newPath);
            return newPath;
          });
      } catch (error) {
        console.error("Error processing the file:", error);
      }
    } else {
      console.log("No file found to rename.");
    }

    await browser.close();
    return {success:true,msg:newFileName,data:rowData};
  } catch (error) {
    return {
      success: false,
      msg: "Taking a lot of time to login, user might not exists on first-promoter",
    };
  }
};
exports.viewScalenutData = async (data) => {
  try {
  } catch (error) {
    return error;
  }
};
