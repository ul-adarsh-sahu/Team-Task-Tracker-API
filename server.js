require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./src/docs/swaggerConfig");
const { connectDB } = require("./src/config/db");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI — available at /api-docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "Team Task Tracker API",
  swaggerOptions: { persistAuthorization: true },
}));

// Expose raw spec for tooling (Postman import, etc.)
app.get("/api-docs.json", (req, res) => res.json(swaggerSpec));

// Routes
app.use("/api/v1", require("./src/api/api.router"));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ status: 404, code: "NOT_FOUND", message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ status: 500, code: "INTERNAL_SERVER_ERROR", message: "Internal server error" });
});

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
    console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
  });
};

// Only boot when run directly (not during tests)
if (require.main === module) {
  start();
}

module.exports = app;
