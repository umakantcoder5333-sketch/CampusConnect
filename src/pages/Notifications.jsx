import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./UnifiedPages.css";

const TYPE_META = {
  follow: { icon: "👤", title: "New follower" },
  like: { icon: "❤️", title: "Post liked" },
  comment: { icon: "💬", title: "New comment" },
  reply: { icon: "↩️", title: "New reply" },
  message: { icon: "✉️", title: "New message" },
  share: { icon: "↗️", title: "Post shared" },
};

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diff = Math.max(0, now.getTime() - date.getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m`;
  if (diff < day) return `${Math.floor(diff / hour)}h`;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function Notifications() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [filter, setFilter] = useState("all");

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const visibleNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((item) => !item.is_read);
    }
    return notifications;
  }, [notifications, filter]);

  useEffect(() => {
    let channel;

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      setCurrentUser(user);
      await loadNotifications(user.id);

      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            const actor = payload.new.actor_id
              ? await loadActor(payload.new.actor_id)
              : null;

            setNotifications((previous) => {
              if (previous.some((item) => item.id === payload.new.id)) {
                return previous;
              }

              return [
                {
                  ...payload.new,
                  actor: actor || null,
                },
                ...previous,
              ];
            });
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [navigate]);

  const loadActor = async (actorId) => {
    if (!actorId) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, username, profile_image_url")
      .eq("id", actorId)
      .single();

    if (error) {
      console.error("Notification actor error:", error.message);
      return null;
    }

    return data;
  };

  const loadNotifications = async (userId) => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id, user_id, actor_id, type, message, is_read, reference_id, target_path, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Notifications loading error:", error.message);
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const actorIds = [
      ...new Set((data || []).map((item) => item.actor_id).filter(Boolean)),
    ];

    let actorMap = {};

    if (actorIds.length > 0) {
      const { data: actors, error: actorError } = await supabase
        .from("profiles")
        .select("id, name, username, profile_image_url")
        .in("id", actorIds);

      if (actorError) {
        console.error("Notification actors error:", actorError.message);
      } else {
        actorMap = Object.fromEntries(
          (actors || []).map((actor) => [actor.id, actor])
        );
      }
    }

    setNotifications(
      (data || []).map((item) => ({
        ...item,
        actor: actorMap[item.actor_id] || null,
      }))
    );
    setLoading(false);
  };

  const markAsRead = async (notificationId) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", currentUser?.id);

    if (error) {
      console.error("Mark notification read error:", error.message);
      return false;
    }

    setNotifications((previous) =>
      previous.map((item) =>
        item.id === notificationId ? { ...item, is_read: true } : item
      )
    );

    return true;
  };

  const markAllAsRead = async () => {
    if (!currentUser?.id || unreadCount === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", currentUser.id)
      .eq("is_read", false);

    if (error) {
      console.error("Mark all notifications read error:", error.message);
      return;
    }

    setNotifications((previous) =>
      previous.map((item) => ({ ...item, is_read: true }))
    );
  };

  const handleNotificationClick = async (notification) => {
    await markAsRead(notification.id);

    if (notification.target_path) {
      navigate(notification.target_path);
      return;
    }

    switch (notification.type) {
      case "message":
        navigate("/messages");
        break;
      case "like":
      case "comment":
      case "reply":
        if (notification.reference_id) {
          navigate(`/dashboard?post=${notification.reference_id}`);
        } else {
          navigate("/dashboard");
        }
        break;
      case "follow":
        navigate("/explore");
        break;
      default:
        break;
    }
  };

  return (
    <div
      className="unified-dark-page notifications-page"
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "30px",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "18px",
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            padding: "22px 24px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "24px", color: "#0f172a" }}>
              Notifications
            </h1>
            <p style={{ margin: "5px 0 0", color: "#64748b" }}>
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : "You're all caught up"}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              style={{
                border: "1px solid #cbd5e1",
                background: unreadCount === 0 ? "#f1f5f9" : "white",
                color: unreadCount === 0 ? "#94a3b8" : "#334155",
                borderRadius: "10px",
                padding: "9px 13px",
                cursor: unreadCount === 0 ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              Mark all as read
            </button>
          </div>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: "14px 24px",
              background: "#fff1f2",
              color: "#be123c",
              borderBottom: "1px solid #ffe4e6",
            }}
          >
            {errorMessage}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "8px",
            padding: "12px 24px",
            borderBottom: "1px solid #eef2f7",
          }}
        >
          <button
            type="button"
            onClick={() => setFilter("all")}
            style={{
              border: "none",
              background: filter === "all" ? "#eff6ff" : "transparent",
              color: filter === "all" ? "#2563eb" : "#64748b",
              borderRadius: "999px",
              padding: "7px 12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            style={{
              border: "none",
              background: filter === "unread" ? "#eff6ff" : "transparent",
              color: filter === "unread" ? "#2563eb" : "#64748b",
              borderRadius: "999px",
              padding: "7px 12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Unread {unreadCount > 0 ? `(${unreadCount})` : ""}
          </button>
        </div>

        <div>
          {loading ? (
            <div style={{ padding: "60px 24px", textAlign: "center", color: "#64748b" }}>
              Loading notifications...
            </div>
          ) : visibleNotifications.length === 0 ? (
            <div style={{ padding: "70px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "42px", marginBottom: "12px" }}>🔔</div>
              <h3 style={{ margin: 0, color: "#0f172a" }}>No notifications yet</h3>
              <p style={{ color: "#64748b" }}>
                Follow activity, likes, comments, replies, shares, and messages will appear here.
              </p>
            </div>
          ) : (
            notifications.map((notification) => {
              const meta = TYPE_META[notification.type] || {
                icon: "🔔",
                title: "Notification",
              };
              const actor = notification.actor;

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    width: "100%",
                    border: "none",
                    borderBottom: "1px solid #eef2f7",
                    background: notification.is_read ? "white" : "#eff6ff",
                    padding: "18px 24px",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: "46px",
                      height: "46px",
                      borderRadius: "50%",
                      background: "#e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                      fontSize: "20px",
                    }}
                  >
                    {actor?.profile_image_url ? (
                      <img
                        src={actor.profile_image_url}
                        alt={actor.name || "User"}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      meta.icon
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: notification.is_read ? 600 : 700,
                        color: "#0f172a",
                      }}
                    >
                      {actor?.name || "Someone"}
                      {actor?.username ? ` @${actor.username}` : ""}
                    </div>
                    <div style={{ marginTop: "3px", color: "#334155" }}>
                      {notification.message || meta.title}
                    </div>
                    <div style={{ marginTop: "5px", color: "#94a3b8", fontSize: "12px" }}>
                      {formatTime(notification.created_at)}
                    </div>
                  </div>

                  {!notification.is_read && (
                    <span
                      style={{
                        width: "9px",
                        height: "9px",
                        borderRadius: "50%",
                        background: "#2563eb",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default Notifications;
