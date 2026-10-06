import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./UnifiedPages.css";

export default function Events() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // =========================================
  // LOAD EVENTS
  // =========================================
  const loadEvents = async () => {
    setLoading(true);
    setMessage("");

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      navigate("/login");
      return;
    }

    setUser(currentUser);

    // -----------------------------------------
    // Get communities where current user joined
    // -----------------------------------------
    const { data: memberships, error: membershipError } = await supabase
      .from("community_members")
      .select("community_id")
      .eq("user_id", currentUser.id);

    if (membershipError) {
      console.error("Membership loading error:", membershipError.message);
      setMessage(membershipError.message);
      setLoading(false);
      return;
    }

    const communityIds = (memberships || []).map(
      (member) => member.community_id
    );

    if (communityIds.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    // -----------------------------------------
    // Load events from joined communities
    // -----------------------------------------
    const { data: eventData, error: eventError } = await supabase
      .from("community_events")
      .select(
        `
          id,
          community_id,
          title,
          description,
          event_date,
          start_time,
          end_time,
          location,
          created_by,
          created_at
        `
      )
      .in("community_id", communityIds)
      .order("event_date", { ascending: true });

    if (eventError) {
      console.error("Events loading error:", eventError.message);
      setMessage(eventError.message);
      setLoading(false);
      return;
    }

    // -----------------------------------------
    // Load community details
    // -----------------------------------------
    const { data: communityData, error: communityError } = await supabase
      .from("communities")
      .select("id, name, slug, type, department, category, college")
      .in("id", communityIds);

    if (communityError) {
      console.error(
        "Community details loading error:",
        communityError.message
      );
    }

    const communityMap = {};

    (communityData || []).forEach((community) => {
      communityMap[community.id] = community;
    });

    // -----------------------------------------
    // Attach community to every event
    // -----------------------------------------
    const finalEvents = (eventData || []).map((event) => ({
      ...event,
      community: communityMap[event.community_id] || null,
    }));

    setEvents(finalEvents);
    setLoading(false);
  };

  // =========================================
  // INITIAL LOAD
  // =========================================
  useEffect(() => {
    loadEvents();

    const channel = supabase
      .channel("community-events-page")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_events",
        },
        () => {
          loadEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // =========================================
  // SEARCH
  // =========================================
  const filteredEvents = useMemo(() => {
    const text = search.trim().toLowerCase();

    if (!text) {
      return events;
    }

    return events.filter((event) => {
      return (
        event.title?.toLowerCase().includes(text) ||
        event.description?.toLowerCase().includes(text) ||
        event.location?.toLowerCase().includes(text) ||
        event.community?.name?.toLowerCase().includes(text)
      );
    });
  }, [events, search]);

  // =========================================
  // FORMAT DATE
  // =========================================
  const formatDate = (date) => {
    if (!date) return "Date not available";

    const parsed = new Date(`${date}T00:00:00`);

    return parsed.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // =========================================
  // FORMAT TIME
  // =========================================
  const formatTime = (time) => {
    if (!time) return "";

    const parts = time.split(":");

    const hour = Number(parts[0]);
    const minute = parts[1];

    const suffix = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;

    return `${formattedHour}:${minute} ${suffix}`;
  };

  // =========================================
  // EVENT CARD
  // =========================================
  const renderEvent = (event) => {
    const community = event.community;

    return (
      <div
        key={event.id}
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "16px",
          padding: "22px",
          background: "#ffffff",
          boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
        }}
      >
        {/* Community */}
        <div
          className="unified-dark-page events-page"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              background: "#eef2ff",
              color: "#4338ca",
              padding: "5px 10px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: "700",
            }}
          >
            {community?.type || "Community"}
          </span>

          <span
            style={{
              color: "#64748b",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            {community?.name || "Unknown community"}
          </span>
        </div>

        {/* Title */}
        <h2
          style={{
            margin: "0 0 10px",
            fontSize: "22px",
            color: "#111827",
          }}
        >
          {event.title}
        </h2>

        {/* Description */}
        {event.description && (
          <p
            style={{
              margin: "0 0 18px",
              color: "#475569",
              lineHeight: "1.6",
            }}
          >
            {event.description}
          </p>
        )}

        {/* Date */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "10px",
            color: "#1f2937",
          }}
        >
          <span>📅</span>

          <span>
            <strong>Date:</strong> {formatDate(event.event_date)}
          </span>
        </div>

        {/* Time */}
        {(event.start_time || event.end_time) && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "10px",
              color: "#1f2937",
            }}
          >
            <span>⏰</span>

            <span>
              <strong>Time:</strong>{" "}
              {event.start_time ? formatTime(event.start_time) : ""}
              {event.start_time && event.end_time ? " - " : ""}
              {event.end_time ? formatTime(event.end_time) : ""}
            </span>
          </div>
        )}

        {/* Location */}
        {event.location && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "16px",
              color: "#1f2937",
            }}
          >
            <span>📍</span>

            <span>
              <strong>Location:</strong> {event.location}
            </span>
          </div>
        )}

        {/* Community button */}
        {community?.id && (
          <button
            onClick={() => navigate(`/communities/${community.id}`)}
            style={{
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              padding: "10px 16px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "700",
            }}
          >
            Open Community
          </button>
        )}
      </div>
    );
  };

  // =========================================
  // UI
  // =========================================
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "30px",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            marginBottom: "25px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "32px",
                color: "#111827",
              }}
            >
              📅 Campus Events
            </h1>

            <p
              style={{
                marginTop: "8px",
                color: "#64748b",
              }}
            >
              Discover events from your joined communities.
            </p>
          </div>

          <button
            onClick={() => navigate("/communities")}
            style={{
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              padding: "10px 16px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "700",
            }}
          >
            ← Communities
          </button>
        </div>

        {/* Search */}
        <div
          style={{
            background: "#ffffff",
            padding: "16px",
            borderRadius: "14px",
            border: "1px solid #e5e7eb",
            marginBottom: "25px",
          }}
        >
          <input
            type="text"
            placeholder="Search events, communities, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "12px 14px",
              fontSize: "15px",
              outline: "none",
            }}
          />
        </div>

        {/* Message */}
        {message && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "12px 15px",
              borderRadius: "10px",
              marginBottom: "20px",
            }}
          >
            {message}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "50px 20px",
              color: "#64748b",
            }}
          >
            Loading events...
          </div>
        )}

        {/* No events */}
        {!loading && filteredEvents.length === 0 && (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "16px",
              padding: "50px 20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "45px", marginBottom: "15px" }}>📅</div>

            <h2 style={{ marginBottom: "8px", color: "#111827" }}>
              No events found
            </h2>

            <p style={{ color: "#64748b", marginBottom: "20px" }}>
              Join communities to discover their upcoming events.
            </p>

            <button
              onClick={() => navigate("/communities")}
              style={{
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                padding: "11px 18px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "700",
              }}
            >
              Explore Communities
            </button>
          </div>
        )}

        {/* Events */}
        {!loading && filteredEvents.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "20px",
            }}
          >
            {filteredEvents.map((event) => renderEvent(event))}
          </div>
        )}
      </div>
    </div>
  );
}