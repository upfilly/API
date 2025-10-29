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

    console.log(`Starting process for email: ${user_email}`);

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

    // Enhanced browser launch for server environment
    console.log("Launching browser with server-optimized settings...");
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
        "--disable-features=AudioServiceOutOfProcess",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-field-trial-config", // Disable features that might cause issues
        "--disable-ipc-flooding-protection"
      ],
      headless: true,
      ignoreHTTPSErrors: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });

    const page = await browser.newPage();

    // Set larger viewport for server
    await page.setViewport({ width: 1920, height: 1080 });

    // Set up download behavior with explicit permissions
    console.log("Setting up download behavior...");
    const client = await page.target().createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadPath,
    });

    // Set much longer timeouts for server
    page.setDefaultTimeout(180000);
    page.setDefaultNavigationTimeout(180000);

    // Disable images and styles for faster loading on server
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Navigate to login page
    console.log(`Navigating to URL: ${url}`);
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded", // More reliable than networkidle on servers
        timeout: 60000
      });
    } catch (error) {
      console.log("Initial navigation failed, trying load...");
      await page.goto(url, {
        waitUntil: "load",
        timeout: 60000
      });
    }

    await waitForTimeout(5000);

    // LOGIN PROCESS with server-optimized waits
    console.log("Starting login process...");

    // Wait for email field with multiple fallbacks
    let emailField = null;
    const emailSelectors = ['#email', 'input[type="email"]', '[name="email"]', 'input[placeholder*="email" i]'];
    
    for (const selector of emailSelectors) {
      emailField = await page.$(selector);
      if (emailField) {
        console.log(`Found email field with selector: ${selector}`);
        break;
      }
    }

    if (!emailField) {
      throw new Error("Email field not found with any selector");
    }

    await emailField.click({ clickCount: 3 });
    await emailField.type(user_email, { delay: 50 });

    // Wait for password field
    let passwordField = null;
    const passwordSelectors = ['#password', 'input[type="password"]', '[name="password"]', 'input[placeholder*="password" i]'];
    
    for (const selector of passwordSelectors) {
      passwordField = await page.$(selector);
      if (passwordField) {
        console.log(`Found password field with selector: ${selector}`);
        break;
      }
    }

    if (!passwordField) {
      throw new Error("Password field not found with any selector");
    }

    await passwordField.click({ clickCount: 3 });
    await passwordField.type(user_password, { delay: 50 });

    // Click login button
    console.log("Clicking login button...");
    const loginButton = await page.$('button[data-cy="button"][data-fp="primaryButton"]');
    if (loginButton) {
      await loginButton.click();
    } else {
      // Fallback: try to find any submit button
      const submitButton = await page.$('button[type="submit"], input[type="submit"]');
      if (submitButton) {
        await submitButton.click();
      } else {
        await page.keyboard.press('Enter');
      }
    }

    // Wait for login with multiple success checks
    console.log("Waiting for login to complete...");
    await waitForTimeout(10000);

    // Check login success
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    let loginSuccess = false;
    
    // Check if we're on commissions page
    if (currentUrl.includes('my-commissions')) {
      loginSuccess = true;
      console.log("Login successful - on commissions page");
    } else {
      // Check for dashboard elements
      const dashboardElement = await page.$('.dashboard, [data-cy*="dashboard"], .affiliate-dashboard');
      if (dashboardElement) {
        loginSuccess = true;
        console.log("Login successful - dashboard found");
      }
    }

    if (!loginSuccess) {
      // Navigate directly to commissions
      console.log("Navigating directly to commissions page...");
      const baseUrl = data.url.split('/login')[0];
      const commissionsUrl = `${baseUrl}/my-commissions`;
      await page.goto(commissionsUrl, { 
        waitUntil: "domcontentloaded",
        timeout: 30000 
      });
      await waitForTimeout(5000);
    }

    console.log("On commissions page, starting download process...");

    // RE-ENABLE requests for the download
    await page.setRequestInterception(false);

    // STRATEGY 1: Direct download button click with comprehensive selectors
    console.log("STRATEGY 1: Comprehensive download button search...");
    
    const downloadSelectors = [
      // FirstPromoter specific
      'button[data-cy="commissions-download"]',
      '[data-cy="commissions-download"]',
      'button[data-fp*="download"]',
      '[data-fp*="download"]',
      'button[data-testid*="download"]',
      '[data-testid*="download"]',
      
      // General download buttons
      'button:contains("Download CSV")',
      'button:contains("Export CSV")', 
      'button:contains("Download")',
      'button:contains("Export")',
      'a:contains("Download CSV")',
      'a:contains("Export CSV")',
      'a:contains("Download")',
      'a:contains("Export")',
      
      // CSS class based
      '.download-btn',
      '.export-btn',
      '.btn-download',
      '.btn-export',
      '[class*="download"]',
      '[class*="export"]'
    ];

    for (const selector of downloadSelectors) {
      try {
        console.log(`Trying selector: ${selector}`);
        
        let element = null;
        
        if (selector.includes(':contains(')) {
          const text = selector.match(/:contains\("([^"]+)"\)/)[1];
          element = await page.evaluateHandle((searchText) => {
            const elements = document.querySelectorAll('button, a, [role="button"]');
            for (let el of elements) {
              if (el.textContent && el.textContent.toLowerCase().includes(searchText.toLowerCase())) {
                return el;
              }
            }
            return null;
          }, text);
        } else {
          element = await page.$(selector);
        }
        
        if (element && (await element.asElement())) {
          const isVisible = await element.evaluate(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
          
          if (isVisible) {
            console.log(`Found visible download button: ${selector}`);
            
            const filesBefore = fs.readdirSync(downloadPath).length;
            console.log(`Files before click: ${filesBefore}`);
            
            await element.click();
            console.log("Clicked download button");
            
            // Wait longer on server
            await waitForTimeout(8000);
            
            const downloadedFile = await waitForDownload(downloadPath, 45000);
            if (downloadedFile) {
              console.log(`Download successful: ${downloadedFile}`);
              const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
              await browser.close();
              return result;
            } else {
              console.log(`No download triggered with: ${selector}`);
            }
          }
        }
      } catch (error) {
        console.log(`Selector ${selector} failed: ${error.message}`);
      }
    }

    // STRATEGY 2: Screenshot and analyze the page for debugging
    console.log("STRATEGY 2: Taking screenshot and analyzing page...");
    
    // Take screenshot for debugging
    await page.screenshot({ path: '/tmp/commissions-page.png', fullPage: true });
    console.log("Screenshot saved to /tmp/commissions-page.png");

    // Get all interactive elements for analysis
    const allElements = await page.evaluate(() => {
      const elements = [];
      const interactive = document.querySelectorAll('button, a, [role="button"], [onclick]');
      
      interactive.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          elements.push({
            tag: el.tagName,
            text: el.textContent?.trim().substring(0, 50),
            classes: el.className,
            id: el.id,
            'data-cy': el.getAttribute('data-cy'),
            'data-fp': el.getAttribute('data-fp'),
            'data-testid': el.getAttribute('data-testid'),
            onclick: el.getAttribute('onclick')?.substring(0, 100)
          });
        }
      });
      
      return elements;
    });

    console.log("Interactive elements found:", JSON.stringify(allElements, null, 2));

    // STRATEGY 3: Try clicking all buttons that might be related to download
    console.log("STRATEGY 3: Trying all potential download buttons...");
    
    const potentialButtons = await page.$$('button, a[href*=".csv"], a[href*="export"], a[href*="download"]');
    console.log(`Found ${potentialButtons.length} potential buttons/links`);
    
    for (let i = 0; i < potentialButtons.length; i++) {
      try {
        const button = potentialButtons[i];
        const buttonText = await button.evaluate(el => el.textContent?.toLowerCase() || '');
        
        if (buttonText.includes('download') || buttonText.includes('export') || buttonText.includes('csv')) {
          console.log(`Trying button ${i + 1}: ${buttonText}`);
          
          const filesBefore = fs.readdirSync(downloadPath).length;
          await button.click();
          await waitForTimeout(5000);
          
          const downloadedFile = await waitForDownload(downloadPath, 15000);
          if (downloadedFile) {
            console.log(`Download successful via button ${i + 1}: ${downloadedFile}`);
            const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
            await browser.close();
            return result;
          }
        }
      } catch (error) {
        console.log(`Button ${i + 1} failed: ${error.message}`);
      }
    }

    // STRATEGY 4: Use keyboard shortcuts or alternative navigation
    console.log("STRATEGY 4: Trying keyboard navigation...");
    
    // Sometimes export is in settings or tools menu
    const menuSelectors = [
      '[aria-label*="menu" i]',
      '.menu-toggle',
      '.settings',
      '.tools',
      '.options'
    ];
    
    for (const selector of menuSelectors) {
      try {
        const menu = await page.$(selector);
        if (menu) {
          console.log(`Found menu: ${selector}`);
          await menu.click();
          await waitForTimeout(2000);
          
          // Look for download in menu
          const menuItems = await page.$$('.menu-item, .dropdown-item, [role="menuitem"]');
          for (const item of menuItems) {
            const text = await item.evaluate(el => el.textContent?.toLowerCase() || '');
            if (text.includes('download') || text.includes('export') || text.includes('csv')) {
              console.log(`Found menu item: ${text}`);
              const filesBefore = fs.readdirSync(downloadPath).length;
              await item.click();
              
              const downloadedFile = await waitForDownload(downloadPath, 20000);
              if (downloadedFile) {
                console.log(`Download successful via menu: ${downloadedFile}`);
                const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
                await browser.close();
                return result;
              }
            }
          }
        }
      } catch (error) {
        console.log(`Menu selector ${selector} failed: ${error.message}`);
      }
    }

    // STRATEGY 5: Check if download happens via API call that we can trigger
    console.log("STRATEGY 5: Monitoring network requests...");
    
    // Set up request interception to detect download URLs
    const downloadUrls = [];
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('download') || url.includes('export') || url.includes('.csv')) {
        console.log(`Detected download-related request: ${url}`);
        downloadUrls.push(url);
      }
      request.continue();
    });

    // Try triggering download by visiting potential URLs
    if (downloadUrls.length > 0) {
      console.log(`Found ${downloadUrls.length} download-related URLs`);
      for (const downloadUrl of downloadUrls) {
        try {
          console.log(`Trying direct download URL: ${downloadUrl}`);
          const filesBefore = fs.readdirSync(downloadPath).length;
          await page.goto(downloadUrl, { waitUntil: 'domcontentloaded' });
          await waitForTimeout(5000);
          
          const downloadedFile = await waitForDownload(downloadPath, 15000);
          if (downloadedFile) {
            console.log(`Download successful via direct URL: ${downloadedFile}`);
            const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
            await browser.close();
            return result;
          }
        } catch (error) {
          console.log(`Direct URL failed: ${error.message}`);
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
    
    // Provide detailed error information
    throw new Error(`No file downloaded. Check /tmp/commissions-page.png for what the page looks like. Found ${allElements.length} interactive elements.`);

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
 * Wait for download to complete (simplified for server)
 */
async function waitForDownload(downloadPath, maxWaitTime = 30000) {
  const startTime = Date.now();
  const initialFiles = fs.readdirSync(downloadPath);
  
  while (Date.now() - startTime < maxWaitTime) {
    await waitForTimeout(2000);

    const currentFiles = fs.readdirSync(downloadPath);
    const newFiles = currentFiles.filter(file => 
      !initialFiles.includes(file) && 
      (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls')) &&
      !file.endsWith('.crdownload')
    );

    if (newFiles.length > 0) {
      return newFiles[0];
    }
  }

  return null;
}

/**
 * Process downloaded file
 */
async function processDownloadedFile(downloadedFile, downloadPath, newFileName) {
  const downloadedFilePath = path.join(downloadPath, downloadedFile);
  const finalFilePath = path.join(downloadPath, newFileName);

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
    throw renameError;
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