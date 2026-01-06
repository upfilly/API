// api/controllers/CommissionCronController.js
const SingleMonthlyInvoiceService = require("../services/MonthlyInvoiceService")

// api/controllers/CommissionCronController.js

module.exports = {
  
  /**
   * Generate SINGLE monthly invoice for ALL affiliates
   */
  generateSingleMonthlyInvoice: async function (req, res) {
    try {
      console.log(' API: Generating single monthly invoice...');
      
      const result = await SingleMonthlyInvoiceService.generateSingleMonthlyInvoice();
      
      return res.json({
        success: true,
        message: result.message,
        data: result
      });
      
    } catch (error) {
      console.error(' API Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },
  
  /**
   * Get monthly invoice details
   */
  getMonthlyInvoice: async function (req, res) {
    try {
      const { month, year } = req.query;
      
      let query = { isDeleted: false };
      
      if (month && year) {
        query.month = parseInt(month);
        query.year = parseInt(year);
      } else {
        // Get latest invoice
        const latestInvoice = await MonthlyCommissionInvoice.find({
          where: { isDeleted: false },
          sort: 'createdAt DESC',
          limit: 1
        });
        
        if (latestInvoice.length > 0) {
          return res.json({
            success: true,
            invoice: latestInvoice[0]
          });
        }
      }
      
      const invoice = await MonthlyCommissionInvoice.findOne(query);
      
      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Monthly invoice not found'
        });
      }
      
      return res.json({
        success: true,
        invoice: invoice
      });
      
    } catch (error) {
      console.error('Error:', error);
      return res.serverError(error);
    }
  },
  
  /**
   * List all monthly invoices
   */
  listMonthlyInvoices: async function (req, res) {
    try {
      const invoices = await MonthlyCommissionInvoice.find({
        where: { isDeleted: false },
        sort: 'createdAt DESC'
      });
      
      return res.json({
        success: true,
        count: invoices.length,
        data: invoices
      });
      
    } catch (error) {
      console.error('Error:', error);
      return res.serverError(error);
    }
  }
};

