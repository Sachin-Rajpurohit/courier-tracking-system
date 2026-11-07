const mongoose = require("mongoose");
require("../models");

async function connectDB() {
  await mongoose.connect(process.env.MONGO_URI);
  // Wait for indexes so unique rules are active before the first request.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

module.exports = connectDB;
