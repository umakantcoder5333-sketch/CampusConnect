import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import "./UnifiedPages.css";

const EMOJIS = [
  "😀", "😂", "🤣", "😊", "😍", "🥰", "😘", "😎",
  "🤔", "😅", "😭", "😡", "👍", "👎", "👏", "🙏",
  "❤️", "🔥", "🎉", "✅", "💯", "🚀", "💪", "😄",
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function Messages() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  const [loading, setLoading] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [attachmentType, setAttachmentType] = useState("");
  const [attachmentPreview, setAttachmentPreview] = useState("");

  const messagesEndRef = useRef(null);
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // =========================================================
  // CURRENT USER
  // =========================================================

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("User error:", error);
        setErrorMessage("Unable to get logged-in user.");
        setLoading(false);
        return;
      }

      if (!user) {
        setErrorMessage("You are not logged in.");
        setLoading(false);
        return;
      }

      setCurrentUser(user);

      await Promise.all([
        loadUsers(user.id),
        loadConversationList(user.id),
      ]);

      setLoading(false);
    } catch (error) {
      console.error("Get current user error:", error);
      setErrorMessage("Something went wrong.");
      setLoading(false);
    }
  };

  // =========================================================
  // ONLINE / OFFLINE PRESENCE
  // =========================================================

  useEffect(() => {
    if (!currentUser?.id) return;

    const presenceChannel = supabase.channel("campusconnect-online-users", {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    const updateOnlineUsers = () => {
      const state = presenceChannel.presenceState();
      setOnlineUsers(new Set(Object.keys(state)));
    };

    presenceChannel
      .on("presence", { event: "sync" }, updateOnlineUsers)
      .on("presence", { event: "join" }, updateOnlineUsers)
      .on("presence", { event: "leave" }, updateOnlineUsers)
      .subscribe(async (status, error) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            user_id: currentUser.id,
            online_at: new Date().toISOString(),
          });
          updateOnlineUsers();
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Presence error:", error);
        }
      });

    return () => {
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
      setOnlineUsers(new Set());
    };
  }, [currentUser?.id]);

  // =========================================================
  // LOAD USERS
  // =========================================================

  const loadUsers = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, username, profile_image_url")
        .neq("id", userId)
        .order("name", { ascending: true });

      if (error) {
        console.error("Users error:", error);
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error("Load users error:", error);
    }
  };

  // =========================================================
  // LOAD CONVERSATIONS
  // =========================================================

  const loadConversationList = async (userId) => {
    if (!userId) return;

    try {
      const { data: myMemberships, error: membershipError } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id, last_read_at")
        .eq("user_id", userId);

      if (membershipError) {
        console.error("Membership error:", membershipError);
        return;
      }

      const conversationIds =
        myMemberships?.map((item) => item.conversation_id) || [];

      if (conversationIds.length === 0) {
        setConversations([]);
        return;
      }

      const { data: memberRows, error: memberRowsError } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id")
        .in("conversation_id", conversationIds)
        .neq("user_id", userId);

      if (memberRowsError) {
        console.error("Member rows error:", memberRowsError);
        return;
      }

      const otherUserIds = [
        ...new Set((memberRows || []).map((row) => row.user_id)),
      ];

      let profileMap = {};

      if (otherUserIds.length > 0) {
        const { data: profileRows, error: profileError } = await supabase
          .from("profiles")
          .select("id, name, username, profile_image_url")
          .in("id", otherUserIds);

        if (profileError) {
          console.error("Profile error:", profileError);
          return;
        }

        profileMap = Object.fromEntries(
          (profileRows || []).map((profile) => [profile.id, profile])
        );
      }

      const { data: messageRows, error: messageError } = await supabase
        .from("messages")
        .select(
          "id, conversation_id, content, sender_id, created_at, edited_at, deleted_at, reply_to_message_id, message_type, media_url, file_name, file_size"
        )
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false });

      if (messageError) {
        console.error("Conversation messages error:", messageError);
        return;
      }

      const latestMessageMap = {};
      const messagesByConversation = {};

      (messageRows || []).forEach((message) => {
        if (!latestMessageMap[message.conversation_id]) {
          latestMessageMap[message.conversation_id] = message;
        }

        if (!messagesByConversation[message.conversation_id]) {
          messagesByConversation[message.conversation_id] = [];
        }

        messagesByConversation[message.conversation_id].push(message);
      });

      const conversationList = conversationIds
        .map((id) => {
          const member = (memberRows || []).find(
            (row) => row.conversation_id === id
          );

          if (!member) return null;

          const latestMessage = latestMessageMap[id];
          const myMembership = (myMemberships || []).find(
            (row) => row.conversation_id === id
          );

          const otherUser =
            profileMap[member.user_id] || {
              id: member.user_id,
              name: "Student",
              username: "student",
              profile_image_url: null,
            };

          const messagesForConversation =
            messagesByConversation[id] || [];

          const lastReadTime = myMembership?.last_read_at
            ? new Date(myMembership.last_read_at).getTime()
            : 0;

          const unreadCount = messagesForConversation.filter((message) => {
            if (message.sender_id === userId) return false;
            return new Date(message.created_at).getTime() > lastReadTime;
          }).length;

          const lastMessageSender = latestMessage
            ? latestMessage.sender_id === userId
              ? "You"
              : profileMap[latestMessage.sender_id]?.name || otherUser.name
            : "";

          return {
            conversationId: id,
            user: otherUser,
            lastMessage: latestMessage || null,
            lastMessageTime: latestMessage?.created_at || null,
            lastMessageSender,
            unreadCount,
          };
        })
        .filter(Boolean);

      conversationList.sort((a, b) => {
        const dateA = a.lastMessageTime
          ? new Date(a.lastMessageTime).getTime()
          : 0;
        const dateB = b.lastMessageTime
          ? new Date(b.lastMessageTime).getTime()
          : 0;
        return dateB - dateA;
      });

      setConversations(conversationList);
    } catch (error) {
      console.error("Conversation list error:", error);
    }
  };

  // =========================================================
  // CONVERSATION READ STATE
  // =========================================================

  const markConversationRead = async (id) => {
    if (!currentUser?.id || !id) return;

    const { error } = await supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", id)
      .eq("user_id", currentUser.id);

    if (error) {
      console.error("Mark conversation read error:", error);
      return;
    }

    await loadConversationList(currentUser.id);
  };

  // =========================================================
  // TIME HELPERS
  // =========================================================

  const formatConversationTime = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const now = new Date();
    const difference = now.getTime() - date.getTime();

    const oneMinute = 60 * 1000;
    const oneHour = 60 * oneMinute;
    const oneDay = 24 * oneHour;

    if (difference < oneMinute) return "Just now";
    if (difference < oneHour) return `${Math.floor(difference / oneMinute)}m`;
    if (difference < oneDay) return `${Math.floor(difference / oneHour)}h`;

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return "";

    return new Date(timestamp).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // =========================================================
  // MESSAGE DISPLAY HELPERS
  // =========================================================

  const attachmentLabel = (message) => {
    if (!message) return "";
    if (message.message_type === "image") return "Photo";
    if (message.message_type === "video") return "Video";
    if (message.message_type === "file") return message.file_name || "File";
    return "";
  };

  const previewMessageText = (message) => {
    if (!message) return "";
    if (message.deleted_at) return "Message deleted";

    if (message.message_type === "image") return "📷 Photo";
    if (message.message_type === "video") return "🎥 Video";
    if (message.message_type === "file") {
      return `📎 ${message.file_name || "File"}`;
    }

    return message.content || "";
  };

  const getMessageCaption = (message) => {
    if (!message || message.deleted_at) return "";

    if (message.message_type === "text") {
      return message.content || "";
    }

    const label = attachmentLabel(message);

    if (!message.content || message.content === label) return "";
    if (message.message_type === "file" && message.content === message.file_name) {
      return "";
    }

    return message.content;
  };

  // =========================================================
  // OPEN CONVERSATIONS
  // =========================================================

  const openExistingConversation = async (conversation) => {
    setShowNewMessage(false);
    setShowEmojiPicker(false);
    setSelectedUser(conversation.user);
    setConversationId(conversation.conversationId);
    setMessages([]);
    setErrorMessage("");
    setEditingMessageId(null);
    setEditingText("");
    setReplyingTo(null);
    clearAttachment();
    setLoadingConversation(true);

    await loadMessages(conversation.conversationId);
    await markConversationRead(conversation.conversationId);
    setLoadingConversation(false);
  };

  const openNewConversation = async (user) => {
    if (!currentUser) {
      alert("You are not logged in.");
      return;
    }

    setSelectedUser(user);
    setMessages([]);
    setConversationId(null);
    setErrorMessage("");
    setEditingMessageId(null);
    setEditingText("");
    setReplyingTo(null);
    setShowNewMessage(false);
    setShowEmojiPicker(false);
    clearAttachment();
    setLoadingConversation(true);

    try {
      const { data, error } = await supabase.rpc(
        "create_direct_conversation",
        {
          target_user_id: user.id,
        }
      );

      if (error) {
        console.error("Conversation RPC error:", error);
        setErrorMessage("Unable to create conversation: " + error.message);
        return;
      }

      setConversationId(data);
      await loadMessages(data);
      await markConversationRead(data);
      await loadConversationList(currentUser.id);
    } catch (error) {
      console.error("Open conversation error:", error);
      setErrorMessage("Unable to open conversation.");
    } finally {
      setLoadingConversation(false);
    }
  };

  // =========================================================
  // LOAD MESSAGES
  // =========================================================

  const loadMessages = async (id) => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, conversation_id, content, sender_id, created_at, edited_at, deleted_at, reply_to_message_id, message_type, media_url, file_name, file_size"
        )
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Messages loading error:", error);
        setErrorMessage("Unable to load messages: " + error.message);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error("Load messages error:", error);
    }
  };

  // =========================================================
  // REALTIME MESSAGES
  // =========================================================

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          setMessages((previousMessages) => {
            const exists = previousMessages.some(
              (message) => message.id === payload.new.id
            );

            if (exists) return previousMessages;
            return [...previousMessages, payload.new];
          });

          if (
            currentUser?.id &&
            payload.new.sender_id !== currentUser.id
          ) {
            await markConversationRead(conversationId);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((previousMessages) =>
            previousMessages.map((message) =>
              message.id === payload.new.id ? payload.new : message
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUser?.id]);

  // =========================================================
  // LIVE CONVERSATION LIST
  // =========================================================

  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase
      .channel(`all-user-messages-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async () => {
          await loadConversationList(currentUser.id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        async () => {
          await loadConversationList(currentUser.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  // =========================================================
  // EMOJI
  // =========================================================

  const addEmoji = (emoji) => {
    setMessageText((previous) => previous + emoji);
  };

  // =========================================================
  // ATTACHMENTS
  // =========================================================

  const clearAttachment = () => {
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
    }

    setSelectedFile(null);
    setAttachmentType("");
    setAttachmentPreview("");

    if (photoInputRef.current) photoInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      if (attachmentPreview) {
        URL.revokeObjectURL(attachmentPreview);
      }
    };
  }, [attachmentPreview]);

  const chooseAttachment = (file, type) => {
    if (!file) return;

    let maxSize = MAX_FILE_SIZE;
    if (type === "image") maxSize = MAX_IMAGE_SIZE;
    if (type === "video") maxSize = MAX_VIDEO_SIZE;

    if (file.size > maxSize) {
      const limitText =
        type === "image"
          ? "10 MB"
          : type === "video"
          ? "50 MB"
          : "20 MB";

      setErrorMessage(`File is too large. Maximum allowed is ${limitText}.`);
      return;
    }

    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
    }

    setErrorMessage("");
    setSelectedFile(file);
    setAttachmentType(type);

    if (type === "image" || type === "video") {
      setAttachmentPreview(URL.createObjectURL(file));
    } else {
      setAttachmentPreview("");
    }
  };

  const handlePhotoChange = (event) => {
    chooseAttachment(event.target.files?.[0], "image");
  };

  const handleVideoChange = (event) => {
    chooseAttachment(event.target.files?.[0], "video");
  };

  const handleFileChange = (event) => {
    chooseAttachment(event.target.files?.[0], "file");
  };

  const uploadSelectedFile = async () => {
    if (!selectedFile || !currentUser?.id) return null;

    const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${currentUser.id}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("message-media")
      .upload(path, selectedFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: selectedFile.type || "application/octet-stream",
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("message-media")
      .getPublicUrl(path);

    return data.publicUrl;
  };

  // =========================================================
  // SEND MESSAGE
  // =========================================================

  const sendMessage = async (e) => {
    e.preventDefault();

    const text = messageText.trim();
    const hasAttachment = Boolean(selectedFile);

    if ((!text && !hasAttachment) || sending) return;

    if (!currentUser) {
      alert("You are not logged in.");
      return;
    }

    if (!conversationId) {
      alert("Conversation is not ready.");
      return;
    }

    try {
      setSending(true);
      setErrorMessage("");

      let mediaUrl = null;
      let fileName = null;
      let fileSize = null;
      let messageType = "text";
      let content = text;

      if (selectedFile) {
        mediaUrl = await uploadSelectedFile();
        fileName = selectedFile.name;
        fileSize = selectedFile.size;
        messageType = attachmentType;

        if (!content) {
          content =
            attachmentType === "image"
              ? "Photo"
              : attachmentType === "video"
              ? "Video"
              : selectedFile.name;
        }
      }

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUser.id,
        content,
        reply_to_message_id: replyingTo?.id || null,
        message_type: messageType,
        media_url: mediaUrl,
        file_name: fileName,
        file_size: fileSize,
      });

      if (error) {
        console.error("Send message error:", error);
        setErrorMessage("Message failed: " + error.message);
        return;
      }

      setMessageText("");
      setReplyingTo(null);
      setShowEmojiPicker(false);
      clearAttachment();
      await loadConversationList(currentUser.id);
    } catch (error) {
      console.error("Send message error:", error);
      setErrorMessage("Unable to send message: " + error.message);
    } finally {
      setSending(false);
    }
  };

  // =========================================================
  // EDIT MESSAGE
  // =========================================================

  const startEditMessage = (message) => {
    if (
      !message ||
      message.sender_id !== currentUser?.id ||
      message.deleted_at ||
      message.message_type !== "text"
    ) {
      return;
    }

    setEditingMessageId(message.id);
    setEditingText(message.content);
    setReplyingTo(null);
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const saveEditedMessage = async (messageId) => {
    const text = editingText.trim();

    if (!text) {
      setErrorMessage("Edited message cannot be empty.");
      return;
    }

    const { error } = await supabase
      .from("messages")
      .update({
        content: text,
        edited_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .eq("sender_id", currentUser.id);

    if (error) {
      console.error("Edit message error:", error);
      setErrorMessage("Unable to edit message: " + error.message);
      return;
    }

    setEditingMessageId(null);
    setEditingText("");
    await loadMessages(conversationId);
    await loadConversationList(currentUser.id);
  };

  // =========================================================
  // DELETE MESSAGE
  // =========================================================

  const deleteMessage = async (message) => {
    if (
      !message ||
      message.sender_id !== currentUser?.id ||
      message.deleted_at
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this message for this conversation?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("messages")
      .update({
        deleted_at: new Date().toISOString(),
        edited_at: null,
      })
      .eq("id", message.id)
      .eq("sender_id", currentUser.id);

    if (error) {
      console.error("Delete message error:", error);
      setErrorMessage("Unable to delete message: " + error.message);
      return;
    }

    if (editingMessageId === message.id) {
      cancelEditMessage();
    }

    await loadMessages(conversationId);
    await loadConversationList(currentUser.id);
  };

  // =========================================================
  // REPLY
  // =========================================================

  const startReplyMessage = (message) => {
    if (!message) return;

    setEditingMessageId(null);
    setEditingText("");
    setReplyingTo(message);
  };

  const cancelReplyMessage = () => {
    setReplyingTo(null);
  };

  // =========================================================
  // AUTO-SCROLL
  // =========================================================

  useEffect(() => {
    if (!conversationId) return;

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
  }, [conversationId, messages.length]);

  // =========================================================
  // AVATAR
  // =========================================================

  const Avatar = ({ user, size = 46 }) => {
    if (user?.profile_image_url) {
      return (
        <img
          src={user.profile_image_url}
          alt={user.name || "User"}
          width={size}
          height={size}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      );
    }

    const initial = (user?.name || "U").charAt(0).toUpperCase();

    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#e2e8f0",
          color: "#334155",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {initial}
      </div>
    );
  };

  if (loading) {
    return (
      <div
        className="unified-dark-page messages-page messages-shell"
        style={{
          padding: "40px",
          textAlign: "center",
          color: "#64748b",
        }}
      >
        Loading messages...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "80vh",
        minHeight: "560px",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        overflow: "hidden",
        background: "#ffffff",
        boxShadow: "0 8px 30px rgba(15, 23, 42, 0.06)",
      }}
    >
      {/* LEFT: CONVERSATIONS */}
      <div
        style={{
          width: "34%",
          minWidth: "300px",
          maxWidth: "420px",
          borderRight: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
        }}
      >
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "22px",
                  color: "#0f172a",
                }}
              >
                Messages
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "12px",
                  color: "#94a3b8",
                }}
              >
                Your conversations
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowNewMessage((previous) => !previous)}
              style={{
                border: "none",
                borderRadius: "9px",
                padding: "9px 13px",
                cursor: "pointer",
                background: "#2563eb",
                color: "white",
                fontWeight: 600,
              }}
            >
              + New
            </button>
          </div>
        </div>

        {showNewMessage && (
          <div
            style={{
              padding: "12px",
              borderBottom: "1px solid #e2e8f0",
              background: "#f8fafc",
              maxHeight: "260px",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#64748b",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Start a new conversation
            </div>

            {users.length === 0 ? (
              <div style={{ padding: "12px", color: "#64748b", fontSize: "13px" }}>
                No other users found.
              </div>
            ) : (
              users.map((user) => {
                const isOnline = onlineUsers.has(user.id);

                return (
                  <div
                    key={user.id}
                    onClick={() => openNewConversation(user)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "9px",
                      cursor: "pointer",
                      borderRadius: "10px",
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      <Avatar user={user} size={40} />
                      {isOnline && (
                        <span
                          title="Online"
                          style={{
                            position: "absolute",
                            right: 0,
                            bottom: 1,
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: "#22c55e",
                            border: "2px solid white",
                          }}
                        />
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: "block", fontSize: "14px", color: "#0f172a" }}>
                        {user.name}
                      </strong>
                      <div style={{ marginTop: "2px", fontSize: "12px", color: "#64748b" }}>
                        @{user.username}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px",
          }}
        >
          {conversations.length === 0 ? (
            <div
              style={{
                padding: "35px 20px",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              <div style={{ fontSize: "15px", fontWeight: 600 }}>
                No conversations yet
              </div>
              <div style={{ fontSize: "13px", marginTop: "6px" }}>
                Click <strong>+ New</strong> to start chatting.
              </div>
            </div>
          ) : (
            conversations.map((conversation) => {
              const isSelected = selectedUser?.id === conversation.user.id;
              const isOnline = onlineUsers.has(conversation.user.id);
              const hasUnread = conversation.unreadCount > 0;
              const latest = conversation.lastMessage;

              return (
                <div
                  key={conversation.conversationId}
                  onClick={() => openExistingConversation(conversation)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "11px",
                    padding: "11px 10px",
                    marginBottom: "4px",
                    cursor: "pointer",
                    borderRadius: "12px",
                    background: isSelected
                      ? "#eff6ff"
                      : hasUnread
                      ? "#f8fafc"
                      : "transparent",
                    border: isSelected
                      ? "1px solid #dbeafe"
                      : "1px solid transparent",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <Avatar user={conversation.user} size={48} />
                    {isOnline && (
                      <span
                        title="Online"
                        style={{
                          position: "absolute",
                          right: 0,
                          bottom: 1,
                          width: "11px",
                          height: "11px",
                          borderRadius: "50%",
                          background: "#22c55e",
                          border: "2px solid white",
                        }}
                      />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                      }}
                    >
                      <strong
                        style={{
                          color: "#0f172a",
                          fontSize: "14px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {conversation.user.name}
                      </strong>

                      <span
                        style={{
                          fontSize: "11px",
                          color: hasUnread ? "#2563eb" : "#94a3b8",
                          fontWeight: hasUnread ? 700 : 400,
                          flexShrink: 0,
                        }}
                      >
                        {formatConversationTime(conversation.lastMessageTime)}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                        marginTop: "4px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          color: hasUnread ? "#334155" : "#64748b",
                          fontWeight: hasUnread ? 600 : 400,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          minWidth: 0,
                        }}
                      >
                        {latest
                          ? `${conversation.lastMessageSender}: ${previewMessageText(latest)}`
                          : "No messages yet"}
                      </div>

                      {hasUnread && (
                        <span
                          style={{
                            minWidth: "20px",
                            height: "20px",
                            padding: "0 6px",
                            borderRadius: "999px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#2563eb",
                            color: "white",
                            fontSize: "11px",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: CHAT */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          background: "#fff",
        }}
      >
        {selectedUser ? (
          <>
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div style={{ position: "relative" }}>
                <Avatar user={selectedUser} size={44} />
                {onlineUsers.has(selectedUser.id) && (
                  <span
                    title="Online"
                    style={{
                      position: "absolute",
                      right: 0,
                      bottom: 0,
                      width: "11px",
                      height: "11px",
                      borderRadius: "50%",
                      background: "#22c55e",
                      border: "2px solid white",
                    }}
                  />
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: "15px", color: "#0f172a" }}>
                  Chat with {selectedUser.name}
                </strong>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "2px",
                    fontSize: "12px",
                  }}
                >
                  <span
                    style={{
                      color: onlineUsers.has(selectedUser.id)
                        ? "#16a34a"
                        : "#94a3b8",
                      fontWeight: 600,
                    }}
                  >
                    {onlineUsers.has(selectedUser.id) ? "Online" : "Offline"}
                  </span>
                  <span style={{ color: "#cbd5e1" }}>•</span>
                  <span style={{ color: "#64748b" }}>@{selectedUser.username}</span>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div
                style={{
                  padding: "9px 14px",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  borderBottom: "1px solid #fecaca",
                  fontSize: "13px",
                }}
              >
                {errorMessage}
              </div>
            )}

            <div
              style={{
                flex: 1,
                padding: "20px",
                overflowY: "auto",
                background: "#f8fafc",
              }}
            >
              {loadingConversation ? (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748b",
                  }}
                >
                  Opening conversation...
                </div>
              ) : messages.length === 0 ? (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    color: "#64748b",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "17px", fontWeight: 700, color: "#334155" }}>
                      No messages yet
                    </div>
                    <div style={{ marginTop: "5px", fontSize: "13px" }}>
                      Start the conversation with {selectedUser.name}.
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  const isMine = message.sender_id === currentUser?.id;
                  const isEditing = editingMessageId === message.id;
                  const isDeleted = Boolean(message.deleted_at);
                  const repliedMessage = message.reply_to_message_id
                    ? messages.find((item) => item.id === message.reply_to_message_id)
                    : null;
                  const caption = getMessageCaption(message);

                  return (
                    <div
                      key={message.id}
                      style={{
                        display: "flex",
                        justifyContent: isMine ? "flex-end" : "flex-start",
                        marginBottom: "16px",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "76%",
                          minWidth: "120px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isMine ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "11px",
                            color: isMine ? "#2563eb" : "#64748b",
                            fontWeight: 700,
                            marginBottom: "4px",
                            padding: "0 3px",
                          }}
                        >
                          <span>{isMine ? "You" : selectedUser.name}</span>
                        </div>

                        {isEditing ? (
                          <div
                            style={{
                              width: "100%",
                              padding: "10px",
                              borderRadius: "12px",
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
                            }}
                          >
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              rows={3}
                              autoFocus
                              style={{
                                width: "100%",
                                boxSizing: "border-box",
                                resize: "vertical",
                                padding: "9px",
                                border: "1px solid #cbd5e1",
                                borderRadius: "8px",
                                outline: "none",
                                fontFamily: "inherit",
                                fontSize: "14px",
                              }}
                            />

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: "8px",
                                marginTop: "8px",
                              }}
                            >
                              <button
                                type="button"
                                onClick={cancelEditMessage}
                                style={{
                                  padding: "7px 10px",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "8px",
                                  background: "#fff",
                                  cursor: "pointer",
                                }}
                              >
                                Cancel
                              </button>

                              <button
                                type="button"
                                onClick={() => saveEditedMessage(message.id)}
                                style={{
                                  padding: "7px 10px",
                                  border: "none",
                                  borderRadius: "8px",
                                  background: "#2563eb",
                                  color: "#fff",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div
                              style={{
                                padding: message.message_type === "image" || message.message_type === "video" ? "7px" : "11px 14px",
                                borderRadius: isMine
                                  ? "16px 16px 4px 16px"
                                  : "16px 16px 16px 4px",
                                background: isDeleted
                                  ? "#f1f5f9"
                                  : isMine
                                  ? "#2563eb"
                                  : "#ffffff",
                                color: isDeleted
                                  ? "#94a3b8"
                                  : isMine
                                  ? "#ffffff"
                                  : "#0f172a",
                                border:
                                  isMine && !isDeleted
                                    ? "1px solid #2563eb"
                                    : "1px solid #e2e8f0",
                                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
                                wordBreak: "break-word",
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.45,
                                fontStyle: isDeleted ? "italic" : "normal",
                                overflow: "hidden",
                              }}
                            >
                              {repliedMessage && (
                                <div
                                  style={{
                                    marginBottom: "8px",
                                    padding: "7px 9px",
                                    borderLeft: "3px solid #93c5fd",
                                    background: isMine ? "rgba(255,255,255,0.14)" : "#f8fafc",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    color: isMine ? "#dbeafe" : "#64748b",
                                  }}
                                >
                                  <div style={{ fontWeight: 700, marginBottom: "2px" }}>
                                    {repliedMessage.sender_id === currentUser?.id
                                      ? "You"
                                      : selectedUser.name}
                                  </div>
                                  <div
                                    style={{
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {previewMessageText(repliedMessage)}
                                  </div>
                                </div>
                              )}

                              {isDeleted ? (
                                "Message deleted"
                              ) : message.message_type === "image" && message.media_url ? (
                                <div>
                                  <img
                                    src={message.media_url}
                                    alt={message.file_name || "Shared image"}
                                    style={{
                                      display: "block",
                                      maxWidth: "100%",
                                      maxHeight: "360px",
                                      borderRadius: "10px",
                                      objectFit: "cover",
                                    }}
                                  />
                                  {caption && (
                                    <div
                                      style={{
                                        marginTop: "8px",
                                        padding: "0 4px 2px",
                                      }}
                                    >
                                      {caption}
                                    </div>
                                  )}
                                </div>
                              ) : message.message_type === "video" && message.media_url ? (
                                <div>
                                  <video
                                    src={message.media_url}
                                    controls
                                    preload="metadata"
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      maxWidth: "420px",
                                      maxHeight: "360px",
                                      borderRadius: "10px",
                                      background: "#000",
                                    }}
                                  />
                                  {caption && (
                                    <div style={{ marginTop: "8px", padding: "0 4px 2px" }}>
                                      {caption}
                                    </div>
                                  )}
                                </div>
                              ) : message.message_type === "file" && message.media_url ? (
                                <div>
                                  <a
                                    href={message.media_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "9px",
                                      color: isMine ? "#ffffff" : "#2563eb",
                                      textDecoration: "none",
                                      fontWeight: 700,
                                    }}
                                  >
                                    <span style={{ fontSize: "22px" }}>📎</span>
                                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {message.file_name || "Open file"}
                                    </span>
                                  </a>
                                  {caption && <div style={{ marginTop: "8px" }}>{caption}</div>}
                                </div>
                              ) : (
                                message.content
                              )}
                            </div>

                            <div
                              style={{
                                marginTop: "4px",
                                padding: "0 3px",
                                fontSize: "10px",
                                color: "#94a3b8",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <span>{formatMessageTime(message.created_at)}</span>
                              {message.edited_at && !isDeleted && <span>(edited)</span>}
                            </div>

                            {!isDeleted && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  marginTop: "5px",
                                  padding: "0 2px",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => startReplyMessage(message)}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "#64748b",
                                    fontSize: "11px",
                                    padding: "2px 0",
                                    cursor: "pointer",
                                  }}
                                >
                                  Reply
                                </button>

                                {isMine && message.message_type === "text" && (
                                  <>
                                    <span style={{ color: "#cbd5e1", fontSize: "10px" }}>•</span>

                                    <button
                                      type="button"
                                      onClick={() => startEditMessage(message)}
                                      style={{
                                        border: "none",
                                        background: "transparent",
                                        color: "#64748b",
                                        fontSize: "11px",
                                        padding: "2px 0",
                                        cursor: "pointer",
                                      }}
                                    >
                                      Edit
                                    </button>
                                  </>
                                )}

                                {isMine && (
                                  <button
                                    type="button"
                                    onClick={() => deleteMessage(message)}
                                    style={{
                                      border: "none",
                                      background: "transparent",
                                      color: "#dc2626",
                                      fontSize: "11px",
                                      padding: "2px 0",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Attachment preview */}
            {selectedFile && (
              <div
                style={{
                  padding: "10px 14px",
                  borderTop: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  {attachmentPreview && attachmentType === "image" && (
                    <img
                      src={attachmentPreview}
                      alt="Preview"
                      style={{
                        width: "56px",
                        height: "56px",
                        objectFit: "cover",
                        borderRadius: "9px",
                      }}
                    />
                  )}

                  {attachmentPreview && attachmentType === "video" && (
                    <video
                      src={attachmentPreview}
                      style={{
                        width: "70px",
                        height: "56px",
                        objectFit: "cover",
                        borderRadius: "9px",
                        background: "#000",
                      }}
                    />
                  )}

                  {!attachmentPreview && <span style={{ fontSize: "28px" }}>📎</span>}

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "13px",
                        color: "#334155",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {selectedFile.name}
                    </strong>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {Math.max(1, Math.round(selectedFile.size / 1024))} KB
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={clearAttachment}
                    style={{
                      width: "30px",
                      height: "30px",
                      border: "none",
                      borderRadius: "50%",
                      background: "#e2e8f0",
                      color: "#475569",
                      cursor: "pointer",
                      fontSize: "18px",
                    }}
                    title="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Reply preview */}
            {replyingTo && (
              <div
                style={{
                  padding: "9px 14px",
                  borderTop: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                    paddingLeft: "9px",
                    borderLeft: "3px solid #2563eb",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb" }}>
                    Replying to {replyingTo.sender_id === currentUser?.id ? "yourself" : selectedUser.name}
                  </div>
                  <div
                    style={{
                      marginTop: "2px",
                      fontSize: "12px",
                      color: "#64748b",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {previewMessageText(replyingTo)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={cancelReplyMessage}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#64748b",
                    fontSize: "18px",
                    cursor: "pointer",
                  }}
                  aria-label="Cancel reply"
                >
                  ×
                </button>
              </div>
            )}

            {/* Emoji picker */}
            {showEmojiPicker && (
              <div
                style={{
                  position: "relative",
                  borderTop: "1px solid #e2e8f0",
                  background: "#ffffff",
                  padding: "10px 14px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(8, 1fr)",
                    gap: "6px",
                    maxWidth: "360px",
                  }}
                >
                  {EMOJIS.map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => addEmoji(emoji)}
                      style={{
                        border: "none",
                        background: "transparent",
                        borderRadius: "8px",
                        fontSize: "22px",
                        cursor: "pointer",
                        padding: "5px",
                      }}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Send form */}
            <form
              onSubmit={sendMessage}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 14px",
                borderTop: "1px solid #e2e8f0",
                background: "#ffffff",
                gap: "8px",
              }}
            >
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ display: "none" }}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                style={{ display: "none" }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />

              <button
                type="button"
                onClick={() => setShowEmojiPicker((previous) => !previous)}
                disabled={sending || loadingConversation}
                style={{
                  width: "38px",
                  height: "38px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  background: showEmojiPicker ? "#eff6ff" : "#fff",
                  cursor: "pointer",
                  fontSize: "20px",
                }}
                title="Emoji"
              >
                😊
              </button>

              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={sending || loadingConversation}
                style={{
                  width: "38px",
                  height: "38px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
                title="Send photo"
              >
                📷
              </button>

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={sending || loadingConversation}
                style={{
                  width: "38px",
                  height: "38px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
                title="Send video"
              >
                🎥
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || loadingConversation}
                style={{
                  width: "38px",
                  height: "38px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
                title="Send file"
              >
                📎
              </button>

              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onFocus={() => setErrorMessage("")}
                placeholder={
                  replyingTo
                    ? "Write a reply..."
                    : `Message ${selectedUser.name}...`
                }
                disabled={sending || loadingConversation}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "11px 13px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  outline: "none",
                  fontSize: "14px",
                  background: "#f8fafc",
                }}
              />

              <button
                type="submit"
                disabled={
                  sending ||
                  loadingConversation ||
                  !conversationId ||
                  (!messageText.trim() && !selectedFile)
                }
                style={{
                  padding: "11px 18px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#2563eb",
                  color: "white",
                  fontWeight: 600,
                  cursor:
                    sending ||
                    loadingConversation ||
                    !conversationId ||
                    (!messageText.trim() && !selectedFile)
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    sending ||
                    loadingConversation ||
                    !conversationId ||
                    (!messageText.trim() && !selectedFile)
                      ? 0.55
                      : 1,
                }}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </form>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              padding: "25px",
              background: "#f8fafc",
            }}
          >
            <div>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  margin: "0 auto 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#dbeafe",
                  color: "#2563eb",
                  fontSize: "28px",
                }}
              >
                💬
              </div>

              <h3 style={{ margin: 0, color: "#0f172a" }}>
                Select a conversation
              </h3>

              <p
                style={{
                  marginTop: "7px",
                  color: "#64748b",
                  fontSize: "13px",
                  maxWidth: "330px",
                }}
              >
                Choose a chat from the left or start a new conversation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Messages;
