const { v4: uuidv4 } = require("uuid");
const csv = require("csv-parser");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

/**
 * Wait for download to complete with better file detection
 */
async function waitForDownload(downloadPath, filesBeforeDownload, timeout = 60000) {
  const startTime = Date.now();
  let lastProgress = Date.now();

  while (Date.now() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, 2000));

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

    // Check for .crdownload files (download in progress)
    const inProgressFiles = currentFiles.filter(file =>
      !filesBeforeDownload.includes(file) && file.endsWith('.crdownload')
    );

    if (inProgressFiles.length > 0) {
      lastProgress = Date.now();
      console.log(`Download in progress: ${inProgressFiles.length} files`);
    }

    // If no progress for 30 seconds, assume stalled
    if (Date.now() - lastProgress > 30000 && inProgressFiles.length === 0) {
      console.log("Download appears to have stalled");
      return null;
    }
  }

  console.log("Download timeout reached");
  return null;
}

/**
 * Process downloaded file (NO DATABASE OPERATIONS)
 */
async function processDownloadedFile(downloadedFile, downloadPath, newFileName) {
  const downloadedFilePath = path.join(downloadPath, downloadedFile);
  let finalFilePath = path.join(downloadPath, newFileName);

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
      console.log(`Created download directory: ${downloadPath}`);
    }

    // Clear any existing files in download directory
    const files = fs.readdirSync(downloadPath);
    for (const file of files) {
      if (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls') || file.endsWith('.crdownload')) {
        fs.unlinkSync(path.join(downloadPath, file));
      }
    }
    console.log(`Cleaned download directory, removed ${files.length} files`);

    // Generate a unique file name using UUID
    const uniqueId = uuidv4();
    const newFileName = `file_${uniqueId}.csv`;

    // Launch the browser with production-friendly settings
    console.log("Launching browser...");
    const browserConfig = {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--single-process",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding"
      ],
      headless: true,
      ignoreHTTPSErrors: true,
    };

    // For Docker/container environments
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      browserConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      console.log("Using custom Puppeteer executable path");
    }

    browser = await puppeteer.launch(browserConfig);

    const page = await browser.newPage();

    // Set viewport to desktop size
    await page.setViewport({ width: 1366, height: 768 });

    // Set up download behavior with better error handling
    console.log("Setting up download behavior...");
    const client = await page.target().createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadPath,
    });

    // Set longer timeouts for production
    page.setDefaultTimeout(120000);
    page.setDefaultNavigationTimeout(120000);

    // Block images and stylesheets to speed up loading (optional)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Navigate to the URL
    console.log(`Navigating to URL: ${url}`);
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    // Wait for page to load completely
    await page.waitForFunction(() => document.readyState === 'complete');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Login process with better selectors
    console.log("Attempting login...");

    // Try multiple email field selectors
    const emailSelectors = [
      '#email',
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="mail" i]',
      '[data-cy="email"]',
      '[data-testid="email"]'
    ];

    let emailField = null;
    for (const selector of emailSelectors) {
      emailField = await page.$(selector);
      if (emailField) {
        console.log(`Found email field with selector: ${selector}`);
        break;
      }
    }

    if (!emailField) {
      // Take screenshot to see what's on the page
      const debugPath = path.join(downloadPath, 'debug-no-email-field.png');
      await page.screenshot({ path: debugPath, fullPage: true });
      console.log(`Screenshot saved to: ${debugPath}`);
      throw new Error("Email field not found with any selector");
    }

    await emailField.click({ clickCount: 3 });
    await emailField.type(user_email, { delay: 100 });
    console.log("Email entered");

    // Try multiple password field selectors
    const passwordSelectors = [
      '#password',
      'input[type="password"]',
      'input[name="password"]',
      'input[placeholder*="password" i]',
      '[data-cy="password"]',
      '[data-testid="password"]'
    ];

    let passwordField = null;
    for (const selector of passwordSelectors) {
      passwordField = await page.$(selector);
      if (passwordField) {
        console.log(`Found password field with selector: ${selector}`);
        break;
      }
    }

    if (!passwordField) throw new Error("Password field not found");
    await passwordField.click({ clickCount: 3 });
    await passwordField.type(user_password, { delay: 100 });
    console.log("Password entered");

    // Try multiple login button selectors
    console.log("Clicking login button...");
    const loginButtonSelectors = [
      'button[data-cy="button"][data-fp="primaryButton"]',
      'button[type="submit"]',
      'input[type="submit"]',
      'button:contains("Login")',
      'button:contains("Sign In")',
      'input[value*="Login" i]',
      'input[value*="Sign" i]',
      '[data-cy="login-button"]',
      '[data-testid="login-button"]'
    ];

    let loginButton = null;
    for (const selector of loginButtonSelectors) {
      loginButton = await page.$(selector);
      if (loginButton) {
        console.log(`Found login button with selector: ${selector}`);
        break;
      }
    }

    if (loginButton) {
      await loginButton.click();
      console.log("Login button clicked");
    } else {
      // Fallback: press Enter
      console.log("No login button found, pressing Enter");
      await page.keyboard.press('Enter');
    }

    // Wait for navigation with better handling
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      console.log("Navigation occurred after login");
    } catch (e) {
      console.log("No navigation occurred after login, waiting for page change");
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    // Check if login was successful by looking for dashboard elements
    console.log("Checking login success...");
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Check for common error messages
    const errorSelectors = [
      '.error',
      '.alert-danger',
      '.alert-error',
      '[data-cy*="error"]',
      '[class*="error"]',
      '[class*="alert"]',
      '[role="alert"]'
    ];

    for (const selector of errorSelectors) {
      const errorElement = await page.$(selector);
      if (errorElement) {
        const errorText = await page.evaluate(el => el.textContent?.trim(), errorElement);
        if (errorText && errorText.length < 200) {
          console.log(`Login error detected: ${errorText}`);
          throw new Error(`Login failed: ${errorText}`);
        }
      }
    }

    // Check for successful login indicators
    const successSelectors = [
      '[data-cy*="dashboard"]',
      '[class*="dashboard"]',
      '[data-cy*="commission"]',
      'text/Commissions',
      'text/Dashboard'
    ];

    let loginSuccess = false;
    for (const selector of successSelectors) {
      const successElement = await page.$(selector);
      if (successElement) {
        loginSuccess = true;
        console.log(`Login successful indicator found: ${selector}`);
        break;
      }
    }

    if (!loginSuccess) {
      // Check URL for success indicators
      const currentUrl = page.url();
      if (currentUrl.includes('dashboard') || currentUrl.includes('commission')) {
        loginSuccess = true;
        console.log("Login successful - URL indicates success");
      }
    }

    if (!loginSuccess) {
      throw new Error("Login may have failed - no success indicators found");
    }

    console.log("Login successful, proceeding to download...");

    // STRATEGY 1: Enhanced download button detection
    console.log("STRATEGY 1: Looking for download button with multiple selectors...");

    const downloadButtonSelectors = [
      'button[data-cy="commissions-download"][data-fp="plainButton"]',
      'button:contains("Download")',
      'button:contains("Export")',
      'a:contains("Download")',
      'a:contains("Export")',
      '[data-cy*="download"]',
      '[data-testid*="download"]',
      '[class*="download"]',
      'button[title*="Download" i]',
      'button[title*="Export" i]',
      '[onclick*="download"]',
      '[onclick*="export"]'
    ];

    let downloadButton = null;
    for (const selector of downloadButtonSelectors) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        downloadButton = elements[0];
        console.log(`Found download button with selector: ${selector}`);
        break;
      }
    }

    if (downloadButton) {
      console.log("Found download button, attempting download...");
      const filesBeforeDownload = fs.readdirSync(downloadPath);
      console.log(`Files before download: ${filesBeforeDownload.length}`);

      // Scroll button into view and click
      await page.evaluate(button => button.scrollIntoView({ behavior: 'smooth', block: 'center' }), downloadButton);
      await new Promise(resolve => setTimeout(resolve, 2000));

      await downloadButton.click();
      console.log("Download button clicked, waiting for file...");

      // Enhanced download wait with better file detection
      const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 90000);

      if (downloadedFile) {
        console.log(`Download completed: ${downloadedFile}`);
        const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
        await browser.close();
        return result;
      } else {
        console.log("Download started but no file completed within timeout");
      }
    }

    // STRATEGY 2: Navigate directly to commissions page
    console.log("STRATEGY 2: Trying direct commissions page navigation...");

    const commissionsUrl = `${data.url}/my-commissions`;
    console.log(`Navigating to: ${commissionsUrl}`);

    await page.goto(commissionsUrl, {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    await page.waitForFunction(() => document.readyState === 'complete');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Look for download buttons on commissions page
    console.log("Looking for download buttons on commissions page...");
    for (const selector of downloadButtonSelectors) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        downloadButton = elements[0];
        console.log(`Found download button on commissions page with selector: ${selector}`);

        const filesBeforeDownload = fs.readdirSync(downloadPath);
        await downloadButton.click();
        console.log("Download button clicked on commissions page");

        const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 90000);

        if (downloadedFile) {
          console.log(`Download completed: ${downloadedFile}`);
          const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
          await browser.close();
          return result;
        }
        break;
      }
    }

    // STRATEGY 3: Check if we're on the right page and look for data tables
    console.log("STRATEGY 3: Checking page content and looking for data...");

    const pageTitle = await page.title();
    const pageUrl = page.url();
    console.log(`Current page - Title: ${pageTitle}, URL: ${pageUrl}`);

    // Check if we can see commission data on the page
    const commissionDataSelectors = [
      '[data-cy*="commission"]',
      '[class*="commission"]',
      'table',
      '.table',
      '[data-testid*="table"]',
      '.MuiTableContainer',
      '.ant-table'
    ];

    for (const selector of commissionDataSelectors) {
      const element = await page.$(selector);
      if (element) {
        console.log(`Found potential data container: ${selector}`);
      }
    }

    // STRATEGY 4: Try to find and click any export-related links
    console.log("STRATEGY 4: Looking for export links...");

    const exportLinks = await page.$$eval('a', anchors =>
      anchors.filter(a =>
        a.href && (
          a.href.includes('export') ||
          a.href.includes('download') ||
          a.textContent.toLowerCase().includes('export') ||
          a.textContent.toLowerCase().includes('download') ||
          a.getAttribute('onclick')?.includes('export') ||
          a.getAttribute('onclick')?.includes('download')
        )
      ).map(a => ({ href: a.href, text: a.textContent?.trim() }))
    );

    if (exportLinks.length > 0) {
      console.log(`Found ${exportLinks.length} export links`);

      for (const link of exportLinks.slice(0, 3)) { // Try first 3 links only
        if (!link.href) continue;

        console.log(`Trying export link: ${link.text} - ${link.href}`);
        const filesBeforeDownload = fs.readdirSync(downloadPath);

        try {
          await page.goto(link.href, { waitUntil: 'networkidle2', timeout: 60000 });

          const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 60000);
          if (downloadedFile) {
            console.log(`Download completed via export link: ${downloadedFile}`);
            const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
            await browser.close();
            return result;
          }
        } catch (linkError) {
          console.log(`Error following export link: ${linkError.message}`);
        }

        // Go back to commissions page if download failed
        try {
          await page.goto(commissionsUrl, { waitUntil: 'networkidle2' });
        } catch (e) {
          console.log("Error returning to commissions page");
        }
      }
    }

    // STRATEGY 5: Try JavaScript execution to trigger download
    console.log("STRATEGY 5: Attempting JavaScript download trigger...");
    try {
      const filesBeforeDownload = fs.readdirSync(downloadPath);

      // Try to find and execute download function
      await page.evaluate(() => {
        // Look for buttons with onclick handlers
        const buttons = Array.from(document.querySelectorAll('button, a'));
        const downloadButtons = buttons.filter(btn => {
          const onclick = btn.getAttribute('onclick');
          return onclick && (onclick.includes('download') || onclick.includes('export'));
        });

        if (downloadButtons.length > 0) {
          downloadButtons[0].click();
          return true;
        }

        // Try to find and call common download functions
        const functionNames = ['downloadCommissions', 'exportData', 'downloadCSV', 'exportCSV'];
        for (const funcName of functionNames) {
          if (typeof window[funcName] === 'function') {
            window[funcName]();
            return true;
          }
        }

        return false;
      });

      const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 30000);
      if (downloadedFile) {
        console.log(`Download completed via JavaScript: ${downloadedFile}`);
        const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
        await browser.close();
        return result;
      }
    } catch (jsError) {
      console.log("JavaScript strategy failed:", jsError.message);
    }

    // Final check for any downloaded files that might have been downloaded silently
    const finalFiles = fs.readdirSync(downloadPath);
    const downloadedFiles = finalFiles.filter(file =>
      (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls')) &&
      !file.endsWith('.crdownload')
    );

    console.log("Final files in download directory:", downloadedFiles);

    if (downloadedFiles.length > 0) {
      console.log(`Found downloaded file: ${downloadedFiles[0]}`);
      const result = await processDownloadedFile(downloadedFiles[0], downloadPath, newFileName);
      await browser.close();
      return result;
    }

    await browser.close();
    throw new Error("No file was downloaded after trying all strategies. Please check if the commission data is available and the download functionality is working on the website.");

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

// Additional utility function for debugging
exports.checkScalenutStatus = async (data) => {
  let browser;
  try {
    const user_password = data.password;
    const user_email = data.email;
    const url = `${data.url}?redirect=%252Fmy-commissions`;

    console.log(`Checking status for: ${user_email}`);

    const browserConfig = {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
      headless: true,
      ignoreHTTPSErrors: true,
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      browserConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    browser = await puppeteer.launch(browserConfig);
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const pageTitle = await page.title();
    const pageUrl = page.url();

    // Check if login page is accessible
    const emailField = await page.$('#email') || await page.$('input[type="email"]');
    const passwordField = await page.$('#password') || await page.$('input[type="password"]');

    await browser.close();

    return {
      success: true,
      data: {
        pageTitle,
        pageUrl,
        loginPageAccessible: !!(emailField && passwordField),
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    if (browser) await browser.close();
    return {
      success: false,
      error: error.message
    };
  }
};