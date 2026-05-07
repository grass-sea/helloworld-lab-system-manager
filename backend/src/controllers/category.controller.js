const prisma = require("../config/prisma");



const createCategory = async (req, res) => {

  try {

    const { name } = req.body;

    const category = await prisma.category.create({
      data: {
        name
      }
    });

    res.status(201).json(category);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};



const getCategories = async (req, res) => {

  try {

    const categories = await prisma.category.findMany();

    res.json(categories);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};



module.exports = {
  createCategory,
  getCategories
};