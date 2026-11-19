import { login, userlogout } from './userController.js';
import jwt from 'jsonwebtoken';

const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });

export const sellerLogin = async (req, res) => {
    const { email, password } = req.body || {};
    if (!process.env.SELLER_EMAIL || !process.env.SELLER_PASSWORD) {
        req.requiredRole = 'seller';
        return login(req, res);
    }
    if (typeof email !== 'string' || typeof password !== 'string' || email.trim().toLowerCase() !== process.env.SELLER_EMAIL.trim().toLowerCase() || password !== process.env.SELLER_PASSWORD) {
        req.requiredRole = 'seller';
        return login(req, res);
    }
    const seller = { email: process.env.SELLER_EMAIL, name: 'Freshora Seller', role: 'seller' };
    const token = jwt.sign(seller, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.clearCookie('token', cookieOptions());
    res.cookie('sellerToken', token, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({ success: true, seller });
};
export const isAuth = (req, res) => res.json({ success: true, seller: req.seller });
export const sellerLogout = userlogout;
