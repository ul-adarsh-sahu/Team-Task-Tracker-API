const jwt = require("jsonwebtoken");

//RBAC (Role-Based Access Control) middleware to check for valid JWT and user roles
//  checkToken()
// checkToken(["ADMIN"])
// checkToken(["ADMIN","MANAGER"])
const checkToken =
  (allowedRoles = []) =>
  (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          status: 401,
          code: "UNAUTHORIZED",
          message: "Authorization token missing",
        });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.userId = decoded.id;
      req.userRole = decoded.role;
      req.organizationId = decoded.organizationId;

      if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({
          status: 403,
          code: "FORBIDDEN",
          message: "You do not have permission to perform this action",
        });
      }

      next();
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          status: 401,
          code: "TOKEN_EXPIRED",
          message: "Access token expired",
        });
      }
      return res.status(401).json({
        status: 401,
        code: "UNAUTHORIZED",
        message: "Invalid token",
      });
    }
  };

module.exports = checkToken;
