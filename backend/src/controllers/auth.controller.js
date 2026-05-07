const prisma = require("../config/prisma");

const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");



const register = async (req, res) => {

  try {

    const { fullName, email, password, role } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: {
        email
      }
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        role
      }
    });

    res.status(201).json({
      message: "Register successful",
      user
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};



const login = async (req, res) => {

  try {

    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: {
        email
      }
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Wrong password"
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role
      },
      "SECRET_KEY",
      {
        expiresIn: "1d"
      }
    );

    res.json({
      message: "Login successful",
      token,
      user
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};

module.exports = {
  register,
  login
};