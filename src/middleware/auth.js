import jwt from "jsonwebtoken";

const checkAuth = (req, res, next) => {
  try {
    // Check if Authorization header exists
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "Auth failed: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user data to the request object
    req.userData = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json({ message: "Auth failed: Invalid token" });
  }
};

export default checkAuth;