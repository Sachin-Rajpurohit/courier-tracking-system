const mongoose = require("mongoose");
const ApiError = require("./ApiError");

const MAX_LIMIT = 100;

// Query values are only trusted as plain strings, which blocks operator injection.
function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function searchRegex(value) {
  return new RegExp(escapeRegex(value.slice(0, 100)), "i");
}

function parseList(query, sortableFields, defaultSort = "-createdAt") {
  const page = Math.max(parseInt(text(query.page), 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(text(query.limit), 10) || 10, 1), MAX_LIMIT);

  const requested = text(query.sort);
  const sort = sortableFields.includes(requested.replace(/^-/, "")) ? requested : defaultSort;

  return { page, limit, skip: (page - 1) * limit, sort: `${sort} -_id` };
}

function enumFilter(value, allowed, label) {
  const selected = text(value);
  if (!selected) return undefined;
  if (!allowed.includes(selected)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  return selected;
}

function idFilter(value, label) {
  const selected = text(value);
  if (!selected) return undefined;
  if (!mongoose.isValidObjectId(selected)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  return new mongoose.Types.ObjectId(selected);
}

function dateRange(fromValue, toValue) {
  const range = {};
  const from = text(fromValue);
  const to = text(toValue);
  if (from) {
    range.$gte = new Date(from);
    if (Number.isNaN(range.$gte.getTime())) throw new ApiError(400, "Invalid from date");
  }
  if (to) {
    range.$lte = new Date(to);
    if (Number.isNaN(range.$lte.getTime())) throw new ApiError(400, "Invalid to date");
    // A plain date means the whole of that day.
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) range.$lte.setUTCHours(23, 59, 59, 999);
  }
  return Object.keys(range).length > 0 ? range : undefined;
}

function withoutEmpty(filter) {
  return Object.fromEntries(Object.entries(filter).filter(([, value]) => value !== undefined));
}

async function paginate(model, filter, { page, limit, skip, sort }, populate = []) {
  const [items, total] = await Promise.all([
    model.find(filter).sort(sort).skip(skip).limit(limit).populate(populate),
    model.countDocuments(filter),
  ]);
  return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
}

module.exports = { text, searchRegex, parseList, enumFilter, idFilter, dateRange, withoutEmpty, paginate };
