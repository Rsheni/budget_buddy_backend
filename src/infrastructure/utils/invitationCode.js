const crypto = require('crypto');
const GroupInvitation = require('../models/GroupInvitation');

/**
 * Generates a random 6-character uppercase alphanumeric code.
 * Ensures uniqueness by checking existing invitations.
 * @returns {Promise<string>} Unique invitation code
 */
async function generateInvitationCode() {
  const generate = () => crypto.randomBytes(3).toString('hex').toUpperCase();
  let code = generate();
  // Ensure uniqueness (unlikely to collide, but loop just in case)
  while (await GroupInvitation.findOne({ code })) {
    code = generate();
  }
  return code;
}

module.exports = { generateInvitationCode };
