const express = require("express");
const router = express.Router();
const roleMiddleware = require(
  "../middleware/role.middleware"
);

const {
  createBorrowRequest,
  approveBorrowRequest,
  returnBorrowRequest,
  getBorrowHistory
} = require("../controllers/borrow.controller");

const authMiddleware = require(
  "../middleware/auth.middleware"
);



router.post(
  "/",
  authMiddleware,
  createBorrowRequest
);

router.patch(
  "/:id/approve",

  authMiddleware,

  roleMiddleware("ADMIN", "LECTURER"),

  approveBorrowRequest
);

router.patch(
  "/:id/return",

  authMiddleware,

  roleMiddleware("ADMIN", "LECTURER"),

  returnBorrowRequest
);

router.get(
  "/",

  authMiddleware,

  getBorrowHistory
);

module.exports = router;