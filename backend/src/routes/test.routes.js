const express = require("express");

const router = express.Router();

const authMiddleware = require(
  "../middleware/auth.middleware"
);

router.get(
  "/profile",
  authMiddleware,
  (req, res) => {

    res.json({
      message: "Protected route success",
      user: req.user
    });

  }
);

module.exports = router;