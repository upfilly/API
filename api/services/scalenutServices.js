const crypto = require('crypto');
const csv = require("csv-parser");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

exports.exportScalenutData = async (data) => {
  let browser;
  const downloadPath = path.join(process.cwd(), "assets", "downloads");

  try {
    const user_password = data.password;
    const user_email = data.email;
    const url = `${data.url}?redirect=%252Fmy-commissions`;

    console.log(`Starting process for email: ${user_email}, URL: ${url}`);
    console.log(`Download path: ${downloadPath}`);

    // Create the download directory if it doesn't exist with proper permissions
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, {
        recursive: true,
        mode: 0o755
      });
      console.log(`Created download directory: ${downloadPath}`);
    }

    // Verify directory is writable
    try {
      fs.accessSync(downloadPath, fs.constants.W_OK);
      console.log("Download directory is writable");
    } catch (accessError) {
      console.error("Download directory is not writable, fixing permissions:", accessError.message);
      fs.chmodSync(downloadPath, 0o755);
    }

    // Clear any existing files in download directory
    try {
      const files = fs.readdirSync(downloadPath);
      for (const file of files) {
        if (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls') || file.endsWith('.crdownload')) {
          fs.unlinkSync(path.join(downloadPath, file));
        }
      }
      console.log("Cleaned up existing files");
    } catch (cleanupError) {
      console.log("No files to clean up or cleanup failed:", cleanupError.message);
    }

    // Generate a unique file name using crypto.randomUUID() instead of uuidv4
    const uniqueId = crypto.randomUUID();
    const newFileName = `file_${uniqueId}.csv`;

    // Enhanced browser launch configuration for server
    console.log("Launching browser...");
    const launchOptions = {
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
        "--disable-ipc-flooding-protection",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-field-trial-config",
        "--disable-cloud-import",
        "--ignore-certificate-errors",
        "--ignore-certificate-errors-spki-list",
        "--enable-features=NetworkService,NetworkServiceInProcess",
        "--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      ],
      headless: true,
      ignoreHTTPSErrors: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    };

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();

    // Set realistic viewport and user agent
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Set longer timeouts for server environment
    page.setDefaultTimeout(120000);
    page.setDefaultNavigationTimeout(120000);

    // Enhanced debugging for server environment
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`HTTP ${response.status()} for: ${response.url()}`);
      }
    });
    page.on('requestfailed', request => {
      console.log(`Request failed: ${request.url()} ${request.failure().errorText}`);
    });

    // Set up download behavior
    console.log("Setting up download behavior...");
    try {
      const client = await page.target().createCDPSession();
      await client.send("Page.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: downloadPath,
      });
      console.log("Download behavior set successfully");
    } catch (cdpError) {
      console.log("CDP session failed, continuing without download behavior:", cdpError.message);
    }

    // Navigate to the URL
    console.log(`Navigating to URL: ${url}`);
    try {
      const response = await page.goto(url, {
        waitUntil: ["networkidle0", "domcontentloaded"],
        timeout: 60000
      });
      console.log(`Navigation completed with status: ${response?.status()}`);
    } catch (navError) {
      console.log("Navigation timeout, continuing anyway:", navError.message);
    }

    // Wait for page to load
    await page.waitForSelector('body', { timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take initial screenshot for debugging
    await page.screenshot({ path: path.join(downloadPath, '1-initial-page.png') });

    // FIXED: Enhanced login process with better error handling
    console.log("Attempting login...");

    // Fill email
    const emailField = await page.$('#email');
    if (!emailField) {
      await page.screenshot({ path: path.join(downloadPath, '2-email-not-found.png') });
      throw new Error("Email field not found");
    }

    await emailField.click({ clickCount: 3 });
    await emailField.type(user_email, { delay: 100 });

    // Fill password
    const passwordField = await page.$('#password');
    if (!passwordField) {
      await page.screenshot({ path: path.join(downloadPath, '3-password-not-found.png') });
      throw new Error("Password field not found");
    }

    await passwordField.click({ clickCount: 3 });
    await passwordField.type(user_password, { delay: 100 });

    // Take pre-login screenshot
    await page.screenshot({ path: path.join(downloadPath, '4-pre-login.png') });

    // Click login button
    console.log("Clicking login button...");
    const loginButton = await page.$('button[data-cy="button"][data-fp="primaryButton"]');
    if (!loginButton) {
      throw new Error("Login button not found");
    }

    // Wait for both navigation and potential API calls
    await Promise.all([
      loginButton.click(),
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {
        console.log("Navigation timeout after login, checking for errors...");
      }),
      page.waitForResponse(response =>
        response.url().includes('/api/') && response.status() === 200
        , { timeout: 30000 }).catch(() => {
          console.log("No API response received");
        })
    ]);

    // Wait a bit for any redirects
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Take post-login screenshot
    await page.screenshot({ path: path.join(downloadPath, '5-post-login.png') });

    // Check if login was successful
    const currentUrl = page.url();
    console.log(`Current URL after login: ${currentUrl}`);

    // Check for login errors
    const errorElement = await page.$('.error, [class*="error"], [data-cy*="error"]');
    if (errorElement) {
      const errorText = await page.evaluate(el => el.textContent, errorElement);
      throw new Error(`Login failed: ${errorText}`);
    }

    // Check if we're still on login page
    if (currentUrl.includes('login')) {
      throw new Error("Login failed - still on login page");
    }

    console.log("Login successful, proceeding to download...");

    // FIXED: Enhanced download strategies with valid CSS selectors
    console.log("STRATEGY 1: Looking for direct download button...");

    // Valid CSS selectors only (no :contains)
    const downloadButtonSelectors = [
      'button[data-cy="commissions-download"][data-fp="plainButton"]',
      '[data-cy*="download"]',
      '[class*="download"]',
      '.download-btn',
      '[title*="Download"]',
      '[aria-label*="Download"]',
      'button',
      'a'
    ];

    let downloadButton = null;
    for (const selector of downloadButtonSelectors) {
      try {
        const buttons = await page.$$(selector);
        for (const button of buttons) {
          const buttonText = await page.evaluate(el => el.textContent?.toLowerCase() || '', button);
          if (buttonText.includes('download') || buttonText.includes('export') ||
            buttonText.includes('csv') || buttonText.includes('excel')) {
            downloadButton = button;
            console.log(`Found download button with text: ${buttonText}`);
            break;
          }
        }
        if (downloadButton) break;
      } catch (selectorError) {
        console.log(`Error with selector ${selector}:`, selectorError.message);
      }
    }

    if (downloadButton) {
      console.log("Found download button, attempting download...");
      const filesBeforeDownload = fs.readdirSync(downloadPath);

      await downloadButton.click();

      const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 45000);

      if (downloadedFile) {
        const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
        await browser.close();
        return formatBrowserResponse(result);
      }
    }

    // STRATEGY 2: Navigate directly to commissions page and look for export
    console.log("STRATEGY 2: Trying commissions page approach...");
    try {
      // Navigate directly to commissions page
      const commissionsUrl = currentUrl.includes('my-commissions') ? currentUrl : `${data.url.replace('/login', '/my-commissions')}`;
      console.log(`Navigating to commissions page: ${commissionsUrl}`);

      await page.goto(commissionsUrl, {
        waitUntil: "networkidle0",
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 5000));
      await page.screenshot({ path: path.join(downloadPath, '6-commissions-page.png') });

      // Look for export buttons with text content check
      const allButtons = await page.$$('button, a, [role="button"]');
      let exportButton = null;

      for (const button of allButtons) {
        const buttonText = await page.evaluate(el => el.textContent?.toLowerCase()?.trim() || '', button);
        const buttonHtml = await page.evaluate(el => el.outerHTML, button);

        if (buttonText.includes('download') || buttonText.includes('export') ||
          buttonText.includes('csv') || buttonText.includes('excel') ||
          buttonHtml.includes('download') || buttonHtml.includes('export')) {
          exportButton = button;
          console.log(`Found export button with text: ${buttonText}`);
          break;
        }
      }

      if (exportButton) {
        console.log("Found export button, clicking...");
        const filesBeforeDownload = fs.readdirSync(downloadPath);

        await exportButton.click();

        const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 45000);

        if (downloadedFile) {
          const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
          await browser.close();
          return formatBrowserResponse(result);
        }
      }
    } catch (altError) {
      console.log("Alternative approach failed:", altError.message);
    }

    // STRATEGY 3: Try to find and click any potential download links
    console.log("STRATEGY 3: Looking for download links...");
    try {
      const filesBeforeDownload = fs.readdirSync(downloadPath);

      // Try to find links that might trigger downloads
      const links = await page.$$('a[href*=".csv"], a[href*=".xlsx"], a[href*="export"], a[href*="download"]');

      if (links.length > 0) {
        console.log(`Found ${links.length} potential download links`);
        for (const link of links) {
          try {
            await link.click();
            await new Promise(resolve => setTimeout(resolve, 3000));

            const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 30000);
            if (downloadedFile) {
              const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
              await browser.close();
              return formatBrowserResponse(result);
            }
          } catch (linkError) {
            console.log("Link click failed:", linkError.message);
          }
        }
      }
    } catch (linkError) {
      console.log("Link approach failed:", linkError.message);
    }

    // Final check for any downloaded files
    console.log("Performing final files check...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    const finalFiles = fs.readdirSync(downloadPath);
    const downloadedFiles = finalFiles.filter(file =>
      (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls')) &&
      !file.endsWith('.crdownload')
    );

    console.log("Final files check:", downloadedFiles);

    if (downloadedFiles.length > 0) {
      console.log(`Found downloaded file: ${downloadedFiles[0]}`);
      const result = await processDownloadedFile(downloadedFiles[0], downloadPath, newFileName);
      await browser.close();
      return formatBrowserResponse(result);
    }

    // Take final screenshot for debugging
    await page.screenshot({ path: path.join(downloadPath, '7-final-state.png') });

    await browser.close();
    throw new Error("No file was downloaded after trying all strategies");

  } catch (error) {
    console.error("Error in exportScalenutData:", error);

    // Take final screenshot for debugging
    if (browser) {
      try {
        const pages = await browser.pages();
        if (pages.length > 0) {
          await pages[0].screenshot({
            path: path.join(downloadPath, '8-error-state.png')
          });
        }
      } catch (screenshotError) {
        console.error("Could not take final screenshot:", screenshotError);
      }

      await browser.close();
    }

    return formatBrowserResponse({
      success: false,
      msg: `Server execution failed: ${error.message}`,
      error: error.toString()
    });
  }
};

/**
 * Wait for download to complete
 */
async function waitForDownload(downloadPath, filesBeforeDownload, maxWaitTime = 60000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
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

      // Check for .crdownload files (in-progress downloads)
      const inProgressFiles = currentFiles.filter(file =>
        file.endsWith('.crdownload') && !filesBeforeDownload.includes(file)
      );

      if (inProgressFiles.length > 0) {
        console.log(`Download in progress: ${inProgressFiles.length} files`);
      }
    } catch (fileError) {
      console.log("Error checking download directory:", fileError.message);
    }
  }

  console.log("Download timeout reached");
  return null;
}

/**
 * Format response for browser environment
 */
function formatBrowserResponse(result) {
  if (result.success && result.data) {
    return {
      success: true,
      msg: result.msg,
      data: result.data,
      fileName: result.fileName,
      recordCount: result.recordCount
    };
  } else {
    return {
      success: false,
      msg: result.msg,
      error: result.error
    };
  }
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

exports.processDownloadedFile = processDownloadedFile;

exports.viewScalenutData = async (data) => {
  try {
    return { success: true, msg: "View functionality not implemented yet" };
  } catch (error) {
    return {
      success: false,
      msg: error.message
    };
  }
};