import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import mongoose from "mongoose";
import { getReceiverSocketId, io } from './../lib/socket.js';
import streamifier from "streamifier"

export const getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id
        const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password")
        
        res.status(200).json(filteredUsers);

    } catch (error) {
        console.error("Error in getUsersForSidebar controller", error.message);
        return res.status(500).json({message:"Internal server error"})
    }
}

export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params
        const myId = req.user._id

        const messages = await Message.find({
            $or: [
                {senderId:myId, receiverId:userToChatId},
                {senderId:userToChatId, receiverId:myId}
            ]
        })

        res.status(200).json(messages)

    } catch (error) {
        console.error("Error in getMessages controller", error.message);
        return res.status(500).json({message:"Internal server error"})
    }
}

export const sendMessages = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Validation
    if (!text && !req.file) {
      return res.status(400).json({ message: "Message text or image is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid receiver ID" });
    }

    // Upload image if provided
    let imageUrl;
    if (req.file) {
      // upload buffer to cloudinary via stream
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "chat_images" }, // optional
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error (callback):", error);
            return res.status(500).json({ message: "Image upload failed" });
          }
          // result.secure_url will be available here — but we need to continue flow;
          // we'll handle message saving in the promise wrapper below.
        }
      );

      // Create promise wrapper since upload_stream uses callback
      const streamUpload = () =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "chat_images" },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });

      try {
        const uploadResponse = await streamUpload();
        imageUrl = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({ message: "Image upload failed" });
      }
    }

    // Save message
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    // Optionally populate sender details
    const populatedMessage = await newMessage.populate("senderId", "fullName profilePic");

    return res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error in sendMessages controller:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};
