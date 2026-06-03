const authUseCases = require('../../domain/usecases/AuthUseCases');

// @desc    Register new user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
    try {
        console.log('Register Request Body:', req.body);
        const result = await authUseCases.register(req.body);
        res.status(201).json(result);
    } catch (error) {
        console.error('Register Error:', error.message);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Verify Email PIN
// @route   POST /api/auth/verify-pin
const verifyEmailPin = async (req, res) => {
    try {
        const { email, pin } = req.body;
        const result = await authUseCases.verifyPin(email, pin);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await authUseCases.login(email, password);
        res.json(user);
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    verifyEmailPin
};
