const { PrismaClient } = require("@prisma/client");

const bcrypt = require("bcrypt");

const prisma = new PrismaClient();



async function main() {

  console.log("Seeding database...");



  // ADMIN

  const hashedPassword =
    await bcrypt.hash("123456", 10);



  const admin =
    await prisma.user.upsert({

      where: {
        email: "admin@gmail.com"
      },

      update: {},

      create: {

        fullName: "Admin",

        email: "admin@gmail.com",

        password: hashedPassword,

        role: "ADMIN"

      }

    });



  console.log("Admin created");



  // CATEGORY

 const category =
  await prisma.category.upsert({

    where: {
      name: "Arduino"
    },

    update: {},

    create: {
      name: "Arduino"
    }

  });



  console.log("Category created");



  // ITEM

  const item =
    await prisma.item.create({

      data: {
        name: "Arduino Uno R3",
        categoryId: category.id,
        type: "FIXED",
        location: "Cabinet A1",

    stock: {
        create: {
        quantity: 10,
        minimumLevel: 2
        }
     }

    }

    });



  console.log("Item created");



  console.log("Seeding completed");

}



main()

  .catch((error) => {

    console.error(error);

    process.exit(1);

  })

  .finally(async () => {

    await prisma.$disconnect();

  });