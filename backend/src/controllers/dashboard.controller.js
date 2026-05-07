const dashboardService = require("../services/dashboard.service");

// Hàm lấy thống kê tổng quan cho Dashboard
const getDashboardStats = async (req, res) => {
  try {
    const result = await dashboardService.getDashboardStats();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Hàm lấy danh sách vật tư sắp hết (Low Stock)
const getLowStock = async (req, res) => {
  try {
    // Gọi hàm từ service thông qua object dashboardService đã require ở đầu file
    const items = await dashboardService.getLowStockItems();
    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getLowStock
};