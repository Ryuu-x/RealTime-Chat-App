import express from "express";
import { login, logout, signup, updateProfile, checkAuth } from "../controllers/auth.controller.js";
import { loginAccountLimiter, loginIpLimiter, signupLimiter } from "../lib/rateLimitConfig.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.js";


const router = express.Router();

router.post("/signup", signupLimiter ,signup);
router.post("/login", loginIpLimiter, loginAccountLimiter, login);
router.post("/logout", logout);
router.put("/update-profile", protectRoute, upload.single("image"), updateProfile);

router.get("/check", protectRoute, checkAuth)

export default router;
