// Runs the API with a temporary in-memory database and demo data, so the app can be
// tried without an Atlas account. Everything is lost when the process stops.
const crypto = require("crypto");
const { MongoMemoryServer } = require("mongodb-memory-server");

async function run() {
  const mongo = await MongoMemoryServer.create();

  process.env.MONGO_URI = mongo.getUri("courier_tracking");
  process.env.JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString("hex");

  const connectDB = require("../config/db");
  const app = require("../app");
  const { seedDatabase, DEMO_USERS } = require("./seedData");

  await connectDB();
  await seedDatabase();

  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`In-memory API running on http://localhost:${port}`);
    console.table(DEMO_USERS.map(({ email, password, role }) => ({ role, email, password })));
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
