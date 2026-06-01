require('dotenv').config({ path: './.env' });
const { sendGroupInvitationEmail } = require('./src/infrastructure/services/emailService');

(async () => {
    try {
        console.log("Testing email to: sehanidilmika7@gmail.com");
        const info = await sendGroupInvitationEmail('sehanidilmika7@gmail.com', 'TestAdmin', 'TestGroup');
        console.log("Result:", info);
    } catch (e) {
        console.error("Test failed:", e);
    }
})();
