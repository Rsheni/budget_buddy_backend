const User = require('../../infrastructure/models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const register = async (userData) => {
    const { name, email, password, phoneNumber } = userData;

    const userExists = await User.findOne({ email });
    if (userExists) {
        throw new Error('User already exists');
    }

    const user = await User.create({
        name,
        email,
        password,
        phoneNumber,
        isVerified: true
    });

    if (user) {
        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            isVerified: true,
            token: generateToken(user._id),
        };
    } else {
        throw new Error('Invalid user data');
    }
};

const login = async (email, password) => {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            isVerified: true,
            token: generateToken(user._id),
        };
    } else {
        throw new Error('Invalid email or password');
    }
};

module.exports = {
    register,
    login,
};
