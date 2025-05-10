const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    const token = req.header('Authorization')?.split(' ')[1]; // Bearer <token>
    console.log('token', token)
    if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // You can access userId, email etc.
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};
