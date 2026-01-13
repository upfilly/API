// api/services/MonthlyInvoiceService.js

const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");
const CommissionService = require("./CommissionService");
const credentials = require("../../config/local.js"); //sails.config.env.production;
const report = require("./reportService.js")

module.exports = {
  /**
   * Generate ONE SINGLE monthly invoice for ALL affiliates
   */
  generateSingleMonthlyInvoice: async function () {
    try {
      console.log("Generating SINGLE monthly invoice for ALL brands...");

      // Calculate previous month
      const now = new Date();
      // let previousMonth = now.getMonth(); // 0-based
      // let previousYear = now.getFullYear();
       let previousYear = now.getFullYear();
      let previousMonth = 1; // jan

      if (previousMonth === 0) {
        previousMonth = 12;
        previousYear = previousYear - 1;
      }

      console.log(`Processing: ${previousMonth}/${previousYear}`);

      // Get aggregated data for ALL brands
      const aggregatedData =
        await CommissionService.getAggregatedMonthlyCommissions(
          previousMonth,
          previousYear
        );

      if (aggregatedData.total_commissions === 0) {
        return {
          success: true,
          message: "No commissions to invoice for this period",
          month: previousMonth,
          year: previousYear,
        };
      }

      const invoiceNumber = `MONTHLY-INV-${previousYear}${previousMonth
        .toString()
        .padStart(2, "0")}`;

      // Generate SINGLE PDF with all data
      const invoiceUrl = await this.generateAggregatedInvoicePDF(
        aggregatedData,
        invoiceNumber
      );

      const report_url = await report.generateBrandTransactionReport(previousMonth,previousYear)

      // Create SINGLE invoice record
      const monthlyInvoice = await MonthlyCommissionInvoice.create({
        invoice_number: invoiceNumber,
        month: previousMonth,
        year: previousYear,
        total_commission: aggregatedData.total_amount,
        total_amount: aggregatedData.total_amount,
        invoice_url: invoiceUrl,
        report_url: report_url,
        status: "pending",
        details: {
          brands: aggregatedData.brands.map((brand) => ({
            brand_id: brand.brand_id,
            brand_email: brand.brand_email,
            brand_name: brand.brand_name,
            total_amount: brand.total_amount,
            commission_count: brand.commission_count,
            // Include affiliate details
            affiliates:
              brand.affiliates?.map((aff) => ({
                affiliate_id: aff.affiliate_id,
                affiliate_email: aff.affiliate_email,
                affiliate_name: aff.affiliate_name,
                total_amount: aff.total_amount,
                commission_count: aff.commission_count,
              })) || [],
          })),
          commission_ids: aggregatedData.all_commissions.map((c) => c.id),
        },
        commission_count: aggregatedData.total_commissions,
        brand_count: aggregatedData.brand_count,
        isDeleted: false,
      }).fetch();

      const commissionIds = aggregatedData.all_commissions.map((c) => c.id);
      await CommissionService.markCommissionsAsInvoiced(
        commissionIds,
        monthlyInvoice.id
      );


      return {
        success: true,
        message: `Generated SINGLE monthly invoice for ${previousMonth}/${previousYear}`,
        invoice: {
          invoice_id: monthlyInvoice.id,
          invoice_number: invoiceNumber,
          invoice_url: invoiceUrl,
          report_url:report_url,
          month: previousMonth,
          year: previousYear,
          total_amount: aggregatedData.total_amount,
          total_commissions: aggregatedData.total_commissions,
          total_brands: aggregatedData.brand_count,
        },
        summary: {
          grand_total: aggregatedData.total_amount,
          commission_count: aggregatedData.total_commissions,
          brand_count: aggregatedData.brand_count,
          brands: aggregatedData.brands.map((brand) => ({
            name: brand.brand_name,
            email: brand.brand_email,
            amount: brand.total_amount,
            commissions: brand.commission_count,
          })),
        },
      };
    } catch (error) {
      console.error("Error generating single monthly invoice:", error);
      throw error;
    }
  },
  /**
   * Generate SINGLE PDF with all affiliate data
   */
  generateAggregatedInvoicePDF: async function (data, invoiceNumber) {
    console.log("data++++", data);
    const html = this.generateAggregatedInvoiceHTML(data, invoiceNumber);

    // Create directory

    const invoicesDir = path.join(
      __dirname,
      "../../assets",
      "monthly_invoices"
    );
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }
    const filename = `monthly_invoice_${invoiceNumber}.pdf`;
    const outputPath = path.join(invoicesDir, filename);

    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: process.env.LOCAL ? '/usr/bin/google-chrome' : '/usr/bin/chromium-browser', //live
      // executablePath: process.env.LOCAL
      //   ? "/usr/bin/google-chrome"
      //   : "/usr/bin/google-chrome", //local

      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
      });

      fs.writeFileSync(outputPath, pdfBuffer);
      console.log(` SINGLE PDF generated: ${filename}`);

      return `monthly_invoices/${filename}`;
    } finally {
      await browser.close();
    }
  },

  /**
   * Generate HTML for aggregated invoice
   */

  generateAggregatedInvoiceHTML: function (data, invoiceNumber) {
    const now = new Date();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Monthly Commission Summary - ${data.month_name} ${data.year}</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f7fa;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 10px;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
      padding: 30px;
    }
    
    .header {
      text-align: center;
      border-bottom: 2px solid #eaeaea;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      color: #333;
      margin: 10px 0;
      font-size: 28px;
    }
    
    .header h2 {
      color: #666;
      margin: 5px 0;
      font-weight: normal;
    }
    
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .summary-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      border-top: 4px solid #2c5282;
    }
    
    .summary-card.highlight {
      background: linear-gradient(135deg, #2c5282, #4299e1);
      color: white;
    }
    
    .summary-card.highlight .card-label {
      color: rgba(255,255,255,0.9);
    }
    
    .summary-card.highlight .card-value {
      color: white;
    }
    
    .card-label {
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 10px;
      font-weight: 600;
    }
    
    .card-value {
      font-size: 24px;
      font-weight: bold;
      color: #2c5282;
    }
    
    .summary-section {
      margin-bottom: 30px;
    }
    
    .summary-section h3 {
      color: #333;
      border-bottom: 1px solid #eaeaea;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    
    .brands-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    
    .brands-table th {
      background: #2c5282;
      color: white;
      padding: 12px 15px;
      text-align: left;
      font-weight: 600;
    }
    
    .brands-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #eaeaea;
    }
    
    .brands-table tr:hover {
      background: #f8f9fa;
    }
    
    .amount, .fee, .total {
      text-align: right;
      font-weight: 500;
    }
    
    .amount {
      color: #2c5282;
    }
    
    .fee {
      color: #d69e2e;
    }
    
    .total {
      color: #38a169;
      font-weight: bold;
    }
    
    .rank {
      text-align: center;
      font-weight: bold;
      color: #666;
      width: 50px;
    }
    
    .orders {
      text-align: center;
    }
    
    .percentage {
      font-size: 12px;
      color: #666;
    }
    
    .grand-total-section {
      background: linear-gradient(135deg, #2c5282, #4299e1);
      color: white;
      padding: 30px;
      border-radius: 10px;
      text-align: center;
      margin-top: 40px;
    }
    
    .grand-total-section h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.9;
    }
    
    .grand-amount {
      font-size: 42px;
      font-weight: bold;
      margin: 10px 0;
    }
    
    .breakdown {
      display: flex;
      justify-content: center;
      gap: 40px;
      margin-top: 20px;
      font-size: 14px;
    }
    
    .breakdown-item {
      text-align: center;
    }
    
    .breakdown-label {
      opacity: 0.9;
      margin-bottom: 5px;
    }
    
    .breakdown-value {
      font-weight: bold;
      font-size: 18px;
    }
    
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eaeaea;
      color: #666;
      font-size: 12px;
    }
    
    .logo {
      height: 40px;
      margin-bottom: 10px;
    }
    
    .brand-details {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    
    .commission-rate {
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${
        credentials.BACK_WEB_URL
      }/images/logo.png" alt="Logo" class="logo" />
      <h1>Monthly Commission Summary</h1>
      <h2>${data.month_name} ${data.year}</h2>
    </div>
    
    <div class="summary-section">
      
      <table class="brands-table">
        <thead>
          <tr>
            <th class="rank">#</th>
            <th class="orders">Orders</th>
            <th class="amount">Amount</th>
            <th class="fee">Upfilly Fee</th>
            <th class="total">Grand Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.brands
            .map((brand, index) => {
              const affiliateCount = brand.affiliates?.length || 0;

              return `
            <tr>
              <td class="rank">${index + 1}</td>
              <td class="orders">${brand.total_orders}</td>
              <td class="amount">$${brand.total_amount.toFixed(2)}</td>
              <td class="fee">
                $${brand.upfilly_fee.toFixed(2)}
                ${
                  brand.commission_override > 0
                    ? `<div class="percentage">(${brand.commission_override}%)</div>`
                    : ""
                }
              </td>
              <td class="total">$${brand.brand_total.toFixed(2)}</td>
            </tr>
          `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
    
    <div class="grand-total-section">
      <h3>Grand Total Commission Payout</h3>
      <div class="grand-amount">$${data.grand_total.toFixed(2)}</div>
      <div class="breakdown">
        <div class="breakdown-item">
          <div class="breakdown-label">Total Amount</div>
          <div class="breakdown-value">$${data.total_amount.toFixed(2)}</div>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-label">+ Upfilly Fee</div>
          <div class="breakdown-value">$${data.total_upfilly_fee.toFixed(
            2
          )}</div>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-label">= Grand Total</div>
          <div class="breakdown-value">$${data.grand_total.toFixed(2)}</div>
        </div>
      </div>
      <div style="margin-top: 20px; font-size: 14px; opacity: 0.9;">
        Summary: ${data.total_orders} orders from ${data.brand_count} brands
      </div>
    </div>
    
    <div class="footer">
      <p>Generated by Upfilly Commission System • ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</p>
    </div>
  </div>
</body>
</html>
    `;
  },
};
