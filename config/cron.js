// config/cron.js

const cron = require('node-cron');
const MonthlyInvoiceService = require("../api/services/MonthlyInvoiceService")

module.exports.cron = {
  init: function() {
    // Schedule monthly invoice generation on 1st of every month at 2:00 AM
    cron.schedule('0 2 1 * *', async () => {
      
      try {
        const result = await MonthlyInvoiceService.generateSingleMonthlyInvoice();
        console.log('Monthly invoice generation completed:', result);
        
      } catch (error) {
        console.error('Cron job failed:', error);
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });
    
    console.log('Monthly commission cron job scheduled');
  }
};