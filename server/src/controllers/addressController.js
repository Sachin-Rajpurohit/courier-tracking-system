const { Address, Shipment, User } = require("../models");
const ApiError = require("../utils/ApiError");
const { text, searchRegex, parseList, idFilter, withoutEmpty, paginate } = require("../utils/listQuery");
const { isManager } = require("../utils/access");
const { pick } = require("../validators/rules");

const FIELDS = ["label", "contactName", "phone", "line1", "line2", "city", "state", "postalCode", "country"];
const OWNER = { path: "owner", select: "name email" };

function ownerScope(user) {
  return isManager(user) ? {} : { owner: user._id };
}

async function resolveOwner(req) {
  if (!isManager(req.user)) return req.user._id;
  const owner = await User.exists({ _id: req.body.owner, role: "customer" });
  if (!owner) {
    throw new ApiError(400, "Please correct the highlighted fields", { owner: "Choose a customer" });
  }
  return req.body.owner;
}

async function findAddress(req) {
  const address = await Address.findOne({ _id: req.params.id, ...ownerScope(req.user) });
  if (!address) throw new ApiError(404, "Address not found");
  return address;
}

// Shipment history must keep showing where a parcel actually went.
async function assertNotInUse(address) {
  const used = await Shipment.exists({
    $or: [{ senderAddress: address._id }, { receiverAddress: address._id }],
  });
  if (used) {
    throw new ApiError(409, "This address is used by a shipment. Add a new address instead.");
  }
}

async function listAddresses(req, res) {
  const options = parseList(req.query, ["label", "city", "state", "contactName", "createdAt"]);
  const q = text(req.query.q);
  const filter = withoutEmpty({
    owner: idFilter(req.query.owner, "owner"),
    city: text(req.query.city) ? searchRegex(text(req.query.city)) : undefined,
    ...ownerScope(req.user),
  });
  if (q) {
    const regex = searchRegex(q);
    filter.$or = [{ label: regex }, { contactName: regex }, { line1: regex }, { city: regex }, { postalCode: regex }];
  }
  res.json(await paginate(Address, filter, options, OWNER));
}

async function getAddress(req, res) {
  const address = await findAddress(req);
  await address.populate(OWNER);
  res.json(address);
}

async function createAddress(req, res) {
  const owner = await resolveOwner(req);
  const address = await Address.create({ ...pick(req.body, FIELDS), owner });
  res.status(201).json(address);
}

async function updateAddress(req, res) {
  const address = await findAddress(req);
  await assertNotInUse(address);
  const owner = await resolveOwner(req);
  Object.assign(address, pick(req.body, FIELDS), { owner });
  await address.save();
  res.json(address);
}

async function deleteAddress(req, res) {
  const address = await findAddress(req);
  await assertNotInUse(address);
  await address.deleteOne();
  res.json({ message: "Address deleted" });
}

module.exports = { listAddresses, getAddress, createAddress, updateAddress, deleteAddress };
