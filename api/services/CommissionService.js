module.exports = {
getAggregatedMonthlyCommissions: async function (month, year) {
  try {
    console.log(`\nAggregating commissions for ${month}/${year}`);

    //  Date range (UTC, DB-safe)
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
      .toISOString()
      .replace("Z", "+00:00");

    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
      .toISOString()
      .replace("Z", "+00:00");

    console.log("startDate:", startDate);
    console.log("endDate:", endDate);

    //  Fetch commissions
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
        total_commissions: 0,
        total_amount: 0,
        affiliate_count: 0,
        affiliates: [],
        commission_details: [],
        all_commissions: [],
      };
    }

    // Aggregation containers
    const affiliateMap = new Map();
    const commissionDetails = [];
    let grandTotal = 0;

    // CORRECT async-safe loop
    for (const commission of allCommissions) {
      const affiliateId = commission.affiliateLinkId?.affiliate_id;
      if (!affiliateId) continue;

      // Create affiliate once
    //   if (!affiliateMap.has(affiliateId)) {
        const affiliateData = await Users.findOne({ id: affiliateId });

        affiliateMap.set(affiliateId, {
          affiliate_id: affiliateId,
          affiliate_email: affiliateData?.email || "unknown@example.com",
          affiliate_name: affiliateData?.fullName || "Unknown",
          total_amount: 0,
          commission_count: 0,
          commissions: [],
        });
    //   }

      const affiliate = affiliateMap.get(affiliateId);
      const amount = Number(commission.amount || 0);

      affiliate.total_amount += amount;
      affiliate.commission_count += 1;
      affiliate.commissions.push(commission);

      commissionDetails.push({
        transaction_id: commission.id,
        affiliate_id: affiliateId,
        affiliate_email: affiliate.affiliate_email,
        affiliate_name: affiliate.affiliate_name,
        commission_count : affiliate.commission_count,
        amount,
        date: commission.createdAt,
        affiliate_link_id: commission.affiliateLinkId?.id,
      });

      grandTotal += amount;
    }

    //Convert Map → Array + sort
    const affiliates = Array.from(affiliateMap.values()).sort(
      (a, b) => b.total_amount - a.total_amount
    );

    console.log("Aggregated affiliates:", affiliates.length);

    //  Final response
    return {
      month,
      year,
      month_name: this.getMonthName(month),
      total_commissions: allCommissions.length,
      total_amount: grandTotal,
      affiliate_count: affiliates.length,
      affiliates,
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
   * Group commissions by affiliate
   */
  groupCommissionsByAffiliate: function (commissions) {
    const grouped = {};

    commissions.forEach((commission) => {
      const affiliateId = commission.user_id?.id || "unknown";

      if (!grouped[affiliateId]) {
        grouped[affiliateId] = {
          affiliate: commission.user_id,
          commissions: [],
          totalAmount: 0,
          details: [],
        };
      }

      grouped[affiliateId].commissions.push(commission);
      grouped[affiliateId].totalAmount += parseFloat(commission.amount || 0);

      // Get campaign details for the invoice
      let campaignName = "Unknown Campaign";
      if (commission.affiliateLinkId) {
        // We'll need to fetch campaign details separately
        grouped[affiliateId].details.push({
          transaction_id: commission.id,
          amount: parseFloat(commission.amount || 0),
          date: commission.createdAt,
          affiliate_link_id: commission.affiliateLinkId,
          invoice_url: commission.custom_invoice_url,
        });
      }
    });

    return grouped;
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
        transaction_status: "invoiced",
      });

      console.log(`Marked ${commissionIds.length} commissions as invoiced`);
    } catch (error) {
      console.error("Error marking commissions as invoiced:", error);
      throw error;
    }
  },

  // ... rest of your existing code ...
};
