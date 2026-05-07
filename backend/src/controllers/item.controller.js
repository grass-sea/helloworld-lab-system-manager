const prisma = require("../config/prisma");



const createItem = async (req, res) => {

  try {

    const {
      name,
      categoryId,
      type,
      location,
      quantity,
      minimumLevel
    } = req.body;



    const item = await prisma.item.create({

      data: {

        name,

        categoryId,

        type,

        location,

        stock: {

          create: {
            quantity,
            minimumLevel
          }

        }

      },

      include: {
        stock: true,
        category: true
      }

    });



    res.status(201).json(item);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};



const getItems = async (req, res) => {

  try {

    const items = await prisma.item.findMany({

      include: {
        stock: true,
        category: true
      }

    });



    res.json(items);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};



module.exports = {
  createItem,
  getItems
};