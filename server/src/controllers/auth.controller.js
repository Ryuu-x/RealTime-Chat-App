import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import validator from "validator";
import streamifier from "streamifier";

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password should be of at least 6 characters." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existing = await User.findOne({ email: normalizedEmail });

    if (existing)
      return res
        .status(400)
        .json({ message: "Account already exists with this email" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName: fullName,
      email: normalizedEmail,
      password: hashedPassword,
    });

    const savedUser = await newUser.save();

    // generate JWT token
    generateToken(savedUser._id, res);

    return res.status(201).json({
      _id: savedUser._id,
      fullName: savedUser.fullName,
      email: savedUser.email,
      profilePic: savedUser.profilePic || null,
    });
  } catch (error) {
    console.error("Error in signup controller:", error);
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      return res
        .status(400)
        .json({ message: "Account already exists with this email" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  try {
    const normalizedEmail = email.trim().toLowerCase();

    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const isPassCorrect = await bcrypt.compare(password, user.password);
    if (!isPassCorrect) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic || null,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// export const updateProfile = async (req, res) => {
//   try {
//     const { profilePic } = req.body;
//     const userId = req.user._id;

//     if (!profilePic) {
//       return res.status(400).json({ message: "Profile pic is required" });
//     }

//     const uploadResponse = await cloudinary.uploader.upload(profilePic);
//     const updatedUser = await User.findByIdAndUpdate(
//       userId,
//       { profilePic: uploadResponse.secure_url },
//       { new: true }
//     );

//     return res.status(200).json(updatedUser);
//   } catch (error) {
//     console.log("Error in updateProfile controller", error.message);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

export const updateProfile = async (req, res) => {
  console.log("---- updateProfile handler entry ----", {
    method: req.method,
    url: req.originalUrl,
    cookies: Object.keys(req.cookies || {}).length,
    hasFile: !!req.file,
    bodyKeys: Object.keys(req.body || {}),
  });
  
  try {
    const userId = req.user._id;

    // If a file was uploaded via multipart/form-data (multer), it's available at req.file
    // If client posts base64 in JSON for backward compatibility, it will be in req.body.profilePic
    let profilePicUrl = null;

    // 1) Handle file upload via multer (preferred)
    if (req.file) {
      // stream the buffer to Cloudinary
      const streamUpload = () =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "profile_pics" }, // optional folder
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });

      try {
        const uploadResult = await streamUpload();
        profilePicUrl = uploadResult.secure_url;
      } catch (uploadErr) {
        console.error("Cloudinary (stream) upload error:", uploadErr);
        return res.status(500).json({ message: "Image upload failed" });
      }
    }
    // 2) Fallback: base64 image in req.body.profilePic (keep compatibility)
    else if (req.body?.profilePic) {
      try {
        const uploadResult = await cloudinary.uploader.upload(
          req.body.profilePic,
          {
            folder: "profile_pics",
          }
        );
        profilePicUrl = uploadResult.secure_url;
      } catch (uploadErr) {
        console.error("Cloudinary (base64) upload error:", uploadErr);
        return res.status(500).json({ message: "Image upload failed" });
      }
    }

    // If neither provided, return bad request (or you may simply update other fields)
    if (!profilePicUrl && !Object.keys(req.body).length) {
      return res.status(400).json({ message: "No profile data provided" });
    }

    // Build update object: include profilePicUrl if uploaded, and any other fields sent in req.body
    const updateData = { ...req.body };
    if (profilePicUrl) updateData.profilePic = profilePicUrl;

    // Remove profilePic from updateData if it was the base64 string (we replaced with url)
    if (updateData.profilePic && updateData.profilePic.startsWith("data:")) {
      // ensured we replaced with url above, but be defensive
      updateData.profilePic = profilePicUrl || updateData.profilePic;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
      select: "-password",
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    // full error dump for debugging
    console.error(
      "updateProfile error - toJSON:",
      error.toJSON ? error.toJSON() : error
    );
    console.error("error.response?.status:", error.response?.status);
    console.error("error.response?.data:", error.response?.data);
    console.error("error.message:", error.message);
    toast.error(error?.response?.data?.message ?? "Update failed");
    throw error;
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
