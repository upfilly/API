const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const CommissionService = require("./CommissionService")
const credentials = require("../../config/local.js"); //sails.config.env.production;



module.exports = {
  
  /**
   * Generate brand transaction report (separate from invoices)
   */
  generateBrandTransactionReport: async function (month, year) {
    try {
      console.log(`Generating brand transaction report for ${month}/${year}`);
      
      // Use existing aggregation but for reporting purposes
      const aggregatedData = await CommissionService.getAggregatedMonthlyCommissions(month, year);
      
      if (aggregatedData.total_orders === 0) {
        return {
          success: false,
          message: 'No transactions found for this period',
          month: month,
          year: year
        };
      }
      
      // Generate report number
      const reportNumber = `BRAND-REPORT-${year}${month.toString().padStart(2, '0')}`;
      
      // Generate report PDF
      const reportUrl = await this.generateReportPDF(aggregatedData, reportNumber);
      return reportUrl;
      
    //   // Create report record
    //   const reportRecord = await MonthlyCommissionReport.create({
    //     report_number: reportNumber,
    //     month: month,
    //     year: year,
    //     report_url: reportUrl,
    //     total_brands: aggregatedData.brand_count,
    //     total_transactions: aggregatedData.total_orders,
    //     total_amount: aggregatedData.total_amount,
    //     details: {
    //       report_type: 'brand_transaction_summary',
    //       period: `${aggregatedData.month_name} ${year}`,
    //       brands: aggregatedData.brands,
    //       summary: {
    //         total_transactions: aggregatedData.total_orders,
    //         total_amount: aggregatedData.total_amount,
    //         brand_count: aggregatedData.brand_count
    //       }
    //     },
    //     generated_at: new Date()
    //   }).fetch();
      
    //   return {
    //     success: true,
    //     message: `Generated brand transaction report for ${month}/${year}`,
    //     report: {
    //       report_id: reportRecord.id,
    //       report_number: reportNumber,
    //       report_url: reportUrl,
    //       month: month,
    //       year: year,
    //       summary: {
    //         total_brands: aggregatedData.brand_count,
    //         total_transactions: aggregatedData.total_orders,
    //         total_amount: aggregatedData.total_amount
    //       }
    //     }
    //   };
      
    } catch (error) {
      console.error('Error generating brand transaction report:', error);
      throw error;
    }
  },
  
  /**
   * Generate PDF for report (different from invoice PDF)
   */
  generateReportPDF: async function (data, reportNumber) {
    const html = this.generateReportHTML(data, reportNumber);
    
    const reportsDir = path.join(__dirname, '../../assets', 'monthly_reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const filename = `brand_report_${reportNumber}.pdf`;
    const outputPath = path.join(reportsDir, filename);
    
    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: process.env.LOCAL ? '/usr/bin/google-chrome' : '/usr/bin/chromium-browser', //live
    //   executablePath: process.env.LOCAL
    //     ? "/usr/bin/google-chrome"
    //     : "/usr/bin/google-chrome", //local
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
      console.log(`Report PDF generated: ${filename}`);
      
      return `monthly_reports/${filename}`;
    } finally {
      await browser.close();
    }
  },
  
  /**
   * Generate HTML for report (different from invoice HTML)
   */
 /**
 * Generate HTML for report with order details
 */
generateReportHTML: function (data, reportNumber) {
  const now = new Date();
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Brand Transaction Report - ${data.month_name} ${data.year}</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f7fa;
    }
    
    .container {
      max-width: 1400px;
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
    
    /* Brand Sections */
    .brand-section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .brand-header {
      background: #e2e8f0;
      padding: 15px 20px;
      border-radius: 8px 8px 0 0;
      border-left: 4px solid #2c5282;
    }
    
    .brand-title {
      font-size: 18px;
      font-weight: bold;
      color: #2d3748;
    }
    
    .brand-subtitle {
      font-size: 14px;
      color: #718096;
    }
    
    .transaction-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 13px;
    }
    
    .transaction-table th {
      background: #2c5282;
      color: white;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
    }
    
    .transaction-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #eaeaea;
    }
    
    .transaction-table tr:hover {
      background: #f8f9fa;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    .amount {
      font-weight: 500;
      color: #2c5282;
    }
    
    .order-id {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #4a5568;
    }
    
    .date {
      color: #666;
      font-size: 12px;
    }
    
    .affiliate-info {
      color: #4a5568;
      font-size: 13px;
    }
    
    .status-paid {
      color: #38a169;
      font-weight: 600;
      background: #c6f6d5;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 12px;
    }
    
    .status-failed {
      color: #e53e3e;
      font-weight: 600;
      background: #fed7d7;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 12px;
    }
    
    .status-pending {
      color: #d69e2e;
      font-weight: 600;
      background: #feebc8;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 12px;
    }
    
    .period {
      color: #718096;
      font-size: 12px;
      font-style: italic;
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
    
    .page-break {
      page-break-before: always;
    }
    
    .report-type {
      background: #e6fffa;
      padding: 10px 15px;
      border-radius: 6px;
      margin: 15px 0;
      text-align: center;
      font-size: 14px;
      color: #234e52;
      border-left: 4px solid #38b2ac;
    }
    
    .commission-info {
      font-size: 12px;
      color: #718096;
      margin-top: 3px;
    }
    
    .order-amount {
      font-weight: 600;
      color: #2d3748;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${credentials.BACK_WEB_URL || 'http://localhost:1337'}/images/logo.png" alt="Logo" class="logo" />
      <h1>Brand Transaction Report</h1>
      <h2>${data.month_name} ${data.year} - Detailed Transaction Summary</h2>
    </div>
    
    <div class="report-type">
      📊 Detailed transaction report for ${data.month_name} ${data.year} - Showing order details, amounts, periods, commission, and status
    </div>
    
    ${data.brands.map((brand, brandIndex) => `
      <div class="brand-section ${brandIndex > 0 ? 'page-break' : ''}">
        <div class="brand-header">
          <div class="brand-title">${brand.brand_name}</div>
          <div class="brand-subtitle">
            ${brand.total_orders} orders • Total Commission: $${brand.total_amount.toFixed(2)} • 
            Upfilly Fee (${brand.commission_override}%): $${brand.upfilly_fee.toFixed(2)} • 
            ${brand.affiliates?.length || 0} affiliates
          </div>
        </div>
        
        <table class="transaction-table">
          <thead>
            <tr>
            <th>Date</th>
              <th>Order ID</th>
              <th>Period</th>
              <th class="text-right">Order Amount</th>
              <th class="text-right">Commission</th>
              <th class="text-right">Upfilly Fee</th>
            </tr>
          </thead>
          <tbody>
            ${brand.commissions && brand.commissions.length > 0 ? 
              brand.commissions.map((commission, index) => {
                const affiliate = brand.affiliates?.find(a => a.affiliate_id === commission.affiliateLinkId?.affiliate_id);
                const affiliateLink = commission.affiliateLinkId;
                const orderId = affiliateLink?.order_id || 'N/A';
                const orderAmount = affiliateLink?.price || 0;
                const commissionAmount = commission.amount || 0;
                const period = affiliateLink?.timestamp || data.month_name + ' ' + data.year;
                const status = commission.transaction_status || 'paid';
                const upfillyFee = brand.commission_override > 0 ? (brand.commission_override / 100) * commissionAmount : 0;
                
                // Determine status class
                let statusClass = 'status-paid';
                let statusText = 'Paid';
                
                if (status === 'failed' || status === 'Failed') {
                  statusClass = 'status-failed';
                  statusText = 'Failed';
                } else if (status === 'pending' || status === 'Pending') {
                  statusClass = 'status-pending';
                  statusText = 'Pending';
                }
                
                return `
                <tr>
                <td class="date">${new Date(commission.createdAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}</td>
                  <td class="order-id">${orderId}</td>
                  <td class="period">${period}</td>
                  <td class="text-right order-amount">$${parseFloat(orderAmount).toFixed(2)}</td>
                  <td class="text-right amount">$${parseFloat(commissionAmount).toFixed(2)}</td>
                  <td class="text-right commission-info">$${upfillyFee.toFixed(2)}</td>
                </tr>
              `}).join('') : 
              `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #718096;">No transaction details available</td></tr>`
            }
          </tbody>
          <tfoot>
            <tr style="background: #f7fafc; font-weight: bold;">
              <td colspan="4" style="text-align: right; padding: 12px;">Brand Totals:</td>
              <td class="text-right">$${brand.commissions?.reduce((sum, c) => {
                const affiliateLink = c.affiliateLinkId;
                return sum + (affiliateLink?.price || 0);
              }, 0).toFixed(2) || '0.00'}</td>
              <td class="text-right">$${brand.total_amount.toFixed(2)}</td>
              <td></td>
              <td class="text-right">$${brand.upfilly_fee.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        
        <div style="margin-top: 15px; padding: 15px; background: #f7fafc; border-radius: 6px; border-left: 4px solid #4299e1;">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; font-size: 14px;">
            <div>
              <div style="color: #718096; font-size: 12px;">Total Orders</div>
              <div style="font-weight: bold; font-size: 16px;">${brand.total_orders}</div>
            </div>
            <div>
              <div style="color: #718096; font-size: 12px;">Total Order Amount</div>
              <div style="font-weight: bold; font-size: 16px; color: #2c5282;">
                $${brand.commissions?.reduce((sum, c) => {
                  const affiliateLink = c.affiliateLinkId;
                  return sum + (affiliateLink?.price || 0);
                }, 0).toFixed(2) || '0.00'}
              </div>
            </div>
            <div>
              <div style="color: #718096; font-size: 12px;">Total Commission</div>
              <div style="font-weight: bold; font-size: 16px; color: #38a169;">$${brand.total_amount.toFixed(2)}</div>
            </div>
            <div>
              <div style="color: #718096; font-size: 12px;">Upfilly Fee (${brand.commission_override}%)</div>
              <div style="font-weight: bold; font-size: 16px; color: #d69e2e;">$${brand.upfilly_fee.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    `).join('')}
    
    <div style="margin-top: 40px; padding: 25px; background: linear-gradient(135deg, #2c5282, #4299e1); border-radius: 10px; color: white;">
      <h3 style="margin: 0 0 15px 0; text-align: center; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">Grand Total Summary</h3>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; text-align: center;">
        <div>
          <div style="font-size: 14px; opacity: 0.9;">Total Order Amount</div>
          <div style="font-size: 24px; font-weight: bold;">$${data.brands.reduce((sum, brand) => {
            return sum + (brand.commissions?.reduce((brandSum, c) => {
              const affiliateLink = c.affiliateLinkId;
              return brandSum + (affiliateLink?.price || 0);
            }, 0) || 0);
          }, 0).toFixed(2)}</div>
        </div>
        <div>
          <div style="font-size: 14px; opacity: 0.9;">Total Commission</div>
          <div style="font-size: 24px; font-weight: bold;">$${data.total_amount.toFixed(2)}</div>
        </div>
        <div>
          <div style="font-size: 14px; opacity: 0.9;">Total Upfilly Fee</div>
          <div style="font-size: 24px; font-weight: bold;">$${data.total_upfilly_fee.toFixed(2)}</div>
        </div>
        <div>
          <div style="font-size: 14px; opacity: 0.9;">Grand Total</div>
          <div style="font-size: 24px; font-weight: bold;">$${data.grand_total.toFixed(2)}</div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p>Generated by Upfilly Commission System • Report ID: ${reportNumber}</p>
    </div>
  </div>
</body>
</html>
    `;
  },
}
 