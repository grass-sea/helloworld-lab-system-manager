const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const asyncHandler =
  require("express-async-handler");

const register = asyncHandler(
  async (req, res) => {
    const {
      fullName,
      email,
      password,
      role
    } = req.body;

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email
        }

      });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"

      });

    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const user =
      await prisma.user.create({

        data: {
          fullName,
          email,
          password: hashedPassword,
          role

        }
      });

    res.status(201).json({
      success: true,
      message: "Register successful",
      user

    });

});


const login = asyncHandler(
  async (req, res) => {
    const { email, password } =
      req.body;

    const user =
      await prisma.user.findUnique({
        where: {
          email
        }

      });


    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"

      });

    }

    const isMatch =
      await bcrypt.compare(
        password,
        user.password

      );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Wrong password"

      });

    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }

    );


    res.json({
      success: true,
      message: "Login successful",
      token,
      user
    });

});

module.exports = {
  register,
  login
};