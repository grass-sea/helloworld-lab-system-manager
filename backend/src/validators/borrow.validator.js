const z = require("zod");



const createBorrowSchema = z.object({

  items: z.array(

    z.object({

      itemId: z.number(),

      quantity: z.number().min(1)

    })

  ).min(1)

});



module.exports = {
  createBorrowSchema
};