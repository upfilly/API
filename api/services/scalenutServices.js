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
    // Validate input data
    if (!data.email || !data.password || !data.url) {
      throw new Error("Missing required fields: email, password, or url");
    }

    const user_password = data.password;
    const user_email = data.email;
    const url = `${data.url}?redirect=%252Fmy-commissions`;
    
    console.log(`Starting process for email: ${user_email}`);
    console.log(`Download path: ${downloadPath}`);

    // Create the download directory if it doesn't exist
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true, mode: 0o755 });
      console.log('Created download directory');
    }

    // Clear any existing files in download directory
    try {
      const files = fs.readdirSync(downloadPath);
      for (const file of files) {
        if (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls') || file.endsWith('.crdownload')) {
          fs.unlinkSync(path.join(downloadPath, file));
          console.log(`Cleaned up file: ${file}`);
        }
      }
    } catch (cleanupError) {
      console.log("Cleanup warning:", cleanupError.message);
    }

    // Generate a unique file name
    const uniqueId = crypto.randomUUID();
    const newFileName = `file_${uniqueId}.csv`;

    // Launch browser with optimized configuration
    console.log("Launching browser...");
    const browserOptions = {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-web-security",
        "--ignore-certificate-errors",
        "--disable-features=VizDisplayCompositor",
        "--disable-ipc-flooding-protection",
        "--window-size=1366,768",
        "--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      ],
      headless: true,
      ignoreHTTPSErrors: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    };

    browser = await puppeteer.launch(browserOptions);
    console.log("Browser launched successfully");

    const page = await browser.newPage();
    
    // Set realistic browser characteristics
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set reasonable timeouts
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    // Set up download behavior
    console.log("Setting up download behavior...");
    try {
      const client = await page.target().createCDPSession();
      await client.send("Page.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: downloadPath,
      });
      console.log("Download behavior configured");
    } catch (cdpError) {
      console.log("Download behavior setup warning:", cdpError.message);
    }

    // Navigate to the URL
    console.log(`Navigating to: ${url}`);
    const navigationResponse = await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 60000
    });

    if (navigationResponse && navigationResponse.status() !== 200) {
      console.warn(`Navigation response status: ${navigationResponse.status()}`);
    }

    await delay(3000);
    console.log("Page loaded successfully");

    // Login process
    console.log("Starting login process...");

    // Fill email field
    const emailField = await page.$('#email');
    if (!emailField) {
      await page.screenshot({ path: path.join(downloadPath, 'email-field-missing.png') });
      throw new Error("Email field not found on page");
    }
    
    await emailField.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await delay(200);
    await emailField.type(user_email, { delay: 50 });
    console.log("Email entered");

    // Fill password field
    const passwordField = await page.$('#password');
    if (!passwordField) {
      await page.screenshot({ path: path.join(downloadPath, 'password-field-missing.png') });
      throw new Error("Password field not found on page");
    }
    
    await passwordField.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await delay(200);
    await passwordField.type(user_password, { delay: 50 });
    console.log("Password entered");

    // Find and click login button
    const loginButton = await page.$('button[data-cy="button"][data-fp="primaryButton"]');
    if (!loginButton) {
      await page.screenshot({ path: path.join(downloadPath, 'login-button-missing.png') });
      throw new Error("Login button not found");
    }
    
    console.log("Clicking login button...");
    await loginButton.click();

    // Wait for navigation or changes
    try {
      await page.waitForNavigation({ 
        waitUntil: 'networkidle0', 
        timeout: 15000 
      });
      console.log("Navigation after login completed");
    } catch (navError) {
      console.log("No navigation detected, waiting for page changes...");
      await delay(5000);
    }

    // Check login status
    const currentUrl = page.url();
    console.log(`Current URL after login attempt: ${currentUrl}`);

    // Check if we're still on login page
    if (currentUrl.includes('login')) {
      // Check for error messages
      const errorElement = await page.$('.error, .text-error, [data-cy*="error"], .alert-danger');
      let errorMessage = 'Login failed - redirected to login page';
      
      if (errorElement) {
        const errorText = await page.evaluate(el => el.textContent?.trim(), errorElement);
        if (errorText) {
          errorMessage = `Login failed: ${errorText}`;
        }
      }
      
      await page.screenshot({ path: path.join(downloadPath, 'login-failed.png') });
      throw new Error(errorMessage);
    }

    console.log("Login successful! Current page:", currentUrl);

    // Wait for dashboard to load
    await delay(3000);

    // Take screenshot for debugging
    await page.screenshot({ path: path.join(downloadPath, 'dashboard-loaded.png') });

    // Strategy 1: Look for download button with specific selectors
    console.log("Looking for download button...");
    let downloadButton = await findDownloadButton(page);
    
    if (downloadButton) {
      console.log("Download button found, attempting download...");
      const filesBeforeDownload = fs.readdirSync(downloadPath);
      
      await downloadButton.click();
      await delay(5000);
      
      const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 30000);
      if (downloadedFile) {
        console.log(`Download completed: ${downloadedFile}`);
        const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
        await browser.close();
        return result;
      }
    }

    // Strategy 2: Look for export links
    console.log("Looking for export links...");
    const exportSuccess = await tryExportLinks(page, downloadPath, newFileName);
    if (exportSuccess) {
      await browser.close();
      return exportSuccess;
    }

    // Strategy 3: Try direct navigation to export endpoints
    console.log("Trying direct export endpoints...");
    const directExportSuccess = await tryDirectExportEndpoints(page, data.url, downloadPath, newFileName);
    if (directExportSuccess) {
      await browser.close();
      return directExportSuccess;
    }

    // Final attempt: Look for any download-related elements
    console.log("Final attempt: Searching for any download elements...");
    const finalSuccess = await finalDownloadAttempt(page, downloadPath, newFileName);
    if (finalSuccess) {
      await browser.close();
      return finalSuccess;
    }

    await browser.close();
    throw new Error("No download options found after all attempts");

  } catch (error) {
    console.error("Service error:", error.message);
    
    // Take error screenshot
    if (browser) {
      try {
        await page.screenshot({ path: path.join(downloadPath, 'error-state.png') });
      } catch (screenshotError) {
        console.log("Could not take error screenshot:", screenshotError.message);
      }
      
      await browser.close();
    }

    // Re-throw the error for the controller to handle
    throw error;
  }
};

/**
 * Find download button by checking text content
 */
async function findDownloadButton(page) {
  try {
    // First try specific selectors
    const specificSelectors = [
      'button[data-cy*="download"]',
      'button[data-cy*="export"]',
      '[data-cy*="download"]',
      '[data-cy*="export"]',
      '.download-btn',
      '.export-btn',
      'button:has-text("Download")',
      'button:has-text("Export")'
    ];

    for (const selector of specificSelectors) {
      const element = await page.$(selector);
      if (element) {
        console.log(`Found element with selector: ${selector}`);
        return element;
      }
    }

    // Then check all buttons for download-related text
    const allButtons = await page.$$('button, a, [role="button"]');
    
    for (const button of allButtons) {
      try {
        const buttonText = await page.evaluate(btn => {
          return btn.textContent?.toLowerCase()?.trim() || '';
        }, button);
        
        const downloadKeywords = ['download', 'export', 'csv', 'excel', 'commissions'];
        
        for (const keyword of downloadKeywords) {
          if (buttonText.includes(keyword)) {
            console.log(`Found button with text: "${buttonText}" containing "${keyword}"`);
            return button;
          }
        }
      } catch (e) {
        // Continue to next button
      }
    }
    
    return null;
  } catch (error) {
    console.log("Error finding download button:", error.message);
    return null;
  }
}

/**
 * Try export links
 */
async function tryExportLinks(page, downloadPath, newFileName) {
  try {
    const linkSelectors = [
      'a[href*="export"]',
      'a[href*="download"]',
      'a[href*=".csv"]',
      'a[href*=".xlsx"]',
      'a[download]'
    ];

    for (const selector of linkSelectors) {
      const links = await page.$$(selector);
      for (const link of links) {
        console.log(`Found link with selector: ${selector}`);
        const filesBeforeDownload = fs.readdirSync(downloadPath);
        await link.click();
        await delay(3000);
        
        const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 20000);
        if (downloadedFile) {
          return await processDownloadedFile(downloadedFile, downloadPath, newFileName);
        }
      }
    }
    
    return null;
  } catch (error) {
    console.log("Export links attempt failed:", error.message);
    return null;
  }
}

/**
 * Try direct export endpoints
 */
async function tryDirectExportEndpoints(page, baseUrl, downloadPath, newFileName) {
  try {
    const exportEndpoints = [
      '/commissions/export',
      '/export/commissions',
      '/my-commissions/export',
      '/api/commissions/export',
      '/commissions.csv',
      '/commissions.xlsx'
    ];

    for (const endpoint of exportEndpoints) {
      const exportUrl = `${baseUrl.replace('/login', '')}${endpoint}`;
      console.log(`Trying direct endpoint: ${exportUrl}`);
      
      const filesBeforeDownload = fs.readdirSync(downloadPath);
      
      try {
        await page.goto(exportUrl, { 
          waitUntil: "networkidle0",
          timeout: 10000 
        });
        
        await delay(3000);
        
        const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 15000);
        if (downloadedFile) {
          return await processDownloadedFile(downloadedFile, downloadPath, newFileName);
        }
      } catch (e) {
        console.log(`Endpoint ${exportUrl} failed:`, e.message);
      }
    }
    
    return null;
  } catch (error) {
    console.log("Direct endpoints attempt failed:", error.message);
    return null;
  }
}

/**
 * Final download attempt
 */
async function finalDownloadAttempt(page, downloadPath, newFileName) {
  try {
    // Try to trigger any JavaScript download functionality
    const filesBeforeDownload = fs.readdirSync(downloadPath);
    
    const downloadTriggered = await page.evaluate(() => {
      // Look for elements with onclick handlers
      const elements = document.querySelectorAll('[onclick*="export"], [onclick*="download"], [onclick*="csv"]');
      for (const element of elements) {
        element.click();
        return true;
      }
      return false;
    });

    if (downloadTriggered) {
      await delay(5000);
      const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 20000);
      if (downloadedFile) {
        return await processDownloadedFile(downloadedFile, downloadPath, newFileName);
      }
    }
    
    return null;
  } catch (error) {
    console.log("Final download attempt failed:", error.message);
    return null;
  }
}

/**
 * Wait for download to complete
 */
async function waitForDownload(downloadPath, filesBeforeDownload, maxWaitTime = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    await delay(2000);
    
    try {
      const currentFiles = fs.readdirSync(downloadPath);
      const completedFiles = currentFiles.filter(file =>
        !filesBeforeDownload.includes(file) &&
        (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls')) &&
        !file.endsWith('.crdownload')
      );

      if (completedFiles.length > 0) {
        console.log(`Download found: ${completedFiles[0]}`);
        return completedFiles[0];
      }

      // Check for in-progress downloads
      const inProgressFiles = currentFiles.filter(file => 
        file.endsWith('.crdownload') && !filesBeforeDownload.includes(file)
      );
      
      if (inProgressFiles.length > 0) {
        console.log(`Download in progress: ${inProgressFiles.length} files`);
      }
    } catch (error) {
      console.log("Error checking download directory:", error.message);
    }
  }
  
  console.log("Download timeout reached");
  return null;
}

/**
 * Process downloaded file
 */
async function processDownloadedFile(downloadedFile, downloadPath, newFileName) {
  const downloadedFilePath = path.join(downloadPath, downloadedFile);
  const finalFilePath = path.join(downloadPath, newFileName);

  console.log(`Processing file: ${downloadedFile}`);
  let rowData = [];

  try {
    // Read and parse the file based on format
    if (downloadedFile.endsWith('.csv')) {
      rowData = await new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(downloadedFilePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => {
            console.log(`CSV processing complete: ${results.length} rows`);
            resolve(results);
          })
          .on('error', reject);
      });
    } else if (downloadedFile.endsWith('.xlsx') || downloadedFile.endsWith('.xls')) {
      const workbook = XLSX.readFile(downloadedFilePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      rowData = XLSX.utils.sheet_to_json(worksheet);
      console.log(`Excel processing complete: ${rowData.length} rows`);
    } else {
      throw new Error(`Unsupported file format: ${downloadedFile}`);
    }

    // Rename file to the new name
    fs.renameSync(downloadedFilePath, finalFilePath);
    console.log(`File renamed to: ${newFileName}`);

    return {
      success: true,
      msg: "Data exported successfully",
      data: rowData,
      fileName: newFileName,
      recordCount: rowData.length
    };

  } catch (error) {
    console.error("File processing error:", error);
    throw new Error(`Failed to process downloaded file: ${error.message}`);
  }
}

/**
 * Utility function for delays
 */
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

exports.processDownloadedFile = processDownloadedFile;

// Optional: View functionality
exports.viewScalenutData = async (data) => {
  try {
    return { 
      success: true, 
      msg: "View functionality not implemented yet" 
    };
  } catch (error) {
    return {
      success: false,
      msg: error.message
    };
  }
};