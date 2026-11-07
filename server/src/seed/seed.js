const mongoose = require("mongoose");
const { checkEnv } = require("../config/env");
const connectDB = require("../config/db");
const { User } = require("../models");
const { clearDatabase, seedDatabase, DEMO_USERS } = require("./seedData");

async function run() {
  checkEnv();
  await connectDB();

  const reset = process.argv.includes("--reset");
  const hasData = await User.exists({});
  if (hasData && !reset) {
    throw new Error("This database already has data. Run with --reset to delete everything and seed again.");
  }

  if (reset) await clearDatabase();
  const result = await seedDatabase();

  console.log(`Seeded ${result.users} users and ${result.shipments} shipments.`);
  console.table(DEMO_USERS.map(({ email, password, role }) => ({ role, email, password })));
}

run()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
