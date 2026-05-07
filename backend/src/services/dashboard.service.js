const prisma = require("../config/prisma");

const getDashboardStats = async () => {

  const totalItems =
    await prisma.item.count();

  const borrowedItems =
    await prisma.borrowOrder.count({

      where: {
        status: "BORROWED"
      }

    });

  const pendingRequests =
    await prisma.borrowOrder.count({

      where: {
        status: "PENDING"
      }

    });

  const lowStockItems =
    await prisma.stock.count({

      where: {

        quantity: {
          lte: 5
        }

      }

    });

  return {

    totalItems,
    borrowedItems,
    pendingRequests,
    lowStockItems

  };

};

const getLowStockItems =
  async () => {

    return await prisma.stock.findMany({

      where: {

        quantity: {

          lte:
            prisma.stock.fields.minimumLevel

        }

      },

      include: {

        item: true

      }

    });

};


module.exports = {
  getDashboardStats,
  getLowStockItems
};