const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();

// Render sits in front of the app, and rate limits need the visitor's real IP.
app.set("trust proxy", 1);

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/addresses", require("./routes/addressRoutes"));
app.use("/api/shipments", require("./routes/shipmentRoutes"));
app.use("/api/tracking-events", require("./routes/trackingEventRoutes"));
app.use("/api/assignments", require("./routes/assignmentRoutes"));
app.use("/api/delivery-attempts", require("./routes/deliveryAttemptRoutes"));
app.use("/api/track", require("./routes/trackingRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
