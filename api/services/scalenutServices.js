const crypto = require('crypto');
const csv = require("csv-parser");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

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

    // Enhanced browser launch configuration with stealth
    console.log("Launching browser with stealth plugins...");
    const launchOptions = {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
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
        "--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "--window-size=1366,768"
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

    // Block images and unnecessary resources to speed up loading
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (resourceType === 'image' || resourceType === 'font' || resourceType === 'media') {
        req.abort();
      } else {
        req.continue();
      }
    });

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

    // Navigate to the URL with human-like delays
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

    // Wait for page to load with human-like delay
    await page.waitForSelector('body', { timeout: 30000 });
    await humanDelay(2000, 3000);

    // Take initial screenshot for debugging
    await page.screenshot({ path: path.join(downloadPath, '1-initial-page.png') });

    // FIXED: Enhanced login process with human-like behavior
    console.log("Attempting login with human-like behavior...");

    // Fill email with human-like typing
    const emailField = await page.$('#email');
    if (!emailField) {
      await page.screenshot({ path: path.join(downloadPath, '2-email-not-found.png') });
      throw new Error("Email field not found");
    }

    await emailField.click();
    await humanDelay(100, 200);
    await emailField.click({ clickCount: 3 }); // Select all text
    await humanDelay(100, 200);
    await page.keyboard.press('Backspace'); // Clear field
    await humanDelay(100, 200);
    await typeLikeHuman(page, user_email);

    // Fill password with human-like typing
    const passwordField = await page.$('#password');
    if (!passwordField) {
      await page.screenshot({ path: path.join(downloadPath, '3-password-not-found.png') });
      throw new Error("Password field not found");
    }

    await passwordField.click();
    await humanDelay(100, 200);
    await passwordField.click({ clickCount: 3 }); // Select all text
    await humanDelay(100, 200);
    await page.keyboard.press('Backspace'); // Clear field
    await humanDelay(100, 200);
    await typeLikeHuman(page, user_password);

    // Take pre-login screenshot
    await page.screenshot({ path: path.join(downloadPath, '4-pre-login.png') });

    // Click login button with human-like behavior
    console.log("Clicking login button...");
    const loginButton = await page.$('button[data-cy="button"][data-fp="primaryButton"]');
    if (!loginButton) {
      throw new Error("Login button not found");
    }

    // Move mouse to button and click like human
    const buttonBox = await loginButton.boundingBox();
    if (buttonBox) {
      await page.mouse.move(buttonBox.x + buttonBox.width / 2, buttonBox.y + buttonBox.height / 2);
      await humanDelay(500, 800);
    }

    await loginButton.click();
    await humanDelay(1000, 1500);

    // Wait for navigation or changes
    console.log("Waiting for login to complete...");
    
    // Wait for either navigation or check for errors
    try {
      await page.waitForNavigation({ 
        waitUntil: 'networkidle0', 
        timeout: 15000 
      });
      console.log("Navigation occurred after login");
    } catch (e) {
      console.log("No navigation, checking for status changes...");
    }

    // Wait a bit more for any JavaScript redirects
    await humanDelay(3000, 4000);

    // Take post-login screenshot
    await page.screenshot({ path: path.join(downloadPath, '5-post-login.png') });

    // Check if login was successful
    const currentUrl = page.url();
    console.log(`Current URL after login attempt: ${currentUrl}`);

    // Check for login errors more thoroughly
    const errorSelectors = [
      '.error', 
      '.alert-error', 
      '[data-cy*="error"]',
      '[class*="error"]',
      '[role="alert"]',
      '.text-red',
      '.login-error'
    ];

    let loginError = null;
    for (const selector of errorSelectors) {
      const errorElement = await page.$(selector);
      if (errorElement) {
        const errorText = await page.evaluate(el => el.textContent?.trim(), errorElement);
        if (errorText && errorText.length > 0) {
          loginError = errorText;
          console.log(`Found login error: ${errorText}`);
          break;
        }
      }
    }

    // Check if we're still on login page
    if (currentUrl.includes('login') || loginError) {
      // Try alternative login approach - direct form submission
      console.log("Standard login failed, trying alternative approach...");
      
      // Disable request interception for the alternative approach
      await page.setRequestInterception(false);
      
      const alternativeSuccess = await tryAlternativeLogin(page, user_email, user_password, downloadPath);
      
      if (!alternativeSuccess) {
        throw new Error(`Login failed: ${loginError || 'Still on login page after multiple attempts'}`);
      }
    }

    console.log("Login successful, proceeding to download...");

    // Wait for commissions page to load completely
    await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });
    await humanDelay(2000, 3000);

    // Take screenshot of the dashboard
    await page.screenshot({ path: path.join(downloadPath, '6-dashboard.png') });

    // Enhanced download strategies
    console.log("Looking for download options...");

    // Strategy 1: Look for download buttons
    const downloadButton = await findDownloadButton(page);
    if (downloadButton) {
      console.log("Found download button via strategy 1");
      const filesBeforeDownload = fs.readdirSync(downloadPath);
      await downloadButton.click();
      await humanDelay(2000, 3000);
      
      const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 30000);
      if (downloadedFile) {
        const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
        await browser.close();
        return formatBrowserResponse(result);
      }
    }

    // Strategy 2: Navigate to commissions export page directly
    console.log("Trying direct commissions export page...");
    const exportSuccess = await tryDirectExport(page, data.url, downloadPath, newFileName);
    if (exportSuccess) {
      await browser.close();
      return exportSuccess;
    }

    // Strategy 3: Try JavaScript-based export
    console.log("Trying JavaScript export triggers...");
    const jsSuccess = await tryJavaScriptExport(page, downloadPath, newFileName);
    if (jsSuccess) {
      await browser.close();
      return jsSuccess;
    }

    // Final check for any downloaded files
    console.log("Performing final files check...");
    await humanDelay(5000, 7000);
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
 * Human-like typing function
 */
async function typeLikeHuman(page, text) {
  for (let char of text) {
    await page.keyboard.type(char, { delay: Math.random() * 100 + 50 });
    // Random pause between keystrokes
    if (Math.random() > 0.7) {
      await humanDelay(100, 300);
    }
  }
}

/**
 * Human-like delay
 */
async function humanDelay(min, max) {
  const delay = Math.random() * (max - min) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Alternative login approach
 */
async function tryAlternativeLogin(page, email, password, downloadPath) {
  try {
    console.log("Attempting alternative login approach...");
    
    // Try to submit the form directly via JavaScript
    const loginSuccess = await page.evaluate((email, password) => {
      // Find the form
      const form = document.querySelector('form');
      if (!form) return false;
      
      // Find email and password inputs
      const emailInput = document.querySelector('#email');
      const passwordInput = document.querySelector('#password');
      
      if (emailInput && passwordInput) {
        emailInput.value = email;
        passwordInput.value = password;
        
        // Trigger change events
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Submit form
        form.submit();
        return true;
      }
      return false;
    }, email, password);

    if (loginSuccess) {
      await humanDelay(5000, 7000);
      const currentUrl = page.url();
      console.log(`Alternative login URL: ${currentUrl}`);
      
      if (!currentUrl.includes('login')) {
        await page.screenshot({ path: path.join(downloadPath, '5a-alternative-login-success.png') });
        return true;
      }
    }
    
    await page.screenshot({ path: path.join(downloadPath, '5a-alternative-login-failed.png') });
    return false;
  } catch (error) {
    console.log("Alternative login failed:", error.message);
    return false;
  }
}

/**
 * Find download button
 */
async function findDownloadButton(page) {
  // Look for buttons with download-related text
  const allButtons = await page.$$('button, a, [role="button"], input[type="button"]');
  
  for (const button of allButtons) {
    try {
      const buttonInfo = await page.evaluate(button => {
        const text = button.textContent?.toLowerCase()?.trim() || '';
        const html = button.outerHTML.toLowerCase();
        const value = button.value?.toLowerCase() || '';
        const title = button.title?.toLowerCase() || '';
        const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
        
        return { text, html, value, title, ariaLabel };
      }, button);

      const downloadIndicators = ['download', 'export', 'csv', 'excel', 'export', 'commissions'];
      
      for (const indicator of downloadIndicators) {
        if (buttonInfo.text.includes(indicator) ||
            buttonInfo.html.includes(indicator) ||
            buttonInfo.value.includes(indicator) ||
            buttonInfo.title.includes(indicator) ||
            buttonInfo.ariaLabel.includes(indicator)) {
          console.log(`Found download button with indicator: ${indicator}`);
          return button;
        }
      }
    } catch (e) {
      // Continue with next button
    }
  }
  
  return null;
}

/**
 * Try direct export
 */
async function tryDirectExport(page, baseUrl, downloadPath, newFileName) {
  try {
    // Try common export URLs
    const exportUrls = [
      `${baseUrl.replace('/login', '')}/commissions/export`,
      `${baseUrl.replace('/login', '')}/export/commissions`,
      `${baseUrl.replace('/login', '')}/my-commissions/export`,
      `${baseUrl.replace('/login', '')}/api/commissions/export`
    ];

    for (const exportUrl of exportUrls) {
      console.log(`Trying direct export URL: ${exportUrl}`);
      
      const filesBeforeDownload = fs.readdirSync(downloadPath);
      
      try {
        const response = await page.goto(exportUrl, { 
          waitUntil: "networkidle0",
          timeout: 15000 
        });
        
        if (response && response.status() === 200) {
          await humanDelay(3000, 5000);
          
          const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 20000);
          if (downloadedFile) {
            return await processDownloadedFile(downloadedFile, downloadPath, newFileName);
          }
        }
      } catch (e) {
        console.log(`Export URL failed: ${exportUrl}`, e.message);
      }
    }
    
    return null;
  } catch (error) {
    console.log("Direct export approach failed:", error.message);
    return null;
  }
}

/**
 * Try JavaScript export
 */
async function tryJavaScriptExport(page, downloadPath, newFileName) {
  try {
    const filesBeforeDownload = fs.readdirSync(downloadPath);
    
    // Try to trigger any export functionality via JavaScript
    const downloadTriggered = await page.evaluate(() => {
      // Look for elements with onclick handlers
      const elements = document.querySelectorAll('[onclick*="export"], [onclick*="download"], [onclick*="csv"], [onclick*="excel"]');
      for (const element of elements) {
        element.click();
        return true;
      }
      
      // Look for data attributes that might trigger downloads
      const dataElements = document.querySelectorAll('[data-action*="export"], [data-action*="download"]');
      for (const element of dataElements) {
        element.click();
        return true;
      }
      
      return false;
    });

    if (downloadTriggered) {
      await humanDelay(3000, 5000);
      const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 20000);
      if (downloadedFile) {
        return await processDownloadedFile(downloadedFile, downloadPath, newFileName);
      }
    }
    
    return null;
  } catch (error) {
    console.log("JavaScript export failed:", error.message);
    return null;
  }
}

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
      
      if (inProgressFiles.length === 0 && currentFiles.some(f => !filesBeforeDownload.includes(f))) {
        // No in-progress downloads but new files appeared
        const newFiles = currentFiles.filter(f => !filesBeforeDownload.includes(f));
        console.log("New files found (no .crdownload):", newFiles);
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