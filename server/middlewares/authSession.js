import jwt from 'jsonwebtoken';
import User from '../models/user.js';

export default async function authSession(req, res, next) {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ success: false, message: 'Please sign in.' });
    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
    catch { return res.status(401).json({ success: false, message: 'Your session has expired. Please sign in again.' }); }
    if (typeof decoded.id !== 'string' || !/^[a-f0-9]{24}$/i.test(decoded.id)) {
        return res.status(401).json({ success: false, message: 'Invalid account session.' });
    }
    try {
        const user = await User.findById(decoded.id).select('-password');
        if (!user) return res.status(401).json({ success: false, message: 'Account no longer exists.' });
        req.user = user;
        req.userId = String(user._id);
        return next();
    } catch { return res.status(503).json({ success: false, message: 'Unable to verify your account. Please try again.' }); }
}
