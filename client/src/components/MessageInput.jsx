import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const sendMessage = useChatStore((s) => s.sendMessage);

  const handleImageChange = (e) => {
    const selectedFile = e.target.files?.[0] ?? null;
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please select an image file");
      // reset the input if invalid
      e.target.value = "";
      return;
    }

    // store file in state (actual File object)
    setFile(selectedFile);

    // create preview (data URL) from the selected file
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const removeImage = () => {
    setImagePreview(null);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !file) return;

    try {
      // Build FormData (multipart/form-data)
      const formData = new FormData();
      if (text.trim()) formData.append("text", text.trim());
      if (file) formData.append("image", file); // important: field name "image"

      // send FormData to the server (axiosInstance will set headers)
      await sendMessage(formData);

      // Clear form
      setText("");
      removeImage();
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    }
  };

  return (
    <div className="p-4 w-full">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle ${
              imagePreview ? "text-emerald-500" : "text-zinc-400"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !file}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
