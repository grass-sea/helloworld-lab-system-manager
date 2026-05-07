const express = require("express");

const router = express.Router();

const {
  createItem,
  getItems
} = require("../controllers/item.controller");

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
  createItem
);



router.get(
  "/",
  authMiddleware,
  getItems
);



module.exports = router;