require("dotenv").config();

const required = ["MONGO_URI", "JWT_SECRET"];

function checkEnv() {
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
  }
}

module.exports = { checkEnv };
