const { checkEnv } = require("./config/env");
const connectDB = require("./config/db");
const app = require("./app");

async function start() {
  checkEnv();
  await connectDB();
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

start().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
