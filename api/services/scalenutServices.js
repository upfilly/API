const { v4: uuidv4 } = require("uuid");
const csv = require("csv-parser");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

// Helper function for timeouts (compatible with all Puppeteer versions)
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

    // Enhanced browser launch options for server compatibility
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
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor"
      ],
      headless: true, // Use classic headless for older versions
      ignoreHTTPSErrors: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });

    const page = await browser.newPage();

    // Set viewport to a common desktop size
    await page.setViewport({ width: 1366, height: 768 });

    // Set up download behavior
    console.log("Setting up download behavior...");
    const client = await page.target().createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadPath,
    });

    // Set longer timeouts for server environments
    page.setDefaultTimeout(120000);
    page.setDefaultNavigationTimeout(120000);

    // Navigate to the URL with better error handling
    console.log(`Navigating to URL: ${url}`);
    try {
      await page.goto(url, {
        waitUntil: ["domcontentloaded", "networkidle0"],
        timeout: 60000
      });
    } catch (navigationError) {
      console.log("Initial navigation failed, trying with networkidle2...");
      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 60000
      });
    }

    // Improved wait for page load using evaluate
    await page.evaluate(() => {
      return new Promise((resolve) => {
        if (document.readyState === 'complete') {
          resolve();
        } else {
          window.addEventListener('load', resolve);
        }
      });
    });
    
    await waitForTimeout(5000);

    // Login process with enhanced selectors and fallbacks
    console.log("Attempting login...");

    // Wait for login form to be present with multiple selector options
    try {
      await page.waitForSelector('#email, input[type="email"], [name="email"]', { timeout: 15000 });
    } catch (e) {
      // If no email field found, check if we're already logged in
      const currentUrl = page.url();
      if (currentUrl.includes('my-commissions') || !currentUrl.includes('login')) {
        console.log("Already logged in or on different page, proceeding...");
      } else {
        throw new Error("Login form not found");
      }
    }

    // Fill email with multiple selector options
    const emailSelectors = ['#email', 'input[type="email"]', '[name="email"]'];
    let emailField = null;
    
    for (const selector of emailSelectors) {
      emailField = await page.$(selector);
      if (emailField) break;
    }
    
    if (emailField) {
      await emailField.click({ clickCount: 3 });
      await emailField.type(user_email, { delay: 100 });
    } else {
      throw new Error("Email field not found with any selector");
    }

    // Fill password with multiple selector options
    const passwordSelectors = ['#password', 'input[type="password"]', '[name="password"]'];
    let passwordField = null;
    
    for (const selector of passwordSelectors) {
      passwordField = await page.$(selector);
      if (passwordField) break;
    }
    
    if (passwordField) {
      await passwordField.click({ clickCount: 3 });
      await passwordField.type(user_password, { delay: 100 });
    } else {
      throw new Error("Password field not found with any selector");
    }

    // Enhanced login button click with multiple selector options
    console.log("Clicking login button...");
    const loginButtonSelectors = [
      'button[data-cy="button"][data-fp="primaryButton"]',
      'button[type="submit"]',
      'input[type="submit"]',
      '.login-button',
      'button',
    ];

    let loginClicked = false;
    
    for (const selector of loginButtonSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          // Check if button is visible and clickable
          const isVisible = await button.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
          });
          
          if (isVisible) {
            await button.click();
            loginClicked = true;
            console.log(`Clicked login button with selector: ${selector}`);
            break;
          }
        }
      } catch (e) {
        console.log(`Failed to click with selector ${selector}: ${e.message}`);
      }
    }

    // Fallback to Enter key
    if (!loginClicked) {
      console.log("No button found, pressing Enter...");
      await page.keyboard.press('Enter');
    }

    // Enhanced navigation wait with multiple strategies
    console.log("Waiting for post-login navigation...");
    
    try {
      // Strategy 1: Wait for URL change
      await page.waitForFunction(
        (originalUrl) => window.location.href !== originalUrl,
        { timeout: 15000 },
        url
      );
      console.log("URL changed detected");
    } catch (e) {
      console.log("No URL change detected");
    }

    try {
      // Strategy 2: Wait for network idle
      await page.waitForNavigation({ 
        waitUntil: ['networkidle0', 'domcontentloaded'], 
        timeout: 15000 
      });
    } catch (e) {
      console.log("No navigation event detected");
    }

    // Strategy 3: Wait for specific elements that indicate successful login
    try {
      await page.waitForFunction(() => {
        const elements = document.querySelectorAll('.dashboard, [data-cy*="dashboard"], .my-commissions, [href*="commission"]');
        return elements.length > 0;
      }, { timeout: 15000 });
      console.log("Dashboard elements found");
    } catch (e) {
      console.log("No specific dashboard elements found, continuing anyway");
    }

    // Final wait to ensure page is stable
    await waitForTimeout(5000);
    console.log("Login process completed");

    // STRATEGY 1: Direct download button click with enhanced selectors
    console.log("STRATEGY 1: Looking for download buttons...");
    
    const downloadButtonSelectors = [
      'button[data-cy="commissions-download"][data-fp="plainButton"]',
      'button:contains("Download")',
      'a:contains("Export")',
      'button[title*="download" i]',
      'button[title*="export" i]',
      '[data-cy*="download"]',
      '[data-testid*="download"]'
    ];

    let downloadClicked = false;
    
    for (const selector of downloadButtonSelectors) {
      try {
        // Use evaluate to find elements by text content for contains selectors
        let downloadButton;
        if (selector.includes('contains("')) {
          downloadButton = await page.evaluateHandle((sel) => {
            const elements = document.querySelectorAll('button, a');
            for (let el of elements) {
              if (el.textContent.includes(sel.split('contains("')[1].split('")')[0])) {
                return el;
              }
            }
            return null;
          }, selector);
        } else {
          downloadButton = await page.$(selector);
        }
        
        if (downloadButton && (await downloadButton.asElement())) {
          console.log(`Found download button with selector: ${selector}`);
          
          const filesBeforeDownload = fs.readdirSync(downloadPath);
          await downloadButton.click();
          console.log("Download button clicked");
          
          downloadClicked = true;
          
          // Wait for download with improved logic
          const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 60000);
          
          if (downloadedFile) {
            const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
            await browser.close();
            return result;
          }
          break;
        }
      } catch (buttonError) {
        console.log(`Failed with selector ${selector}: ${buttonError.message}`);
      }
    }

    // STRATEGY 2: Navigate directly to commissions page
    if (!downloadClicked) {
      console.log("STRATEGY 2: Navigating directly to commissions page...");
      try {
        const commissionsUrl = `${data.url.replace(/\/login(\/|$)/g, '/').replace(/\/$/, '')}/my-commissions`;
        console.log(`Navigating to: ${commissionsUrl}`);
        
        await page.goto(commissionsUrl, { 
          waitUntil: ["domcontentloaded", "networkidle0"],
          timeout: 30000 
        });
        
        await waitForTimeout(5000);
        
        // Retry download buttons on commissions page
        for (const selector of downloadButtonSelectors) {
          try {
            let downloadButton;
            if (selector.includes('contains("')) {
              downloadButton = await page.evaluateHandle((sel) => {
                const elements = document.querySelectorAll('button, a');
                for (let el of elements) {
                  if (el.textContent.includes(sel.split('contains("')[1].split('")')[0])) {
                    return el;
                  }
                }
                return null;
              }, selector);
            } else {
              downloadButton = await page.$(selector);
            }
            
            if (downloadButton && (await downloadButton.asElement())) {
              console.log(`Found download button on commissions page: ${selector}`);
              
              const filesBeforeDownload = fs.readdirSync(downloadPath);
              await downloadButton.click();
              console.log("Download button clicked on commissions page");
              
              const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 60000);
              
              if (downloadedFile) {
                const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
                await browser.close();
                return result;
              }
              break;
            }
          } catch (buttonError) {
            console.log(`Failed with selector ${selector}: ${buttonError.message}`);
          }
        }
      } catch (commissionsError) {
        console.log("Commissions page navigation failed:", commissionsError.message);
      }
    }

    // STRATEGY 3: Try JavaScript-based download
    if (!downloadClicked) {
      console.log("STRATEGY 3: Attempting JavaScript download trigger...");
      try {
        const filesBeforeDownload = fs.readdirSync(downloadPath);
        
        // Try to trigger download via JavaScript
        await page.evaluate(() => {
          // Look for any element that might trigger download
          const downloadElements = document.querySelectorAll('[onclick*="download"], [onclick*="export"], [href*=".csv"], [href*=".xlsx"]');
          for (let el of downloadElements) {
            el.click();
            return true;
          }
          return false;
        });
        
        await waitForTimeout(5000);
        
        const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 30000);
        if (downloadedFile) {
          const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
          await browser.close();
          return result;
        }
      } catch (jsError) {
        console.log("JavaScript download trigger failed:", jsError.message);
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
async function waitForDownload(downloadPath, filesBeforeDownload, maxWaitTime = 60000) {
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

    // Check for partial downloads
    const partialFiles = currentFiles.filter(file =>
      !filesBeforeDownload.includes(file) &&
      file.endsWith('.crdownload')
    );

    if (partialFiles.length === 0 && currentFiles.length > filesBeforeDownload.length) {
      // No partial downloads but new files exist
      const newFiles = currentFiles.filter(file => !filesBeforeDownload.includes(file));
      if (newFiles.length > 0) {
        console.log(`Found new file (no partial downloads): ${newFiles[0]}`);
        return newFiles[0];
      }
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

// Export the processDownloadedFile function
exports.processDownloadedFile = processDownloadedFile;