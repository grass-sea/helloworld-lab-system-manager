const express = require("express");

const router = express.Router();

const {
  createCategory,
  getCategories
} = require("../controllers/category.controller");

const authMiddleware = require(
  "../middleware/auth.middleware"
);

const roleMiddleware = require(
  "../middleware/role.middleware"
);



router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  createCategory
);



router.get(
  "/",
  authMiddleware,
  getCategories
);



module.exports = router;