const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

module.exports = function (req, res, next) {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }
  try {
    let actualToken;
    if (token.startsWith('Bearer ')) {
      actualToken = token.slice(7, token.length);
    } else {
      actualToken = token;
    }

    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);

    req.user = { id: decoded.id };
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};