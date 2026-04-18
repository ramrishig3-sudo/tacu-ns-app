const jwt = require("jsonwebtoken");

const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error("JWT_SECRET is required");
  process.exit(1);
}

const token = jwt.sign(
  {
    role: "admin",
    issuer: "tacuns"
  },
  secret,
  {
    expiresIn: "30d"
  }
);

console.log(token);
