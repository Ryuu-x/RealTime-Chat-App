import express from "express";
import { login, logout, signup, updateProfile } from "../controllers/auth.controller.js";
import { loginAccountLimiter, loginIpLimiter, signupLimiter } from "../lib/rateLimitConfig.js";

const router = express.Router();

router.post("/signup", signupLimiter ,signup);
router.post("/login", loginIpLimiter, loginAccountLimiter, login);
router.post("/logout", logout);
router.put("/update-profile", updateProfile);

export default router;
