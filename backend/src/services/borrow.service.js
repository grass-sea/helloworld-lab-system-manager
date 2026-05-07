const prisma = require("../config/prisma");



const createBorrowRequest = async (userId, items) => {

  const borrowOrder = await prisma.borrowOrder.create({

    data: {
      userId
    }

  });



  for (const borrowItem of items) {

    const item = await prisma.item.findUnique({

      where: {
        id: borrowItem.itemId
      },

      include: {
        stock: true
      }

    });



    if (!item) {
      throw new Error("Item not found");
    }



    if (item.stock.quantity < borrowItem.quantity) {
      throw new Error(`${item.name} out of stock`);
    }



    await prisma.borrowDetail.create({

      data: {

        borrowOrderId: borrowOrder.id,

        itemId: item.id,

        quantity: borrowItem.quantity

      }

    });

  }



  return borrowOrder;

};

const approveBorrowRequest = async (borrowId) => {

  return await prisma.$transaction(async (tx) => {

    const borrowOrder =
      await tx.borrowOrder.findUnique({

        where: {
          id: parseInt(borrowId)
        },

        include: {
          details: true
        }

      });



    if (!borrowOrder) {
      throw new Error("Borrow order not found");
    }



    if (borrowOrder.status !== "PENDING") {
      throw new Error("Order already processed");
    }



    for (const detail of borrowOrder.details) {

      const item = await tx.item.findUnique({

        where: {
          id: detail.itemId
        },

        include: {
          stock: true
        }

      });



      if (!item) {
        throw new Error("Item not found");
      }



      if (item.stock.quantity < detail.quantity) {
        throw new Error(`${item.name} insufficient stock`);
      }



      await tx.stock.update({

        where: {
          itemId: item.id
        },

        data: {

          quantity: {
            decrement: detail.quantity
          }

        }

      });

    }



    const updatedOrder =
      await tx.borrowOrder.update({

        where: {
          id: parseInt(borrowId)
        },

        data: {

          status: "BORROWED",

          borrowDate: new Date()

        }

      });



    return updatedOrder;

  });

};

const returnBorrowRequest = async (borrowId) => {

  return await prisma.$transaction(async (tx) => {

    const borrowOrder =
      await tx.borrowOrder.findUnique({

        where: {
          id: parseInt(borrowId)
        },

        include: {

          details: {
            include: {
              item: {
                include: {
                  stock: true
                }
              }
            }
          }

        }

      });



    if (!borrowOrder) {
      throw new Error("Borrow order not found");
    }



    if (borrowOrder.status !== "BORROWED") {
      throw new Error("Order is not borrowed");
    }



    for (const detail of borrowOrder.details) {

      if (detail.item.type === "FIXED") {

        await tx.stock.update({

          where: {
            itemId: detail.item.id
          },

          data: {

            quantity: {
              increment: detail.quantity
            }

          }

        });

      }

    }

    const updatedOrder =
      await tx.borrowOrder.update({

        where: {
          id: parseInt(borrowId)
        },

        data: {

          status: "RETURNED",

          returnDate: new Date()

        }
      });
    return updatedOrder;

  });

};

const getBorrowHistory = async () => {

  return await prisma.borrowOrder.findMany({

    include: {

      user: {

        select: {

          id: true,
          fullName: true,
          email: true

        }

      },

      details: {

        include: {

          item: true

        }

      }

    },

    orderBy: {

      createdAt: "desc"

    }

  });

};

module.exports = {
  createBorrowRequest,
  approveBorrowRequest,
  returnBorrowRequest,
  getBorrowHistory
};