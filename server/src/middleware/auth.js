const jwt = require("jsonwebtoken");
const { User } = require("../models");
const ApiError = require("../utils/ApiError");

// Checks the JWT sent by the browser and puts the logged-in user on req.user.
async function protect(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new ApiError(401, "Please log in to continue");
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, "Your session has expired. Please log in again.");
  }

  // Loaded on every request so role changes and deactivation apply straight away.
  const user = await User.findById(payload.id);
  if (!user || !user.isActive) {
    throw new ApiError(401, "Your session has expired. Please log in again.");
  }

  req.user = user;
  next();
}

// Use after protect, for example: authorize("admin", "staff")
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, "You don't have permission to do this");
    }
    next();
  };
}

module.exports = { protect, authorize };
