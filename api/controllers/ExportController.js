const ExportService = require("../services/exportServices")

exports.exportPerformanceReport = async (req, res) => {
  try {
    return await ExportService.exportPerformanceReport(req, res);
  } catch (error) {
    console.error('Export controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Export failed',
      error: error.message
    });
  }
};