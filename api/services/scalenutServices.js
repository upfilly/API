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
    console.log(`Download path: ${downloadPath}`);
    console.log(`Current working directory: ${rootpath}`);

    // Check and create download directory with proper permissions
    if (!fs.existsSync(downloadPath)) {
      console.log(`Creating download directory: ${downloadPath}`);
      fs.mkdirSync(downloadPath, { recursive: true, mode: 0o755 });
    }

    // Verify directory permissions
    try {
      const testFile = path.join(downloadPath, `test_${Date.now()}.txt`);
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log("Download directory is writable");
    } catch (permError) {
      console.error("Download directory permission error:", permError);
      throw new Error(`Cannot write to download directory: ${permError.message}`);
    }

    // Clear any existing files in download directory
    const files = fs.readdirSync(downloadPath);
    console.log(`Found ${files.length} existing files in download directory`);
    for (const file of files) {
      if (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls') || file.endsWith('.crdownload')) {
        try {
          fs.unlinkSync(path.join(downloadPath, file));
          console.log(`Deleted existing file: ${file}`);
        } catch (deleteError) {
          console.warn(`Could not delete file ${file}: ${deleteError.message}`);
        }
      }
    }

    // Generate a unique file name using UUID
    const uniqueId = uuidv4();
    const newFileName = `file_${uniqueId}.csv`;

    // Enhanced browser launch configuration for server environment
    console.log("Launching browser with server-optimized configuration...");

    const isProduction = process.env.NODE_ENV === 'production';
    const browserConfig = {
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
    };

    // Add server-specific args in production
    if (isProduction) {
      browserConfig.args.push(
        "--single-process",
        "--no-zygote",
        "--disable-features=VizDisplayCompositor",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding"
      );

      // Set executable path if provided
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        browserConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }
    }

    browser = await puppeteer.launch(browserConfig);
    console.log("Browser launched successfully");

    const page = await browser.newPage();

    // Set viewport size
    await page.setViewport({ width: 1366, height: 768 });

    // Enhanced download behavior setup
    console.log("Setting up download behavior...");
    const client = await page.target().createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadPath,
    });

    // Set longer timeouts for server environment
    page.setDefaultTimeout(120000);
    page.setDefaultNavigationTimeout(120000);

    // Navigate to URL with enhanced error handling
    console.log(`Navigating to URL: ${url}`);
    try {
      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 60000
      });
    } catch (navError) {
      console.error("Navigation failed:", navError);
      throw new Error(`Failed to navigate to URL: ${navError.message}`);
    }

    // Wait for page to load completely with multiple checks
    await page.waitForFunction(() => document.readyState === 'complete');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check if we're on login page or already logged in
    const currentUrl = page.url();
    console.log(`Current URL after navigation: ${currentUrl}`);

    // If we're not on a login page, check if we're already on commissions page
    if (!currentUrl.includes('login') && (currentUrl.includes('commissions') || currentUrl.includes('my-commissions'))) {
      console.log("Already on commissions page, skipping login");
    } else {
      // Login process
      console.log("Attempting login...");

      // Wait for login form more specifically
      try {
        await page.waitForSelector('#email', { timeout: 15000 });
        console.log("Login form found");
      } catch (selectorError) {
        console.error("Login form not found. Current page content:");
        const pageContent = await page.content();
        console.log("Page title:", await page.title());

        // Take screenshot for debugging
        const screenshotPath = path.join(downloadPath, `login_error_${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Debug screenshot saved: ${screenshotPath}`);

        throw new Error("Login form not available on the page");
      }

      // Fill email
      const emailField = await page.$('#email');
      if (!emailField) throw new Error("Email field not found");
      await emailField.click({ clickCount: 3 });
      await emailField.type(user_email, { delay: 100 });
      console.log("Email filled");

      // Fill password
      const passwordField = await page.$('#password');
      if (!passwordField) throw new Error("Password field not found");
      await passwordField.click({ clickCount: 3 });
      await passwordField.type(user_password, { delay: 100 });
      console.log("Password filled");

      // Click login button with multiple fallbacks
      console.log("Clicking login button...");
      let loginSuccess = false;

      // Try data-cy attribute first
      const loginButton = await page.$('button[data-cy="button"][data-fp="primaryButton"]');
      if (loginButton) {
        await loginButton.click();
        loginSuccess = true;
        console.log("Clicked login button using data-cy selector");
      } else {
        // Try other selectors
        const alternativeSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          '.login-button',
          'button:contains("Login")',
          'button:contains("Sign In")',
          'button.btn-primary',
          'input.btn-primary'
        ];

        for (const selector of alternativeSelectors) {
          const altButton = await page.$(selector);
          if (altButton) {
            await altButton.click();
            loginSuccess = true;
            console.log(`Clicked login button using selector: ${selector}`);
            break;
          }
        }

        if (!loginSuccess) {
          console.log("No specific login button found, pressing Enter");
          await page.keyboard.press('Enter');
        }
      }

      // Wait for navigation or dashboard load
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 });
        console.log("Navigation after login detected");
      } catch (e) {
        console.log("No immediate navigation occurred, waiting for dashboard elements...");
      }

      // Wait for dashboard to load with multiple checks
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Check if login was successful by looking for error messages
      const errorSelectors = [
        '.error-message',
        '.alert-error',
        '.alert-danger',
        '[data-cy="error-message"]',
        '.text-error',
        '[role="alert"]'
      ];

      for (const selector of errorSelectors) {
        const errorElement = await page.$(selector);
        if (errorElement) {
          const errorText = await page.evaluate(el => el.textContent?.trim(), errorElement);
          if (errorText && errorText.length > 0) {
            throw new Error(`Login failed: ${errorText}`);
          }
        }
      }

      console.log("Login process completed successfully");
    }

    // STRATEGY 1: Enhanced download button detection
    console.log("STRATEGY 1: Looking for download button with multiple selectors...");

    const downloadSelectors = [
      'button[data-cy="commissions-download"][data-fp="plainButton"]',
      'button:contains("Download")',
      'button:contains("Export")',
      'a:contains("Download")',
      'a:contains("Export")',
      '[data-cy*="download"]',
      '[data-testid*="download"]',
      '.download-button',
      '.export-button',
      'button[title*="Download"]',
      'button[title*="Export"]'
    ];

    let downloadButton = null;
    let usedSelector = '';

    for (const selector of downloadSelectors) {
      try {
        downloadButton = await page.$(selector);
        if (downloadButton) {
          usedSelector = selector;
          console.log(`Found download button with selector: ${selector}`);
          break;
        }
      } catch (selectorError) {
        console.log(`Selector ${selector} failed: ${selectorError.message}`);
      }
    }

    if (downloadButton) {
      console.log(`Attempting download using selector: ${usedSelector}`);
      const filesBeforeDownload = fs.readdirSync(downloadPath);
      console.log(`Files before download: ${filesBeforeDownload.length}`);

      // Scroll button into view and click
      await page.evaluate(button => {
        button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, downloadButton);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Click the button
      await downloadButton.click();

      console.log("Download initiated, waiting for file...");

      // Enhanced download wait with better file detection
      let downloadedFile = null;
      const maxWaitTime = 90000; // 90 seconds
      const startTime = Date.now();
      let waitCount = 0;

      while (Date.now() - startTime < maxWaitTime) {
        waitCount++;
        await new Promise(resolve => setTimeout(resolve, 3000));

        const currentFiles = fs.readdirSync(downloadPath);
        console.log(`Check ${waitCount}: ${currentFiles.length} files in directory`);

        // Look for new files that are completed downloads
        const newFiles = currentFiles.filter(file =>
          !filesBeforeDownload.includes(file)
        );

        if (newFiles.length > 0) {
          console.log(`New files detected: ${newFiles.join(', ')}`);

          // Check for completed downloads (not .crdownload files)
          const completedFiles = newFiles.filter(file =>
            (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls')) &&
            !file.endsWith('.crdownload')
          );

          if (completedFiles.length > 0) {
            downloadedFile = completedFiles[0];
            console.log(`Download completed: ${downloadedFile}`);

            // Additional wait to ensure file is fully written
            await new Promise(resolve => setTimeout(resolve, 2000));
            break;
          }

          // Also check if any .crdownload files exist (download in progress)
          const inProgressFiles = newFiles.filter(file =>
            file.endsWith('.crdownload')
          );

          if (inProgressFiles.length > 0) {
            console.log(`Download in progress: ${inProgressFiles[0]}`);
          }
        }
      }

      if (downloadedFile) {
        const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
        await browser.close();
        return result;
      } else {
        console.log("No file downloaded within timeout period");
      }
    } else {
      console.log("No download button found with any selector");
    }

    // STRATEGY 2: Alternative approach - navigate directly to commissions page
    console.log("STRATEGY 2: Trying direct commissions page navigation...");
    try {
      // Navigate directly to commissions page
      const commissionsUrl = `${data.url}/my-commissions`;
      console.log(`Navigating directly to: ${commissionsUrl}`);

      await page.goto(commissionsUrl, {
        waitUntil: "networkidle2",
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 5000));

      // Look for download button again on commissions page
      for (const selector of downloadSelectors) {
        const button = await page.$(selector);
        if (button) {
          console.log(`Found download button on commissions page with selector: ${selector}`);

          const filesBeforeDownload = fs.readdirSync(downloadPath);
          await button.click();

          console.log("Alternative download initiated...");

          // Wait for download
          let downloadedFile = null;
          const maxWaitTime = 60000;
          const startTime = Date.now();

          while (Date.now() - startTime < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 3000));

            const currentFiles = fs.readdirSync(downloadPath);
            const completedFiles = currentFiles.filter(file =>
              !filesBeforeDownload.includes(file) &&
              (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls')) &&
              !file.endsWith('.crdownload')
            );

            if (completedFiles.length > 0) {
              downloadedFile = completedFiles[0];
              console.log(`Alternative download completed: ${downloadedFile}`);
              break;
            }
          }

          if (downloadedFile) {
            const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
            await browser.close();
            return result;
          }
          break;
        }
      }
    } catch (altError) {
      console.log("Alternative approach failed:", altError.message);
    }

    // STRATEGY 3: Try using keyboard shortcuts or different interactions
    console.log("STRATEGY 3: Trying keyboard navigation...");
    try {
      // Press Ctrl+S or look for export options
      await page.keyboard.down('Control');
      await page.keyboard.press('s');
      await page.keyboard.up('Control');

      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (kbError) {
      console.log("Keyboard approach failed:", kbError.message);
    }

    // Take screenshot for debugging
    const screenshotPath = path.join(downloadPath, `debug_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Debug screenshot saved: ${screenshotPath}`);

    // Save page HTML for debugging
    const htmlContent = await page.content();
    const htmlPath = path.join(downloadPath, `page_content_${Date.now()}.html`);
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`Page HTML saved: ${htmlPath}`);

    // Final comprehensive file check
    console.log("Performing final file check...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    const finalFiles = fs.readdirSync(downloadPath);
    console.log(`Final files in directory: ${finalFiles.join(', ')}`);

    const downloadedFiles = finalFiles.filter(file =>
      (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls')) &&
      !file.endsWith('.crdownload')
    );

    if (downloadedFiles.length > 0) {
      console.log(`Found downloaded file in final check: ${downloadedFiles[0]}`);
      const result = await processDownloadedFile(downloadedFiles[0], downloadPath, newFileName);
      await browser.close();
      return result;
    }

    await browser.close();
    throw new Error("No file was downloaded after trying all strategies");

  } catch (error) {
    console.error("Error in exportScalenutData:", error);
    console.error("Error stack:", error.stack);

    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("Error closing browser:", closeError);
      }
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
  let finalFilePath = path.join(downloadPath, newFileName);

  console.log(`Processing downloaded file: ${downloadedFile}`);
  console.log(`Downloaded file path: ${downloadedFilePath}`);
  console.log(`Final file path: ${finalFilePath}`);

  let rowData = [];

  try {
    // Check if file exists and has content
    if (!fs.existsSync(downloadedFilePath)) {
      throw new Error(`Downloaded file not found: ${downloadedFilePath}`);
    }

    const fileStats = fs.statSync(downloadedFilePath);
    if (fileStats.size === 0) {
      throw new Error(`Downloaded file is empty: ${downloadedFile}`);
    }

    console.log(`File size: ${fileStats.size} bytes`);

    // Read and parse the file based on extension
    if (downloadedFile.endsWith('.csv')) {
      console.log("Processing CSV file...");
      rowData = await new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(downloadedFilePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => {
            console.log(`Successfully parsed ${results.length} CSV rows`);
            resolve(results);
          })
          .on('error', (error) => {
            console.error("CSV parsing error:", error);
            reject(error);
          });
      });
    } else if (downloadedFile.endsWith('.xlsx') || downloadedFile.endsWith('.xls')) {
      console.log("Processing Excel file...");
      const workbook = XLSX.readFile(downloadedFilePath);
      const sheetName = workbook.SheetNames[0];
      console.log(`Using sheet: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];
      rowData = XLSX.utils.sheet_to_json(worksheet);
      console.log(`Successfully parsed ${rowData.length} Excel rows`);
    } else {
      throw new Error(`Unsupported file format: ${downloadedFile}`);
    }

    console.log(`Total rows processed: ${rowData.length}`);

    // Log first few rows for verification
    if (rowData.length > 0) {
      console.log("First row sample:", JSON.stringify(rowData[0], null, 2));
    }

  } catch (processError) {
    console.error("Error processing file:", processError);

    // Try to read file as text to see what's in it
    try {
      const fileContent = fs.readFileSync(downloadedFilePath, 'utf8');
      console.log(`File content (first 500 chars): ${fileContent.substring(0, 500)}`);
    } catch (readError) {
      console.error("Could not read file content:", readError);
    }

    throw processError;
  }

  // Rename file
  try {
    fs.renameSync(downloadedFilePath, finalFilePath);
    console.log(`File successfully renamed to: ${newFileName}`);
  } catch (renameError) {
    console.error("Error renaming file:", renameError);
    // If rename fails, use the original downloaded file
    finalFilePath = downloadedFilePath;
    newFileName = downloadedFile;
    console.log(`Using original filename: ${newFileName}`);
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