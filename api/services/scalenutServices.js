const { v4: uuidv4 } = require("uuid");
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

    // Generate a unique file name using UUID
    const uniqueId = uuidv4();
    const newFileName = `file_${uniqueId}.csv`;

    // Detect if running on server
    const isServerEnvironment = !process.env.PUPPETEER_EXECUTABLE_PATH || 
                               process.env.NODE_ENV === 'production' || 
                               process.env.IS_SERVER;

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
        "--enable-features=NetworkService,NetworkServiceInProcess"
      ],
      headless: true,
      ignoreHTTPSErrors: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    };

    if (isServerEnvironment) {
      console.log("Applying server-specific browser settings");
      launchOptions.args.push("--single-process");
    }

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();

    // Enhanced page configuration with server adjustments
    await page.setViewport({ width: 1280, height: 720 });
    
    if (isServerEnvironment) {
      page.setDefaultTimeout(180000);
      page.setDefaultNavigationTimeout(180000);
      await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    } else {
      page.setDefaultTimeout(120000);
      page.setDefaultNavigationTimeout(120000);
    }

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

    // Set up download behavior with error handling
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

    // Enhanced navigation with multiple retries
    console.log(`Navigating to URL: ${url}`);
    let navigationSuccess = false;
    let retryCount = 0;
    const maxRetries = 3;

    while (!navigationSuccess && retryCount < maxRetries) {
      try {
        const response = await page.goto(url, {
          waitUntil: ["networkidle0", "domcontentloaded", "load"],
          timeout: 60000
        });

        // Check if response is valid
        if (response && response.status() === 200) {
          console.log("Navigation completed successfully");
          navigationSuccess = true;
        } else {
          console.log(`Navigation response status: ${response ? response.status() : 'no response'}`);
          throw new Error(`Navigation failed with status: ${response ? response.status() : 'no response'}`);
        }
      } catch (navError) {
        retryCount++;
        console.log(`Navigation attempt ${retryCount} failed:`, navError.message);
        
        if (retryCount < maxRetries) {
          console.log(`Retrying navigation in 3 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          console.log("All navigation attempts failed, continuing with current page state...");
          // Take screenshot for debugging
          await page.screenshot({ path: path.join(downloadPath, 'navigation-failed.png') });
        }
      }
    }

    // Enhanced page load detection
    console.log("Waiting for page to load completely...");
    try {
      // Wait for network to be idle
      await page.waitForNetworkIdle({ timeout: 30000 });
    } catch (e) {
      console.log("Network idle timeout, continuing...");
    }

    // Multiple strategies to ensure page is loaded
    await Promise.race([
      page.waitForSelector('body', { timeout: 30000 }),
      page.waitForFunction(() => document.readyState === 'complete', { timeout: 30000 })
    ]).catch(() => console.log("Page load detection timeout, continuing..."));

    // Additional wait for dynamic content
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Check if we're on the expected page
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    if (currentUrl.includes('login') || currentUrl.includes('auth')) {
      console.log("Still on login/auth page, proceeding with login...");
    } else {
      console.log("Already on target page, skipping login...");
    }

    // Take initial screenshot for debugging
    await page.screenshot({ path: path.join(downloadPath, 'initial-page.png') });

    // Enhanced login process with multiple selectors
    console.log("Attempting login...");

    // Try multiple possible email field selectors
    const emailSelectors = [
      '#email',
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="mail" i]',
      '[data-cy="email"]',
      '.email-input',
      'input[id*="email"]'
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
      // Take screenshot for debugging
      await page.screenshot({ path: path.join(downloadPath, 'debug-login.png') });
      throw new Error("Email field not found with any selector");
    }

    await emailField.click({ clickCount: 3 });
    await emailField.type(user_email, { delay: 100 });

    // Try multiple possible password field selectors
    const passwordSelectors = [
      '#password',
      'input[type="password"]',
      'input[name="password"]',
      'input[placeholder*="password" i]',
      '[data-cy="password"]',
      '.password-input',
      'input[id*="password"]'
    ];

    let passwordField = null;
    for (const selector of passwordSelectors) {
      passwordField = await page.$(selector);
      if (passwordField) {
        console.log(`Found password field with selector: ${selector}`);
        break;
      }
    }

    if (!passwordField) {
      await page.screenshot({ path: path.join(downloadPath, 'debug-password.png') });
      throw new Error("Password field not found with any selector");
    }

    await passwordField.click({ clickCount: 3 });
    await passwordField.type(user_password, { delay: 100 });

    // Take pre-login screenshot
    await page.screenshot({ path: path.join(downloadPath, 'pre-login.png') });

    // Enhanced login button click with multiple strategies
    console.log("Clicking login button...");
    
    // Try multiple login button selectors
    const loginButtonSelectors = [
      'button[data-cy="button"][data-fp="primaryButton"]',
      'button[type="submit"]',
      'input[type="submit"]',
      'button:contains("Login")',
      'button:contains("Sign In")',
      'input[value*="Login" i]',
      'input[value*="Sign" i]',
      '[data-cy="login-button"]',
      '.login-btn',
      'button[class*="login"]'
    ];

    let loginClicked = false;
    for (const selector of loginButtonSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          console.log(`Clicked login button with selector: ${selector}`);
          loginClicked = true;
          break;
        }
      } catch (buttonError) {
        console.log(`Failed to click button with selector ${selector}:`, buttonError.message);
      }
    }

    if (!loginClicked) {
      console.log("No button found, trying Enter key");
      await page.keyboard.press('Enter');
    }

    // Wait for navigation with better handling
    try {
      await page.waitForNavigation({ 
        waitUntil: ['networkidle2', 'domcontentloaded'], 
        timeout: 30000 
      });
      console.log("Navigation after login completed");
    } catch (e) {
      console.log("No navigation occurred after login, continuing...");
    }

    // Wait for dashboard to load with multiple checks
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Take post-login screenshot
    await page.screenshot({ path: path.join(downloadPath, 'post-login.png') });

    // Check if login was successful by looking for dashboard elements
    const dashboardIndicators = [
      '.dashboard',
      '[data-cy*="dashboard"]',
      '[class*="dashboard"]',
      'my-commissions',
      'commissions',
      '.my-commissions',
      '[href*="commissions"]'
    ];

    let loginSuccessful = false;
    for (const indicator of dashboardIndicators) {
      const element = await page.$(indicator);
      if (element) {
        loginSuccessful = true;
        console.log(`Login successful - found indicator: ${indicator}`);
        break;
      }
    }

    if (!loginSuccessful) {
      // Check for error messages
      const errorSelectors = [
        '.error',
        '[class*="error"]',
        '[data-cy*="error"]',
        '#error',
        '.alert-error',
        '.login-error',
        '[role="alert"]'
      ];

      for (const selector of errorSelectors) {
        const errorElement = await page.$(selector);
        if (errorElement) {
          const errorText = await page.evaluate(el => el.textContent, errorElement);
          throw new Error(`Login failed: ${errorText}`);
        }
      }

      console.log("No clear login status, continuing anyway...");
    }

    // Enhanced download strategies
    console.log("STRATEGY 1: Looking for direct download button...");
    
    const downloadButtonSelectors = [
      'button[data-cy="commissions-download"][data-fp="plainButton"]',
      'button:contains("Download")',
      'button:contains("Export")',
      'a:contains("Download")',
      'a:contains("Export")',
      '[data-cy*="download"]',
      '[class*="download"]',
      '.download-btn',
      '[title*="Download"]',
      '[aria-label*="Download"]'
    ];

    let downloadButton = null;
    for (const selector of downloadButtonSelectors) {
      try {
        downloadButton = await page.$(selector);
        if (downloadButton) {
          console.log(`Found download button with selector: ${selector}`);
          break;
        }
      } catch (selectorError) {
        console.log(`Error with selector ${selector}:`, selectorError.message);
      }
    }

    if (downloadButton) {
      console.log("Found download button, attempting download...");
      const filesBeforeDownload = fs.readdirSync(downloadPath);

      // Try clicking with multiple approaches
      try {
        await downloadButton.click();
      } catch (clickError) {
        console.log("Direct click failed, trying JavaScript click:", clickError.message);
        await page.evaluate(button => button.click(), downloadButton);
      }

      const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 60000);
      
      if (downloadedFile) {
        const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
        await browser.close();
        return formatBrowserResponse(result);
      }
    }

    // STRATEGY 2: Alternative approach - Navigate directly to commissions page
    console.log("STRATEGY 2: Trying alternative approach...");
    try {
      // Navigate directly to commissions page if not already there
      const currentUrl = page.url();
      if (!currentUrl.includes('my-commissions')) {
        const commissionsUrl = `${data.url.replace(/\/login(\/|$)/g, '/').replace(/\/$/, '')}/my-commissions`;
        console.log(`Navigating directly to commissions page: ${commissionsUrl}`);
        
        await page.goto(commissionsUrl, { 
          waitUntil: "networkidle2",
          timeout: 30000 
        });
        
        // Wait for commissions page to load
        await new Promise(resolve => setTimeout(resolve, 8000));
        await page.screenshot({ path: path.join(downloadPath, 'commissions-page.png') });
      }

      // Look for export options with multiple selectors
      const exportSelectors = [
        'a[href*="export"]',
        'button[onclick*="export"]',
        '[data-cy*="export"]',
        'button:contains("CSV")',
        'button:contains("Excel")',
        'a:contains("CSV")',
        'a:contains("Excel")',
        '.export-btn',
        '[title*="Export"]'
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

    // STRATEGY 3: Try JavaScript-based download
    console.log("STRATEGY 3: Trying JavaScript execution...");
    try {
      const filesBeforeDownload = fs.readdirSync(downloadPath);
      
      // Try to trigger download via JavaScript
      const downloadTriggered = await page.evaluate(() => {
        // Look for any element that might trigger download
        const downloadElements = document.querySelectorAll('[data-cy*="download"], [onclick*="download"], [onclick*="export"], button, a');
        
        for (let element of downloadElements) {
          const text = element.textContent.toLowerCase();
          if (text.includes('download') || text.includes('export') || text.includes('csv') || text.includes('excel')) {
            element.click();
            return true;
          }
        }
        return false;
      });

      if (downloadTriggered) {
        console.log("JavaScript download triggered");
        const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 45000);
        
        if (downloadedFile) {
          const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
          await browser.close();
          return formatBrowserResponse(result);
        }
      }
    } catch (jsError) {
      console.log("JavaScript approach failed:", jsError.message);
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
    await page.screenshot({ path: path.join(downloadPath, 'final-state.png') });

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
            path: path.join(downloadPath, 'final-error-state.png') 
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
  // For browser responses, ensure the response is JSON-serializable
  // and doesn't contain circular references or Buffer data
  if (result.success && result.data) {
    return {
      success: true,
      msg: result.msg,
      data: result.data,
      fileName: result.fileName,
      recordCount: result.recordCount
      // Remove filePath as it's not useful in browser context
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