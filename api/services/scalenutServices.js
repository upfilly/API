const { v4: uuidv4 } = require("uuid");
const csv = require("csv-parser");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

exports.exportScalenutData = async (data) => {
  let browser;
  try {
    const user_password = data.password;
    const user_email = data.email;
    const url = `${data.url}?redirect=%252Fmy-commissions`;
    const rootpath = process.cwd();
    const fullpath = rootpath + "/assets/downloads/";
    const downloadPath = fullpath;

    console.log(`Starting process for email: ${user_email}, URL: ${url}`);

    // Create the download directory if it doesn't exist
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }

    // Clear any existing files in download directory
    const files = fs.readdirSync(downloadPath);
    for (const file of files) {
      if (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls') || file.endsWith('.crdownload')) {
        fs.unlinkSync(path.join(downloadPath, file));
      }
    }

    // Generate a unique file name using UUID
    const uniqueId = uuidv4();
    const newFileName = `file_${uniqueId}.csv`;

    // Launch the browser
    console.log("Launching browser...");
    browser = await puppeteer.launch({
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu"
      ],
      headless: true,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // Set up download behavior
    console.log("Setting up download behavior...");
    const client = await page.target().createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadPath,
    });

    // Set longer timeouts
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    // Navigate to the URL
    console.log(`Navigating to URL: ${url}`);
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    // Wait for page to load completely
    await page.waitForFunction(() => document.readyState === 'complete');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Login process
    console.log("Attempting login...");

    // Fill email
    const emailField = await page.$('#email');
    if (!emailField) throw new Error("Email field not found");
    await emailField.click({ clickCount: 3 });
    await emailField.type(user_email, { delay: 100 });

    // Fill password
    const passwordField = await page.$('#password');
    if (!passwordField) throw new Error("Password field not found");
    await passwordField.click({ clickCount: 3 });
    await passwordField.type(user_password, { delay: 100 });

    // Click login button
    console.log("Clicking login button...");
    const loginButton = await page.$('button[data-cy="button"][data-fp="primaryButton"]');
    if (loginButton) {
      await loginButton.click();
    } else {
      await page.keyboard.press('Enter');
    }

    // Wait for navigation
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    } catch (e) {
      console.log("No navigation occurred");
    }

    // Wait for dashboard to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log("Login successful");

    // STRATEGY 1: Direct download button click
    console.log("STRATEGY 1: Looking for direct download button...");
    const downloadButton = await page.$('button[data-cy="commissions-download"][data-fp="plainButton"]');

    if (downloadButton) {
      console.log("Found download button, attempting download...");
      const filesBeforeDownload = fs.readdirSync(downloadPath);

      // Try clicking
      await downloadButton.click();
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Wait for download to complete
      let downloadedFile = null;
      const maxWaitTime = 60000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const currentFiles = fs.readdirSync(downloadPath);
        const completedFiles = currentFiles.filter(file =>
          !filesBeforeDownload.includes(file) &&
          (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls')) &&
          !file.endsWith('.crdownload')
        );

        if (completedFiles.length > 0) {
          downloadedFile = completedFiles[0];
          console.log(`Download completed: ${downloadedFile}`);
          break;
        }
      }

      if (downloadedFile) {
        const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
        await browser.close();
        return result;
      }
    }

    // STRATEGY 2: Alternative approach - navigate to rewards page and export
    console.log("STRATEGY 2: Trying alternative approach...");
    try {
      // Navigate to rewards page
      await page.goto(`${data.url}/my-commissions`, { waitUntil: "networkidle2" });

      // Look for export link/button
      const exportLink = await page.$('a[href*="export"]');
      if (exportLink) {
        console.log("Found export link, clicking...");
        const filesBeforeDownload = fs.readdirSync(downloadPath);

        await exportLink.click();
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Wait for download
        let downloadedFile = null;
        const maxWaitTime = 30000;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, 2000));

          const currentFiles = fs.readdirSync(downloadPath);
          const completedFiles = currentFiles.filter(file =>
            !filesBeforeDownload.includes(file) &&
            (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls')) &&
            !file.endsWith('.crdownload')
          );

          if (completedFiles.length > 0) {
            downloadedFile = completedFiles[0];
            console.log(`Download completed: ${downloadedFile}`);
            break;
          }
        }

        if (downloadedFile) {
          const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
          await browser.close();
          return result;
        }
      }
    } catch (altError) {
      console.log("Alternative approach failed:", altError.message);
    }

    // Final check for any downloaded files
    const finalFiles = fs.readdirSync(downloadPath);
    const downloadedFiles = finalFiles.filter(file =>
      file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls')
    );
    console.log(downloadedFiles, downloadedFiles?.length, "downloadedFilesdownloadedFiles")

    if (downloadedFiles.length > 0) {
      console.log(`Found downloaded file: ${downloadedFiles[0]}`);
      const result = await processDownloadedFile(downloadedFiles[0], downloadPath, newFileName);
      await browser.close();
      return result;
    }

    await browser.close();
    throw new Error("No file was downloaded after trying all strategies");

  } catch (error) {
    console.error("Error in exportScalenutData:", error);

    if (browser) {
      await browser.close();
    }

    return {
      success: false,
      msg: error.message,
      error: error.toString()
    };
  }
};

/**
 * Process downloaded file (NO DATABASE OPERATIONS)
 */
async function processDownloadedFile(downloadedFile, downloadPath, newFileName) {
  const downloadedFilePath = path.join(downloadPath, downloadedFile);
  const finalFilePath = path.join(downloadPath, newFileName);

  console.log(`Processing downloaded file: ${downloadedFile}`);
  let rowData = [];

  try {
    // Read and parse the file
    if (downloadedFile.endsWith('.csv')) {
      rowData = await new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(downloadedFilePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', reject);
      });
    } else if (downloadedFile.endsWith('.xlsx') || downloadedFile.endsWith('.xls')) {
      const workbook = XLSX.readFile(downloadedFilePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      rowData = XLSX.utils.sheet_to_json(worksheet);
    }

    console.log(`Successfully processed ${rowData.length} rows`);

  } catch (processError) {
    console.error("Error processing file:", processError);
    throw processError;
  }

  // Rename file
  try {
    fs.renameSync(downloadedFilePath, finalFilePath);
    console.log(`File renamed to: ${newFileName}`);
  } catch (renameError) {
    console.error("Error renaming file:", renameError);
    // If rename fails, use the original downloaded file
    finalFilePath = downloadedFilePath;
  }

  return {
    success: true,
    msg: "Data exported successfully",
    data: rowData,
    filePath: finalFilePath,
    fileName: newFileName,
    recordCount: rowData.length
  };
}

// Export the processDownloadedFile function
exports.processDownloadedFile = processDownloadedFile;

exports.viewScalenutData = async (data) => {
  try {
    // Your view functionality here
    return { success: true, msg: "View functionality not implemented yet" };
  } catch (error) {
    return {
      success: false,
      msg: error.message
    };
  }
};