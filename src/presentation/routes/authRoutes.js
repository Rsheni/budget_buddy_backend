const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    verifyEmailPin
} = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-pin', verifyEmailPin);

module.exports = router;
