const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Prijava je obavezna.",
    });
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Sesija je nevažeća ili je istekla.",
    });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Prijava je obavezna.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Nemate dozvolu za ovu akciju.",
      });
    }

    next();
  };
}

module.exports = { authenticate, requireRole };
