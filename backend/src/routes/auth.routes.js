const express = require("express");

const router = express.Router();

const {
  register,
  login
} = require("../controllers/auth.controller");

const validate =
  require("../middleware/validate.middleware");

const {
  registerSchema,
  loginSchema
} = require("../validators/auth.validator");

//-------------------------------------\\

router.post(
  "/register",
  validate(registerSchema),
  register
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post(
  "/login",
  validate(loginSchema),
  login
);

module.exports = router;