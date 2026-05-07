const prisma = require("../config/prisma");

const createItem = async (data) => {

  const {
    name,
    categoryId,
    type,
    location,
    quantity,
    minimumLevel
  } = data;

  return await prisma.item.create({

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

};

const getItems = async () => {

  return await prisma.item.findMany({

    include: {

      stock: true,
      category: true

    }

  });

};

module.exports = {

  createItem,
  getItems

};