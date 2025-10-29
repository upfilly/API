const { v4: uuidv4 } = require("uuid");
const csv = require("csv-parser");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

/**
 * Enhanced Scalenut Data Export Function for Production
 */
exports.exportScalenutData = async (data) => {
  let browser;
  try {
    const user_password = data.password;
    const user_email = data.email;
    const url = `${data.url}?redirect=%252Fmy-commissions`;
    const rootpath = process.cwd();
    const fullpath = path.join(rootpath, "assets", "downloads");
    const downloadPath = fullpath;

    // Enhanced logging for production debugging
    console.log('Environment Info:', {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
      downloadPath: downloadPath,
      puppeteerExecutable: process.env.PUPPETEER_EXECUTABLE_PATH
    });

    console.log(`Starting process for email: ${user_email}, URL: ${url}`);

    // Create the download directory if it doesn't exist
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
      console.log(`Created download directory: ${downloadPath}`);
    }

    // Clear any existing files in download directory with error handling
    try {
      const files = fs.readdirSync(downloadPath);
      let deletedCount = 0;
      for (const file of files) {
        if (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls') || file.endsWith('.crdownload')) {
          try {
            fs.unlinkSync(path.join(downloadPath, file));
            deletedCount++;
          } catch (unlinkError) {
            console.warn(`Could not delete file ${file}:`, unlinkError.message);
          }
        }
      }
      console.log(`Cleaned up ${deletedCount} existing files`);
    } catch (cleanupError) {
      console.warn("Could not clean up directory:", cleanupError.message);
    }

    // Generate a unique file name using UUID
    const uniqueId = uuidv4();
    const newFileName = `file_${uniqueId}.csv`;

    // Enhanced browser launch for production
    console.log("Launching browser with production configuration...");
    const browserOptions = {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--single-process",
        "--disable-features=VizDisplayCompositor",
        "--window-size=1366,768"
      ],
      headless: "new",
      ignoreHTTPSErrors: true,
      timeout: 60000
    };

    // Use system Chromium in production if available
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      browserOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      console.log(`Using Chromium from: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
    }

    browser = await puppeteer.launch(browserOptions);

    const page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({ width: 1366, height: 768 });

    // Enhanced download setup
    console.log("Setting up download behavior...");
    const client = await page.target().createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadPath,
    });

    // Extended timeouts for production
    page.setDefaultTimeout(120000);
    page.setDefaultNavigationTimeout(120000);

    // Add request interception to handle slow networks and speed up loading
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // Block images, stylesheets, and fonts to speed up loading
      const resourceType = request.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Navigate with enhanced error handling
    console.log(`Navigating to URL: ${url}`);
    try {
      await page.goto(url, {
        waitUntil: ["domcontentloaded", "networkidle0"],
        timeout: 120000
      });
    } catch (navError) {
      console.error("Navigation failed:", navError);
      throw new Error(`Failed to load page: ${navError.message}`);
    }

    // Wait for page to load with multiple strategies
    await page.waitForFunction(() => document.readyState === 'complete', { timeout: 30000 });
    await page.waitForTimeout(5000);

    // Take screenshot for debugging (optional)
    if (process.env.DEBUG_SCREENSHOTS === 'true') {
      await page.screenshot({ path: path.join(downloadPath, 'login-page.png'), fullPage: true });
    }

    // Enhanced login process
    console.log("Attempting login...");

    // Wait for and fill email
    let emailField;
    try {
      emailField = await page.waitForSelector('#email', { timeout: 15000 });
      await emailField.click({ clickCount: 3 });
      await emailField.type(user_email, { delay: 100 });
      console.log("Email filled successfully");
    } catch (emailError) {
      throw new Error("Email field not found or not interactable");
    }

    // Wait for and fill password
    let passwordField;
    try {
      passwordField = await page.waitForSelector('#password', { timeout: 15000 });
      await passwordField.click({ clickCount: 3 });
      await passwordField.type(user_password, { delay: 100 });
      console.log("Password filled successfully");
    } catch (passwordError) {
      throw new Error("Password field not found or not interactable");
    }

    // Enhanced login button click with multiple strategies
    console.log("Clicking login button...");
    let loginSuccess = false;

    try {
      // Strategy 1: Click login button by selector
      const loginButton = await page.$('button[data-cy="button"][data-fp="primaryButton"]');
      if (loginButton) {
        await loginButton.click();
        console.log("Login button clicked via selector");
      } else {
        // Strategy 2: Press Enter key
        await page.keyboard.press('Enter');
        console.log("Enter key pressed for login");
      }

      // Wait for navigation with multiple strategies
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
        loginSuccess = true;
        console.log("Navigation detected after login");
      } catch (navError) {
        console.log("No immediate navigation detected, checking for URL change or dashboard elements");
      }

      // Wait additional time for potential client-side routing
      await page.waitForTimeout(8000);

      // Check for error messages
      const errorSelectors = [
        '.error',
        '.alert-error',
        '.text-red-500',
        '[data-cy*="error"]',
        '[data-testid*="error"]'
      ];

      for (const selector of errorSelectors) {
        const errorElement = await page.$(selector);
        if (errorElement) {
          const errorText = await page.evaluate(el => el.textContent?.trim() || 'Unknown error', errorElement);
          throw new Error(`Login failed: ${errorText}`);
        }
      }

      // Check for successful login by looking for dashboard elements
      const successSelectors = [
        '[data-cy*="dashboard"]',
        '[data-cy*="commission"]',
        '[data-testid*="dashboard"]',
        '.dashboard',
        '.my-commissions'
      ];

      for (const selector of successSelectors) {
        const successElement = await page.$(selector);
        if (successElement) {
          loginSuccess = true;
          console.log(`Login successful - found element: ${selector}`);
          break;
        }
      }

      // Additional check: current URL
      const currentUrl = page.url();
      if (currentUrl.includes('dashboard') || currentUrl.includes('commission') || currentUrl.includes('my-commissions')) {
        loginSuccess = true;
        console.log("Login successful - URL indicates success");
      }

      if (!loginSuccess) {
        // Take screenshot for debugging
        if (process.env.DEBUG_SCREENSHOTS === 'true') {
          await page.screenshot({ path: path.join(downloadPath, 'login-failed.png'), fullPage: true });
        }
        throw new Error("Login unsuccessful - no dashboard elements found and URL doesn't indicate success");
      }

      console.log("Login verified as successful");
    } catch (loginError) {
      throw new Error(`Login process failed: ${loginError.message}`);
    }

    // Enhanced download strategies
    console.log("Starting download strategies...");

    // STRATEGY 1: Direct download button
    console.log("STRATEGY 1: Looking for direct download button...");
    try {
      const downloadButtonSelectors = [
        'button[data-cy="commissions-download"][data-fp="plainButton"]',
        'button:contains("Download")',
        '[data-cy*="download"]',
        '[data-testid*="download"]',
        'a[href*="download"]',
        'button:contains("Export")'
      ];

      let downloadButton = null;
      for (const selector of downloadButtonSelectors) {
        try {
          downloadButton = await page.waitForSelector(selector, { timeout: 10000 });
          if (downloadButton) {
            console.log(`Found download button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (downloadButton) {
        console.log("Found download button, attempting download...");
        const filesBeforeDownload = fs.readdirSync(downloadPath);

        await downloadButton.click();
        console.log("Download button clicked");

        const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 60000);

        if (downloadedFile) {
          console.log(`Download completed via Strategy 1: ${downloadedFile}`);
          const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
          await browser.close();
          return result;
        } else {
          console.log("Strategy 1: Download started but did not complete within timeout");
        }
      } else {
        console.log("Strategy 1: No download button found with any selector");
      }
    } catch (strategy1Error) {
      console.log("Strategy 1 failed:", strategy1Error.message);
    }

    // STRATEGY 2: Alternative navigation to commissions page
    console.log("STRATEGY 2: Trying alternative navigation approach...");
    try {
      const commissionsUrl = `${data.url}/my-commissions`;
      console.log(`Navigating to commissions page: ${commissionsUrl}`);

      await page.goto(commissionsUrl, {
        waitUntil: "networkidle0",
        timeout: 60000
      });

      // Wait for page to load
      await page.waitForFunction(() => document.readyState === 'complete', { timeout: 30000 });
      await page.waitForTimeout(5000);

      // Look for export elements with multiple selectors
      const exportSelectors = [
        'a[href*="export"]',
        'button:contains("Export")',
        '[data-cy*="export"]',
        '[data-testid*="export"]',
        'button:contains("Download CSV")',
        'button:contains("Download Excel")',
        '.export-button',
        '.download-button'
      ];

      let exportElement = null;
      for (const selector of exportSelectors) {
        exportElement = await page.$(selector);
        if (exportElement) {
          console.log(`Found export element with selector: ${selector}`);
          break;
        }
      }

      if (exportElement) {
        console.log("Found export element, clicking...");
        const filesBeforeDownload = fs.readdirSync(downloadPath);

        await exportElement.click();
        console.log("Export element clicked");

        const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 60000);

        if (downloadedFile) {
          console.log(`Download completed via Strategy 2: ${downloadedFile}`);
          const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
          await browser.close();
          return result;
        } else {
          console.log("Strategy 2: Download started but did not complete within timeout");
        }
      } else {
        console.log("Strategy 2: No export elements found");
      }
    } catch (strategy2Error) {
      console.log("Strategy 2 failed:", strategy2Error.message);
    }

    // STRATEGY 3: Try to find and click any download link in the commissions table
    console.log("STRATEGY 3: Looking for download links in page content...");
    try {
      // Look for tables or data sections that might contain download links
      const downloadLinks = await page.$$eval('a', links =>
        links
          .filter(link => {
            const href = link.getAttribute('href') || '';
            const text = link.textContent.toLowerCase();
            return href.includes('download') ||
              href.includes('export') ||
              text.includes('download') ||
              text.includes('export') ||
              href.endsWith('.csv') ||
              href.endsWith('.xlsx');
          })
          .map(link => ({
            href: link.getAttribute('href'),
            text: link.textContent.trim()
          }))
      );

      if (downloadLinks.length > 0) {
        console.log(`Found ${downloadLinks.length} potential download links:`, downloadLinks);

        // Click the first promising download link
        const firstDownloadLink = await page.$(`a[href="${downloadLinks[0].href}"]`);
        if (firstDownloadLink) {
          console.log(`Clicking download link: ${downloadLinks[0].text}`);
          const filesBeforeDownload = fs.readdirSync(downloadPath);

          await firstDownloadLink.click();

          const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 60000);

          if (downloadedFile) {
            console.log(`Download completed via Strategy 3: ${downloadedFile}`);
            const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
            await browser.close();
            return result;
          }
        }
      } else {
        console.log("Strategy 3: No download links found in page content");
      }
    } catch (strategy3Error) {
      console.log("Strategy 3 failed:", strategy3Error.message);
    }

    // Final check for any downloaded files that might have been downloaded silently
    console.log("Performing final check for downloaded files...");
    const finalFiles = fs.readdirSync(downloadPath);
    const downloadedFiles = finalFiles.filter(file =>
      (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls')) &&
      !file.endsWith('.crdownload')
    );

    console.log(`Final files check: ${downloadedFiles.length} files found`, downloadedFiles);

    if (downloadedFiles.length > 0) {
      console.log(`Using downloaded file: ${downloadedFiles[0]}`);
      const result = await processDownloadedFile(downloadedFiles[0], downloadPath, newFileName);
      await browser.close();
      return result;
    }

    // If we reach here, no download was successful
    await browser.close();
    throw new Error("No file was downloaded after trying all strategies. Possible reasons: download button not found, download blocked, or file format not supported.");

  } catch (error) {
    console.error("Error in exportScalenutData:", error);

    if (browser) {
      await browser.close();
    }

    return {
      success: false,
      msg: error.message,
      error: error.toString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
};

/**
 * Wait for download to complete with enhanced monitoring
 */
async function waitForDownload(downloadPath, filesBeforeDownload, maxWaitTime = 60000) {
  const startTime = Date.now();
  let lastProgressUpdate = startTime;

  console.log(`Waiting for download to complete (max ${maxWaitTime / 1000}s)...`);

  while (Date.now() - startTime < maxWaitTime) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const currentFiles = fs.readdirSync(downloadPath);

    // Check for completed downloads
    const completedFiles = currentFiles.filter(file =>
      !filesBeforeDownload.includes(file) &&
      (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls')) &&
      !file.endsWith('.crdownload')
    );

    if (completedFiles.length > 0) {
      console.log(`Download completed! File: ${completedFiles[0]}`);
      return completedFiles[0];
    }

    // Check for in-progress downloads
    const inProgressFiles = currentFiles.filter(file =>
      file.endsWith('.crdownload') && !filesBeforeDownload.includes(file)
    );

    // Progress update every 10 seconds
    if (Date.now() - lastProgressUpdate > 10000) {
      if (inProgressFiles.length > 0) {
        console.log(`Download in progress... (${inProgressFiles.length} .crdownload files)`);
      } else {
        console.log("Waiting for download to start...");
      }
      lastProgressUpdate = Date.now();
    }

    // If no download in progress and no completed files after reasonable time, break
    if (inProgressFiles.length === 0 && completedFiles.length === 0 && (Date.now() - startTime) > 10000) {
      console.log("No download activity detected");
      break;
    }
  }

  console.log("Download wait timeout reached");
  return null;
}

/**
 * Process downloaded file (NO DATABASE OPERATIONS)
 */
async function processDownloadedFile(downloadedFile, downloadPath, newFileName) {
  const downloadedFilePath = path.join(downloadPath, downloadedFile);
  let finalFilePath = path.join(downloadPath, newFileName);

  console.log(`Processing downloaded file: ${downloadedFile}`);
  console.log(`File size: ${fs.statSync(downloadedFilePath).size} bytes`);

  let rowData = [];

  try {
    // Read and parse the file based on format
    if (downloadedFile.endsWith('.csv')) {
      console.log("Processing as CSV file...");
      rowData = await new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(downloadedFilePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => {
            console.log(`CSV parsing complete: ${results.length} rows`);
            resolve(results);
          })
          .on('error', (error) => {
            console.error("CSV parsing error:", error);
            reject(error);
          });
      });
    } else if (downloadedFile.endsWith('.xlsx') || downloadedFile.endsWith('.xls')) {
      console.log("Processing as Excel file...");
      const workbook = XLSX.readFile(downloadedFilePath);
      const sheetName = workbook.SheetNames[0];
      console.log(`Using sheet: ${sheetName}`);

      const worksheet = workbook.Sheets[sheetName];
      rowData = XLSX.utils.sheet_to_json(worksheet);
      console.log(`Excel parsing complete: ${rowData.length} rows`);
    } else {
      throw new Error(`Unsupported file format: ${downloadedFile}`);
    }

    console.log(`Successfully processed ${rowData.length} rows from ${downloadedFile}`);

    // Log sample data for debugging
    if (rowData.length > 0) {
      console.log("Sample data (first row):", JSON.stringify(rowData[0], null, 2));
    }

  } catch (processError) {
    console.error("Error processing file:", processError);

    // Try to read as plain text to see what we got
    try {
      const fileContent = fs.readFileSync(downloadedFilePath, 'utf8');
      console.log("File content (first 500 chars):", fileContent.substring(0, 500));
    } catch (readError) {
      console.error("Could not read file as text:", readError);
    }

    throw new Error(`File processing failed: ${processError.message}`);
  }

  // Rename file to unique name
  try {
    fs.renameSync(downloadedFilePath, finalFilePath);
    console.log(`File renamed to: ${newFileName}`);
  } catch (renameError) {
    console.error("Error renaming file:", renameError);
    // If rename fails, use the original downloaded file
    finalFilePath = downloadedFilePath;
    newFileName = downloadedFile;
  }

  return {
    success: true,
    msg: "Data exported successfully",
    data: rowData,
    filePath: finalFilePath,
    fileName: newFileName,
    recordCount: rowData.length,
    fileSize: fs.statSync(finalFilePath).size
  };
}

/**
 * View Scalenut Data (placeholder implementation)
 */
exports.viewScalenutData = async (data) => {
  try {
    // Your view functionality here
    return {
      success: true,
      msg: "View functionality not implemented yet",
      data: []
    };
  } catch (error) {
    return {
      success: false,
      msg: error.message,
      error: error.toString()
    };
  }
};

// Export helper functions
exports.processDownloadedFile = processDownloadedFile;
exports.waitForDownload = waitForDownload;