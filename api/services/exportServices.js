/**
 * AnalyticsController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const Services = require("../services/index");
const ExcelJS = require("exceljs");
const moment = require("moment");
const ObjectId = require("mongodb").ObjectId;
const { js2xml } = require("xml-js");

module.exports = {
  exportPerformanceReport: async function (req, res) {
    try {
      let {
        format = "csv",
        startDate,
        endDate,
        startDate2,
        endDate2,
        brand_id,
        affiliate_id,
        campaign,
        search,
        filter,
        status,
        isDeleted,
      } = req.query;

      format = decodeURIComponent(format || "csv")
        .trim()
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase();

      const adjustedEndDate = endDate || startDate;
      const adjustedEndDate2 = endDate2 || startDate2;

      // ── Build the SAME base query as reportAnalytics ──────────────────────────
      const baseQuery = await this._buildBaseQuery(req);

      // ── Primary period ─────────────────────────────────────────────────────────
      const analyticsData = await this._runPipeline(
        baseQuery,
        startDate,
        adjustedEndDate,
      );

      // ── Comparison period (skip if dates missing / empty) ──────────────────────
      const hasCompareDates =
        startDate2 &&
        endDate2 &&
        startDate2.toString().trim() !== "" &&
        endDate2.toString().trim() !== "";

      const analyticsData2 = hasCompareDates
        ? await this._runPipeline(baseQuery, startDate2, adjustedEndDate2)
        : { revenue: [], actions: [], conversions: [] };

      // ── Generate row arrays ────────────────────────────────────────────────────
      const dailyData = this.generateDailyData(
        analyticsData,
        startDate,
        adjustedEndDate,
        filter,
      );
      const dailyData2 = hasCompareDates
        ? this.generateDailyData(
            analyticsData2,
            startDate2,
            adjustedEndDate2,
            filter,
          )
        : [];

      // ── Dispatch to format handler ─────────────────────────────────────────────
      if (format === "excel") {
        return await this.exportToExcel(
          res,
          dailyData,
          dailyData2,
          startDate,
          adjustedEndDate,
          startDate2,
          adjustedEndDate2,
          filter,
        );
      } else if (format === "xml") {
        return await this.exportToXML(
          res,
          dailyData,
          dailyData2,
          startDate,
          adjustedEndDate,
          startDate2,
          adjustedEndDate2,
          filter,
        );
      } else {
        return await this.exportToCSV(
          res,
          dailyData,
          dailyData2,
          startDate,
          adjustedEndDate,
          startDate2,
          adjustedEndDate2,
          filter,
        );
      }
    } catch (error) {
      console.error("Export error:", error);
      return res.serverError("Failed to export performance report");
    }
  },

  _buildBaseQuery: async function (req) {
    let { search, status, isDeleted, brand_id, affiliate_id, campaign } =
      req.query;

    const query = { isDeleted: isDeleted === "true" };

    if (search) {
      search = Services.Utils.remove_special_char_exept_underscores(search);
      query.$or = [
        { event: { $regex: search, $options: "i" } },
        { "urlParams.page": { $regex: search, $options: "i" } },
        { "data.page": { $regex: search, $options: "i" } },
      ];
    }

    if (status) query.status = status;

    if (brand_id && brand_id.toString().trim() !== "") {
      const arr = await Services.Utils.string_to_array(brand_id);
      const filtered = arr.filter((id) => id && id.toString().trim() !== "");
      if (filtered.length > 0)
        query.brand_id = { $in: filtered.map((id) => new ObjectId(id)) };
    }

    if (affiliate_id && affiliate_id.toString().trim() !== "") {
      const arr = await Services.Utils.string_to_array(affiliate_id);
      const filtered = arr.filter((id) => id && id.toString().trim() !== "");
      if (filtered.length > 0)
        query.affiliate_id = { $in: filtered.map((id) => new ObjectId(id)) };
    }

    if (campaign && campaign.toString().trim() !== "") {
      const arr = await Services.Utils.string_to_array(campaign);
      const filtered = arr.filter((id) => id && id.toString().trim() !== "");
      if (filtered.length > 0)
        query.campaignId = { $in: filtered.map((id) => new ObjectId(id)) };
    }

    return query;
  },

  _runPipeline: async function (baseQuery, startDate, endDate) {
    try {
      const db = sails.getDatastore().manager;
      const query = { ...baseQuery };

      if (
        startDate &&
        endDate &&
        startDate.toString().trim() !== "" &&
        endDate.toString().trim() !== ""
      ) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: start, $lte: end };
      }

      console.log("Export pipeline query:", JSON.stringify(query, null, 2));

      const baseStages = [
        {
          $project: {
            id: "$_id",
            affiliate_id: 1,
            brand_id: 1,
            order_id: {
              $cond: { if: "$order_id", then: "$order_id", else: null },
            },
            currency: 1,
            price: 1,
            campaignId: 1,
            event: 1,
            isDeleted: 1,
            status: 1,
            createdAt: 1,
            day: { $dayOfMonth: "$createdAt" },
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
        },
      ];

      const facetBlock = {
        $facet: {
          total_docs: [{ $count: "total_docs" }],

          revenue: [
            {
              $group: {
                _id: { day: "$day", month: "$month", year: "$year" },
                price: { $sum: "$price" },
                createdAt: { $first: "$createdAt" },
              },
            },
          ],

          actions: [
            {
              $group: {
                _id: { day: "$day", month: "$month", year: "$year" },
                createdAt: { $first: "$createdAt" },
                action: {
                  $sum: {
                    $cond: [{ $ne: ["$order_id", null] }, 1, 0],
                  },
                },
              },
            },
          ],

          conversions: [
            {
              $group: {
                _id: { day: "$day", month: "$month", year: "$year" },
                totalEvents: { $sum: 1 },
                converted: {
                  $sum: {
                    $cond: [{ $ne: ["$order_id", null] }, 1, 0],
                  },
                },
                createdAt: { $first: "$createdAt" },
              },
            },
            {
              $addFields: {
                conversionRate: {
                  $cond: [
                    { $gt: ["$totalEvents", 0] },
                    {
                      $multiply: [
                        { $divide: ["$converted", "$totalEvents"] },
                        100,
                      ],
                    },
                    0,
                  ],
                },
              },
            },
          ],
        },
      };

      const pipeline = [
        { $match: query },
        ...baseStages,
        facetBlock,
        { $addFields: { total_docs: { $arrayElemAt: ["$total_docs", 0] } } },
        { $project: { revenue: 1, actions: 1, conversions: 1 } },
      ];

      const result = await db
        .collection("affiliatelink")
        .aggregate(pipeline)
        .toArray();

      console.log("Export pipeline result:", {
        found: result.length > 0,
        revenueCount: result[0]?.revenue?.length || 0,
        actionsCount: result[0]?.actions?.length || 0,
        conversionsCount: result[0]?.conversions?.length || 0,
      });

      return result.length > 0
        ? result[0]
        : { revenue: [], actions: [], conversions: [] };
    } catch (error) {
      console.error("Export _runPipeline error:", error);
      return { revenue: [], actions: [], conversions: [] };
    }
  },

  generateDailyData: function (analyticsData, startDate, endDate, filter) {
    try {
      const noData =
        !analyticsData ||
        (analyticsData.revenue.length === 0 &&
          analyticsData.actions.length === 0 &&
          analyticsData.conversions.length === 0);

      const noDates =
        !startDate ||
        !endDate ||
        startDate.toString().trim() === "" ||
        endDate.toString().trim() === "";

      if (noData && noDates) return [];

      let rangeStart, rangeEnd;
      if (!noDates) {
        rangeStart = moment(startDate);
        rangeEnd = moment(endDate);
      } else {
        const range = this.getDateRange(filter);
        rangeStart = moment(range.startDate);
        rangeEnd = moment(range.endDate);
      }

      const dates = [];
      let current = rangeStart.clone();
      while (current <= rangeEnd) {
        dates.push(current.format("YYYY-MM-DD"));
        current = current.clone().add(1, "days");
      }

      const dailyRevenue = {};
      const dailySales = {};
      const dailyClicks = {};

      (analyticsData.revenue || []).forEach((item) => {
        if (item.createdAt) {
          dailyRevenue[moment(item.createdAt).format("YYYY-MM-DD")] =
            item.price || 0;
        }
      });

      (analyticsData.actions || []).forEach((item) => {
        if (item.createdAt) {
          dailySales[moment(item.createdAt).format("YYYY-MM-DD")] =
            item.action || 0;
        }
      });

      (analyticsData.conversions || []).forEach((item) => {
        if (item.createdAt) {
          dailyClicks[moment(item.createdAt).format("YYYY-MM-DD")] =
            item.totalEvents || 0;
        }
      });

      return dates.map((date) => {
        const clicks = dailyClicks[date] || 0;
        const sales = dailySales[date] || 0;
        const revenue = dailyRevenue[date] || 0;
        const cr = clicks > 0 ? (sales / clicks) * 100 : 0;

        return {
          Date: date,
          Clicks: clicks,
          Sales: sales,
          Revenue: revenue.toFixed(2),
          "Conversion Rate": `${cr.toFixed(2)}%`,
        };
      });
    } catch (error) {
      console.error("generateDailyData error:", error);
      return [];
    }
  },

  getDateRange: function (filterType) {
    const presets = {
      this_week: { s: moment().startOf("week"), e: moment().endOf("week") },
      last_week: {
        s: moment().subtract(1, "week").startOf("week"),
        e: moment().subtract(1, "week").endOf("week"),
      },
      this_month: { s: moment().startOf("month"), e: moment().endOf("month") },
      last_month: {
        s: moment().subtract(1, "month").startOf("month"),
        e: moment().subtract(1, "month").endOf("month"),
      },
      this_year: { s: moment().startOf("year"), e: moment().endOf("year") },
      last_year: {
        s: moment().subtract(1, "year").startOf("year"),
        e: moment().subtract(1, "year").endOf("year"),
      },
    };
    const p = presets[filterType] || presets.this_month;
    return { startDate: p.s.toDate(), endDate: p.e.toDate() };
  },

  exportToExcel: async function (
    res,
    data,
    data2,
    startDate,
    endDate,
    startDate2,
    endDate2,
    filter,
  ) {
    try {
      const workbook = new ExcelJS.Workbook();

      const addSheet = (worksheet, sheetData, periodLabel) => {
        worksheet.mergeCells("A1:E1");
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
          fgColor: { argb: "E7E6E6" },
        };
        worksheet.getRow(1).height = 25;

        worksheet.mergeCells("A2:E2");
        const periodCell = worksheet.getCell("A2");
        periodCell.value = `Report Period: ${periodLabel}`;
        periodCell.font = { bold: true, size: 11 };
        periodCell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
        worksheet.getRow(2).height = 20;

        worksheet.mergeCells("A3:E3");
        const tsCell = worksheet.getCell("A3");
        tsCell.value = `Report Generated: ${moment().format("YYYY-MM-DD HH:mm:ss")}`;
        tsCell.font = { size: 10 };
        tsCell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
        worksheet.getRow(3).height = 20;

        worksheet.addRow([]);
        const headerRow = worksheet.addRow([
          "Date",
          "Clicks",
          "Sales",
          "Revenue",
          "Conversion Rate",
        ]);
        headerRow.height = 25;
        headerRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "4472C4" },
          };
          cell.font = { color: { argb: "FFFFFF" }, bold: true, size: 11 };
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

        if (sheetData && sheetData.length > 0) {
          sheetData.forEach((row, index) => {
            const dataRow = worksheet.addRow([
              row["Date"],
              row["Clicks"],
              row["Sales"],
              parseFloat(row["Revenue"]),
              row["Conversion Rate"],
            ]);
            dataRow.height = 20;
            dataRow.eachCell((cell, colNumber) => {
              if (index % 2 === 0)
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "F5F5F5" },
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
              cell.font = { size: 10 };
              if (colNumber === 4) cell.numFmt = '"$"#,##0.00';
            });
          });

          const tClicks = sheetData.reduce((s, r) => s + (r["Clicks"] || 0), 0);
          const tSales = sheetData.reduce((s, r) => s + (r["Sales"] || 0), 0);
          const tRevenue = sheetData.reduce(
            (s, r) => s + parseFloat(r["Revenue"] || 0),
            0,
          );
          const tCR = tClicks > 0 ? (tSales / tClicks) * 100 : 0;

          worksheet.addRow([]);
          const totalRow = worksheet.addRow([
            "TOTAL",
            tClicks,
            tSales,
            tRevenue,
            `${tCR.toFixed(2)}%`,
          ]);
          totalRow.height = 25;
          totalRow.eachCell((cell, colNumber) => {
            cell.font = { bold: true, size: 11 };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "D9D9D9" },
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
            if (colNumber === 4) cell.numFmt = '"$"#,##0.00';
          });
        } else {
          const noDataRow = worksheet.addRow([
            "No data available for the selected period",
            "",
            "",
            "",
            "",
          ]);
          worksheet.mergeCells(`A${noDataRow.number}:E${noDataRow.number}`);
          noDataRow.height = 25;
          noDataRow.getCell(1).alignment = {
            vertical: "middle",
            horizontal: "center",
          };
          noDataRow.getCell(1).font = { italic: true };
        }

        [18, 12, 12, 15, 18].forEach((w, i) => {
          worksheet.getColumn(i + 1).width = w;
        });
      };

      const primaryLabel =
        startDate && endDate
          ? `${moment(startDate).format("YYYY-MM-DD")} to ${moment(endDate).format("YYYY-MM-DD")}`
          : "Current Month";
      addSheet(workbook.addWorksheet("Primary Period"), data, primaryLabel);

      const hasCompare =
        startDate2 &&
        endDate2 &&
        startDate2.toString().trim() !== "" &&
        endDate2.toString().trim() !== "" &&
        data2 &&
        data2.length > 0;

      if (hasCompare) {
        const comparisonLabel = `${moment(startDate2).format("YYYY-MM-DD")} to ${moment(endDate2).format("YYYY-MM-DD")}`;
        addSheet(
          workbook.addWorksheet("Comparison Period"),
          data2,
          comparisonLabel,
        );
      }

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

      const buffer = await workbook.xlsx.writeBuffer();
      return res.send(buffer);
    } catch (error) {
      console.error("Excel export error:", error);
      throw new Error("Excel export failed: " + error.message);
    }
  },

  exportToCSV: async function (
    res,
    data,
    data2,
    startDate,
    endDate,
    startDate2,
    endDate2,
    filter,
  ) {
    try {
      const timestamp = moment().format("YYYY-MM-DD");
      const csvLines = [];

      const buildSection = (rows, label) => {
        csvLines.push(`"Daily Performance Report - ${label}"`);
        csvLines.push(`"Generated: ${moment().format("YYYY-MM-DD HH:mm")}"`);
        csvLines.push('""');
        csvLines.push('"Date","Clicks","Sales","Revenue","Conversion Rate"');

        if (rows && rows.length > 0) {
          rows.forEach((row) => {
            const revenue = parseFloat(row["Revenue"] || 0).toFixed(2);
            csvLines.push(
              `"${row["Date"]}",${row["Clicks"] || 0},${row["Sales"] || 0},"$${revenue}","${row["Conversion Rate"] || "0.00%"}"`,
            );
          });

          const tClicks = rows.reduce((s, r) => s + (r["Clicks"] || 0), 0);
          const tSales = rows.reduce((s, r) => s + (r["Sales"] || 0), 0);
          const tRevenue = rows.reduce(
            (s, r) => s + parseFloat(r["Revenue"] || 0),
            0,
          );
          const tCR =
            tClicks > 0 ? ((tSales / tClicks) * 100).toFixed(2) + "%" : "0.00%";

          csvLines.push('""');
          csvLines.push(
            `"TOTAL",${tClicks},${tSales},"$${tRevenue.toFixed(2)}","${tCR}"`,
          );
        } else {
          csvLines.push('"No data available for the selected period"');
        }
      };

      const primaryLabel =
        startDate && endDate
          ? `${moment(startDate).format("YYYY-MM-DD")} to ${moment(endDate).format("YYYY-MM-DD")}`
          : "Current Month";

      buildSection(data, primaryLabel);

      const hasCompare =
        startDate2 &&
        endDate2 &&
        startDate2.toString().trim() !== "" &&
        endDate2.toString().trim() !== "" &&
        data2 &&
        data2.length > 0;

      if (hasCompare) {
        const compLabel = `${moment(startDate2).format("YYYY-MM-DD")} to ${moment(endDate2).format("YYYY-MM-DD")}`;
        csvLines.push('""');
        csvLines.push('""');
        buildSection(data2, compLabel);
      }

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="daily_performance_${timestamp}.csv"`,
      );
      return res.send("\uFEFF" + csvLines.join("\r\n"));
    } catch (error) {
      console.error("CSV export error:", error);
      throw new Error("CSV export failed: " + error.message);
    }
  },

  exportToXML: async function (
    res,
    data,
    data2,
    startDate,
    endDate,
    startDate2,
    endDate2,
    filter,
  ) {
    try {
      const timestamp = moment().format("YYYY-MM-DD");

      const buildTotals = (rows) => {
        if (!rows || rows.length === 0)
          return { tClicks: 0, tSales: 0, tRevenue: 0, tCR: 0 };
        const tClicks = rows.reduce((s, r) => s + (r["Clicks"] || 0), 0);
        const tSales = rows.reduce((s, r) => s + (r["Sales"] || 0), 0);
        const tRevenue = rows.reduce(
          (s, r) => s + parseFloat(r["Revenue"] || 0),
          0,
        );
        const tCR = tClicks > 0 ? (tSales / tClicks) * 100 : 0;
        return { tClicks, tSales, tRevenue, tCR };
      };

      const buildRecords = (rows) =>
        rows && rows.length > 0
          ? rows.map((item, i) => ({
              _attributes: { id: i + 1, date: item["Date"] },
              Date: { _text: item["Date"] },
              Clicks: { _text: item["Clicks"] },
              Sales: { _text: item["Sales"] },
              Revenue: { _text: item["Revenue"] },
              ConversionRate: { _text: item["Conversion Rate"] },
            }))
          : [
              {
                Date: { _text: "No data" },
                Clicks: { _text: "0" },
                Sales: { _text: "0" },
                Revenue: { _text: "0.00" },
                ConversionRate: { _text: "0%" },
              },
            ];

      const { tClicks, tSales, tRevenue, tCR } = buildTotals(data);

      const hasCompare =
        startDate2 &&
        endDate2 &&
        startDate2.toString().trim() !== "" &&
        endDate2.toString().trim() !== "" &&
        data2 &&
        data2.length > 0;

      const xmlData = {
        _declaration: { _attributes: { version: "1.0", encoding: "UTF-8" } },
        DailyPerformanceReport: {
          _attributes: {
            generatedBy: "Performance Report System",
            timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
          },
          PrimaryPeriod: {
            ReportPeriod: {
              _attributes: {
                start: startDate
                  ? moment(startDate).format("YYYY-MM-DD")
                  : "N/A",
                end: endDate ? moment(endDate).format("YYYY-MM-DD") : "N/A",
              },
            },
            DailyData: {
              _attributes: { totalRecords: data ? data.length : 0 },
              Record: buildRecords(data),
            },
            Total: {
              TotalClicks: { _text: tClicks },
              TotalSales: { _text: tSales },
              TotalRevenue: { _text: tRevenue.toFixed(2) },
              TotalConversionRate: { _text: `${tCR.toFixed(2)}%` },
            },
          },
          ...(hasCompare
            ? (() => {
                const {
                  tClicks: c2,
                  tSales: s2,
                  tRevenue: r2,
                  tCR: cr2,
                } = buildTotals(data2);
                return {
                  ComparisonPeriod: {
                    ReportPeriod: {
                      _attributes: {
                        start: moment(startDate2).format("YYYY-MM-DD"),
                        end: moment(endDate2).format("YYYY-MM-DD"),
                      },
                    },
                    DailyData: {
                      _attributes: { totalRecords: data2.length },
                      Record: buildRecords(data2),
                    },
                    Total: {
                      TotalClicks: { _text: c2 },
                      TotalSales: { _text: s2 },
                      TotalRevenue: { _text: r2.toFixed(2) },
                      TotalConversionRate: { _text: `${cr2.toFixed(2)}%` },
                    },
                  },
                };
              })()
            : {}),
        },
      };

      const xml = js2xml(xmlData, {
        compact: true,
        spaces: 2,
        ignoreComment: true,
        fullTagEmptyElement: false,
      });

      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="daily_performance_${timestamp}.xml"`,
      );
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
