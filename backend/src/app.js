const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const testRoutes = require("./routes/test.routes");

const app = express();
const categoryRoutes = require(
  "./routes/category.routes"
);

const itemRoutes = require(
  "./routes/item.routes"
);

const borrowRoutes = require(
  "./routes/borrow.routes"
);

const errorMiddleware = require(
  "./middleware/error.middleware"
);

const dashboardRoutes =
  require("./routes/dashboard.routes");

const swaggerUi =
  require("swagger-ui-express");

const swaggerSpec =
  require("./config/swagger");

const errorHandler =
  require("./middleware/error.middleware");
//------------------------------------------------------\\
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/borrow", borrowRoutes);
app.use(errorMiddleware);
app.use("/api/dashboard", dashboardRoutes);
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);
app.use(errorHandler);

//----------------------------------------------------------\\
app.get("/", (req, res) => {
  res.send("Lab Inventory Backend Running");
});

module.exports = app;