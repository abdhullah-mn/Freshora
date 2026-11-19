import User from '../models/user.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
const profile = user => ({ id: String(user._id), name: user.name, email: user.email, role: user.role || 'buyer' });
export function startSession(user, res) {
    const account = profile(user);
    const token = jwt.sign({ id: account.id, role: account.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.clearCookie('sellerToken', cookieOptions());
    res.cookie('token', token, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });
    return account;
}
export const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72 || !['buyer', 'seller'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Enter your name, a valid email, an 8-character password (maximum 72 bytes), and select Buyer or Seller.' });
    }
    try {
        const normalizedEmail = email.trim().toLowerCase();
        if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ success: false, message: 'This email already has an account. Please sign in.' });
        const user = await User.create({ name: name.trim(), email: normalizedEmail, password: await bcrypt.hash(password, 10), role });
        return res.status(201).json({ success: true, user: startSession(user, res) });
    } catch (error) {
        return res.status(error.code === 11000 ? 409 : 500).json({ success: false, message: error.code === 11000 ? 'This email already has an account.' : 'Unable to create your account. Please try again.' });
    }
};
export const login = async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) return res.status(400).json({ success: false, message: 'Email and password are required.' });
    try {
        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user || !await bcrypt.compare(password, user.password)) return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        if (req.requiredRole && (user.role || 'buyer') !== req.requiredRole) return res.status(403).json({ success: false, message: 'This is a buyer account. Sign in from the store, or create a seller account with another email.' });
        return res.json({ success: true, user: startSession(user, res), ...(user.role === 'seller' ? { seller: profile(user) } : {}) });
    } catch { return res.status(500).json({ success: false, message: 'Unable to sign in. Please try again.' }); }
};
export const isAuth = (req, res) => res.json({ success: true, user: profile(req.user) });
export const userlogout = (req, res) => {
    res.clearCookie('token', cookieOptions());
    res.clearCookie('sellerToken', cookieOptions());
    return res.json({ success: true, message: 'Logged out.' });
};
