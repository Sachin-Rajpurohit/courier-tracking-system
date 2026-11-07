const ApiError = require("../utils/ApiError");

function validate(rules) {
  return (req, res, next) => {
    const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
    const errors = rules(body, req);
    if (Object.keys(errors).length > 0) {
      throw new ApiError(400, "Please correct the highlighted fields", errors);
    }
    req.body = body;
    next();
  };
}

module.exports = validate;
