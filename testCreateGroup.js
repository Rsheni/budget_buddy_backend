require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const { createGroup } = require('./src/presentation/controllers/groupController');
const User = require('./src/infrastructure/models/User');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("DB Connected");
        
        const testUser = await User.findOne();
        if (!testUser) {
            console.log("No user found in DB");
            process.exit(1);
        }

        const req = {
            body: {
                groupName: "Automated Test Group",
                members: JSON.stringify(["sehanidilmika7@gmail.com"])
            },
            user: testUser
        };

        const res = {
            status: (code) => {
                console.log("Response status:", code);
                return {
                    json: (data) => console.log("Response JSON:", data)
                };
            }
        };

        await createGroup(req, res);
        
        console.log("Create group completed.");
        process.exit(0);
    } catch (e) {
        console.error("Test failed:", e);
        process.exit(1);
    }
})();
