const express = require("express");

const router = express.Router();

const authMiddleware = require(
  "../middleware/auth.middleware"
);

const {
  getDashboardStats,
  getLowStock
} = require("../controllers/dashboard.controller");

router.get(
  "/low-stock",
  authMiddleware,
  getLowStock
);

router.get(
  "/stats",
  authMiddleware,
  getDashboardStats
);

module.exports = router;