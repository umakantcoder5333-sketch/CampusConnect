import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./UnifiedPages.css";

function Communities() {
  const navigate = useNavigate();

  const [communities, setCommunities] = useState([]);
  const [memberships, setMemberships] = useState(new Set());

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [showCreate, setShowCreate] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    community_type: "general",
    department: "",
    category: "",
    college: "",
  });

  const filteredCommunities = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return communities.filter((community) => {
      const matchesFilter =
        filter === "all" ||
        community.community_type === filter ||
        (filter === "mine" && memberships.has(community.id));

      const matchesSearch =
        !searchText ||
        community.name.toLowerCase().includes(searchText) ||
        community.slug.toLowerCase().includes(searchText) ||
        (community.department || "")
          .toLowerCase()
          .includes(searchText) ||
        (community.category || "")
          .toLowerCase()
          .includes(searchText);

      return matchesFilter && matchesSearch;
    });
  }, [communities, memberships, search, filter]);

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    const [communityResult, membershipResult] = await Promise.all([
      supabase
        .from("communities")
        .select(
          `
          id,
          name,
          slug,
          description,
          community_type,
          department,
          category,
          college,
          cover_image_url,
          created_by,
          created_at
          `
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", user.id),
    ]);

    if (communityResult.error) {
      console.error(
        "Community loading error:",
        communityResult.error.message
      );

      setMessage(communityResult.error.message);
      setLoading(false);
      return;
    }

    if (membershipResult.error) {
      console.error(
        "Membership loading error:",
        membershipResult.error.message
      );

      setMessage(membershipResult.error.message);
      setLoading(false);
      return;
    }

    setCommunities(communityResult.data || []);

    setMemberships(
      new Set(
        (membershipResult.data || []).map(
          (item) => item.community_id
        )
      )
    );

    setLoading(false);
  };

  const handleInputChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const createCommunity = async (event) => {
    event.preventDefault();

    setMessage("");

    if (!form.name.trim()) {
      setMessage("Community name is required.");
      return;
    }

    let slug = form.slug.trim();

    if (!slug) {
      slug = form.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }

    const { data, error } = await supabase.rpc(
      "create_community",
      {
        p_name: form.name.trim(),
        p_slug: slug,
        p_description:
          form.description.trim() || null,
        p_community_type:
          form.community_type,
        p_department:
          form.department.trim() || null,
        p_category:
          form.category.trim() || null,
        p_college:
          form.college.trim() || null,
        p_cover_image_url: null,
      }
    );

    if (error) {
      console.error(
        "Create community error:",
        error.message
      );

      setMessage(error.message);
      return;
    }

    setShowCreate(false);

    setForm({
      name: "",
      slug: "",
      description: "",
      community_type: "general",
      department: "",
      category: "",
      college: "",
    });

    await loadCommunities();

    navigate(`/communities/${data}`);
  };

  const joinCommunity = async (communityId) => {
    setMessage("");

    const { error } = await supabase.rpc(
      "join_community",
      {
        p_community_id: communityId,
      }
    );

    if (error) {
      console.error(
        "Join community error:",
        error.message
      );

      setMessage(error.message);
      return;
    }

    setMemberships((previous) => {
      const next = new Set(previous);
      next.add(communityId);
      return next;
    });
  };

  const leaveCommunity = async (communityId) => {
    setMessage("");

    const { error } = await supabase.rpc(
      "leave_community",
      {
        p_community_id: communityId,
      }
    );

    if (error) {
      console.error(
        "Leave community error:",
        error.message
      );

      setMessage(error.message);
      return;
    }

    setMemberships((previous) => {
      const next = new Set(previous);
      next.delete(communityId);
      return next;
    });
  };

  if (loading) {
    return (
      <div
        className="unified-dark-page communities-page"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        Loading communities...
      </div>
    );
  }

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
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            marginBottom: "25px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#2563eb",
                fontSize: "13px",
                fontWeight: "700",
              }}
            >
              CAMPUSCONNECT
            </p>

            <h1
              style={{
                margin: "5px 0",
                color: "#0f172a",
              }}
            >
              Communities
            </h1>

            <p
              style={{
                margin: 0,
                color: "#64748b",
              }}
            >
              Find your campus communities,
              departments and clubs.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() =>
                navigate("/dashboard")
              }
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: "white",
                cursor: "pointer",
                fontWeight: "700",
              }}
            >
              ← Home
            </button>

            <button
              type="button"
              onClick={() =>
                setShowCreate(true)
              }
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                border: "none",
                background: "#2563eb",
                color: "white",
                cursor: "pointer",
                fontWeight: "700",
              }}
            >
              + Create Community
            </button>
          </div>
        </div>

        {/* MESSAGE */}

        {message && (
          <div
            style={{
              marginBottom: "18px",
              padding: "12px 15px",
              borderRadius: "10px",
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              color: "#9a3412",
            }}
          >
            {message}
          </div>
        )}

        {/* SEARCH + FILTER */}

        <div
          style={{
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "15px",
            marginBottom: "22px",
          }}
        >
          <input
            type="text"
            placeholder="Search communities..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              marginBottom: "12px",
            }}
          />

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {[
              ["all", "All"],
              ["department", "Departments"],
              ["club", "Clubs"],
              ["mine", "My Communities"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setFilter(value)
                }
                style={{
                  padding: "9px 13px",
                  borderRadius: "9px",
                  border: "1px solid #cbd5e1",
                  background:
                    filter === value
                      ? "#2563eb"
                      : "white",
                  color:
                    filter === value
                      ? "white"
                      : "#334155",
                  cursor: "pointer",
                  fontWeight: "700",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* COMMUNITY GRID */}

        {filteredCommunities.length === 0 ? (
          <div
            style={{
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "70px 20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "45px",
              }}
            >
              👥
            </div>

            <h3
              style={{
                color: "#0f172a",
              }}
            >
              No communities found
            </h3>

            <p
              style={{
                color: "#64748b",
              }}
            >
              Create the first community.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "18px",
            }}
          >
            {filteredCommunities.map(
              (community) => {
                const isMember =
                  memberships.has(
                    community.id
                  );

                return (
                  <div
                    key={community.id}
                    style={{
                      background: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "16px",
                      overflow: "hidden",
                      boxShadow:
                        "0 8px 24px rgba(15,23,42,.05)",
                    }}
                  >
                    <div
                      style={{
                        height: "120px",
                        background: "#dbeafe",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "45px",
                      }}
                    >
                      {community.community_type ===
                      "department"
                        ? "🎓"
                        : community.community_type ===
                          "club"
                        ? "🏫"
                        : "👥"}
                    </div>

                    <div
                      style={{
                        padding: "18px",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          padding: "5px 9px",
                          borderRadius: "999px",
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          fontSize: "11px",
                          fontWeight: "800",
                          textTransform:
                            "capitalize",
                        }}
                      >
                        {
                          community.community_type
                        }
                      </span>

                      <h3
                        style={{
                          margin:
                            "10px 0 4px",
                          color: "#0f172a",
                        }}
                      >
                        {community.name}
                      </h3>

                      <p
                        style={{
                          margin: "0 0 10px",
                          color: "#94a3b8",
                          fontSize: "12px",
                        }}
                      >
                        @{community.slug}
                      </p>

                      <p
                        style={{
                          color: "#64748b",
                          lineHeight: "1.5",
                          minHeight: "45px",
                        }}
                      >
                        {community.description ||
                          "Campus community on CampusConnect."}
                      </p>

                      {community.department && (
                        <p
                          style={{
                            color: "#475569",
                            fontSize: "13px",
                          }}
                        >
                          📚{" "}
                          {community.department}
                        </p>
                      )}

                      {community.category && (
                        <p
                          style={{
                            color: "#475569",
                            fontSize: "13px",
                          }}
                        >
                          🏷️{" "}
                          {community.category}
                        </p>
                      )}

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          marginTop: "15px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/communities/${community.id}`
                            )
                          }
                          style={{
                            flex: 1,
                            padding: "10px",
                            borderRadius: "9px",
                            border: "none",
                            background:
                              "#2563eb",
                            color: "white",
                            cursor: "pointer",
                            fontWeight: "700",
                          }}
                        >
                          Open
                        </button>

                        {isMember ? (
                          <button
                            type="button"
                            onClick={() =>
                              leaveCommunity(
                                community.id
                              )
                            }
                            style={{
                              flex: 1,
                              padding: "10px",
                              borderRadius:
                                "9px",
                              border:
                                "1px solid #cbd5e1",
                              background:
                                "white",
                              cursor:
                                "pointer",
                              fontWeight:
                                "700",
                            }}
                          >
                            Leave
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              joinCommunity(
                                community.id
                              )
                            }
                            style={{
                              flex: 1,
                              padding: "10px",
                              borderRadius:
                                "9px",
                              border: "none",
                              background:
                                "#16a34a",
                              color: "white",
                              cursor:
                                "pointer",
                              fontWeight:
                                "700",
                            }}
                          >
                            Join
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* CREATE COMMUNITY MODAL */}

      {showCreate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15,23,42,.45)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
            zIndex: 1000,
          }}
        >
          <form
            onSubmit={createCommunity}
            style={{
              width: "min(650px, 100%)",
              maxHeight: "90vh",
              overflow: "auto",
              background: "white",
              borderRadius: "18px",
              padding: "22px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                marginBottom:
                  "18px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                  }}
                >
                  Create Community
                </h2>

                <p
                  style={{
                    color:
                      "#64748b",
                  }}
                >
                  Create a department,
                  club, or general
                  community.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCreate(false)
                }
                style={{
                  border: "none",
                  background:
                    "transparent",
                  fontSize: "20px",
                  cursor:
                    "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, 1fr)",
                gap: "14px",
              }}
            >
              <input
                required
                name="name"
                placeholder="Community name"
                value={form.name}
                onChange={
                  handleInputChange
                }
              />

              <input
                name="slug"
                placeholder="Slug e.g. cse-club"
                value={form.slug}
                onChange={
                  handleInputChange
                }
              />

              <select
                name="community_type"
                value={
                  form.community_type
                }
                onChange={
                  handleInputChange
                }
              >
                <option value="general">
                  General
                </option>

                <option value="department">
                  Department
                </option>

                <option value="club">
                  Club
                </option>
              </select>

              <input
                name="department"
                placeholder="Department"
                value={
                  form.department
                }
                onChange={
                  handleInputChange
                }
              />

              <input
                name="category"
                placeholder="Category / Club"
                value={
                  form.category
                }
                onChange={
                  handleInputChange
                }
              />

              <input
                name="college"
                placeholder="College"
                value={form.college}
                onChange={
                  handleInputChange
                }
              />

              <textarea
                name="description"
                rows="4"
                placeholder="Community description"
                value={
                  form.description
                }
                onChange={
                  handleInputChange
                }
                style={{
                  gridColumn:
                    "1 / -1",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                gap: "10px",
                marginTop: "18px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setShowCreate(false)
                }
                style={{
                  padding:
                    "10px 15px",
                  borderRadius:
                    "9px",
                  border:
                    "1px solid #cbd5e1",
                  background:
                    "white",
                  cursor:
                    "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                style={{
                  padding:
                    "10px 15px",
                  borderRadius:
                    "9px",
                  border: "none",
                  background:
                    "#2563eb",
                  color: "white",
                  cursor:
                    "pointer",
                  fontWeight:
                    "700",
                }}
              >
                Create Community
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Communities;