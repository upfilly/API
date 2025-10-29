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

    // INTERCEPT NETWORK REQUESTS to detect login success
    let loginSuccess = false;
    await page.setRequestInterception(true);

    page.on('request', (request) => {
      request.continue();
    });

    page.on('response', (response) => {
      const url = response.url();
      const status = response.status();

      // Check for successful authentication responses
      if (url.includes('/api/') && status === 200) {
        console.log(`API Response: ${url} - Status: ${status}`);
      }

      if (url.includes('my-commissions') && status === 200) {
        console.log('Commissions page loaded successfully');
        loginSuccess = true;
      }
    });

    // Navigate to login page
    console.log(`Navigating to URL: ${url}`);
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    // Wait for page load
    await waitForTimeout(3000);

    // DEBUG: Check initial page state
    const initialUrl = page.url();
    console.log(`Initial URL: ${initialUrl}`);

    // If we're already logged in (redirected directly to commissions), proceed
    if (initialUrl.includes('my-commissions')) {
      console.log("Already logged in, proceeding to commissions page");
      loginSuccess = true;
    } else {
      // LOGIN PROCESS
      console.log("Attempting login...");

      // Wait for login form with multiple selector options
      try {
        await page.waitForSelector('#email, input[type="email"], [name="email"], input[placeholder*="email" i]', {
          timeout: 10000
        });
      } catch (e) {
        console.log("Email field not found, checking if already logged in...");
        // Take screenshot to debug
        await page.screenshot({ path: '/tmp/login-form-not-found.png', fullPage: true });
      }

      // FILL EMAIL with multiple approaches
      let emailFilled = false;
      const emailSelectors = [
        '#email',
        'input[type="email"]',
        '[name="email"]',
        'input[placeholder*="email" i]',
        'input[autocomplete="email"]'
      ];

      for (const selector of emailSelectors) {
        try {
          const emailField = await page.$(selector);
          if (emailField) {
            await emailField.click({ clickCount: 3 });
            await emailField.type(user_email, { delay: 50 });
            console.log(`Email filled using selector: ${selector}`);
            emailFilled = true;
            break;
          }
        } catch (e) {
          console.log(`Failed with email selector ${selector}: ${e.message}`);
        }
      }

      if (!emailFilled) {
        throw new Error("Could not find email field with any selector");
      }

      await waitForTimeout(1000);

      // FILL PASSWORD with multiple approaches
      let passwordFilled = false;
      const passwordSelectors = [
        '#password',
        'input[type="password"]',
        '[name="password"]',
        'input[placeholder*="password" i]',
        'input[autocomplete="current-password"]'
      ];

      for (const selector of passwordSelectors) {
        try {
          const passwordField = await page.$(selector);
          if (passwordField) {
            await passwordField.click({ clickCount: 3 });
            await passwordField.type(user_password, { delay: 50 });
            console.log(`Password filled using selector: ${selector}`);
            passwordFilled = true;
            break;
          }
        } catch (e) {
          console.log(`Failed with password selector ${selector}: ${e.message}`);
        }
      }

      if (!passwordFilled) {
        throw new Error("Could not find password field with any selector");
      }

      await waitForTimeout(1000);

      // CLICK LOGIN BUTTON with multiple approaches
      console.log("Looking for login button...");

      const loginButtonSelectors = [
        'button[data-cy="button"][data-fp="primaryButton"]',
        'button[type="submit"]',
        'input[type="submit"]',
        'button:contains("Sign In")',
        'button:contains("Login")',
        'button:contains("Log In")',
        '[data-cy*="login"]',
        '[data-fp*="login"]',
        'form button',
        '.login-button',
        '.submit-button'
      ];

      let loginClicked = false;

      for (const selector of loginButtonSelectors) {
        try {
          let button = null;

          // Handle text-based selectors
          if (selector.includes(':contains(')) {
            const text = selector.match(/:contains\("([^"]+)"\)/)[1];
            button = await page.evaluateHandle((searchText) => {
              const elements = document.querySelectorAll('button, input[type="submit"], [role="button"]');
              for (let el of elements) {
                if (el.textContent && el.textContent.toLowerCase().includes(searchText.toLowerCase())) {
                  return el;
                }
              }
              return null;
            }, text);
          } else {
            button = await page.$(selector);
          }

          if (button && (await button.asElement())) {
            const isVisible = await button.evaluate(el => {
              const rect = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);
              return rect.width > 0 && rect.height > 0 &&
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                style.opacity !== '0' &&
                !el.disabled;
            });

            if (isVisible) {
              console.log(`Found login button: ${selector}`);

              // Take screenshot before login
              await page.screenshot({ path: '/tmp/before-login.png', fullPage: true });

              await button.click();
              loginClicked = true;
              console.log("Login button clicked");
              break;
            }
          }
        } catch (e) {
          console.log(`Login button selector ${selector} failed: ${e.message}`);
        }
      }

      // Fallback: Press Enter
      if (!loginClicked) {
        console.log("No login button found, pressing Enter...");
        await page.keyboard.press('Enter');
      }

      // WAIT FOR LOGIN SUCCESS with multiple strategies
      console.log("Waiting for login to complete...");

      await waitForTimeout(5000);

      // Strategy 1: Check URL change
      const postLoginUrl = page.url();
      console.log(`Post-login URL: ${postLoginUrl}`);

      if (!postLoginUrl.includes('login') && postLoginUrl !== initialUrl) {
        loginSuccess = true;
        console.log("Login successful - URL changed");
      }

      // Strategy 2: Check for dashboard elements
      if (!loginSuccess) {
        try {
          await page.waitForSelector('.dashboard, [data-cy*="dashboard"], .my-commissions, [href*="commission"], .affiliate-dashboard', {
            timeout: 10000
          });
          loginSuccess = true;
          console.log("Login successful - Dashboard elements found");
        } catch (e) {
          console.log("No dashboard elements found");
        }
      }

      // Strategy 3: Check for error messages
      if (!loginSuccess) {
        const errorText = await page.evaluate(() => {
          const errorSelectors = [
            '.error',
            '.alert-danger',
            '.text-red',
            '[data-cy*="error"]',
            '[class*="error"]',
            '[class*="alert"]'
          ];

          for (const selector of errorSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent && element.textContent.trim()) {
              return element.textContent.trim();
            }
          }
          return null;
        });

        if (errorText) {
          throw new Error(`Login failed: ${errorText}`);
        }
      }

      // Strategy 4: Check page content for success indicators
      if (!loginSuccess) {
        const pageText = await page.evaluate(() => document.body.textContent);
        if (pageText.includes('Welcome') || pageText.includes('Dashboard') || pageText.includes('Commissions')) {
          loginSuccess = true;
          console.log("Login successful - Welcome text found");
        }
      }

      if (!loginSuccess) {
        // Take screenshot to debug login failure
        await page.screenshot({ path: '/tmp/login-failed.png', fullPage: true });
        throw new Error("Login failed - no success indicators found");
      }
    }

    console.log("Login successful, proceeding to download...");

    // If we're not already on commissions page, navigate there
    const currentUrl = page.url();
    if (!currentUrl.includes('my-commissions')) {
      console.log("Navigating to commissions page...");
      const baseUrl = data.url.split('/login')[0];
      const commissionsUrl = `${baseUrl}/my-commissions`;

      await page.goto(commissionsUrl, {
        waitUntil: "networkidle2",
        timeout: 30000
      });
      await waitForTimeout(5000);
    }

    // Take screenshot of commissions page
    await page.screenshot({ path: '/tmp/commissions-page.png', fullPage: true });
    console.log("Commissions page screenshot saved");

    // DEBUG: Log page content to identify download elements
    const pageInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return {
        title: document.title,
        url: window.location.href,
        buttons: buttons.map(btn => ({
          text: btn.textContent?.trim(),
          classes: btn.className,
          id: btn.id,
          'data-cy': btn.getAttribute('data-cy'),
          'data-fp': btn.getAttribute('data-fp'),
          tagName: btn.tagName
        })).filter(btn => btn.text)
      };
    });

    console.log("Page Info:", JSON.stringify(pageInfo, null, 2));

    // DOWNLOAD STRATEGIES
    console.log("Looking for download options...");

    // Strategy 1: FirstPromoter specific download button
    const downloadSelectors = [
      // FirstPromoter specific
      'button[data-cy="commissions-download"]',
      'button[data-fp="download-button"]',
      '[data-cy*="download"]',
      '[data-fp*="download"]',
      '[data-cy*="export"]',
      '[data-fp*="export"]',

      // General download buttons
      'button:contains("Download CSV")',
      'button:contains("Export CSV")',
      'button:contains("Download")',
      'button:contains("Export")',
      'a:contains("Download CSV")',
      'a:contains("Export CSV")',

      // Table specific
      '.table-export',
      '.data-export',
      '.csv-export'
    ];

    let downloadSuccess = false;

    for (const selector of downloadSelectors) {
      try {
        console.log(`Trying download selector: ${selector}`);

        let element = null;

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
              style.opacity !== '0' &&
              !el.disabled;
          });

          if (isVisible) {
            console.log(`Found download button: ${selector}`);

            const filesBeforeDownload = fs.readdirSync(downloadPath);
            console.log(`Files before click: ${filesBeforeDownload.length}`);

            await element.click();
            console.log("Download button clicked");

            // Wait for download
            await waitForTimeout(5000);

            const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 30000);

            if (downloadedFile) {
              console.log(`Download successful: ${downloadedFile}`);
              const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
              await browser.close();
              return result;
            } else {
              console.log(`No file downloaded with selector: ${selector}`);
            }
          }
        }
      } catch (error) {
        console.log(`Download selector ${selector} failed: ${error.message}`);
      }
    }

    // Strategy 2: Try all buttons that might be download related
    if (!downloadSuccess) {
      console.log("Trying all potential download buttons...");
      const allButtons = await page.$$('button, a[href*=".csv"], a[href*="export"]');

      for (let i = 0; i < allButtons.length; i++) {
        try {
          const button = allButtons[i];
          const buttonText = await button.evaluate(el => el.textContent?.toLowerCase() || '');

          if (buttonText.includes('download') || buttonText.includes('export') || buttonText.includes('csv')) {
            console.log(`Trying button: ${buttonText}`);

            const filesBeforeDownload = fs.readdirSync(downloadPath);
            await button.click();
            await waitForTimeout(3000);

            const downloadedFile = await waitForDownload(downloadPath, filesBeforeDownload, 10000);
            if (downloadedFile) {
              console.log(`Download successful via button text: ${downloadedFile}`);
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
      return completedFiles[0];
    }
  }

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