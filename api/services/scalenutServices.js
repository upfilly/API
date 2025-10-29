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

    // Navigate directly to login page
    console.log(`Navigating to URL: ${url}`);
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    await waitForTimeout(3000);

    // LOGIN PROCESS
    console.log("Starting login process...");

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

    // Check if login was successful by looking for commissions page elements
    const currentUrl = page.url();
    console.log(`Current URL after login: ${currentUrl}`);

    // If we're not on commissions page, navigate there
    if (!currentUrl.includes('my-commissions')) {
      console.log("Not on commissions page, navigating directly...");
      const baseUrl = data.url.split('/login')[0];
      const commissionsUrl = `${baseUrl}/my-commissions`;
      await page.goto(commissionsUrl, { 
        waitUntil: "networkidle2",
        timeout: 30000 
      });
      await waitForTimeout(5000);
    }

    console.log("On commissions page, looking for download options...");

    // DEBUG: Get all buttons and links on the page to see what's available
    const pageElements = await page.evaluate(() => {
      const elements = [];
      
      // Get all buttons
      const buttons = document.querySelectorAll('button');
      buttons.forEach(btn => {
        elements.push({
          type: 'button',
          text: btn.textContent?.trim(),
          classes: btn.className,
          id: btn.id,
          'data-cy': btn.getAttribute('data-cy'),
          'data-fp': btn.getAttribute('data-fp'),
          'data-testid': btn.getAttribute('data-testid')
        });
      });
      
      // Get all links
      const links = document.querySelectorAll('a');
      links.forEach(link => {
        elements.push({
          type: 'link',
          text: link.textContent?.trim(),
          href: link.getAttribute('href'),
          classes: link.className,
          id: link.id,
          'data-cy': link.getAttribute('data-cy'),
          'data-fp': link.getAttribute('data-fp')
        });
      });
      
      return elements.filter(el => el.text && el.text.length > 0);
    });

    console.log("Page elements found:", JSON.stringify(pageElements, null, 2));

    // STRATEGY 1: FirstPromoter specific download button
    console.log("STRATEGY 1: Looking for FirstPromoter download button...");
    
    const firstPromoterDownloadSelectors = [
      'button[data-cy="commissions-download"]',
      '[data-cy="commissions-download"]',
      'button[data-fp*="download"]',
      '[data-fp*="download"]',
      'button[data-testid*="download"]',
      '[data-testid*="download"]'
    ];

    for (const selector of firstPromoterDownloadSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`Found FirstPromoter download button: ${selector}`);
          const filesBeforeDownload = fs.readdirSync(downloadPath);
          await element.click();
          console.log("Clicked download button");
          
          const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 30000);
          if (downloadedFile) {
            console.log(`Download successful: ${downloadedFile}`);
            const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
            await browser.close();
            return result;
          }
        }
      } catch (error) {
        console.log(`Selector ${selector} failed: ${error.message}`);
      }
    }

    // STRATEGY 2: Look for any button with download/export text
    console.log("STRATEGY 2: Looking for buttons with download/export text...");
    
    const downloadTexts = ['download', 'export', 'csv', 'excel', 'spreadsheet'];
    
    for (const text of downloadTexts) {
      try {
        const button = await page.evaluateHandle((searchText) => {
          const elements = document.querySelectorAll('button, a, [role="button"]');
          for (let el of elements) {
            if (el.textContent && el.textContent.toLowerCase().includes(searchText.toLowerCase())) {
              return el;
            }
          }
          return null;
        }, text);
        
        if (button && (await button.asElement())) {
          console.log(`Found button with text: ${text}`);
          const filesBeforeDownload = fs.readdirSync(downloadPath);
          await button.click();
          console.log(`Clicked button with text: ${text}`);
          
          const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 30000);
          if (downloadedFile) {
            console.log(`Download successful: ${downloadedFile}`);
            const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
            await browser.close();
            return result;
          }
        }
      } catch (error) {
        console.log(`Text search for "${text}" failed: ${error.message}`);
      }
    }

    // STRATEGY 3: Look for export in table controls or toolbar
    console.log("STRATEGY 3: Looking for table export controls...");
    
    const tableExportSelectors = [
      '.table-actions button',
      '.toolbar button',
      '.actions button',
      '.btn-group button',
      '.dropdown button',
      '.export-dropdown',
      '.download-dropdown'
    ];

    for (const selector of tableExportSelectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          const text = await element.evaluate(el => el.textContent?.toLowerCase() || '');
          if (text.includes('download') || text.includes('export') || text.includes('csv')) {
            console.log(`Found table export button: ${text}`);
            const filesBeforeDownload = fs.readdirSync(downloadPath);
            await element.click();
            
            const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 30000);
            if (downloadedFile) {
              console.log(`Download successful: ${downloadedFile}`);
              const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
              await browser.close();
              return result;
            }
          }
        }
      } catch (error) {
        console.log(`Table export selector ${selector} failed: ${error.message}`);
      }
    }

    // STRATEGY 4: Check if there's a hidden dropdown or menu that needs to be opened first
    console.log("STRATEGY 4: Looking for dropdown menus...");
    
    const dropdownSelectors = [
      '.dropdown-toggle',
      '.menu-toggle',
      '[data-toggle="dropdown"]',
      '.actions',
      '.options',
      '.more-actions'
    ];

    for (const selector of dropdownSelectors) {
      try {
        const dropdown = await page.$(selector);
        if (dropdown) {
          console.log(`Found dropdown: ${selector}`);
          await dropdown.click();
          await waitForTimeout(2000);
          
          // Now look for download options in the opened dropdown
          const downloadOptions = await page.$$('.dropdown-menu button, .dropdown-menu a');
          for (const option of downloadOptions) {
            const text = await option.evaluate(el => el.textContent?.toLowerCase() || '');
            if (text.includes('download') || text.includes('export') || text.includes('csv')) {
              console.log(`Found download option in dropdown: ${text}`);
              const filesBeforeDownload = fs.readdirSync(downloadPath);
              await option.click();
              
              const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 30000);
              if (downloadedFile) {
                console.log(`Download successful: ${downloadedFile}`);
                const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
                await browser.close();
                return result;
              }
            }
          }
        }
      } catch (error) {
        console.log(`Dropdown selector ${selector} failed: ${error.message}`);
      }
    }

    // STRATEGY 5: Try to find and click any export link that might trigger download
    console.log("STRATEGY 5: Looking for export links...");
    
    const exportLinks = await page.$$('a[href*="export"], a[href*="download"], a[href*="csv"]');
    for (const link of exportLinks) {
      try {
        console.log("Found potential export link");
        const filesBeforeDownload = fs.readdirSync(downloadPath);
        await link.click();
        await waitForTimeout(3000);
        
        const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 15000);
        if (downloadedFile) {
          console.log(`Download successful via link: ${downloadedFile}`);
          const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
          await browser.close();
          return result;
        }
      } catch (error) {
        console.log("Export link click failed:", error.message);
      }
    }

    // STRATEGY 6: Use JavaScript to trigger any download functionality
    console.log("STRATEGY 6: Trying JavaScript execution...");
    
    const downloadResult = await page.evaluate(() => {
      // Look for any element that might have download functionality
      const elements = document.querySelectorAll('[onclick*="download"], [onclick*="export"], [onclick*="csv"]');
      for (let el of elements) {
        try {
          el.click();
          return { success: true, element: el.tagName };
        } catch (e) {
          continue;
        }
      }
      
      // Try to find and click any button that looks like download
      const buttons = document.querySelectorAll('button');
      for (let btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('download') || text.includes('export') || text.includes('csv')) {
          try {
            btn.click();
            return { success: true, element: 'button', text: text };
          } catch (e) {
            continue;
          }
        }
      }
      
      return { success: false };
    });

    if (downloadResult.success) {
      console.log("JavaScript trigger executed:", downloadResult);
      await waitForTimeout(5000);
      
      // Check if any file was downloaded
      const finalFiles = fs.readdirSync(downloadPath);
      const downloadedFiles = finalFiles.filter(file =>
        (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls')) &&
        !file.endsWith('.crdownload')
      );

      if (downloadedFiles.length > 0) {
        console.log(`Download successful via JS: ${downloadedFiles[0]}`);
        const result = await processDownloadedFile(downloadedFiles[0], downloadPath, newFileName);
        await browser.close();
        return result;
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

    // Check for partial downloads
    const partialFiles = currentFiles.filter(file =>
      !filesBeforeDownload.includes(file) &&
      file.endsWith('.crdownload')
    );

    console.log(`Waiting for download... Found ${partialFiles.length} partial files`);
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