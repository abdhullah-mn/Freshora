import jwt from 'jsonwebtoken';
import authSession from './authSession.js';
export default async function authSeller(req, res, next) {
    if (req.cookies?.token) {
        return authSession(req, res, () => {
            if (req.user.role !== 'seller') return res.status(403).json({ success: false, message: 'Seller access required.' });
            req.seller = { id: req.userId, name: req.user.name, email: req.user.email, role: req.user.role };
            return next();
        });
    }
    // Retain the existing configured store-owner login.
    try {
        const decoded = jwt.verify(req.cookies?.sellerToken, process.env.JWT_SECRET);
        if (decoded.role !== 'seller' || !process.env.SELLER_EMAIL || decoded.email !== process.env.SELLER_EMAIL) {
            return res.status(403).json({ success: false, message: 'Seller access required.' });
        }
        req.seller = { name: decoded.name, email: decoded.email, role: 'seller' };
        return next();
    } catch { return res.status(401).json({ success: false, message: 'Please sign in as a seller.' }); }
}
