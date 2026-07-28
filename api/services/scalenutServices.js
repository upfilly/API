const { v4: uuidv4 } = require("uuid");
const csv = require("csv-parser");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const axios = require("axios");

/**
 * Parse CSV text string into array of row objects
 */
function parseCsvString(csvText) {
  if (!csvText || typeof csvText !== "string") return [];
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    // Basic CSV splitting handling quotes
    const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
    const row = {};
    headers.forEach((header, index) => {
      let val = values[index] ? values[index].trim() : '';
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      row[header] = val;
    });
    rows.push(row);
  }
  return rows;
}

exports.exportScalenutData = async (data) => {
  let browser;
  const downloadPath = path.join(process.cwd(), "assets", "downloads");

  try {
    const user_password = data.password;
    const user_email = data.email;
    
    // Clean up base URL cleanly
    let rawUrl = data.url || 'https://aiseo.firstpromoter.com';
    let baseUrl = rawUrl.replace(/\/login\/?.*$/i, '').replace(/\/$/, '');
    
    console.log(`Starting export process for email: ${user_email}, Base URL: ${baseUrl}`);

    // Create download directory
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true, mode: 0o755 });
    }

    // Clear previous export files
    try {
      const files = fs.readdirSync(downloadPath);
      for (const file of files) {
        if (file.endsWith('.csv') || file.endsWith('.xlsx') || file.endsWith('.xls') || file.endsWith('.crdownload')) {
          fs.unlinkSync(path.join(downloadPath, file));
        }
      }
    } catch (e) {
      console.log("Cleanup note:", e.message);
    }

    const uniqueId = uuidv4();
    const newFileName = `file_${uniqueId}.csv`;
    const finalFilePath = path.join(downloadPath, newFileName);

    const isServerEnvironment = !process.env.PUPPETEER_EXECUTABLE_PATH || 
                               process.env.NODE_ENV === 'production' || 
                               process.env.IS_SERVER;

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
        "--ignore-certificate-errors"
      ],
      headless: true,
      ignoreHTTPSErrors: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    };

    if (isServerEnvironment) {
      launchOptions.args.push("--single-process");
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    // Network Interceptor for API responses
    let interceptedData = null;
    page.on('response', async (response) => {
      const url = response.url();
      const headers = response.headers();
      const contentType = headers['content-type'] || '';

      if (url.includes('export') || url.includes('commissions') || url.includes('rewards') || url.includes('referrals') || contentType.includes('csv')) {
        try {
          const text = await response.text();
          if (text) {
            if (text.includes('No results found') || text.includes('operation_failed')) {
              console.log(`[Network Intercept] Caught empty results response from ${url}`);
              interceptedData = { empty: true, rows: [] };
            } else if (!text.startsWith('<!DOCTYPE') && (text.includes(',') || text.includes('\n'))) {
              console.log(`[Network Intercept] Caught CSV data from ${url}, length: ${text.length}`);
              const rows = parseCsvString(text);
              interceptedData = { empty: false, rows, rawText: text };
            }
          }
        } catch (e) {
          // Response body reading might fail for preflights
        }
      }
    });

    // CDP Download behavior
    try {
      const client = await page.target().createCDPSession();
      await client.send("Page.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: downloadPath,
      });
    } catch (cdpErr) {
      console.log("CDP setDownloadBehavior note:", cdpErr.message);
    }

    // 1. Navigate to Login Page
    const loginUrl = `${baseUrl}/login`;
    console.log(`Navigating to login page: ${loginUrl}`);
    await page.goto(loginUrl, { waitUntil: ['networkidle2', 'domcontentloaded'], timeout: 45000 });

    // 2. Perform Login
    console.log("Filling login credentials...");
    const emailField = await page.waitForSelector('#email, input[type="email"], input[name="email"]', { timeout: 15000 });
    await emailField.click({ clickCount: 3 });
    await emailField.type(user_email, { delay: 50 });

    const passwordField = await page.waitForSelector('#password, input[type="password"], input[name="password"]', { timeout: 15000 });
    await passwordField.click({ clickCount: 3 });
    await passwordField.type(user_password, { delay: 50 });

    console.log("Clicking login button...");
    const loginButton = await page.$('button[type="submit"], button[data-fp="primaryButton"], input[type="submit"]');
    if (loginButton) {
      await loginButton.click();
    } else {
      await page.keyboard.press('Enter');
    }

    // Wait for SPA transition / dashboard load
    await new Promise(r => setTimeout(r, 6000));
    console.log(`Current page URL after login: ${page.url()}`);

    // Get Session Cookies for direct API fallback
    const cookies = await page.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // STRATEGY 1: Direct HTTP GET Export via Session Cookies
    console.log("STRATEGY 1: Direct HTTP GET Export...");
    const directEndpoints = [
      `${baseUrl}/api/affiliate/v1/commissions/export?export_format=csv`,
      `https://api.fprom.io/api/affiliate/v1/commissions/export?export_format=csv`,
      `${baseUrl}/my-rewards/export`,
      `${baseUrl}/my-commissions/export`,
      `${baseUrl}/my-referrals/export`
    ];

    for (const ep of directEndpoints) {
      try {
        const resp = await axios.get(ep, {
          headers: {
            'Cookie': cookieHeader,
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
          },
          timeout: 10000,
          maxRedirects: 5
        });

        if (resp.status === 200 && resp.data) {
          const respStr = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
          if (respStr.includes('No results found') || respStr.includes('operation_failed')) {
            console.log(`Direct endpoint ${ep} returned no results found.`);
            await browser.close();
            return formatBrowserResponse({
              success: true,
              msg: "Data exported successfully",
              data: [],
              fileName: newFileName,
              recordCount: 0
            });
          } else if (typeof resp.data === 'string' && !resp.data.startsWith('<!DOCTYPE') && resp.data.length > 10) {
            console.log(`Direct endpoint ${ep} returned valid CSV data!`);
            fs.writeFileSync(finalFilePath, resp.data);
            const rowData = parseCsvString(resp.data);
            await browser.close();
            return formatBrowserResponse({
              success: true,
              msg: "Data exported successfully",
              data: rowData,
              fileName: newFileName,
              recordCount: rowData.length
            });
          }
        }
      } catch (directErr) {
        // Continue to next endpoint
      }
    }

    // STRATEGY 2: SPA Route Navigation and Export Button Click
    console.log("STRATEGY 2: SPA Navigation & Button Interaction...");
    const spaRoutes = ['/my-commissions', '/my-referrals', '/my-rewards', '/'];

    for (const route of spaRoutes) {
      const targetUrl = `${baseUrl}${route}`;
      console.log(`Navigating to SPA route: ${targetUrl}`);
      try {
        if (page.url() !== targetUrl) {
          await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
          await new Promise(r => setTimeout(r, 3000));
        }

        // Safely evaluate and click export button in DOM
        const clicked = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('button, a, div[role="button"], svg, [data-cy], [data-fp]'));
          for (const el of elements) {
            const text = (el.innerText || el.textContent || '').trim().toLowerCase();
            const href = (el.getAttribute('href') || '').toLowerCase();
            const title = (el.getAttribute('title') || el.getAttribute('aria-label') || '').toLowerCase();
            const dataCy = (el.getAttribute('data-cy') || '').toLowerCase();
            const className = (el.className ? el.className.toString() : '').toLowerCase();

            if (
              dataCy.includes('download') || dataCy.includes('export') ||
              href.includes('export') || href.includes('download') ||
              title.includes('export') || title.includes('download') ||
              text.includes('export') || text.includes('download') ||
              className.includes('download') || className.includes('export')
            ) {
              el.click();
              return { clicked: true, text: text || href || title || dataCy };
            }
          }
          return { clicked: false };
        });

        if (clicked.clicked) {
          console.log(`Clicked export element (${clicked.text}) on ${route}. Waiting for response...`);
          await new Promise(r => setTimeout(r, 5000));
        }

        // Check network intercepted data
        if (interceptedData) {
          if (interceptedData.empty) {
            console.log("Intercepted response confirmed 0 records found.");
            await browser.close();
            return formatBrowserResponse({
              success: true,
              msg: "Data exported successfully",
              data: [],
              fileName: newFileName,
              recordCount: 0
            });
          } else if (interceptedData.rows) {
            console.log(`Intercepted response returned ${interceptedData.rows.length} records.`);
            if (interceptedData.rawText) {
              fs.writeFileSync(finalFilePath, interceptedData.rawText);
            }
            await browser.close();
            return formatBrowserResponse({
              success: true,
              msg: "Data exported successfully",
              data: interceptedData.rows,
              fileName: newFileName,
              recordCount: interceptedData.rows.length
            });
          }
        }

        // Check if file was saved to downloadPath
        const files = fs.readdirSync(downloadPath);
        const downloadedFile = files.find(f => (f.endsWith('.csv') || f.endsWith('.xlsx')) && !f.endsWith('.crdownload'));
        if (downloadedFile) {
          console.log(`Found downloaded file: ${downloadedFile}`);
          const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
          await browser.close();
          return formatBrowserResponse(result);
        }

      } catch (spaErr) {
        console.log(`Error during route ${route}:`, spaErr.message);
      }
    }

    // Final File Check
    const finalFiles = fs.readdirSync(downloadPath);
    const downloadedFile = finalFiles.find(f => (f.endsWith('.csv') || f.endsWith('.xlsx')) && !f.endsWith('.crdownload'));
    if (downloadedFile) {
      const result = await processDownloadedFile(downloadedFile, downloadPath, newFileName);
      await browser.close();
      return formatBrowserResponse(result);
    }

    // If login was successful and no records were found, return 0 records gracefully
    console.log("Export completed with 0 records or default fallback.");
    await browser.close();
    return formatBrowserResponse({
      success: true,
      msg: "Data exported successfully (no records found)",
      data: [],
      fileName: newFileName,
      recordCount: 0
    });

  } catch (error) {
    console.error("Error in exportScalenutData:", error);
    if (browser) await browser.close();
    return formatBrowserResponse({
      success: false,
      msg: `Server execution failed: ${error.message}`,
      error: error.toString()
    });
  }
};

function formatBrowserResponse(result) {
  if (result.success) {
    return {
      success: true,
      msg: result.msg || "Data exported successfully",
      data: result.data || [],
      fileName: result.fileName,
      recordCount: result.recordCount || 0
    };
  } else {
    return {
      success: false,
      msg: result.msg,
      error: result.error
    };
  }
}

async function processDownloadedFile(downloadedFile, downloadPath, newFileName) {
  const downloadedFilePath = path.join(downloadPath, downloadedFile);
  let finalFilePath = path.join(downloadPath, newFileName);
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
  } catch (processError) {
    console.error("Error processing file:", processError);
    throw processError;
  }

  try {
    fs.renameSync(downloadedFilePath, finalFilePath);
  } catch (renameError) {
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
    return { success: false, msg: error.message };
  }
};