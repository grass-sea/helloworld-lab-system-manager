const express = require("express");

const router = express.Router();

const {
  register
} = require("../controllers/auth.controller");

router.post("/register", register);

router.post("/login", (req, res) => {
  res.json({
    message: "Login API working"
  });
});

module.exports = router;