// api/controllers/CommissionCronController.js
const SingleMonthlyInvoiceService = require("../services/MonthlyInvoiceService");

// Helper function using MongoDB aggregation for filtering
async function filterInvoiceByBrandMongo(invoice, brandId) {
  try {
    // If invoice is already found, use JavaScript filtering
    const invoiceObj = invoice.toObject ? invoice.toObject() : invoice;

    if (!invoiceObj.details || !invoiceObj.details.brands) {
      return null;
    }

    // Find brand in the brands array
    const brand = invoiceObj.details.brands.find(
      (b) => b.brand_id === brandId || b.brand_id.toString() === brandId
    );

    if (!brand) {
      return null;
    }

    // Create filtered invoice with the exact same structure
    const filteredInvoice = {
      ...invoiceObj,
      details: {
        ...invoiceObj.details,
        brands: [brand],
      },
      total_commission: brand.total_amount || 0,
      total_amount: brand.total_amount || 0,
      commission_count: brand.affiliates
        ? brand.affiliates.reduce(
            (sum, aff) => sum + (aff.commission_count || 0),
            0
          )
        : 0,
      total_transactions: brand.affiliates
        ? brand.affiliates.reduce(
            (sum, aff) => sum + (aff.commission_count || 0),
            0
          )
        : 0,
      total_brands: 1,
    };

    return filteredInvoice;
  } catch (error) {
    console.error("Filter by brand error:", error);
    return null;
  }
}

module.exports = {
  /**
   * Generate SINGLE monthly invoice for ALL affiliates
   */
  generateSingleMonthlyInvoice: async function (req, res) {
    try {
      console.log(" API: Generating single monthly invoice...");

      const result =
        await SingleMonthlyInvoiceService.generateSingleMonthlyInvoice();

      return res.json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      console.error(" API Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  },

  /**
   * Get monthly invoice details
   */

  getMonthlyInvoice: async function (req, res) {
    try {
      const { month, year, brand_id } = req.query;

      let query = { isDeleted: false };

      if (month && year) {
        query.month = parseInt(month);
        query.year = parseInt(year);
      } else {
        // Get latest invoice
        const latestInvoice = await MonthlyCommissionInvoice.find({
          where: { isDeleted: false },
          sort: "createdAt DESC",
          limit: 1,
        });

        if (latestInvoice.length > 0) {
          // Apply brand filter if provided
          if (brand_id) {
            const filteredInvoice = await filterInvoiceByBrandMongo(
              latestInvoice[0],
              brand_id
            );
            if (filteredInvoice) {
              return res.json({
                success: true,
                invoice: filteredInvoice,
              });
            } else {
              return res.status(404).json({
                success: false,
                error: "Monthly invoice not found for the specified brand",
              });
            }
          }

          return res.json({
            success: true,
            data: latestInvoice[0],
          });
        }
      }

      // Find invoice for specific month/year
      const invoice = await MonthlyCommissionInvoice.findOne(query);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: "Monthly invoice not found",
        });
      }

      // Apply brand filter if provided
      if (brand_id) {
        const filteredInvoice = await filterInvoiceByBrandMongo(
          invoice,
          brand_id
        );
        if (filteredInvoice) {
          let array = [filteredInvoice];
          return res.json({
            success: true,
            data: array,
            total: array.length,
          });
        } else {
          return res.status(404).json({
            success: false,
            error: "Monthly invoice not found for the specified brand",
          });
        }
      }

      let array = [];
      array.push(invoice);
      return res.json({
        success: true,
        data: array,
        total: invoice.length,
      });
    } catch (error) {
      console.error("Error:", error);
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
        sort: "createdAt DESC",
      });

      return res.json({
        success: true,
        total: invoices.length,
        data: invoices,
      });
    } catch (error) {
      console.error("Error:", error);
      return res.serverError(error);
    }
  },
  
  getMonthlyInvoiceStatus: async function (req, res) {
  try {
    const { id, status } = req.body;

    // Validate ID
    if (!id) {
      return res.badRequest({ message: "Invoice id is required" });
    }

    // Allowed status values
    const allowedStatus = ["pending", "processing", "paid", "failed"];

    if (!status || !allowedStatus.includes(status)) {
      return res.badRequest({
        message: `Invalid status. Allowed values: ${allowedStatus.join(", ")}`
      });
    }

    // Find invoice
    const invoice = await MonthlyCommissionInvoice.findOne({
      where: {
        id,
        isDeleted: false
      }
    });

    if (!invoice) {
      return res.notFound({ message: "Monthly invoice not found" });
    }

    // Update only status
    await MonthlyCommissionInvoice.update(
      { status },
      {
        where: { id }
      }
    );

    // Fetch updated invoice
    const updatedInvoice = await MonthlyCommissionInvoice.findOne({
      where: { id }
    });

    return res.json({
      success: true,
      message: "Monthly invoice status updated successfully",
      data: updatedInvoice
    });

  } catch (error) {
    console.error("Error:", error);
    return res.serverError(error);
  }
},

};
