const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// ✅ Test Route
router.get("/", (req, res) => {
  res.send("User API is working!!!!!");
});

// ✅ Register New User
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if the user already exists
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists." });
    }

    // ✅ Force bcrypt to use `$2b$` for consistency
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log("Newly Hashed Password:", hashedPassword); // ✅ Log the hashed password

    // ✅ Store only the hashed password
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    const token = generateToken(newUser._id);

    res.status(201).json({
      message: "User registered successfully!",
      userId: newUser._id,
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Login User
router.post("/login", async (req, res) => {
  console.log("Received login request:", req.body);

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found for email:", email);
      return res.status(400).json({ error: "Invalid email or password" });
    }

    console.log("Stored Hashed Password:", user.password, "Type:", typeof user.password);
    console.log("Entered Password:", password, "Type:", typeof password);

    // ✅ Debug bcrypt.compare() output
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("bcrypt.compare() Result:", isMatch);

    if (!isMatch) {
      console.log("Password incorrect");
      return res.status(400).json({ error: "Invalid email or password" });
    }

    console.log("Login successful for:", email);
    const token = generateToken(user._id);

    res.json({
      message: "Login successful!",
      userId: user._id,
      username: user.username,
      email: user.email,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error while logging in" });
  }
});

// Fetch current user details (Protected Route)
router.get("/me", async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password"); // Exclude password
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update User Details (Protected Route)
router.put("/update", async (req, res) => {
  const token = req.header("Authorization").replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  const { oldEmail, newEmail, oldPassword, newPassword, newUsername } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if old email matches
    if (user.email !== oldEmail) {
      return res.status(400).json({ message: "Old email doesn't match" });
    }

    // Check if old password matches
    if (oldPassword && !(await bcrypt.compare(oldPassword, user.password))) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // Update username, email, and password if necessary
    if (newUsername) user.username = newUsername;
    if (newEmail) user.email = newEmail;
    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();
    res.json({ message: "User details updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
