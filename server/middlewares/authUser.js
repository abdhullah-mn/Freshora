import authSession from './authSession.js';
export default function authUser(req, res, next) {
    return authSession(req, res, () => {
        if ((req.user.role || 'buyer') !== 'buyer') return res.status(403).json({ success: false, message: 'Buyer access required.' });
        return next();
    });
}
