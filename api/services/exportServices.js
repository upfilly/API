const { Parser } = require("json2csv");
const ExcelJS = require("exceljs");
const moment = require("moment");
const ObjectId = require("mongodb").ObjectId;
const { js2xml } = require("xml-js");

module.exports = {
  // Main export function for performance reports
  exportPerformanceReport: async function (req, res) {
    try {
      let {
        format = "csv",
        startDate,
        endDate,
        brand_id,
        affiliate_id,
        campaign,
        search,
        filter,
      } = req.query;

      format = decodeURIComponent(format || "csv")
        .trim()
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase();

      // Set endDate equal to startDate if only startDate is provided
      const adjustedEndDate = endDate || startDate;

      // Fetch only the necessary data
      const [clickAnalyticsData, reportAnalyticsData] = await Promise.all([
        this.getClickAnalyticsData(req, startDate, adjustedEndDate),
        this.getReportAnalyticsData(req, startDate, adjustedEndDate),
      ]);

      // Generate daily data for complete month
      const dailyData = this.generateDailyData(
        clickAnalyticsData,
        reportAnalyticsData,
        startDate,
        adjustedEndDate,
        filter,
      );

      if (format === "excel") {
        return await this.exportToExcel(
          res,
          dailyData,
          startDate,
          adjustedEndDate,
          filter,
        );
      } else if (format === "xml") {
        return await this.exportToXML(
          res,
          dailyData,
          startDate,
          adjustedEndDate,
          filter,
        );
      } else {
        return await this.exportToCSV(
          res,
          dailyData,
          startDate,
          adjustedEndDate,
          filter,
        );
      }
    } catch (error) {
      console.error("Export error:", error);
      return res.serverError("Failed to export performance report");
    }
  },

  // Generate daily data for complete month in YYYY-MM-DD format
  generateDailyData: function (
    clickData,
    reportData,
    startDate,
    endDate,
    filter,
  ) {
    try {
      // Get date range
      let dateRange;
      if (startDate && endDate) {
        dateRange = {
          start: moment(startDate),
          end: moment(endDate),
        };
      } else {
        const range = this.getDateRange(filter);
        dateRange = {
          start: moment(range.startDate),
          end: moment(range.endDate),
        };
      }

      // Generate all dates in the range
      const dates = [];
      let currentDate = dateRange.start.clone();

      while (currentDate <= dateRange.end) {
        dates.push(currentDate.format("YYYY-MM-DD"));
        currentDate = currentDate.clone().add(1, "days");
      }

      // Extract daily data from analytics
      const dailyClicks = this.extractDailyClicks(clickData);
      const dailySales = this.extractDailySales(reportData);

      // Combine data for all dates
      const dailyData = dates.map((date) => {
        const clicks = dailyClicks[date] || 0;
        const sales = dailySales[date] || 0;
        const conversionRate = clicks > 0 ? (sales / clicks) * 100 : 0;

        return {
          Date: date,
          Clicks: clicks,
          Sales: sales,
          "Conversion Rate": `${conversionRate.toFixed(2)}%`,
        };
      });

      return dailyData;
    } catch (error) {
      console.error("Error generating daily data:", error);
      return [
        {
          Date: moment().format("YYYY-MM-DD"),
          Clicks: 0,
          Sales: 0,
          "Conversion Rate": "0.00%",
        },
      ];
    }
  },

  // Extract daily clicks from click analytics data
  extractDailyClicks: function (clickData) {
    const dailyClicks = {};

    if (clickData && clickData.data && clickData.data.length > 0) {
      clickData.data.forEach((item) => {
        if (item.clicks && Array.isArray(item.clicks)) {
          item.clicks.forEach((click) => {
            if (click.createdAt) {
              const dateKey = moment(click.createdAt).format("YYYY-MM-DD");
              dailyClicks[dateKey] =
                (dailyClicks[dateKey] || 0) + (click.count || 0);
            }
          });
        }
      });
    }

    return dailyClicks;
  },

  // Extract daily sales from report analytics data
  extractDailySales: function (reportData) {
    const dailySales = {};

    if (reportData && reportData.data && reportData.data.length > 0) {
      reportData.data.forEach((item) => {
        if (item.actions && Array.isArray(item.actions)) {
          item.actions.forEach((action) => {
            if (action.createdAt) {
              const dateKey = moment(action.createdAt).format("YYYY-MM-DD");
              dailySales[dateKey] =
                (dailySales[dateKey] || 0) + (action.action || 0);
            }
          });
        }
      });
    }

    return dailySales;
  },

  // API 2: Click Analytics Data - Modified to accept date parameters
  getClickAnalyticsData: async function (req, startDate, endDate) {
    try {
      let query = {};
      let { affiliate_id, brand_id, campaign, filter } = req.query;

      query.isDeleted = false;

      // Date filtering logic - use provided dates or filter
      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      } else {
        const dateRange = this.getDateRange(filter);
        query.createdAt = {
          $gte: dateRange.startDate,
          $lte: dateRange.endDate,
        };
      }

      if (affiliate_id) {
        affiliate_id = await Services.Utils.string_to_array(affiliate_id);
        query.affiliate_id = { $in: affiliate_id };
      }

      if (brand_id) {
        brand_id = await Services.Utils.string_to_array(brand_id);
        query.brand_id = { $in: brand_id };
      }

      if (campaign) {
        campaign = await Services.Utils.string_to_array(campaign);
        query.campaignId = { $in: campaign };
      }

      const pipeline = [
        {
          $match: query,
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
            },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            date: "$_id.date",
            count: 1,
            _id: 0,
          },
        },
        { $sort: { date: 1 } },
      ];

      const result = await Cookies.native(function (err, collection) {
        if (err) {
          console.error("Error getting native collection:", err);
          return [];
        }
        return collection.aggregate(pipeline).toArray();
      });

      // Format the result for easier processing
      const formattedResult = {
        data: [
          {
            clicks: result.map((item) => ({
              createdAt: item.date,
              count: item.count,
            })),
          },
        ],
      };

      return { data: formattedResult.data || [] };
    } catch (error) {
      console.error("Error fetching click analytics:", error);
      return { data: [] };
    }
  },

  // API 3: Report Analytics Data - Modified to accept date parameters
  getReportAnalyticsData: async function (req, startDate, endDate) {
    try {
      let query = { isDeleted: false };
      let { affiliate_id, brand_id, campaign } = req.query;

      // Date filtering logic - use provided dates or filter
      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      if (affiliate_id) {
        affiliate_id = await Services.Utils.string_to_array(affiliate_id);
        query.affiliate_id = { $in: affiliate_id };
      }

      if (brand_id) {
        brand_id = await Services.Utils.string_to_array(brand_id);
        query.brand_id = { $in: brand_id };
      }

      if (campaign) {
        campaign = await Services.Utils.string_to_array(campaign);
        query.campaignId = { $in: campaign };
      }

      const pipeline = [
        {
          $match: query,
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
            },
            sales: {
              $sum: {
                $cond: [{ $ne: ["$order_id", ""] }, 1, 0],
              },
            },
          },
        },
        {
          $project: {
            date: "$_id.date",
            sales: 1,
            _id: 0,
          },
        },
        { $sort: { date: 1 } },
      ];

      const result = await AffiliateLink.native(function (err, collection) {
        if (err) {
          console.error("Error getting native collection:", err);
          return [];
        }
        return collection.aggregate(pipeline).toArray();
      });

      // Format the result for easier processing
      const formattedResult = {
        data: [
          {
            actions: result.map((item) => ({
              createdAt: item.date,
              action: item.sales,
            })),
          },
        ],
      };

      return { data: formattedResult.data || [] };
    } catch (error) {
      console.error("Error fetching report analytics:", error);
      return { data: [] };
    }
  },

  // Date range helper
  getDateRange: function (filterType) {
    let startDate, endDate;

    switch (filterType) {
      case "this_week":
        startDate = moment().startOf("week").toDate();
        endDate = moment().endOf("week").toDate();
        break;
      case "last_week":
        startDate = moment().subtract(1, "week").startOf("week").toDate();
        endDate = moment().subtract(1, "week").endOf("week").toDate();
        break;
      case "this_month":
        startDate = moment().startOf("month").toDate();
        endDate = moment().endOf("month").toDate();
        break;
      case "last_month":
        startDate = moment().subtract(1, "month").startOf("month").toDate();
        endDate = moment().subtract(1, "month").endOf("month").toDate();
        break;
      case "this_year":
        startDate = moment().startOf("year").toDate();
        endDate = moment().endOf("year").toDate();
        break;
      case "last_year":
        startDate = moment().subtract(1, "year").startOf("year").toDate();
        endDate = moment().subtract(1, "year").endOf("year").toDate();
        break;
      default:
        startDate = moment().startOf("month").toDate();
        endDate = moment().endOf("month").toDate();
    }

    return { startDate, endDate };
  },

  // exportToExcel: async function (res, data, startDate, endDate, filter) {
  //   try {
  //     const workbook = new ExcelJS.Workbook();

  //     // Set workbook properties for better compatibility
  //     workbook.creator = "Performance Report System";
  //     workbook.lastModifiedBy = "System";
  //     workbook.created = new Date();
  //     workbook.modified = new Date();

  //     const worksheet = workbook.addWorksheet("Daily Performance Report");

  //     // Merge cells for title
  //     worksheet.mergeCells("A1:D1");
  //     const titleCell = worksheet.getCell("A1");
  //     titleCell.value = "DAILY PERFORMANCE REPORT";
  //     titleCell.font = { bold: true, size: 14 };
  //     titleCell.alignment = {
  //       vertical: "middle",
  //       horizontal: "center",
  //       wrapText: true,
  //     };
  //     titleCell.fill = {
  //       type: "pattern",
  //       pattern: "solid",
  //       fgColor: { argb: "FFE7E6E6" },
  //     };
  //     worksheet.getRow(1).height = 25;

  //     // Add report period
  //     const reportPeriod =
  //       startDate && endDate
  //         ? `${moment(startDate).format("YYYY-MM-DD")} to ${moment(endDate).format("YYYY-MM-DD")}`
  //         : "Current Month";

  //     worksheet.mergeCells("A2:D2");
  //     const periodCell = worksheet.getCell("A2");
  //     periodCell.value = `Report Period: ${reportPeriod}`;
  //     periodCell.font = { bold: true, size: 11 };
  //     periodCell.alignment = {
  //       vertical: "middle",
  //       horizontal: "center",
  //       wrapText: true,
  //     };
  //     worksheet.getRow(2).height = 20;

  //     // Add report generated timestamp
  //     worksheet.mergeCells("A3:D3");
  //     const timestampCell = worksheet.getCell("A3");
  //     timestampCell.value = `Report Generated: ${moment().format("YYYY-MM-DD HH:mm:ss")}`;
  //     timestampCell.font = { size: 10 };
  //     timestampCell.alignment = {
  //       vertical: "middle",
  //       horizontal: "center",
  //       wrapText: true,
  //     };
  //     worksheet.getRow(3).height = 20;

  //     worksheet.addRow([]); // Empty row

  //     // Add headers with better styling
  //     const headers = ["Date", "Clicks", "Sales", "Conversion Rate"];
  //     const headerRow = worksheet.addRow(headers);

  //     // Style header row with consistent height
  //     headerRow.height = 25;
  //     headerRow.eachCell((cell) => {
  //       cell.fill = {
  //         type: "pattern",
  //         pattern: "solid",
  //         fgColor: { argb: "FF4472C4" },
  //       };
  //       cell.font = {
  //         color: { argb: "FFFFFFFF" },
  //         bold: true,
  //         size: 11,
  //       };
  //       cell.border = {
  //         top: { style: "thin" },
  //         left: { style: "thin" },
  //         bottom: { style: "thin" },
  //         right: { style: "thin" },
  //       };
  //       cell.alignment = {
  //         vertical: "middle",
  //         horizontal: "center",
  //         wrapText: true,
  //       };
  //     });

  //     // Add data rows with consistent formatting
  //     if (data && data.length > 0) {
  //       data.forEach((row, index) => {
  //         const rowData = [
  //           row["Date"],
  //           row["Clicks"],
  //           row["Sales"],
  //           row["Conversion Rate"],
  //         ];
  //         const dataRow = worksheet.addRow(rowData);

  //         // Set consistent row height
  //         dataRow.height = 20;

  //         // Apply consistent styling to all cells
  //         dataRow.eachCell((cell) => {
  //           // Alternating row colors for better readability
  //           if (index % 2 === 0) {
  //             cell.fill = {
  //               type: "pattern",
  //               pattern: "solid",
  //               fgColor: { argb: "FFF5F5F5" },
  //             };
  //           }

  //           cell.border = {
  //             top: { style: "thin" },
  //             left: { style: "thin" },
  //             bottom: { style: "thin" },
  //             right: { style: "thin" },
  //           };

  //           cell.alignment = {
  //             vertical: "middle",
  //             horizontal: "center",
  //             wrapText: true, // Enable text wrapping for long text
  //           };

  //           cell.font = { size: 10 };
  //         });
  //       });

  //       // Add total row
  //       const totalClicks = data.reduce((sum, row) => sum + row["Clicks"], 0);
  //       const totalSales = data.reduce((sum, row) => sum + row["Sales"], 0);
  //       const totalConversionRate =
  //         totalClicks > 0 ? (totalSales / totalClicks) * 100 : 0;

  //       worksheet.addRow([]); // Empty row
  //       const totalRow = worksheet.addRow([
  //         "TOTAL",
  //         totalClicks,
  //         totalSales,
  //         `${totalConversionRate.toFixed(2)}%`,
  //       ]);

  //       // Style total row with consistent height
  //       totalRow.height = 25;
  //       totalRow.eachCell((cell) => {
  //         cell.font = { bold: true, size: 11 };
  //         cell.fill = {
  //           type: "pattern",
  //           pattern: "solid",
  //           fgColor: { argb: "FFD9D9D9" },
  //         };
  //         cell.border = {
  //           top: { style: "medium" },
  //           left: { style: "thin" },
  //           bottom: { style: "medium" },
  //           right: { style: "thin" },
  //         };
  //         cell.alignment = {
  //           vertical: "middle",
  //           horizontal: "center",
  //           wrapText: true,
  //         };
  //       });
  //     } else {
  //       const noDataRow = worksheet.addRow(["No data available", "", "", ""]);
  //       worksheet.mergeCells(`A${noDataRow.number}:D${noDataRow.number}`);
  //       noDataRow.height = 25;
  //       noDataRow.getCell(1).alignment = {
  //         vertical: "middle",
  //         horizontal: "center",
  //         wrapText: true,
  //       };
  //       noDataRow.getCell(1).font = { italic: true };
  //     }

  //     // Set FIXED column widths for consistency across all platforms
  //     worksheet.getColumn(1).width = 18; // Date
  //     worksheet.getColumn(2).width = 18; // Clicks
  //     worksheet.getColumn(3).width = 18; // Sales
  //     worksheet.getColumn(4).width = 18; // Conversion Rate

  //     // Set response headers with proper MIME type
  //     const timestamp = moment().format("YYYY-MM-DD");
  //     res.setHeader(
  //       "Content-Type",
  //       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  //     );
  //     res.setHeader(
  //       "Content-Disposition",
  //       `attachment; filename="daily_performance_${timestamp}.xlsx"`,
  //     );

  //     // Prevent caching
  //     res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  //     res.setHeader("Pragma", "no-cache");
  //     res.setHeader("Expires", "0");

  //     // Write to buffer first, then send
  //     const buffer = await workbook.xlsx.writeBuffer();
  //     res.send(buffer);
  //   } catch (error) {
  //     console.error("Excel export error:", error);
  //     throw new Error("Excel export failed: " + error.message);
  //   }
  // },

  exportToExcel: async function (res, data, startDate, endDate, filter) {
    try {
      const workbook = new ExcelJS.Workbook();

      const worksheet = workbook.addWorksheet("Daily Performance Report");

      // Use RGB instead of ARGB for better compatibility
      worksheet.mergeCells("A1:D1");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = "DAILY PERFORMANCE REPORT";
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "E7E6E6" }, // Removed FF prefix
      };
      worksheet.getRow(1).height = 25;

      const reportPeriod =
        startDate && endDate
          ? `${moment(startDate).format("YYYY-MM-DD")} to ${moment(endDate).format("YYYY-MM-DD")}`
          : "Current Month";

      worksheet.mergeCells("A2:D2");
      const periodCell = worksheet.getCell("A2");
      periodCell.value = `Report Period: ${reportPeriod}`;
      periodCell.font = { bold: true, size: 11 };
      periodCell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      worksheet.getRow(2).height = 20;

      worksheet.mergeCells("A3:D3");
      const timestampCell = worksheet.getCell("A3");
      timestampCell.value = `Report Generated: ${moment().format("YYYY-MM-DD HH:mm:ss")}`;
      timestampCell.font = { size: 10 };
      timestampCell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      worksheet.getRow(3).height = 20;

      worksheet.addRow([]);

      const headers = ["Date", "Clicks", "Sales", "Conversion Rate"];
      const headerRow = worksheet.addRow(headers);

      headerRow.height = 25;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "4472C4" }, // Removed FF prefix
        };
        cell.font = {
          color: { argb: "FFFFFF" }, // Removed FF prefix
          bold: true,
          size: 11,
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
      });

      if (data && data.length > 0) {
        data.forEach((row, index) => {
          const rowData = [
            row["Date"],
            row["Clicks"],
            row["Sales"],
            row["Conversion Rate"],
          ];
          const dataRow = worksheet.addRow(rowData);

          dataRow.height = 20;

          dataRow.eachCell((cell) => {
            if (index % 2 === 0) {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "F5F5F5" }, // Removed FF prefix
              };
            }

            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };

            cell.alignment = {
              vertical: "middle",
              horizontal: "center",
              wrapText: true,
            };

            cell.font = { size: 10 };
          });
        });

        const totalClicks = data.reduce((sum, row) => sum + row["Clicks"], 0);
        const totalSales = data.reduce((sum, row) => sum + row["Sales"], 0);
        const totalConversionRate =
          totalClicks > 0 ? (totalSales / totalClicks) * 100 : 0;

        worksheet.addRow([]);
        const totalRow = worksheet.addRow([
          "TOTAL",
          totalClicks,
          totalSales,
          `${totalConversionRate.toFixed(2)}%`,
        ]);

        totalRow.height = 25;
        totalRow.eachCell((cell) => {
          cell.font = { bold: true, size: 11 };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "D9D9D9" }, // Removed FF prefix
          };
          cell.border = {
            top: { style: "medium" },
            left: { style: "thin" },
            bottom: { style: "medium" },
            right: { style: "thin" },
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
          };
        });
      } else {
        const noDataRow = worksheet.addRow(["No data available", "", "", ""]);
        worksheet.mergeCells(`A${noDataRow.number}:D${noDataRow.number}`);
        noDataRow.height = 25;
        noDataRow.getCell(1).alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
        noDataRow.getCell(1).font = { italic: true };
      }

      worksheet.getColumn(1).width = 18;
      worksheet.getColumn(2).width = 18;
      worksheet.getColumn(3).width = 18;
      worksheet.getColumn(4).width = 18;

      const timestamp = moment().format("YYYY-MM-DD");
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="daily_performance_${timestamp}.xlsx"`,
      );
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      // Write directly to response for better LibreOffice compatibility
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Excel export error:", error);
      throw new Error("Excel export failed: " + error.message);
    }
  },

  exportToCSV: async function (res, data, startDate, endDate, filter) {
    try {
      const timestamp = moment().format("YYYY-MM-DD");
      let csvData = [];

      // Format dates
      const start = startDate ? moment(startDate).format("YYYY-MM-DD") : "";
      const end = endDate ? moment(endDate).format("YYYY-MM-DD") : "";
      const reportPeriod =
        start && end ? `${start} to ${end}` : "Current Month";

      // === HEADER SECTION - Clean and minimal ===
      csvData.push('"Daily Performance Report"');
      csvData.push(`"Period: ${reportPeriod}"`);
      csvData.push(`"Generated: ${moment().format("YYYY-MM-DD HH:mm")}"`);
      csvData.push('""'); // Empty line

      // === COLUMN HEADERS ===
      csvData.push('"Date","Clicks","Sales","Conv. Rate"');

      // === DATA ROWS ===
      if (data && data.length > 0) {
        // Track max values for formatting (optional)
        let maxClicks = 0;
        let maxSales = 0;

        data.forEach((row) => {
          const clicks = row["Clicks"] || 0;
          const sales = row["Sales"] || 0;
          maxClicks = Math.max(maxClicks, clicks);
          maxSales = Math.max(maxSales, sales);
        });

        data.forEach((row) => {
          const date = row["Date"]
            ? moment(row["Date"]).format("YYYY-MM-DD")
            : "";
          const clicks = row["Clicks"] || 0;
          const sales = row["Sales"] || 0;

          // Calculate conversion rate
          let conversionRate = "0.00%";
          if (row["Conversion Rate"]) {
            conversionRate = row["Conversion Rate"].toString().includes("%")
              ? row["Conversion Rate"]
              : parseFloat(row["Conversion Rate"]).toFixed(2) + "%";
          } else if (clicks > 0) {
            conversionRate = ((sales / clicks) * 100).toFixed(2) + "%";
          }

          csvData.push(`"${date}",${clicks},${sales},"${conversionRate}"`);
        });

        // Calculate totals
        const totalClicks = data.reduce(
          (sum, row) => sum + (row["Clicks"] || 0),
          0,
        );
        const totalSales = data.reduce(
          (sum, row) => sum + (row["Sales"] || 0),
          0,
        );
        const totalConversionRate =
          totalClicks > 0
            ? ((totalSales / totalClicks) * 100).toFixed(2) + "%"
            : "0.00%";

        // Empty line before totals
        csvData.push('""');

        // Totals row
        csvData.push(
          `"TOTAL",${totalClicks},${totalSales},"${totalConversionRate}"`,
        );
      } else {
        csvData.push('"No data available for the selected period"');
      }

      // Join with proper line endings
      const finalCSV = csvData.join("\r\n");

      // Add UTF-8 BOM for Excel compatibility
      const BOM = "\uFEFF";
      const csvWithBOM = BOM + finalCSV;

      // Set response headers
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="daily_performance_${timestamp}.csv"`,
      );

      return res.send(csvWithBOM);
    } catch (error) {
      console.error("CSV export error:", error);
      throw new Error("CSV export failed: " + error.message);
    }
  },

  exportToXML: async function (res, data, startDate, endDate, filter) {
    try {
      const timestamp = moment().format("YYYY-MM-DD");

      // Calculate totals
      let totalClicks = 0;
      let totalSales = 0;

      if (data && data.length > 0) {
        totalClicks = data.reduce((sum, row) => sum + row["Clicks"], 0);
        totalSales = data.reduce((sum, row) => sum + row["Sales"], 0);
      }

      const totalConversionRate =
        totalClicks > 0 ? (totalSales / totalClicks) * 100 : 0;

      // Convert data to XML structure with daily data (no summary section)
      const xmlData = {
        _declaration: {
          _attributes: {
            version: "1.0",
            encoding: "UTF-8",
          },
        },
        DailyPerformanceReport: {
          _attributes: {
            generatedBy: "Performance Report System",
            timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
          },
          ReportInfo: {
            Title: {
              _text: "Daily Performance Report",
            },
            ExportDate: {
              _text: moment().format("YYYY-MM-DD"),
            },
            ExportTime: {
              _text: moment().format("HH:mm:ss"),
            },
            ReportPeriod: {
              _attributes: {
                start: startDate
                  ? moment(startDate).format("YYYY-MM-DD")
                  : "N/A",
                end: endDate ? moment(endDate).format("YYYY-MM-DD") : "N/A",
              },
              _text:
                startDate && endDate
                  ? `${moment(startDate).format("YYYY-MM-DD")} to ${moment(endDate).format("YYYY-MM-DD")}`
                  : "Current Month",
            },
          },
          DailyData: {
            _attributes: {
              totalRecords: data && data.length > 0 ? data.length : 0,
            },
            Record:
              data && data.length > 0
                ? data.map((item, index) => ({
                    _attributes: {
                      id: index + 1,
                      date: item["Date"],
                    },
                    Date: {
                      _text: item["Date"],
                    },
                    Clicks: {
                      _text: item["Clicks"],
                    },
                    Sales: {
                      _text: item["Sales"],
                    },
                    ConversionRate: {
                      _text: item["Conversion Rate"],
                    },
                  }))
                : [
                    {
                      _attributes: {
                        id: 0,
                      },
                      Date: {
                        _text: "No data available",
                      },
                      Clicks: {
                        _text: "0",
                      },
                      Sales: {
                        _text: "0",
                      },
                      ConversionRate: {
                        _text: "0%",
                      },
                    },
                  ],
          },
          Total: {
            TotalClicks: {
              _text: totalClicks,
            },
            TotalSales: {
              _text: totalSales,
            },
            TotalConversionRate: {
              _text: `${totalConversionRate.toFixed(2)}%`,
            },
          },
        },
      };

      // Convert to XML with proper formatting
      const xml = js2xml(xmlData, {
        compact: true,
        spaces: 2,
        ignoreComment: true,
        fullTagEmptyElement: false,
      });

      // Set response headers with proper charset
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="daily_performance_${timestamp}.xml"`,
      );

      // Prevent caching
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      return res.send(xml);
    } catch (error) {
      console.error("XML export error:", error);
      throw new Error("XML export failed: " + error.message);
    }
  },
};
