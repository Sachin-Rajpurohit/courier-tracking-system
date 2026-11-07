const crypto = require("crypto");

// No 0/O or 1/I, so numbers are easy to read out. Random rather than sequential,
// so nobody can guess other shipments on the public tracking page.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const TRACKING_PATTERN = /^CTS[2-9A-HJ-NP-Z]{10}$/;

function generateTrackingNumber() {
  let result = "CTS";
  for (let i = 0; i < 10; i++) {
    result += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return result;
}

module.exports = { generateTrackingNumber, TRACKING_PATTERN };
