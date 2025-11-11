// const { Parser } = require('json2csv');
// const ExcelJS = require('exceljs');
// const moment = require('moment');
// const ObjectId = require('mongodb').ObjectId;
// const { js2xml } = require('xml-js');

// module.exports = {
//   // Main export function for performance reports
//   exportPerformanceReport: async function (req, res) {
//     try {
//       const { 
//         format = 'csv', 
//         startDate, 
//         endDate, 
//         brand_id, 
//         affiliate_id, 
//         campaign,
//         search,
//         filter 
//       } = req.query;

//       // Fetch only the necessary data
//       const [
//         clickAnalyticsData,
//         reportAnalyticsData
//       ] = await Promise.all([
//         this.getClickAnalyticsData(req),
//         this.getReportAnalyticsData(req)
//       ]);

//       // Generate simplified summary table with only required fields
//       const summaryData = this.generateSimplifiedSummaryTable(
//         clickAnalyticsData,
//         reportAnalyticsData,
//         startDate,
//         endDate,
//         filter
//       );

//       if (format === 'excel') {
//         return await this.exportToExcel(res, summaryData, startDate, endDate, filter);
//       } else if (format === 'xml') {
//         return await this.exportToXML(res, summaryData, startDate, endDate, filter);
//       } else {
//         return await this.exportToCSV(res, summaryData, startDate, endDate, filter);
//       }
//     } catch (error) {
//       console.error('Export error:', error);
//       return res.serverError('Failed to export performance report');
//     }
//   },

//   // Generate simplified summary table with only Clicks, Sales, CR Rate
//   generateSimplifiedSummaryTable: function (clickData, reportData, startDate, endDate, filter) {
//     try {
//       // Extract data from the complex nested structure
//       let totalClicks = 0;
//       let totalSales = 0;
//       let totalRevenue = 0;

//       // Process click analytics data
//       if (clickData && clickData.data && clickData.data.length > 0) {
//         clickData.data.forEach(item => {
//           if (item.clicks && Array.isArray(item.clicks)) {
//             item.clicks.forEach(click => {
//               totalClicks += click.count || 0;
//             });
//           }
//         });
//       }

//       // Process report analytics data
//       if (reportData && reportData.data && reportData.data.length > 0) {
//         reportData.data.forEach(item => {
//           // Sum up actions
//           if (item.actions && Array.isArray(item.actions)) {
//             item.actions.forEach(action => {
//               totalSales += action.action || 0;
//             });
//           }
//           // Sum up revenue
//           if (item.revenue && Array.isArray(item.revenue)) {
//             item.revenue.forEach(revenue => {
//               totalRevenue += revenue.price || 0;
//             });
//           }
//         });
//       }

//       const conversionRate = totalClicks > 0 ? (totalSales / totalClicks) * 100 : 0;

//       // Get date range for header
//       const dateRange = this.getDateRangeText(startDate, endDate, filter);

//       // Return only the required fields in rows
//       return [
//         {
//           'Date Range': dateRange,
//           'Clicks': totalClicks,
//           'Sales': totalSales,
//           'Conversion Rate': `${conversionRate.toFixed(2)}%`
//         }
//       ];
//     } catch (error) {
//       console.error('Error generating summary:', error);
//       const dateRange = this.getDateRangeText(startDate, endDate, filter);
//       return [
//         {
//           'Date Range': dateRange,
//           'Clicks': 0,
//           'Sales': 0,
//           'Conversion Rate': '0.00%'
//         }
//       ];
//     }
//   },

//   // Get date range text for headers
//   getDateRangeText: function (startDate, endDate, filter) {
//     if (startDate && endDate) {
//       return `${moment(startDate).format('MMM DD, YYYY')} - ${moment(endDate).format('MMM DD, YYYY')}`;
//     }
    
//     switch (filter) {
//       case "this_week":
//         return `This Week (${moment().startOf('week').format('MMM DD')} - ${moment().endOf('week').format('MMM DD, YYYY')})`;
//       case "last_week":
//         return `Last Week (${moment().subtract(1, 'week').startOf('week').format('MMM DD')} - ${moment().subtract(1, 'week').endOf('week').format('MMM DD, YYYY')})`;
//       case "this_month":
//         return `This Month (${moment().startOf('month').format('MMM DD, YYYY')} - ${moment().endOf('month').format('MMM DD, YYYY')})`;
//       case "last_month":
//         return `Last Month (${moment().subtract(1, 'month').startOf('month').format('MMM DD, YYYY')} - ${moment().subtract(1, 'month').endOf('month').format('MMM DD, YYYY')})`;
//       case "this_year":
//         return `This Year (${moment().startOf('year').format('YYYY')})`;
//       case "last_year":
//         return `Last Year (${moment().subtract(1, 'year').startOf('year').format('YYYY')})`;
//       default:
//         return `This Month (${moment().startOf('month').format('MMM DD, YYYY')} - ${moment().endOf('month').format('MMM DD, YYYY')})`;
//     }
//   },

//   // API 2: Click Analytics Data - FIXED: Use native MongoDB collection
//   getClickAnalyticsData: async function (req) {
//     try {
//       let query = {};
//       let { startDate, endDate, affiliate_id, brand_id, campaign, filter } = req.query;

//       query.isDeleted = false;

//       // Date filtering logic from your clickAnalytics function
//       if (startDate && endDate) {
//         query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
//       } else {
//         const dateRange = this.getDateRange(filter);
//         query.createdAt = { $gte: dateRange.startDate, $lte: dateRange.endDate };
//       }

//       if (affiliate_id) {
//         affiliate_id = await Services.Utils.string_to_array(affiliate_id);
//         query.affiliate_id = { $in: affiliate_id };
//       }

//       if (brand_id) {
//         brand_id = await Services.Utils.string_to_array(brand_id);
//         query.brand_id = { $in: brand_id };
//       }

//       if (campaign) {
//         campaign = await Services.Utils.string_to_array(campaign);
//         query.campaignId = { $in: campaign };
//       }

//       const pipeline = [
//         {
//           $match: query
//         },
//         {
//           $facet: {
//             total_docs: [
//               { $count: "total_docs" }
//             ],
//             clicks: [
//               {
//                 $group: {
//                   _id: null,
//                   totalClicks: { $sum: 1 }
//                 }
//               }
//             ]
//           }
//         }
//       ];

//       // FIXED: Use native MongoDB collection
//       const result = await Cookies.native(function(err, collection) {
//         if (err) {
//           console.error('Error getting native collection:', err);
//           return [];
//         }
//         return collection.aggregate(pipeline).toArray();
//       });

//       return { data: result || [] };
//     } catch (error) {
//       console.error('Error fetching click analytics:', error);
//       return { data: [] };
//     }
//   },

//   // API 3: Report Analytics Data - FIXED: Use native MongoDB collection
//   getReportAnalyticsData: async function (req) {
//     try {
//       let query = { isDeleted: false };
//       let { startDate, endDate, affiliate_id, brand_id, campaign } = req.query;

//       if (startDate && endDate) {
//         query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
//       }

//       if (affiliate_id) {
//         affiliate_id = await Services.Utils.string_to_array(affiliate_id);
//         query.affiliate_id = { $in: affiliate_id };
//       }

//       if (brand_id) {
//         brand_id = await Services.Utils.string_to_array(brand_id);
//         query.brand_id = { $in: brand_id };
//       }

//       if (campaign) {
//         campaign = await Services.Utils.string_to_array(campaign);
//         query.campaignId = { $in: campaign };
//       }

//       const pipeline = [
//         {
//           $match: query
//         },
//         {
//           $facet: {
//             sales: [
//               {
//                 $group: {
//                   _id: null,
//                   totalSales: {
//                     $sum: {
//                       $cond: [{ $ne: ["$order_id", ""] }, 1, 0]
//                     }
//                   },
//                   totalRevenue: { $sum: "$price" }
//                 }
//               }
//             ]
//           }
//         }
//       ];

//       // FIXED: Use native MongoDB collection
//       const result = await AffiliateLink.native(function(err, collection) {
//         if (err) {
//           console.error('Error getting native collection:', err);
//           return [];
//         }
//         return collection.aggregate(pipeline).toArray();
//       });

//       return { data: result || [] };
//     } catch (error) {
//       console.error('Error fetching report analytics:', error);
//       return { data: [] };
//     }
//   },

//   // Date range helper
//   getDateRange: function (filterType) {
//     let startDate, endDate;
    
//     switch (filterType) {
//       case "this_week":
//         startDate = moment().startOf("week").toDate();
//         endDate = moment().endOf("week").toDate();
//         break;
//       case "last_week":
//         startDate = moment().subtract(1, "week").startOf("week").toDate();
//         endDate = moment().subtract(1, "week").endOf("week").toDate();
//         break;
//       case "this_month":
//         startDate = moment().startOf("month").toDate();
//         endDate = moment().endOf("month").toDate();
//         break;
//       case "last_month":
//         startDate = moment().subtract(1, "month").startOf("month").toDate();
//         endDate = moment().subtract(1, "month").endOf("month").toDate();
//         break;
//       case "this_year":
//         startDate = moment().startOf("year").toDate();
//         endDate = moment().endOf("year").toDate();
//         break;
//       case "last_year":
//         startDate = moment().subtract(1, "year").startOf("year").toDate();
//         endDate = moment().subtract(1, "year").endOf("year").toDate();
//         break;
//       default:
//         startDate = moment().startOf("month").toDate();
//         endDate = moment().endOf("month").toDate();
//     }
    
//     return { startDate, endDate };
//   },

//   // Export to Excel - Simplified with only required fields
//   exportToExcel: async function (res, data, startDate, endDate, filter) {
//     try {
//       const workbook = new ExcelJS.Workbook();
//       const worksheet = workbook.addWorksheet('Performance Report');

//       // Add headers
//       const headers = ['Date Range', 'Clicks', 'Sales', 'Conversion Rate'];
//       const headerRow = worksheet.addRow(headers);
      
//       // Style header row
//       headerRow.eachCell((cell) => {
//         cell.fill = {
//           type: 'pattern',
//           pattern: 'solid',
//           fgColor: { argb: 'FF4472C4' }
//         };
//         cell.font = {
//           color: { argb: 'FFFFFFFF' },
//           bold: true
//         };
//         cell.border = {
//           top: { style: 'thin' },
//           left: { style: 'thin' },
//           bottom: { style: 'thin' },
//           right: { style: 'thin' }
//         };
//       });

//       // Add data rows
//       if (data && data.length > 0) {
//         data.forEach(row => {
//           const rowData = [
//             row['Date Range'],
//             row['Clicks'],
//             row['Sales'],
//             row['Conversion Rate']
//           ];
//           worksheet.addRow(rowData);
//         });
//       } else {
//         worksheet.addRow(['No data available', '', '', '']);
//       }

//       // Auto-fit columns
//       worksheet.columns.forEach(column => {
//         column.width = 20;
//       });

//       // Set response headers
//       const timestamp = new Date().toISOString().split('T')[0];
//       res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//       res.setHeader('Content-Disposition', `attachment; filename=performance_report_${timestamp}.xlsx`);

//       // Write to response
//       await workbook.xlsx.write(res);
//       res.end();

//     } catch (error) {
//       console.error('Excel export error:', error);
//       throw new Error('Excel export failed: ' + error.message);
//     }
//   },

//   // Export to CSV - Simplified with only required fields
//   exportToCSV: async function (res, data, startDate, endDate, filter) {
//     try {
//       const timestamp = new Date().toISOString().split('T')[0];
      
//       // Define fields for CSV
//       const fields = ['Date Range', 'Clicks', 'Sales', 'Conversion Rate'];
      
//       // Create parser with only required fields
//       const parser = new Parser({ fields });
      
//       // Parse data to CSV
//       let csv;
//       if (data && data.length > 0) {
//         csv = parser.parse(data);
//       } else {
//         csv = parser.parse([{
//           'Date Range': 'No data available',
//           'Clicks': '',
//           'Sales': '',
//           'Conversion Rate': ''
//         }]);
//       }

//       // Set response headers
//       res.setHeader('Content-Type', 'text/csv');
//       res.setHeader('Content-Disposition', `attachment; filename=performance_report_${timestamp}.csv`);
      
//       return res.send(csv);
//     } catch (error) {
//       console.error('CSV export error:', error);
//       throw new Error('CSV export failed: ' + error.message);
//     }
//   },

//   // Export to XML - Simplified with only required fields
//   exportToXML: async function (res, data, startDate, endDate, filter) {
//     try {
//       const timestamp = new Date().toISOString().split('T')[0];

//       // Convert data to XML structure with only required fields
//       const xmlData = {
//         PerformanceReport: {
//           ReportInfo: {
//             ExportDate: new Date().toLocaleDateString(),
//             ExportTime: new Date().toLocaleTimeString()
//           },
//           Data: {
//             Record: data && data.length > 0 ? 
//               data.map(item => ({
//                 DateRange: item['Date Range'],
//                 Clicks: item['Clicks'],
//                 Sales: item['Sales'],
//                 ConversionRate: item['Conversion Rate']
//               })) : [{
//                 DateRange: 'No data available',
//                 Clicks: '0',
//                 Sales: '0',
//                 ConversionRate: '0%'
//               }]
//           }
//         }
//       };

//       // Convert to XML
//       const xml = js2xml(xmlData, { compact: true, spaces: 2 });

//       // Set response headers
//       res.setHeader('Content-Type', 'application/xml');
//       res.setHeader('Content-Disposition', `attachment; filename=performance_report_${timestamp}.xml`);
      
//       return res.send(xml);
//     } catch (error) {
//       console.error('XML export error:', error);
//       throw new Error('XML export failed: ' + error.message);
//     }
//   }
// };




const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const moment = require('moment');
const ObjectId = require('mongodb').ObjectId;
const { js2xml } = require('xml-js');

module.exports = {
  // Main export function for performance reports
  exportPerformanceReport: async function (req, res) {
    try {
      const { 
        format = 'csv', 
        startDate, 
        endDate, 
        brand_id, 
        affiliate_id, 
        campaign,
        search,
        filter 
      } = req.query;

      // Set endDate equal to startDate if only startDate is provided
      const adjustedEndDate = endDate || startDate;

      // Fetch only the necessary data
      const [
        clickAnalyticsData,
        reportAnalyticsData
      ] = await Promise.all([
        this.getClickAnalyticsData(req, startDate, adjustedEndDate),
        this.getReportAnalyticsData(req, startDate, adjustedEndDate)
      ]);

      // Generate daily data for complete month
      const dailyData = this.generateDailyData(
        clickAnalyticsData,
        reportAnalyticsData,
        startDate,
        adjustedEndDate,
        filter
      );

      if (format === 'excel') {
        return await this.exportToExcel(res, dailyData, startDate, adjustedEndDate, filter);
      } else if (format === 'xml') {
        return await this.exportToXML(res, dailyData, startDate, adjustedEndDate, filter);
      } else {
        return await this.exportToCSV(res, dailyData, startDate, adjustedEndDate, filter);
      }
    } catch (error) {
      console.error('Export error:', error);
      return res.serverError('Failed to export performance report');
    }
  },

  // Generate daily data for complete month in YYYY-MM-DD format
  generateDailyData: function (clickData, reportData, startDate, endDate, filter) {
    try {
      // Get date range
      let dateRange;
      if (startDate && endDate) {
        dateRange = {
          start: moment(startDate),
          end: moment(endDate)
        };
      } else {
        const range = this.getDateRange(filter);
        dateRange = {
          start: moment(range.startDate),
          end: moment(range.endDate)
        };
      }

      // Generate all dates in the range
      const dates = [];
      let currentDate = dateRange.start.clone();
      
      while (currentDate <= dateRange.end) {
        dates.push(currentDate.format('YYYY-MM-DD'));
        currentDate = currentDate.clone().add(1, 'days');
      }

      // Extract daily data from analytics
      const dailyClicks = this.extractDailyClicks(clickData);
      const dailySales = this.extractDailySales(reportData);

      // Combine data for all dates
      const dailyData = dates.map(date => {
        const clicks = dailyClicks[date] || 0;
        const sales = dailySales[date] || 0;
        const conversionRate = clicks > 0 ? (sales / clicks) * 100 : 0;

        return {
          'Date': date,
          'Clicks': clicks,
          'Sales': sales,
          'Conversion Rate': `${conversionRate.toFixed(2)}%`
        };
      });

      return dailyData;
    } catch (error) {
      console.error('Error generating daily data:', error);
      return [{
        'Date': moment().format('YYYY-MM-DD'),
        'Clicks': 0,
        'Sales': 0,
        'Conversion Rate': '0.00%'
      }];
    }
  },

  // Extract daily clicks from click analytics data
  extractDailyClicks: function (clickData) {
    const dailyClicks = {};
    
    if (clickData && clickData.data && clickData.data.length > 0) {
      clickData.data.forEach(item => {
        if (item.clicks && Array.isArray(item.clicks)) {
          item.clicks.forEach(click => {
            if (click.createdAt) {
              const dateKey = moment(click.createdAt).format('YYYY-MM-DD');
              dailyClicks[dateKey] = (dailyClicks[dateKey] || 0) + (click.count || 0);
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
      reportData.data.forEach(item => {
        if (item.actions && Array.isArray(item.actions)) {
          item.actions.forEach(action => {
            if (action.createdAt) {
              const dateKey = moment(action.createdAt).format('YYYY-MM-DD');
              dailySales[dateKey] = (dailySales[dateKey] || 0) + (action.action || 0);
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
        query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
      } else {
        const dateRange = this.getDateRange(filter);
        query.createdAt = { $gte: dateRange.startDate, $lte: dateRange.endDate };
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
          $match: query
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
            },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            date: "$_id.date",
            count: 1,
            _id: 0
          }
        },
        { $sort: { date: 1 } }
      ];

      const result = await Cookies.native(function(err, collection) {
        if (err) {
          console.error('Error getting native collection:', err);
          return [];
        }
        return collection.aggregate(pipeline).toArray();
      });

      // Format the result for easier processing
      const formattedResult = {
        data: [{
          clicks: result.map(item => ({
            createdAt: item.date,
            count: item.count
          }))
        }]
      };

      return { data: formattedResult.data || [] };
    } catch (error) {
      console.error('Error fetching click analytics:', error);
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
        query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
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
          $match: query
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
            },
            sales: {
              $sum: {
                $cond: [{ $ne: ["$order_id", ""] }, 1, 0]
              }
            }
          }
        },
        {
          $project: {
            date: "$_id.date",
            sales: 1,
            _id: 0
          }
        },
        { $sort: { date: 1 } }
      ];

      const result = await AffiliateLink.native(function(err, collection) {
        if (err) {
          console.error('Error getting native collection:', err);
          return [];
        }
        return collection.aggregate(pipeline).toArray();
      });

      // Format the result for easier processing
      const formattedResult = {
        data: [{
          actions: result.map(item => ({
            createdAt: item.date,
            action: item.sales
          }))
        }]
      };

      return { data: formattedResult.data || [] };
    } catch (error) {
      console.error('Error fetching report analytics:', error);
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

  // Export to Excel - Daily data in YYYY-MM-DD format
  exportToExcel: async function (res, data, startDate, endDate, filter) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Daily Performance Report');

      // Add report header with date information
      const reportPeriod = startDate && endDate ? 
        `${moment(startDate).format('YYYY-MM-DD')} to ${moment(endDate).format('YYYY-MM-DD')}` : 
        'Current Month';
      
      worksheet.addRow(['Report Period:', reportPeriod]);
      worksheet.addRow(['Report Generated:', moment().format('YYYY-MM-DD HH:mm:ss')]);
      worksheet.addRow([]); // Empty row

      // Add headers
      const headers = ['Date', 'Clicks', 'Sales', 'Conversion Rate'];
      const headerRow = worksheet.addRow(headers);
      
      // Style header row
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        };
        cell.font = {
          color: { argb: 'FFFFFFFF' },
          bold: true
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Add data rows
      if (data && data.length > 0) {
        data.forEach(row => {
          const rowData = [
            row['Date'],
            row['Clicks'],
            row['Sales'],
            row['Conversion Rate']
          ];
          const dataRow = worksheet.addRow(rowData);
          
          // Add light border to data rows
          dataRow.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });
        });

        // Add total row
        const totalClicks = data.reduce((sum, row) => sum + row['Clicks'], 0);
        const totalSales = data.reduce((sum, row) => sum + row['Sales'], 0);
        const totalConversionRate = totalClicks > 0 ? (totalSales / totalClicks) * 100 : 0;

        worksheet.addRow([]); // Empty row
        const totalRow = worksheet.addRow([
          'TOTAL',
          totalClicks,
          totalSales,
          `${totalConversionRate.toFixed(2)}%`
        ]);

        // Style total row
        totalRow.eachCell((cell) => {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' }
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      } else {
        worksheet.addRow(['No data available', '', '', '']);
      }

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 15;
      });

      // Set response headers
      const timestamp = moment().format('YYYY-MM-DD');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=daily_performance_${timestamp}.xlsx`);

      // Write to response
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Excel export error:', error);
      throw new Error('Excel export failed: ' + error.message);
    }
  },

  // Export to CSV - Daily data in YYYY-MM-DD format
  exportToCSV: async function (res, data, startDate, endDate, filter) {
    try {
      const timestamp = moment().format('YYYY-MM-DD');
      
      let csvData = [];
      
      // Add report header
      const reportPeriod = startDate && endDate ? 
        `${moment(startDate).format('YYYY-MM-DD')} to ${moment(endDate).format('YYYY-MM-DD')}` : 
        'Current Month';
      
      csvData.push('DAILY PERFORMANCE REPORT');
      csvData.push(`Report Period: ${reportPeriod}`);
      csvData.push(`Report Generated: ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
      csvData.push('');
      
      // Define fields for CSV
      const fields = ['Date', 'Clicks', 'Sales', 'Conversion Rate'];
      const parser = new Parser({ fields });
      
      // Parse data to CSV
      if (data && data.length > 0) {
        csvData.push(parser.parse(data));
        
        // Add total row
        const totalClicks = data.reduce((sum, row) => sum + row['Clicks'], 0);
        const totalSales = data.reduce((sum, row) => sum + row['Sales'], 0);
        const totalConversionRate = totalClicks > 0 ? (totalSales / totalClicks) * 100 : 0;
        
        csvData.push('');
        csvData.push(`TOTAL,${totalClicks},${totalSales},${totalConversionRate.toFixed(2)}%`);
      } else {
        csvData.push(parser.parse([{
          'Date': 'No data available',
          'Clicks': '',
          'Sales': '',
          'Conversion Rate': ''
        }]));
      }

      const finalCSV = csvData.join('\n');

      // Set response headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=daily_performance_${timestamp}.csv`);
      
      return res.send(finalCSV);
    } catch (error) {
      console.error('CSV export error:', error);
      throw new Error('CSV export failed: ' + error.message);
    }
  },

  // Export to XML - Daily data in YYYY-MM-DD format
  exportToXML: async function (res, data, startDate, endDate, filter) {
    try {
      const timestamp = moment().format('YYYY-MM-DD');

      // Calculate totals
      let totalClicks = 0;
      let totalSales = 0;
      
      if (data && data.length > 0) {
        totalClicks = data.reduce((sum, row) => sum + row['Clicks'], 0);
        totalSales = data.reduce((sum, row) => sum + row['Sales'], 0);
      }

      const totalConversionRate = totalClicks > 0 ? (totalSales / totalClicks) * 100 : 0;

      // Convert data to XML structure with daily data
      const xmlData = {
        DailyPerformanceReport: {
          ReportInfo: {
            ExportDate: moment().format('YYYY-MM-DD'),
            ExportTime: moment().format('HH:mm:ss'),
            Period: startDate && endDate ? 
              `${moment(startDate).format('YYYY-MM-DD')} to ${moment(endDate).format('YYYY-MM-DD')}` : 
              'Current Month'
          },
          DailyData: {
            Day: data && data.length > 0 ? 
              data.map(item => ({
                Date: item['Date'],
                Clicks: item['Clicks'],
                Sales: item['Sales'],
                ConversionRate: item['Conversion Rate']
              })) : [{
                Date: 'No data available',
                Clicks: '0',
                Sales: '0',
                ConversionRate: '0%'
              }]
          },
          Summary: {
            TotalClicks: totalClicks,
            TotalSales: totalSales,
            TotalConversionRate: `${totalConversionRate.toFixed(2)}%`
          }
        }
      };

      // Convert to XML
      const xml = js2xml(xmlData, { compact: true, spaces: 2 });

      // Set response headers
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename=daily_performance_${timestamp}.xml`);
      
      return res.send(xml);
    } catch (error) {
      console.error('XML export error:', error);
      throw new Error('XML export failed: ' + error.message);
    }
  }
};





















































// const { Parser } = require('json2csv');
// const ExcelJS = require('exceljs');
// const moment = require('moment');
// const ObjectId = require('mongodb').ObjectId;
// const { js2xml } = require('xml-js');

// module.exports = {
//   // Main export function for performance reports
//   exportPerformanceReport: async function (req, res) {
//     try {
//       const { 
//         format = 'csv', 
//         startDate, 
//         endDate, 
//         brand_id, 
//         affiliate_id, 
//         campaign,
//         search,
//         filter 
//       } = req.query;

//       // Fetch only the necessary data
//       const [
//         clickAnalyticsData,
//         reportAnalyticsData
//       ] = await Promise.all([
//         this.getClickAnalyticsData(req),
//         this.getReportAnalyticsData(req)
//       ]);

//       // Generate daily data for complete month
//       const dailyData = this.generateDailyData(
//         clickAnalyticsData,
//         reportAnalyticsData,
//         startDate,
//         endDate,
//         filter
//       );

//       if (format === 'excel') {
//         return await this.exportToExcel(res, dailyData, startDate, endDate, filter);
//       } else if (format === 'xml') {
//         return await this.exportToXML(res, dailyData, startDate, endDate, filter);
//       } else {
//         return await this.exportToCSV(res, dailyData, startDate, endDate, filter);
//       }
//     } catch (error) {
//       console.error('Export error:', error);
//       return res.serverError('Failed to export performance report');
//     }
//   },

//   // Generate daily data for complete month in YYYY-MM-DD format
//   generateDailyData: function (clickData, reportData, startDate, endDate, filter) {
//     try {
//       // Get date range
//       let dateRange;
//       if (startDate && endDate) {
//         dateRange = {
//           start: moment(startDate),
//           end: moment(endDate)
//         };
//       } else {
//         const range = this.getDateRange(filter);
//         dateRange = {
//           start: moment(range.startDate),
//           end: moment(range.endDate)
//         };
//       }

//       // Generate all dates in the range
//       const dates = [];
//       let currentDate = dateRange.start.clone();
      
//       while (currentDate <= dateRange.end) {
//         dates.push(currentDate.format('YYYY-MM-DD'));
//         currentDate = currentDate.clone().add(1, 'days');
//       }

//       // Extract daily data from analytics
//       const dailyClicks = this.extractDailyClicks(clickData);
//       const dailySales = this.extractDailySales(reportData);

//       // Combine data for all dates
//       const dailyData = dates.map(date => {
//         const clicks = dailyClicks[date] || 0;
//         const sales = dailySales[date] || 0;
//         const conversionRate = clicks > 0 ? (sales / clicks) * 100 : 0;

//         return {
//           'Date': date,
//           'Clicks': clicks,
//           'Sales': sales,
//           'Conversion Rate': `${conversionRate.toFixed(2)}%`
//         };
//       });

//       return dailyData;
//     } catch (error) {
//       console.error('Error generating daily data:', error);
//       return [{
//         'Date': moment().format('YYYY-MM-DD'),
//         'Clicks': 0,
//         'Sales': 0,
//         'Conversion Rate': '0.00%'
//       }];
//     }
//   },

//   // Extract daily clicks from click analytics data
//   extractDailyClicks: function (clickData) {
//     const dailyClicks = {};
    
//     if (clickData && clickData.data && clickData.data.length > 0) {
//       clickData.data.forEach(item => {
//         if (item.clicks && Array.isArray(item.clicks)) {
//           item.clicks.forEach(click => {
//             if (click.createdAt) {
//               const dateKey = moment(click.createdAt).format('YYYY-MM-DD');
//               dailyClicks[dateKey] = (dailyClicks[dateKey] || 0) + (click.count || 0);
//             }
//           });
//         }
//       });
//     }

//     return dailyClicks;
//   },

//   // Extract daily sales from report analytics data
//   extractDailySales: function (reportData) {
//     const dailySales = {};
    
//     if (reportData && reportData.data && reportData.data.length > 0) {
//       reportData.data.forEach(item => {
//         if (item.actions && Array.isArray(item.actions)) {
//           item.actions.forEach(action => {
//             if (action.createdAt) {
//               const dateKey = moment(action.createdAt).format('YYYY-MM-DD');
//               dailySales[dateKey] = (dailySales[dateKey] || 0) + (action.action || 0);
//             }
//           });
//         }
//       });
//     }

//     return dailySales;
//   },

//   // API 2: Click Analytics Data - Modified to return daily data
//   getClickAnalyticsData: async function (req) {
//     try {
//       let query = {};
//       let { startDate, endDate, affiliate_id, brand_id, campaign, filter } = req.query;

//       query.isDeleted = false;

//       // Date filtering logic
//       if (startDate && endDate) {
//         query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
//       } else {
//         const dateRange = this.getDateRange(filter);
//         query.createdAt = { $gte: dateRange.startDate, $lte: dateRange.endDate };
//       }

//       if (affiliate_id) {
//         affiliate_id = await Services.Utils.string_to_array(affiliate_id);
//         query.affiliate_id = { $in: affiliate_id };
//       }

//       if (brand_id) {
//         brand_id = await Services.Utils.string_to_array(brand_id);
//         query.brand_id = { $in: brand_id };
//       }

//       if (campaign) {
//         campaign = await Services.Utils.string_to_array(campaign);
//         query.campaignId = { $in: campaign };
//       }

//       const pipeline = [
//         {
//           $match: query
//         },
//         {
//           $group: {
//             _id: {
//               date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
//             },
//             count: { $sum: 1 }
//           }
//         },
//         {
//           $project: {
//             date: "$_id.date",
//             count: 1,
//             _id: 0
//           }
//         },
//         { $sort: { date: 1 } }
//       ];

//       const result = await Cookies.native(function(err, collection) {
//         if (err) {
//           console.error('Error getting native collection:', err);
//           return [];
//         }
//         return collection.aggregate(pipeline).toArray();
//       });

//       // Format the result for easier processing
//       const formattedResult = {
//         data: [{
//           clicks: result.map(item => ({
//             createdAt: item.date,
//             count: item.count
//           }))
//         }]
//       };

//       return { data: formattedResult.data || [] };
//     } catch (error) {
//       console.error('Error fetching click analytics:', error);
//       return { data: [] };
//     }
//   },

//   // API 3: Report Analytics Data - Modified to return daily data
//   getReportAnalyticsData: async function (req) {
//     try {
//       let query = { isDeleted: false };
//       let { startDate, endDate, affiliate_id, brand_id, campaign } = req.query;

//       if (startDate && endDate) {
//         query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
//       }

//       if (affiliate_id) {
//         affiliate_id = await Services.Utils.string_to_array(affiliate_id);
//         query.affiliate_id = { $in: affiliate_id };
//       }

//       if (brand_id) {
//         brand_id = await Services.Utils.string_to_array(brand_id);
//         query.brand_id = { $in: brand_id };
//       }

//       if (campaign) {
//         campaign = await Services.Utils.string_to_array(campaign);
//         query.campaignId = { $in: campaign };
//       }

//       const pipeline = [
//         {
//           $match: query
//         },
//         {
//           $group: {
//             _id: {
//               date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
//             },
//             sales: {
//               $sum: {
//                 $cond: [{ $ne: ["$order_id", ""] }, 1, 0]
//               }
//             }
//           }
//         },
//         {
//           $project: {
//             date: "$_id.date",
//             sales: 1,
//             _id: 0
//           }
//         },
//         { $sort: { date: 1 } }
//       ];

//       const result = await AffiliateLink.native(function(err, collection) {
//         if (err) {
//           console.error('Error getting native collection:', err);
//           return [];
//         }
//         return collection.aggregate(pipeline).toArray();
//       });

//       // Format the result for easier processing
//       const formattedResult = {
//         data: [{
//           actions: result.map(item => ({
//             createdAt: item.date,
//             action: item.sales
//           }))
//         }]
//       };

//       return { data: formattedResult.data || [] };
//     } catch (error) {
//       console.error('Error fetching report analytics:', error);
//       return { data: [] };
//     }
//   },

//   // Date range helper
//   getDateRange: function (filterType) {
//     let startDate, endDate;
    
//     switch (filterType) {
//       case "this_week":
//         startDate = moment().startOf("week").toDate();
//         endDate = moment().endOf("week").toDate();
//         break;
//       case "last_week":
//         startDate = moment().subtract(1, "week").startOf("week").toDate();
//         endDate = moment().subtract(1, "week").endOf("week").toDate();
//         break;
//       case "this_month":
//         startDate = moment().startOf("month").toDate();
//         endDate = moment().endOf("month").toDate();
//         break;
//       case "last_month":
//         startDate = moment().subtract(1, "month").startOf("month").toDate();
//         endDate = moment().subtract(1, "month").endOf("month").toDate();
//         break;
//       case "this_year":
//         startDate = moment().startOf("year").toDate();
//         endDate = moment().endOf("year").toDate();
//         break;
//       case "last_year":
//         startDate = moment().subtract(1, "year").startOf("year").toDate();
//         endDate = moment().subtract(1, "year").endOf("year").toDate();
//         break;
//       default:
//         startDate = moment().startOf("month").toDate();
//         endDate = moment().endOf("month").toDate();
//     }
    
//     return { startDate, endDate };
//   },

//   // Export to Excel - Daily data in YYYY-MM-DD format
//   exportToExcel: async function (res, data, startDate, endDate, filter) {
//     try {
//       const workbook = new ExcelJS.Workbook();
//       const worksheet = workbook.addWorksheet('Daily Performance Report');

//       // Add headers
//       const headers = ['Date', 'Clicks', 'Sales', 'Conversion Rate'];
//       const headerRow = worksheet.addRow(headers);
      
//       // Style header row
//       headerRow.eachCell((cell) => {
//         cell.fill = {
//           type: 'pattern',
//           pattern: 'solid',
//           fgColor: { argb: 'FF4472C4' }
//         };
//         cell.font = {
//           color: { argb: 'FFFFFFFF' },
//           bold: true
//         };
//         cell.border = {
//           top: { style: 'thin' },
//           left: { style: 'thin' },
//           bottom: { style: 'thin' },
//           right: { style: 'thin' }
//         };
//       });

//       // Add data rows
//       if (data && data.length > 0) {
//         data.forEach(row => {
//           const rowData = [
//             row['Date'],
//             row['Clicks'],
//             row['Sales'],
//             row['Conversion Rate']
//           ];
//           const dataRow = worksheet.addRow(rowData);
          
//           // Add light border to data rows
//           dataRow.eachCell((cell) => {
//             cell.border = {
//               top: { style: 'thin' },
//               left: { style: 'thin' },
//               bottom: { style: 'thin' },
//               right: { style: 'thin' }
//             };
//           });
//         });

//         // Add total row
//         const totalClicks = data.reduce((sum, row) => sum + row['Clicks'], 0);
//         const totalSales = data.reduce((sum, row) => sum + row['Sales'], 0);
//         const totalConversionRate = totalClicks > 0 ? (totalSales / totalClicks) * 100 : 0;

//         worksheet.addRow([]); // Empty row
//         const totalRow = worksheet.addRow([
//           'TOTAL',
//           totalClicks,
//           totalSales,
//           `${totalConversionRate.toFixed(2)}%`
//         ]);

//         // Style total row
//         totalRow.eachCell((cell) => {
//           cell.font = { bold: true };
//           cell.fill = {
//             type: 'pattern',
//             pattern: 'solid',
//             fgColor: { argb: 'FFF2F2F2' }
//           };
//           cell.border = {
//             top: { style: 'thin' },
//             left: { style: 'thin' },
//             bottom: { style: 'thin' },
//             right: { style: 'thin' }
//           };
//         });
//       } else {
//         worksheet.addRow(['No data available', '', '', '']);
//       }

//       // Auto-fit columns
//       worksheet.columns.forEach(column => {
//         column.width = 15;
//       });

//       // Set response headers
//       const timestamp = moment().format('YYYY-MM-DD');
//       res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//       res.setHeader('Content-Disposition', `attachment; filename=daily_performance_${timestamp}.xlsx`);

//       // Write to response
//       await workbook.xlsx.write(res);
//       res.end();

//     } catch (error) {
//       console.error('Excel export error:', error);
//       throw new Error('Excel export failed: ' + error.message);
//     }
//   },

//   // Export to CSV - Daily data in YYYY-MM-DD format
//   exportToCSV: async function (res, data, startDate, endDate, filter) {
//     try {
//       const timestamp = moment().format('YYYY-MM-DD');
      
//       // Define fields for CSV
//       const fields = ['Date', 'Clicks', 'Sales', 'Conversion Rate'];
      
//       // Create parser with only required fields
//       const parser = new Parser({ fields });
      
//       // Parse data to CSV
//       let csv;
//       if (data && data.length > 0) {
//         csv = parser.parse(data);
        
//         // Add total row
//         const totalClicks = data.reduce((sum, row) => sum + row['Clicks'], 0);
//         const totalSales = data.reduce((sum, row) => sum + row['Sales'], 0);
//         const totalConversionRate = totalClicks > 0 ? (totalSales / totalClicks) * 100 : 0;
        
//         csv += `\nTOTAL,${totalClicks},${totalSales},${totalConversionRate.toFixed(2)}%`;
//       } else {
//         csv = parser.parse([{
//           'Date': 'No data available',
//           'Clicks': '',
//           'Sales': '',
//           'Conversion Rate': ''
//         }]);
//       }

//       // Set response headers
//       res.setHeader('Content-Type', 'text/csv');
//       res.setHeader('Content-Disposition', `attachment; filename=daily_performance_${timestamp}.csv`);
      
//       return res.send(csv);
//     } catch (error) {
//       console.error('CSV export error:', error);
//       throw new Error('CSV export failed: ' + error.message);
//     }
//   },

//   // Export to XML - Daily data in YYYY-MM-DD format
//   exportToXML: async function (res, data, startDate, endDate, filter) {
//     try {
//       const timestamp = moment().format('YYYY-MM-DD');

//       // Calculate totals
//       let totalClicks = 0;
//       let totalSales = 0;
      
//       if (data && data.length > 0) {
//         totalClicks = data.reduce((sum, row) => sum + row['Clicks'], 0);
//         totalSales = data.reduce((sum, row) => sum + row['Sales'], 0);
//       }

//       const totalConversionRate = totalClicks > 0 ? (totalSales / totalClicks) * 100 : 0;

//       // Convert data to XML structure with daily data
//       const xmlData = {
//         DailyPerformanceReport: {
//           ReportInfo: {
//             ExportDate: moment().format('YYYY-MM-DD'),
//             Period: startDate && endDate ? 
//               `${moment(startDate).format('YYYY-MM-DD')} to ${moment(endDate).format('YYYY-MM-DD')}` : 
//               'Current Month'
//           },
//           DailyData: {
//             Day: data && data.length > 0 ? 
//               data.map(item => ({
//                 Date: item['Date'],
//                 Clicks: item['Clicks'],
//                 Sales: item['Sales'],
//                 ConversionRate: item['Conversion Rate']
//               })) : [{
//                 Date: 'No data available',
//                 Clicks: '0',
//                 Sales: '0',
//                 ConversionRate: '0%'
//               }]
//           },
//           Summary: {
//             TotalClicks: totalClicks,
//             TotalSales: totalSales,
//             TotalConversionRate: `${totalConversionRate.toFixed(2)}%`
//           }
//         }
//       };

//       // Convert to XML
//       const xml = js2xml(xmlData, { compact: true, spaces: 2 });

//       // Set response headers
//       res.setHeader('Content-Type', 'application/xml');
//       res.setHeader('Content-Disposition', `attachment; filename=daily_performance_${timestamp}.xml`);
      
//       return res.send(xml);
//     } catch (error) {
//       console.error('XML export error:', error);
//       throw new Error('XML export failed: ' + error.message);
//     }
//   }
// };