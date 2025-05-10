const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log(req.body)
  try {
    // Find user by email
    const user = await User.findOne({ email });
    console.log('usserr', user)
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    // Match password
    console.log('passworddd', password, user.password)
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('isMatch', isMatch)
    if (!isMatch) return res.status(400).json({ error: "Invalid email and password" });

    // Generate JWT Token
    const token = jwt.sign(
      { userId: user.userId, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({ accessToken: token, message: 'Logged In Successfully', statusCode: 200 });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
