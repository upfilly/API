const { v4: uuidv4 } = require("uuid");
const csv = require("csv-parser");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

// Helper function for timeouts
const waitForTimeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

    // Launch browser
    console.log("Launching browser...");
    browser = await puppeteer.launch({
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--single-process",
        "--disable-web-security"
      ],
      headless: true,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1366, height: 768 });

    // Set up download behavior
    console.log("Setting up download behavior...");
    const client = await page.target().createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadPath,
    });

    // Set longer timeouts
    page.setDefaultTimeout(120000);
    page.setDefaultNavigationTimeout(120000);

    // Navigate to login page
    console.log(`Navigating to URL: ${url}`);
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    // Wait for page load
    await page.evaluate(() => {
      return new Promise((resolve) => {
        if (document.readyState === 'complete') resolve();
        else window.addEventListener('load', resolve);
      });
    });

    await waitForTimeout(3000);

    // DEBUG: Take screenshot of login page
    await page.screenshot({ path: '/tmp/login-page.png', fullPage: true });
    console.log("Login page screenshot saved");

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

    // Wait for login to complete
    await waitForTimeout(8000);

    // DEBUG: Check current URL and take screenshot
    const currentUrl = page.url();
    console.log(`Current URL after login: ${currentUrl}`);
    await page.screenshot({ path: '/tmp/after-login.png', fullPage: true });
    console.log("After login screenshot saved");

    // If we're still on login page, login might have failed
    if (currentUrl.includes('login')) {
      // Check for error messages
      const errorMsg = await page.evaluate(() => {
        const errorEl = document.querySelector('.error, .alert, [data-cy*="error"]');
        return errorEl ? errorEl.textContent : 'No error message found';
      });
      throw new Error(`Login failed. Still on login page. Error: ${errorMsg}`);
    }

    console.log("Login successful, proceeding to commissions...");

    // STRATEGY 1: Navigate directly to commissions page with proper waiting
    console.log("STRATEGY 1: Navigating to commissions page...");

    // Construct commissions URL properly
    const baseUrl = data.url.split('/login')[0];
    const commissionsUrl = `${baseUrl}/my-commissions`;
    console.log(`Navigating to commissions: ${commissionsUrl}`);

    await page.goto(commissionsUrl, {
      waitUntil: "networkidle2",
      timeout: 30000
    });

    await waitForTimeout(5000);

    // DEBUG: Take screenshot of commissions page
    await page.screenshot({ path: '/tmp/commissions-page.png', fullPage: true });
    console.log("Commissions page screenshot saved");

    // Check page content for debugging
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        h1: document.querySelector('h1')?.textContent,
        bodyText: document.body.textContent.substring(0, 500)
      };
    });
    console.log("Page content:", JSON.stringify(pageContent, null, 2));

    // STRATEGY 2: Look for download buttons with comprehensive selectors
    console.log("STRATEGY 2: Looking for download buttons...");

    const downloadSelectors = [
      // FirstPromoter specific selectors
      'button[data-cy*="download"]',
      'button[data-fp*="download"]',
      '[data-cy*="export"]',
      '[data-fp*="export"]',

      // General selectors
      'button:contains("Download")',
      'button:contains("Export")',
      'a:contains("Download")',
      'a:contains("Export")',
      'button[title*="download" i]',
      'button[title*="export" i]',
      '.download-btn',
      '.export-btn',
      '[class*="download"]',
      '[class*="export"]',

      // CSV specific
      'a[href*=".csv"]',
      'button[onclick*="csv"]',

      // Table actions
      '.table-actions button',
      '.actions button',
      '.toolbar button'
    ];

    let downloadClicked = false;

    for (const selector of downloadSelectors) {
      try {
        console.log(`Trying selector: ${selector}`);

        let element = null;

        // Handle :contains selectors
        if (selector.includes(':contains(')) {
          const text = selector.match(/:contains\("([^"]+)"\)/)[1];
          element = await page.evaluateHandle((searchText) => {
            const elements = document.querySelectorAll('button, a, [role="button"]');
            for (let el of elements) {
              if (el.textContent && el.textContent.includes(searchText)) {
                return el;
              }
            }
            return null;
          }, text);

          if (element && (await element.asElement())) {
            console.log(`Found element with text: ${text}`);
          }
        } else {
          element = await page.$(selector);
        }

        if (element && (await element.asElement())) {
          const isVisible = await element.evaluate(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 &&
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              style.opacity !== '0';
          });

          if (isVisible) {
            console.log(`Found visible download button: ${selector}`);

            const filesBeforeDownload = fs.readdirSync(downloadPath);
            console.log(`Files before download: ${filesBeforeDownload.length}`);

            await element.click();
            console.log("Download button clicked");

            downloadClicked = true;

            // Wait for download
            const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 30000);

            if (downloadedFile) {
              console.log(`Download successful: ${downloadedFile}`);
              const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
              await browser.close();
              return result;
            } else {
              console.log(`No download triggered with selector: ${selector}`);
            }
          }
        }
      } catch (error) {
        console.log(`Selector ${selector} failed: ${error.message}`);
      }
    }

    // STRATEGY 3: Try to find and click any export-related elements
    if (!downloadClicked) {
      console.log("STRATEGY 3: Looking for any export-related elements...");

      const allButtons = await page.$$('button, a, [role="button"]');
      console.log(`Found ${allButtons.length} total clickable elements`);

      for (let i = 0; i < allButtons.length; i++) {
        try {
          const button = allButtons[i];
          const buttonText = await button.evaluate(el => el.textContent?.toLowerCase() || '');

          if (buttonText.includes('download') || buttonText.includes('export') || buttonText.includes('csv')) {
            console.log(`Found potential button: ${buttonText}`);

            const filesBeforeDownload = fs.readdirSync(downloadPath);
            await button.click();
            await waitForTimeout(3000);

            const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 10000);
            if (downloadedFile) {
              console.log(`Download successful via text search: ${downloadedFile}`);
              const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
              await browser.close();
              return result;
            }
          }
        } catch (error) {
          // Continue to next button
        }
      }
    }

    // STRATEGY 4: Check if there's a hidden export feature in tables
    if (!downloadClicked) {
      console.log("STRATEGY 4: Checking for table export features...");

      // Look for data tables that might have export capabilities
      const hasTable = await page.evaluate(() => {
        const tables = document.querySelectorAll('table');
        return tables.length > 0;
      });

      if (hasTable) {
        console.log("Table found on page, trying to trigger export...");

        // Try common table export patterns
        const tableExportSelectors = [
          '.dataTables_wrapper .buttons-export',
          '.dt-buttons .btn-export',
          '.ag-tool-panel-wrapper button',
          '[aria-controls*="table"] button'
        ];

        for (const selector of tableExportSelectors) {
          try {
            const exportBtn = await page.$(selector);
            if (exportBtn) {
              console.log(`Found table export button: ${selector}`);
              const filesBeforeDownload = fs.readdirSync(downloadPath);
              await exportBtn.click();

              const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 15000);
              if (downloadedFile) {
                const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
                await browser.close();
                return result;
              }
            }
          } catch (error) {
            console.log(`Table export selector failed: ${selector}`);
          }
        }
      }
    }

    // Final check for any downloaded files
    const finalFiles = fs.readdirSync(downloadPath);
    const downloadedFiles = finalFiles.filter(file =>
      (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls')) &&
      !file.endsWith('.crdownload')
    );

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
 * Wait for download to complete
 */
async function waitForDownload(downloadPath, filesBeforeDownload, maxWaitTime = 30000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    await waitForTimeout(2000);

    const currentFiles = fs.readdirSync(downloadPath);
    const completedFiles = currentFiles.filter(file =>
      !filesBeforeDownload.includes(file) &&
      (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls')) &&
      !file.endsWith('.crdownload')
    );

    if (completedFiles.length > 0) {
      console.log(`Download completed: ${completedFiles[0]}`);
      return completedFiles[0];
    }

    // Check if download started but not completed
    const partialFiles = currentFiles.filter(file =>
      !filesBeforeDownload.includes(file) &&
      file.endsWith('.crdownload')
    );

    console.log(`Waiting for download... Current files: ${currentFiles.length}, Partial: ${partialFiles.length}`);
  }

  console.log("Download timeout reached");
  return null;
}

/**
 * Process downloaded file
 */
async function processDownloadedFile(downloadedFile, downloadPath, newFileName) {
  const downloadedFilePath = path.join(downloadPath, downloadedFile);
  let finalFilePath = path.join(downloadPath, newFileName);

  console.log(`Processing downloaded file: ${downloadedFile}`);
  let rowData = [];

  try {
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
    finalFilePath = downloadedFilePath;
    newFileName = downloadedFile;
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

exports.processDownloadedFile = processDownloadedFile;