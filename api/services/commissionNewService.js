// api/services/commissionNewService.js

const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");
const credentials = require("../../config/local.js");

module.exports = {
  /**
   * Get aggregated monthly commissions with subscription filtering
   */
  getAggregatedMonthlyCommissions: async function (month, year) {
    try {
      console.log(`\nAggregating commissions for ${month}/${year}`);

      // Date range (UTC, DB-safe)
      const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
        .toISOString()
        .replace("Z", "+00:00");

      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
        .toISOString()
        .replace("Z", "+00:00");

      console.log("startDate:", startDate);
      console.log("endDate:", endDate);

      // Fetch commissions with affiliateLink populated
      const allCommissions = await Transactions.find({
        where: {
          transaction_type: "pay_commission",
          commission_invoiced: false,
          createdAt: {
            ">=": new Date(startDate),
            "<=": new Date(endDate),
          },
        },
      }).populate("affiliateLinkId");

      console.log(`Found ${allCommissions.length} commissions`);

      if (allCommissions.length === 0) {
        return {
          month,
          year,
          month_name: this.getMonthName(month),
          total_orders: 0,
          total_amount: 0,
          total_upfilly_fee: 0,
          grand_total: 0,
          brand_count: 0,
          brands: [],
          commission_details: [],
          all_commissions: [],
        };
      }

      // Aggregation containers
      const brandMap = new Map();
      const commissionDetails = [];
      let grandTotal = 0;
      let totalUpfillyFee = 0;

      // Process each commission and group by brand_id
      for (const commission of allCommissions) {
        const brandId = commission.affiliateLinkId?.brand_id;
        if (!brandId) {
          console.warn(`Commission ${commission.id} has no brand_id`);
          continue;
        }

        // Create brand entry if it doesn't exist
        if (!brandMap.has(brandId)) {
          const brandData = await Users.findOne({ id: brandId });

          // Get brand's active subscription for commission override
          let commissionOverride = 0;
          const activeSubscription = await Subscriptions.findOne({
            user_id: brandId,
            status: "active",
          }).populate("subscription_plan_id");
          console.log("activeSubscription++", activeSubscription);

          if (activeSubscription && activeSubscription.subscription_plan_id) {
            commissionOverride =
              activeSubscription.subscription_plan_id.commission_override || 0;
          }

          brandMap.set(brandId, {
            brand_id: brandId,
            brand_email: brandData?.email || "unknown@example.com",
            brand_name: brandData?.fullName || "Unknown Brand",
            total_orders: 0,
            total_amount: 0,
            commission_override: commissionOverride,
            upfilly_fee: 0,
            brand_total: 0,
            commissions: [],
            affiliates: new Map(),
          });
        }

        const brand = brandMap.get(brandId);
        const amount = Number(commission.amount || 0);

        // Update brand totals
        brand.total_orders += 1;
        brand.total_amount += amount;
        brand.commissions.push(commission);

        // Track affiliate details for this brand
        const affiliateId = commission.affiliateLinkId?.affiliate_id;
        if (affiliateId) {
          if (!brand.affiliates.has(affiliateId)) {
            const affiliateData = await Users.findOne({ id: affiliateId });
            brand.affiliates.set(affiliateId, {
              affiliate_id: affiliateId,
              affiliate_email: affiliateData?.email || "unknown@example.com",
              affiliate_name: affiliateData?.fullName || "Unknown Affiliate",
              total_amount: 0,
              commission_count: 0,
            });
          }

          const affiliate = brand.affiliates.get(affiliateId);
          affiliate.total_amount += amount;
          affiliate.commission_count += 1;
        }

        // Add to commission details
        commissionDetails.push({
          transaction_id: commission.id,
          brand_id: brandId,
          brand_email: brand.brand_email,
          brand_name: brand.brand_name,
          affiliate_id: affiliateId,
          affiliate_email:
            brand.affiliates.get(affiliateId)?.affiliate_email || "unknown",
          affiliate_name:
            brand.affiliates.get(affiliateId)?.affiliate_name || "Unknown",
          amount,
          date: commission.createdAt,
          affiliate_link_id: commission.affiliateLinkId?.id,
        });
      }

      // Calculate upfilly fee and totals for each brand
      const brands = Array.from(brandMap.values()).map((brand) => {
        // Calculate upfilly fee based on commission override
        const upfillyFee =
          (brand.commission_override / 100) * brand.total_amount;
        const brandTotal = brand.total_amount + upfillyFee;

        // Update global totals
        totalUpfillyFee += upfillyFee;
        grandTotal += brandTotal;

        return {
          brand_id: brand.brand_id,
          brand_email: brand.brand_email,
          brand_name: brand.brand_name,
          total_orders: brand.total_orders,
          total_amount: parseFloat(brand.total_amount.toFixed(2)),
          commission_override: brand.commission_override,
          upfilly_fee: parseFloat(upfillyFee.toFixed(2)),
          brand_total: parseFloat(brandTotal.toFixed(2)),
          commissions: brand.commissions,
          affiliates: Array.from(brand.affiliates.values()).map(
            (affiliate) => ({
              affiliate_id: affiliate.affiliate_id,
              affiliate_email: affiliate.affiliate_email,
              affiliate_name: affiliate.affiliate_name,
              total_amount: parseFloat(affiliate.total_amount.toFixed(2)),
              commission_count: affiliate.commission_count,
            })
          ),
        };
      });

      // Sort brands by total amount (descending)
      brands.sort((a, b) => b.total_amount - a.total_amount);

      console.log(`Aggregated brands: ${brands.length}`);

      return {
        month,
        year,
        month_name: this.getMonthName(month),
        total_orders: allCommissions.length,
        total_amount: parseFloat(
          brands.reduce((sum, brand) => sum + brand.total_amount, 0).toFixed(2)
        ),
        total_upfilly_fee: parseFloat(totalUpfillyFee.toFixed(2)),
        grand_total: parseFloat(grandTotal.toFixed(2)),
        brand_count: brands.length,
        brands,
        commission_details: commissionDetails,
        all_commissions: allCommissions,
      };
    } catch (error) {
      console.error("Error aggregating monthly commissions:", error);
      throw error;
    }
  },

  getMonthName: function (month) {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return monthNames[month - 1] || `Month ${month}`;
  },

  /**
   * Mark commissions as invoiced
   */
  markCommissionsAsInvoiced: async function (commissionIds, monthlyInvoiceId) {
    try {
      await Transactions.update({
        id: commissionIds,
      }).set({
        commission_invoiced: true,
        monthly_invoice_id: monthlyInvoiceId,
      });

      console.log(`Marked ${commissionIds.length} commissions as invoiced`);
    } catch (error) {
      console.error("Error marking commissions as invoiced:", error);
      throw error;
    }
  },

  /**
   * Generate invoice and report for a single brand
   */
  generateBrandInvoiceAndReport: async function (
    brand,
    month,
    year,
    monthName
  ) {
    try {
      console.log(`\n Generating invoice for brand: ${brand.brand_name}`);

      const brandIdStr = brand.brand_id ? brand.brand_id.toString() : "unknown";

      const invoiceNumber = `INV-${brandIdStr.substring(0, 8)}-${year}${month
        .toString()
        .padStart(2, "0")}`;
      const reportNumber = `REP-${brandIdStr.substring(0, 8)}-${year}${month
        .toString()
        .padStart(2, "0")}`;

      console.log(`Invoice #: ${invoiceNumber}`);
      console.log(`Report #: ${reportNumber}`);

      const invoiceUrl = await this.generateBrandInvoicePDF(
        brand,
        month,
        year,
        monthName,
        invoiceNumber
      );
      const reportUrl = await this.generateBrandReportPDF(
        brand,
        month,
        year,
        monthName,
        reportNumber
      );

      const monthlyInvoice = await MonthlyCommissionInvoice.create({
        invoice_number: invoiceNumber,
        report_number: reportNumber,
        month: month,
        year: year,
        brand_id: brand.brand_id,
        brand_name: brand.brand_name,
        brand_email: brand.brand_email,
        total_commission: brand.total_amount,
        total_amount: brand.brand_total,
        commission_amount: brand.total_amount,
        upfilly_fee: brand.upfilly_fee,
        invoice_url: invoiceUrl,
        report_url: reportUrl,
        status: "pending",
        details: {
          brand: {
            brand_id: brand.brand_id,
            brand_email: brand.brand_email,
            brand_name: brand.brand_name,
            total_amount: brand.total_amount,
            commission_count: brand.total_orders,
            commission_override: brand.commission_override,
            upfilly_fee: brand.upfilly_fee,
            brand_total: brand.brand_total,
          },
          affiliates: brand.affiliates || [],
          commission_ids: (brand.commissions || []).map((c) => c.id) || [],
        },
        commission_count: brand.total_orders,
        isDeleted: false,
      }).fetch();

      console.log(
        `Generated invoice for ${brand.brand_name}: ${invoiceNumber}`
      );

      const commissionIds = (brand.commissions || []).map((c) => c.id);
    if (commissionIds.length > 0) {
      await this.markCommissionsAsInvoiced(commissionIds, monthlyInvoice.id);
    }

      return {
        brand_id: brand.brand_id,
        brand_name: brand.brand_name,
        invoice_id: monthlyInvoice.id,
        invoice_number: invoiceNumber,
        report_number: reportNumber,
        invoice_url: invoiceUrl,
        report_url: reportUrl,
        month: month,
        year: year,
        total_commission: brand.total_amount,
        total_amount: brand.brand_total,
        upfilly_fee: brand.upfilly_fee,
        commission_count: brand.total_orders,
        affiliate_count: (brand.affiliates || []).length,
      };
    } catch (error) {
      console.error(
        ` Error generating invoice for brand ${brand.brand_name}:`,
        error
      );
      return null;
    }
  },

  /**
   * Main function to generate separate invoices for each brand
   */
  generateSeparateBrandInvoices: async function () {
    try {
      console.log("\n Generating SEPARATE monthly invoices for EACH brand...");

      const now = new Date();
      let previousYear = now.getFullYear();
      let previousMonth = 1; // jan

      console.log(` Processing: ${previousMonth}/${previousYear}`);

      const aggregatedData = await this.getAggregatedMonthlyCommissions(
        previousMonth,
        previousYear
      );

      console.log(`\n Aggregation Results:`);
      console.log(
        `Total brands in data: ${aggregatedData.brands?.length || 0}`
      );
      console.log(
        `Total commissions: ${aggregatedData.total_commissions || 0}`
      );
      console.log(`Month: ${aggregatedData.month_name} ${aggregatedData.year}`);
      console.log(
        `Grand Total: $${aggregatedData.grand_total?.toFixed(2) || 0}`
      );

      if (!aggregatedData.brands || aggregatedData.brands.length === 0) {
        return {
          success: true,
          message: "No commissions to invoice for this period",
          month: previousMonth,
          year: previousYear,
        };
      }

      const generatedInvoices = [];
      let skippedBrands = 0;

      for (const brand of aggregatedData.brands) {
        console.log(`\n--- Processing Brand: ${brand.brand_name} ---`);
        console.log(`Commission Override: ${brand.commission_override}%`);
        console.log(`Total Orders: ${brand.total_orders}`);
        console.log(`Total Amount: $${brand.total_amount}`);
        console.log(`Upfilly Fee: $${brand.upfilly_fee}`);
        console.log(`Brand Total: $${brand.brand_total}`);

        // Subscription filtering
        if (!brand.commission_override || brand.commission_override <= 0) {
          console.log(
            ` Skipping - No active subscription or zero commission rate`
          );
          skippedBrands++;
          continue;
        }

        if (!brand.total_amount || brand.total_amount <= 0) {
          console.log(`  Skipping - No commissions for this month`);
          skippedBrands++;
          continue;
        }

        console.log(
          ` Processing - Has active subscription with ${brand.commission_override}% rate`
        );

        const invoiceResult = await this.generateBrandInvoiceAndReport(
          brand,
          previousMonth,
          previousYear,
          aggregatedData.month_name
        );

        if (invoiceResult) {
          generatedInvoices.push(invoiceResult);
        }
      }

      console.log(`\n Invoice Generation Summary:`);
      console.log(`Total brands processed: ${aggregatedData.brands.length}`);
      console.log(
        `Brands with invoices generated: ${generatedInvoices.length}`
      );
      console.log(
        `Brands skipped (no subscription/commissions): ${skippedBrands}`
      );

      // const allCommissionIds =
      //   aggregatedData.all_commissions?.map((c) => c.id) || [];

      // if (allCommissionIds.length > 0) {
      //   await this.markCommissionsAsInvoiced(allCommissionIds, null);
      // }

      return {
        success: true,
        message: `Generated separate invoices for ${generatedInvoices.length} brands for ${aggregatedData.month_name} ${previousYear}`,
        total_brands: aggregatedData.brands.length,
        processed_brands: generatedInvoices.length,
        skipped_brands: skippedBrands,
        total_commissions: aggregatedData.total_commissions,
        total_amount: aggregatedData.total_amount,
        grand_total: aggregatedData.grand_total,
        invoices: generatedInvoices,
        summary: {
          month: previousMonth,
          year: previousYear,
          month_name: aggregatedData.month_name,
          grand_total: aggregatedData.grand_total,
          commission_count: aggregatedData.total_commissions,
          brand_count: aggregatedData.brand_count,
        },
      };
    } catch (error) {
      console.error("Error generating separate brand invoices:", error);
      throw error;
    }
  },

  /**
   * Generate PDF invoice for a single brand
   */
  generateBrandInvoicePDF: async function (
    brand,
    month,
    year,
    monthName,
    invoiceNumber
  ) {
    const html = this.generateBrandInvoiceHTML(
      brand,
      month,
      year,
      monthName,
      invoiceNumber
    );

    const invoicesDir = path.join(__dirname, "../../assets", "brand_invoices");
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const filename = `invoice_${(brand.brand_name || "unknown").replace(
      /[^a-z0-9]/gi,
      "_"
    )}_${invoiceNumber}.pdf`;
    const outputPath = path.join(invoicesDir, filename);

    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: process.env.LOCAL
        ? "/usr/bin/google-chrome"
        : "/usr/bin/chromium-browser", //live
      // executablePath: process.env.LOCAL ? '/usr/bin/google-chrome' : '/usr/bin/google-chrome',
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
      console.log(`📄 Brand PDF invoice generated: ${filename}`);

      return `brand_invoices/${filename}`;
    } finally {
      await browser.close();
    }
  },

  /**
   * Generate HTML for single brand invoice - EXACTLY LIKE BEFORE
   */
  generateBrandInvoiceHTML: function (
    brand,
    month,
    year,
    monthName,
    invoiceNumber
  ) {
    const now = new Date();

    const htmlData= `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Monthly Commission Summary - ${
    brand.brand_name
  } - ${monthName} ${year}</title>
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
      text-align: left !important;
      border-bottom: 1px solid #eaeaea;
    }
    

    .brands-table tr:hover {
      background: #f8f9fa;
    }
    
    .amount, .fee, .total {
      font-weight: 500;
    }
    
    .amount {
      color: #2c5282;
      text-align: left;
    }
    
    .fee {
      color: #d69e2e;
      text-align: left;
    }
    
    .total {
      color: #38a169;
      text-align: left;
      font-weight: bold;
    }
    
    .rank {
      font-weight: bold;
      color: #666;
      width: 50px;
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
    
    .invoice-info {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    
    .invoice-number {
      font-size: 16px;
      color: #2c5282;
      font-weight: bold;
    }
    
    .company-info {
      text-align: right;
      font-size: 12px;
      color: #666;
    }
    
    .brand-summary {
      background: #f0f7ff;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      border-left: 4px solid #2c5282;
    }
    
    .brand-name-large {
      font-size: 20px;
      font-weight: bold;
      color: #2c5282;
      margin-bottom: 5px;
    }
    
    .brand-email {
      color: #666;
      margin-bottom: 5px;
    }

    .total{
      color: #2c5282;
    }
    
    .period {
      color: #666;
      font-style: italic;
    }
    
    .due-date {
      text-align: right;
      margin-top: 20px;
      color: #c53030;
      font-weight: bold;
      font-size: 14px;
    }
    
    .payment-terms {
      background: #fefcbf;
      padding: 15px;
      border-radius: 6px;
      margin-top: 20px;
      border-left: 4px solid #d69e2e;
      font-size: 13px;
    }
      .text-left{
        text-align: left;
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
      <h2>${monthName} ${year}</h2>
    </div>
    
    <div class="invoice-info">
      <div>
        <div class="invoice-number">Invoice #: ${invoiceNumber}</div>
        <div class="period">Invoice Period: ${monthName} ${year}</div>
      </div>
    </div>
  
    
    <div class="summary-section">
      
      <table class="brands-table">
        <thead>
          <tr>
            <th class="text-left">#</th>
            <th class="text-left">Orders</th>
            <th class="amount">Commission</th>
            <th class="fee">Upfilly Fee</th>
            <th class="total">Grand Total</th>

          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="rank" style="text-align:left">1</td>
            <td class="orders" style="text-align:left">${brand.total_orders}</td>
            <td class="amount" style="text-align:left">$${brand.total_amount.toFixed(2)}</td>
            <td class="fee" style="text-align:left">
              $${brand.upfilly_fee.toFixed(2)}
              ${
                brand.commission_override > 0
                  ? `<div class="percentage">(${brand.commission_override}%)</div>`
                  : ""
              }
            </td>
            <td class="total" style="text-align:left">$${brand.brand_total.toFixed(2)}</td>

          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="grand-total-section">
      <h3>Invoice Total</h3>
      <div class="grand-amount">$${brand.brand_total.toFixed(2)}</div>
      <div class="breakdown">
        <div class="breakdown-item">
          <div class="breakdown-label">Commission</div>
          <div class="breakdown-value">$${brand.total_amount.toFixed(2)}</div>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-label">+ Upfilly Fee</div>
          <div class="breakdown-value">$${brand.upfilly_fee.toFixed(2)}</div>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-label">= Total Due</div>
          <div class="breakdown-value">$${brand.brand_total.toFixed(2)}</div>
        </div>
      </div>
      <div style="margin-top: 20px; font-size: 14px; opacity: 0.9;">
        Summary: ${brand.total_orders} orders from ${
      (brand.affiliates || []).length
    } affiliates
      </div>
    </div>
    <div class="footer">
      <p>Generated by Upfilly Commission System • ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</p>
      <p>Invoice #: ${invoiceNumber}</p>
    </div>
  </div>
</body>
</html>
    `;
    // console.log("invoice",htmlData)
    return htmlData
  },

  /**
   * Generate PDF report for a single brand
   */
  generateBrandReportPDF: async function (
    brand,
    month,
    year,
    monthName,
    reportNumber
  ) {
    const html = this.generateBrandReportHTML(
      brand,
      month,
      year,
      monthName,
      reportNumber
    );

    const reportsDir = path.join(__dirname, "../../assets", "brand_reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `report_${(brand.brand_name || "unknown").replace(
      /[^a-z0-9]/gi,
      "_"
    )}_${reportNumber}.pdf`;
    const outputPath = path.join(reportsDir, filename);

    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: process.env.LOCAL
        ? "/usr/bin/google-chrome"
        : "/usr/bin/chromium-browser", //live
      // executablePath: process.env.LOCAL ? '/usr/bin/google-chrome' : '/usr/bin/google-chrome',
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
      console.log(`📄 Brand PDF report generated: ${filename}`);

      return `brand_reports/${filename}`;
    } finally {
      await browser.close();
    }
  },

  /**
   * Generate HTML for single brand report - EXACTLY LIKE BEFORE
   */
  generateBrandReportHTML: function (
    brand,
    month,
    year,
    monthName,
    reportNumber
  ) {
    const brandTotal =
      brand.brand_total || brand.total_amount + (brand.upfilly_fee || 0);

  const htmlData = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Brand Transaction Report - ${
    brand.brand_name
  } - ${monthName} ${year}</title>
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
      margin: 10px 0;
      font-size: 28px;
    }

    .header h2 {
      margin: 5px 0;
      font-weight: normal;
      color: #666;
    }

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
    }

    .brand-subtitle {
      font-size: 14px;
      color: #718096;
    }

    .transaction-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .transaction-table th {
      background: #2c5282;
      color: #fff;
      padding: 10px;
      text-align: left;
      font-weight: 600;
    }

    .transaction-table td {
      padding: 10px;
      border-bottom: 1px solid #eaeaea;
      text-align:left !important;
    }

    .transaction-table tbody tr:nth-child(even) {
      background: #f9fafb;
    }

    .order-id {
      font-family: monospace;
      font-size: 12px;
    }

    .date {
      font-size: 12px;
      color: #666;
    }

    .period {
      font-size: 12px;
      color: #718096;
      font-style: italic;
    }

    tfoot td {
      background: #f7fafc;
      font-weight: bold;
      border-top: 2px solid #cbd5e0;
    }

    .footer {
      text-align: center;
      margin-top: 40px;
      font-size: 12px;
      color: #666;
    }
    
    .affiliate-section {
      margin-top: 30px;
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .affiliate-header {
      background: #e2e8f0;
      padding: 12px 20px;
      border-radius: 8px 8px 0 0;
      border-left: 4px solid #4a5568;
    }
    
    .affiliate-title {
      font-size: 16px;
      font-weight: bold;
    }
    
    .affiliate-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    
    .affiliate-table th {
      background: #4a5568;
      color: #fff;
      padding: 10px;
      text-align: left;
      font-weight: 600;
    }
    
    .affiliate-table td {
      padding: 10px;
      border-bottom: 1px solid #eaeaea;
      text-align:left;
    }
    
    .affiliate-table tbody tr:nth-child(even) {
      background: #f9fafb;
    }
    
    .summary-section {
      background: #f0f7ff;
      padding: 20px;
      border-radius: 8px;
      margin-top: 30px;
      border-left: 4px solid #2c5282;
    }
    
    .summary-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 15px;
      color: #2c5282;
    }
    
    .page-break {
      page-break-before: always;
    }
  </style>
</head>

<body>
<div class="container">
  <div class="header">
    <img src="${
      credentials.BACK_WEB_URL || "http://localhost:1337"
    }/images/logo.png" height="40" />
    <h1>Brand Transaction Report</h1>
    <h2>${monthName} ${year} • ${brand.brand_name}</h2>
  </div>

  <div class="brand-section">
    <div class="brand-header">
    <table class="transaction-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Order ID</th>
          <th class="">Order Amount</th>
          <th class="">Commission</th>
          <th class="">Upfilly Fee</th>
        </tr>
      </thead>

      <tbody>
        ${
          brand.commissions?.length
            ? brand.commissions
                .map((c) => {
                  const link = c.affiliateLinkId || {};
                  const affiliate = brand.affiliates?.find(
                    (a) => a.affiliate_id === link.affiliate_id
                  );
                  const upfillyFee = brand.commission_override
                    ? (brand.commission_override / 100) * (c.amount || 0)
                    : 0;

                  return `
                <tr>
                  <td style="text-align:left" class="date">${new Date(
                    c.createdAt
                  ).toLocaleDateString()}</td>
                  <td style="text-align:left" class="order-id">${
                    link.order_id ? link.order_id : "N/A"
                  }</td>
                  <td style="text-align:left" class="">$${(link.price || 0).toFixed(2)}</td>
                  <td style="text-align:left" class="">$${(c.amount || 0).toFixed(2)}</td>
                  <td style="text-align:left" class="">$${upfillyFee.toFixed(2)}</td>

                </tr>`;
                })
                .join("")
            : `<tr><td colspan="6" style="text-align:left;padding:20px;">No transaction details available</td></tr>`
        }
      </tbody>

      <tfoot>
        <tr>
          <td colspan="2" class="">Brand Totals</td>
          <td class="">$${
            brand.commissions
              ?.reduce((s, c) => s + (c.affiliateLinkId?.price || 0), 0)
              .toFixed(2) || "0.00"
          }</td>
          <td class="">$${(brand.total_amount || 0).toFixed(2)}</td>
          <td class="">$${(brand.upfilly_fee || 0).toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="summary-section">
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #cbd5e0;">
        <p><strong>Total Commission Amount:</strong> $${(
          brand.total_amount || 0
        ).toFixed(2)}</p>
        <p><strong>Upfilly Fee (${
          brand.commission_override || 0
        }%):</strong> $${(brand.upfilly_fee || 0).toFixed(2)}</p>
        <p><strong style="font-size: 18px;">Grand Total :</strong> <span style="font-size: 18px; color: #2c5282; font-weight: bold;">$${brandTotal.toFixed(
          2
        )}</span></p>
      </div>
    </div>
  </div>

  <div class="footer">
    Generated by Upfilly Commission System • Report: ${reportNumber} • ${new Date().toLocaleDateString()}
  </div>
</div>
</body>
</html>
`;
// console.log("htmlData",htmlData)
return htmlData;
  },
};
