import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";

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
    if (!text && !image) {
      return res.status(400).json({ message: "Message text or image is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid receiver ID" });
    }

    // Upload image if provided
    let imageUrl;
    if (image) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(image);
        imageUrl = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError.message);
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

    // Optionally populate sender details
    const populatedMessage = await newMessage.populate("senderId", "fullName profilePic");

    return res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error in sendMessages controller:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};
