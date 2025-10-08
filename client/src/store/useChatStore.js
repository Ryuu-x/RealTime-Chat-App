import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);

      // Normalize senderId to always be the id string
      const normalized = res.data.map((m) => ({
        ...m,
        senderId: m.senderId?._id ?? m.senderId,
      }));

      set({ messages: normalized });

      console.log("Fetched (normalized) messages:", normalized);
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
  const { selectedUser, messages } = get();
  try {
    // If messageData is FormData, axios will set the correct multipart headers automatically.
    const res = await axiosInstance.post(
      `/messages/send/${selectedUser._id}`,
      messageData
    );

    // Normalize senderId in response 
    const normalizedMessage = {
      ...res.data,
      senderId: res.data.senderId?._id ?? res.data.senderId,
    };

    set({ messages: [...messages, normalizedMessage] });
    console.log("Sent message (normalized):", normalizedMessage);
  } catch (error) {
    console.error(error);
    toast.error(error?.response?.data?.message ?? "Send failed");
  }
},

  subscribeToMessages: () => {
  const { selectedUser } = get();
  if (!selectedUser) return;

  const socket = useAuthStore.getState().socket;

  socket.on("newMessage", (newMessage) => {
    // normalize senderId
    const normalized = {
      ...newMessage,
      senderId: newMessage.senderId?._id ?? newMessage.senderId,
    };

    const isMessageSentFromSelectedUser = String(normalized.senderId) === String(selectedUser._id);
    if (!isMessageSentFromSelectedUser) return;

    set({
      messages: [...get().messages, normalized],
    });
  });
},


  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
