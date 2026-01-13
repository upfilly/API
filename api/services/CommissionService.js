module.exports = {
// getAggregatedMonthlyCommissions: async function (month, year) {
//   try {
//     console.log(`\nAggregating commissions for ${month}/${year}`);

//     //  Date range (UTC, DB-safe)
//     const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
//       .toISOString()
//       .replace("Z", "+00:00");

//     const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
//       .toISOString()
//       .replace("Z", "+00:00");

//     console.log("startDate:", startDate);
//     console.log("endDate:", endDate);

//     //  Fetch commissions
//     const allCommissions = await Transactions.find({
//       where: {
//         transaction_type: "pay_commission",
//         commission_invoiced: false,
//         createdAt: {
//           ">=": new Date(startDate),
//           "<=": new Date(endDate),
//         },
//       },
//     }).populate("affiliateLinkId");

//     console.log(`Found ${allCommissions.length} commissions`);

//     if (allCommissions.length === 0) {
//       return {
//         month,
//         year,
//         month_name: this.getMonthName(month),
//         total_commissions: 0,
//         total_amount: 0,
//         affiliate_count: 0,
//         affiliates: [],
//         commission_details: [],
//         all_commissions: [],
//       };
//     }

//     // Aggregation containers
//     const affiliateMap = new Map();
//     const commissionDetails = [];
//     let grandTotal = 0;

//     // CORRECT async-safe loop
//     for (const commission of allCommissions) {
//       const affiliateId = commission.affiliateLinkId?.affiliate_id;
//       if (!affiliateId) continue;

//       // Create affiliate once
//     //   if (!affiliateMap.has(affiliateId)) {
//       const brandId = commission.affiliateLinkId?.brand_id;
//         const affiliateData = await Users.findOne({ id: affiliateId });
//         const brandIdData = await Users.findOne({ id: brandId });


//         affiliateMap.set(affiliateId, {
//           affiliate_id: affiliateId,
//           affiliate_email: affiliateData?.email || "unknown@example.com",
//           affiliate_name: affiliateData?.fullName || "Unknown",
//           total_amount: 0,
//           commission_count: 0,
//           commissions: [],
//         });
//     //   }

//       const affiliate = affiliateMap.get(affiliateId);
//       const amount = Number(commission.amount || 0);

//       affiliate.total_amount += amount;
//       affiliate.commission_count += 1;
//       affiliate.commissions.push(commission);

//       commissionDetails.push({
//         transaction_id: commission.id,
//         affiliate_id: affiliateId,
//         affiliate_email: affiliate.affiliate_email,
//         affiliate_name: affiliate.affiliate_name,
//         commission_count : affiliate.commission_count,
//         amount,
//         date: commission.createdAt,
//         affiliate_link_id: commission.affiliateLinkId?.id,
//       });

//       grandTotal += amount;
//     }

//     //Convert Map → Array + sort
//     const affiliates = Array.from(affiliateMap.values()).sort(
//       (a, b) => b.total_amount - a.total_amount
//     );

//     console.log("Aggregated affiliates:", affiliates.length);

//     //  Final response
//     return {
//       month,
//       year,
//       month_name: this.getMonthName(month),
//       total_commissions: allCommissions.length,
//       total_amount: grandTotal,
//       affiliate_count: affiliates.length,
//       affiliates,
//       commission_details: commissionDetails,
//       all_commissions: allCommissions,
//     };

//   } catch (error) {
//     console.error("Error aggregating monthly commissions:", error);
//     throw error;
//   }
// },

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

    // Aggregation containers - now grouping by brand ID
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
        
        if (activeSubscription && activeSubscription.subscription_plan_id) {
          commissionOverride = activeSubscription.subscription_plan_id.commission_override || 0;
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
          // Store affiliates under this brand for detailed reporting
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
        affiliate_email: brand.affiliates.get(affiliateId)?.affiliate_email || "unknown",
        affiliate_name: brand.affiliates.get(affiliateId)?.affiliate_name || "Unknown",
        amount,
        date: commission.createdAt,
        affiliate_link_id: commission.affiliateLinkId?.id,
      });
    }

    // Calculate upfilly fee and totals for each brand
    const brands = Array.from(brandMap.values()).map(brand => {
      // Calculate upfilly fee based on commission override
      const upfillyFee = (brand.commission_override / 100) * brand.total_amount;
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
        // Convert affiliate Map to Array
        affiliates: Array.from(brand.affiliates.values()).map(affiliate => ({
          affiliate_id: affiliate.affiliate_id,
          affiliate_email: affiliate.affiliate_email,
          affiliate_name: affiliate.affiliate_name,
          total_amount: parseFloat(affiliate.total_amount.toFixed(2)),
          commission_count: affiliate.commission_count,
        })),
      };
    });

    // Sort brands by total amount (descending)
    brands.sort((a, b) => b.total_amount - a.total_amount);

    console.log(`Aggregated brands: ${brands.length}`);

    // Final response - now grouped by brand
    return {
      month,
      year,
      month_name: this.getMonthName(month),
      total_orders: allCommissions.length,
      total_amount: parseFloat(brands.reduce((sum, brand) => sum + brand.total_amount, 0).toFixed(2)),
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
        // transaction_status: "invoiced",
      });

      console.log(`Marked ${commissionIds.length} commissions as invoiced`);
    } catch (error) {
      console.error("Error marking commissions as invoiced:", error);
      throw error;
    }
  },

  // ... rest of your existing code ...
};
