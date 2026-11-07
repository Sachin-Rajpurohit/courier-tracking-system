const { User, Address, Shipment, Assignment, DeliveryAttempt, TrackingEvent } = require("../models");
const { ROLES } = require("../models/constants");
const ApiError = require("../utils/ApiError");
const { text, searchRegex, parseList, enumFilter, withoutEmpty, paginate } = require("../utils/listQuery");
const { pick } = require("../validators/rules");

// Staff only see the customers and agents they work with.
const STAFF_VISIBLE_ROLES = ["customer", "agent"];

function roleScope(user) {
  return user.role === "staff" ? { role: { $in: STAFF_VISIBLE_ROLES } } : {};
}

async function listUsers(req, res) {
  const options = parseList(req.query, ["name", "email", "role", "createdAt"], "name");
  const q = text(req.query.q);
  const activeValue = text(req.query.active);

  const filter = withoutEmpty({
    role: enumFilter(req.query.role, ROLES, "role"),
    isActive: activeValue === "true" ? true : activeValue === "false" ? false : undefined,
    branch: text(req.query.branch) ? searchRegex(text(req.query.branch)) : undefined,
  });
  // Staff asking for no role, or a role they can't see, get the roles they can see.
  if (req.user.role === "staff" && !STAFF_VISIBLE_ROLES.includes(filter.role)) {
    Object.assign(filter, roleScope(req.user));
  }
  if (q) {
    const regex = searchRegex(q);
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }
  res.json(await paginate(User, filter, options));
}

async function getUser(req, res) {
  const user = await User.findOne({ _id: req.params.id, ...roleScope(req.user) });
  if (!user) throw new ApiError(404, "User not found");
  res.json(user);
}

async function createUser(req, res) {
  if (req.user.role === "staff" && req.body.role !== "customer") {
    throw new ApiError(403, "Branch staff can only create customer accounts");
  }
  const user = await User.create({
    ...pick(req.body, ["name", "email", "phone", "role", "branch", "isActive"]),
    password: req.body.password,
  });
  res.status(201).json(user);
}

async function updateUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");

  const isSelf = user._id.equals(req.user._id);
  if (isSelf && (req.body.role !== user.role || req.body.isActive === false)) {
    throw new ApiError(400, "You can't change your own role or deactivate your own account");
  }

  const roleChanged = req.body.role !== user.role;
  if (roleChanged && (await hasWorkRecords(user._id))) {
    throw new ApiError(409, "This user has shipment records, so their role can't be changed");
  }

  Object.assign(user, pick(req.body, ["name", "email", "phone", "role", "branch", "isActive"]));
  if (req.body.password) user.password = req.body.password;
  await user.save();
  res.json(user);
}

function hasWorkRecords(userId) {
  return Promise.all([
    Shipment.exists({ $or: [{ customer: userId }, { createdBy: userId }, { assignedAgent: userId }] }),
    Assignment.exists({ $or: [{ agent: userId }, { assignedBy: userId }] }),
    DeliveryAttempt.exists({ agent: userId }),
    TrackingEvent.exists({ recordedBy: userId }),
  ]).then((found) => found.some(Boolean));
}

async function deleteUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  if (user._id.equals(req.user._id)) {
    throw new ApiError(400, "You can't delete your own account");
  }
  if (await hasWorkRecords(user._id)) {
    throw new ApiError(409, "This user has shipment records. Deactivate the account instead.");
  }
  await Address.deleteMany({ owner: user._id });
  await user.deleteOne();
  res.json({ message: "User deleted" });
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
