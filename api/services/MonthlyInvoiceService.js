// api/services/MonthlyInvoiceService.js

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const CommissionService = require("./CommissionService")
const credentials = require("../../config/local.js"); //sails.config.env.production;

module.exports = {
  
  /**
   * Generate ONE SINGLE monthly invoice for ALL affiliates
   */
  generateSingleMonthlyInvoice: async function () {
    try {
      console.log('Generating SINGLE monthly invoice for ALL affiliates...');
      
      // Calculate previous month
      const now = new Date();
      let previousMonth = now.getMonth(); // 0-based
      let previousYear = now.getFullYear();
//       let previousMonth = 10; // November
// let previousYear = 2025;

      if (previousMonth === 0) {
        previousMonth = 12;
        previousYear = previousYear - 1;
      }
      
      console.log(` Processing: ${previousMonth}/${previousYear}`);
      
      // Check if already processed
    //   const existingInvoice = await MonthlyCommissionInvoice.findOne({
    //     where: {
    //       month: previousMonth,
    //       year: previousYear,
    //       isDeleted: false
    //     }
    //   });
      
    //   if (existingInvoice) {
    //     console.log(` Monthly invoice for ${previousMonth}/${previousYear} already exists`);
    //     return {
    //       success: false,
    //       message: `Monthly invoice for ${previousMonth}/${previousYear} already generated`,
    //       existing_invoice: existingInvoice
    //     };
    //   }
      
      // Get aggregated data for ALL affiliates
      const aggregatedData = await CommissionService.getAggregatedMonthlyCommissions(previousMonth, previousYear);
      
      if (aggregatedData.total_commissions === 0) {
        return {
          success: true,
          message: 'No commissions to invoice for this period',
          month: previousMonth,
          year: previousYear
        };
      }
      
      console.log(` Data: ${aggregatedData.total_commissions} commissions, $${aggregatedData.total_amount} total, ${aggregatedData.affiliate_count} affiliates,aggregatedData`,aggregatedData);
      
      // Generate single invoice number
      const invoiceNumber = `MONTHLY-INV-${previousYear}${previousMonth.toString().padStart(2, '0')}`;
      
      // Generate SINGLE PDF with all data
      const invoiceUrl = await this.generateAggregatedInvoicePDF(aggregatedData, invoiceNumber);
      console.log("aggregatedData.affiliates+++++++++++++++++",aggregatedData.affiliates.map(aff => aff))

      // Create SINGLE invoice record
      const monthlyInvoice = await MonthlyCommissionInvoice.create({
        invoice_number: invoiceNumber,
        month: previousMonth,
        year: previousYear,
        total_commission: aggregatedData.total_amount,
        total_amount: aggregatedData.total_amount,
        invoice_url: invoiceUrl,
        status: 'pending',
        details: {
          affiliates: aggregatedData.affiliates.map(aff => ({
            affiliate_id: aff.affiliate_id,
            affiliate_email: aff.affiliate_email,
            affiliate_name: aff.affiliate_name,
            total_amount: aff.total_amount,
            commission_count: aff.commission_count
          })),
          commission_ids: aggregatedData.all_commissions.map(c => c.id)
        },
        commission_count: aggregatedData.total_commissions,
        affiliate_count: aggregatedData.affiliate_count,
        isDeleted: false
      }).fetch();
      
      // Mark ALL commissions as invoiced
      const commissionIds = aggregatedData.all_commissions.map(c => c.id);
      await CommissionService.markCommissionsAsInvoiced(commissionIds, monthlyInvoice.id);
      
      // Send notifications
      await this.sendMonthlySummaryNotifications(aggregatedData.affiliates, monthlyInvoice);
      
      return {
        success: true,
        message: `Generated SINGLE monthly invoice for ${previousMonth}/${previousYear}`,
        invoice: {
          invoice_id: monthlyInvoice.id,
          invoice_number: invoiceNumber,
          invoice_url: invoiceUrl,
          month: previousMonth,
          year: previousYear,
          total_amount: aggregatedData.total_amount,
          total_commissions: aggregatedData.total_commissions,
          total_affiliates: aggregatedData.affiliate_count
        },
        summary: {
          grand_total: aggregatedData.total_amount,
          commission_count: aggregatedData.total_commissions,
          affiliate_count: aggregatedData.affiliate_count,
          affiliates: aggregatedData.all_commissions.map(aff => ({
            name: aff.affiliate_name,
            email: aff.affiliate_email,
            amount: aff.total_amount,
            commissions: aff.commission_count
          }))
        }
      };
      
    } catch (error) {
      console.error(' Error generating single monthly invoice:', error);
      throw error;
    }
  },
  
  /**
   * Generate SINGLE PDF with all affiliate data
   */
  generateAggregatedInvoicePDF: async function (data, invoiceNumber) {
    console.log("data++++",data)
    const html = this.generateAggregatedInvoiceHTML(data, invoiceNumber);
    
    // Create directory

     const invoicesDir = path.join(__dirname, '../../assets', 'monthly_invoices');
          if (!fs.existsSync(invoicesDir)) {
            fs.mkdirSync(invoicesDir, { recursive: true });
          }
    const filename = `monthly_invoice_${invoiceNumber}.pdf`;
    const outputPath = path.join(invoicesDir, filename);
    
    const browser = await puppeteer.launch({
      headless: "new",
    //   executablePath: process.env.LOCAL ? '/usr/bin/google-chrome' : '/usr/bin/chromium-browser',
      executablePath: process.env.LOCAL ? '/usr/bin/google-chrome' :'/usr/bin/google-chrome',

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
      max-width: 1000px;
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
    
    .meta-info {
      display: flex;
      justify-content: space-between;
      background: #f8f9fa;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    
    .meta-item {
      text-align: center;
    }
    
    .meta-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    
    .meta-value {
      font-size: 18px;
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
    
    .affiliates-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    
    .affiliates-table th {
      background: #2c5282;
      color: white;
      padding: 12px 15px;
      text-align: left;
      font-weight: 600;
    }
    
    .affiliates-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #eaeaea;
    }
    
    .affiliates-table tr:hover {
      background: #f8f9fa;
    }
    
    .amount {
      text-align: right;
      font-weight: 500;
    }
    
    .rank {
      text-align: center;
      font-weight: bold;
      color: #666;
      width: 50px;
    }
    
    .grand-total {
      background: linear-gradient(135deg, #2c5282, #4299e1);
      color: white;
      padding: 25px;
      border-radius: 10px;
      text-align: center;
      margin-top: 40px;
    }
    
    .grand-total h3 {
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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${credentials.BACK_WEB_URL}/images/logo.png" alt="Logo" class="logo" />
      <h1>Monthly Commission Summary</h1>
      <h2>${data.month_name} ${data.year} • All Affiliates</h2>
    </div>
    
    <div class="meta-info">
      <div class="meta-item">
        <div class="meta-label">Invoice Number</div>
        <div class="meta-value">${invoiceNumber}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Period</div>
        <div class="meta-value">${data.month_name} ${data.year}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Generated Date</div>
        <div class="meta-value">${now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
    </div>
    
    <div class="summary-section">
      <h3>Affiliate Performance Summary</h3>
      
      <table class="affiliates-table">
        <thead>
          <tr>
            <th class="rank">#</th>
            <th>Affiliate</th>
            <th>Email</th>
            <th>Commissions</th>
            <th class="amount">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.commission_details.map((affiliate, index) => `
            <tr>
              <td class="rank">${index + 1}</td>
              <td>${affiliate.affiliate_name}</td>
              <td>${affiliate.affiliate_email}</td>
              <td>${affiliate.commission_count}</td>
              <td class="amount">$${affiliate.amount.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="grand-total">
      <h3>Total Commission Payout for ${data.month_name} ${data.year}</h3>
      <div class="grand-amount">$${data.total_amount.toFixed(2)}</div>
      <div>Across ${data.total_commissions} commissions from ${data.affiliate_count} affiliates</div>
    </div>
    
    <div class="footer">
      <p>This is a consolidated monthly commission report for all affiliates.</p>
      <p>Generated by Upfilly Commission System • ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</p>
    </div>
  </div>
</body>
</html>
    `;
  },
  
  /**
   * Send notifications to all affiliates
   */
  sendMonthlySummaryNotifications: async function (affiliates, invoice) {
    try {
      console.log(` Sending notifications to ${affiliates.length} affiliates...`);
      
      for (const affiliate of affiliates) {
        try {
          const emailData = {
            to: affiliate.affiliate_email,
            subject: `Monthly Commission Summary - ${invoice.month}/${invoice.year}`,
            html: `
              <h2>Monthly Commission Summary</h2>
              <p>Hello ${affiliate.affiliate_name || 'Affiliate'},</p>
              <p>Your commissions for ${invoice.month}/${invoice.year} have been included in the monthly report.</p>
              <p><strong>Your Summary:</strong></p>
              <ul>
                <li>Commissions: ${affiliate.commission_count}</li>
                <li>Total Amount: $${affiliate.total_amount.toFixed(2)}</li>
              </ul>
              <p><strong>Monthly Report:</strong></p>
              <ul>
                <li>Invoice Number: ${invoice.invoice_number}</li>
                <li>Total Affiliates: ${invoice.affiliate_count}</li>
                <li>Total Commissions: ${invoice.commission_count}</li>
                <li>Grand Total: $${invoice.total_amount.toFixed(2)}</li>
              </ul>
              <p>You can download the complete monthly report from your dashboard.</p>
              <br>
              <p>Best regards,<br>Upfilly Team</p>
            `
          };
          
          // Uncomment to send emails
          // await sails.helpers.sendMail.with(emailData);
          
          console.log(` Notification queued for ${affiliate.affiliate_email}`);
          
        } catch (emailError) {
          console.error(`Failed to send email to ${affiliate.affiliate_email}:`, emailError);
        }
      }
      
      console.log(' All notifications sent');
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }
};