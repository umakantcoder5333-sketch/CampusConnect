import { useEffect, useState } from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { supabase } from "../lib/supabase";

import "./Dashboard.css";
import "./Explore.css";

function Explore() {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] =
    useSearchParams();

  const [profile, setProfile] = useState(null);

  const [searchText, setSearchText] = useState(
    searchParams.get("q") || ""
  );

  const [students, setStudents] = useState([]);

  const [posts, setPosts] = useState([]);

  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("all");

  const [message, setMessage] = useState("");

  useEffect(() => {
    loadCurrentProfile();
  }, []);

  useEffect(() => {
    const query = searchParams.get("q") || "";

    setSearchText(query);

    loadSearchResults(query);
  }, [searchParams]);

  // =========================
  // CURRENT PROFILE
  // =========================

  const loadCurrentProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error(
        "Current profile error:",
        error.message
      );

      return;
    }

    setProfile(data);
  };

  // =========================
  // SEARCH
  // =========================

  const loadSearchResults = async (query) => {
    setLoading(true);

    setMessage("");

    const cleanQuery = query
      .trim()
      .replace(/[\\%,()]/g, " ");

    // =========================
    // STUDENTS
    // =========================

    let studentQuery = supabase
      .from("profiles")
      .select(`
        id,
        name,
        username,
        college,
        department,
        year,
        bio,
        skills
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

    // =========================
    // POSTS
    // =========================

    let postQuery = supabase
      .from("posts")
      .select(`
        id,
        content,
        post_type,
        created_at,
        user_id,
        profiles (
          name,
          username
        )
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

    if (cleanQuery) {
      studentQuery = studentQuery.or(
        `name.ilike.%${cleanQuery}%,username.ilike.%${cleanQuery}%,college.ilike.%${cleanQuery}%,department.ilike.%${cleanQuery}%`
      );

      postQuery = postQuery.ilike(
        "content",
        `%${cleanQuery}%`
      );
    }

    const [
      { data: studentData, error: studentError },
      { data: postData, error: postError },
    ] = await Promise.all([
      studentQuery,
      postQuery,
    ]);

    if (studentError) {
      console.error(
        "Student search error:",
        studentError.message
      );
    }

    if (postError) {
      console.error(
        "Post search error:",
        postError.message
      );
    }

    const studentsResult = studentData || [];

    const postsResult = postData || [];

    setStudents(studentsResult);

    setPosts(postsResult);

    if (
      cleanQuery &&
      studentsResult.length === 0 &&
      postsResult.length === 0
    ) {
      setMessage(
        `No results found for "${query}".`
      );
    }

    setLoading(false);
  };

  // =========================
  // SEARCH SUBMIT
  // =========================

  const handleSearch = (e) => {
    e.preventDefault();

    const query = searchText.trim();

    if (!query) {
      setSearchParams({});
      return;
    }

    setSearchParams({
      q: query,
    });
  };

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = async () => {
    await supabase.auth.signOut();

    navigate("/login");
  };

  return (
    <div className="dashboard">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-logo">
            🎓
          </div>

          <h2>
            CampusConnect
          </h2>

        </div>

        <nav className="sidebar-nav">

          <button
            className="nav-item"
            type="button"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            🏠
            <span>Home</span>
          </button>

          <button
            className="nav-item active"
            type="button"
          >
            🔍
            <span>Explore</span>
          </button>

          <button
            className="nav-item"
            type="button"
          >
            👥
            <span>Communities</span>
          </button>

          <button
            className="nav-item"
            type="button"
          >
            💬
            <span>Messages</span>
          </button>

          <button
            className="nav-item"
            type="button"
          >
            🔔
            <span>Notifications</span>
          </button>

          <button
            className="nav-item"
            type="button"
          >
            📅
            <span>Events</span>
          </button>

          <button
            className="nav-item"
            type="button"
          >
            💼
            <span></span>
          </button>

          <button
            className="nav-item"
            type="button"
            onClick={() =>
              navigate("/profile")
            }
          >
            👤
            <span>Profile</span>
          </button>

        </nav>

        <div className="sidebar-bottom">

          <button
            className="nav-item"
            type="button"
          >
            ⚙️
            <span>Settings</span>
          </button>

          <button
            className="logout-btn"
            type="button"
            onClick={handleLogout}
          >
            🚪
            <span>Logout</span>
          </button>

        </div>

      </aside>

      {/* MAIN */}

      <main className="main-content">

        {/* TOPBAR */}

        <header className="topbar">

          <div className="mobile-brand">
            🎓 CampusConnect
          </div>

          <form
            className="search-box"
            onSubmit={handleSearch}
          >

            🔍

            <input
              type="text"
              placeholder="Search students, posts, events..."
              value={searchText}
              onChange={(e) =>
                setSearchText(
                  e.target.value
                )
              }
            />

          </form>

          <div className="topbar-actions">

            <button
              type="button"
            >
              🔔
            </button>

            <button
              className="mini-profile"
              type="button"
              onClick={() =>
                navigate("/profile")
              }
            >

              <div className="avatar">

                {profile?.name
                  ?.charAt(0)
                  .toUpperCase() || "U"}

              </div>

              <span>
                {profile?.name ||
                  "Student"}
              </span>

            </button>

          </div>

        </header>

        {/* EXPLORE PAGE */}

        <div className="explore-page content-wrapper">

          <div className="explore-heading">

            <div>

              <p className="explore-eyebrow">
                CampusConnect
              </p>

              <h1>
                Explore
              </h1>

              <p>
                Discover students and posts
                from your campus community.
              </p>

            </div>

          </div>

          {/* SEARCH CARD */}

          <form
            className="explore-search-card card"
            onSubmit={handleSearch}
          >

            <div className="explore-main-search">

              <span>
                🔍
              </span>

              <input
                type="text"
                placeholder="Search by student name, username, college, department or post..."
                value={searchText}
                onChange={(e) =>
                  setSearchText(
                    e.target.value
                  )
                }
              />

              <button
                type="submit"
              >
                Search
              </button>

            </div>

          </form>

          {/* TABS */}

          <div className="explore-tabs">

            <button
              type="button"
              className={
                activeTab === "all"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("all")
              }
            >
              All
            </button>

            <button
              type="button"
              className={
                activeTab === "students"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(
                  "students"
                )
              }
            >
              Students
            </button>

            <button
              type="button"
              className={
                activeTab === "posts"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("posts")
              }
            >
              Posts
            </button>

          </div>

          {message && (
            <div className="explore-empty card">
              {message}
            </div>
          )}

          {loading ? (

            <div className="explore-empty card">
              Searching...
            </div>

          ) : (

            <div className="explore-grid">

              {/* STUDENTS */}

              {(activeTab === "all" ||
                activeTab ===
                  "students") && (

                <section className="explore-section">

                  <div className="explore-section-header">

                    <div>

                      <h2>
                        Students
                      </h2>

                      <p>
                        Find people in your campus.
                      </p>

                    </div>

                    <span>
                      {students.length}
                    </span>

                  </div>

                  {students.length === 0 ? (

                    <div className="card explore-empty">
                      No students found.
                    </div>

                  ) : (

                    <div className="student-results">

                      {students.map(
                        (student) => (

                          <article
                            className="student-result-card card"
                            key={student.id}
                          >

                            <div className="avatar explore-avatar">

                              {student.name
                                ?.charAt(0)
                                .toUpperCase() ||
                                "U"}

                            </div>

                            <div className="student-result-info">

                              <h3>
                                {student.name}
                              </h3>

                              <p className="username">
                                @{student.username}
                              </p>

                              <p>
                                {student.college ||
                                  "College not added"}
                              </p>

                              <p>
                                {student.department ||
                                  "Department not added"}
                              </p>

                            </div>

                            <button
                              type="button"
                              className="view-student-btn"
                              onClick={() =>
                                navigate(
                                  `/profile?username=${encodeURIComponent(
                                    student.username
                                  )}`
                                )
                              }
                            >
                              View
                            </button>

                          </article>

                        )
                      )}

                    </div>

                  )}

                </section>

              )}

              {/* POSTS */}

              {(activeTab === "all" ||
                activeTab ===
                  "posts") && (

                <section className="explore-section">

                  <div className="explore-section-header">

                    <div>

                      <h2>
                        Posts
                      </h2>

                      <p>
                        Discover conversations from students.
                      </p>

                    </div>

                    <span>
                      {posts.length}
                    </span>

                  </div>

                  {posts.length === 0 ? (

                    <div className="card explore-empty">
                      No posts found.
                    </div>

                  ) : (

                    <div className="post-results">

                      {posts.map(
                        (post) => (

                          <article
                            className="explore-post-card card"
                            key={post.id}
                          >

                            <div className="explore-post-header">

                              <div className="avatar">

                                {post.profiles?.name
                                  ?.charAt(0)
                                  .toUpperCase() ||
                                  "U"}

                              </div>

                              <div>

                                <h3>
                                  {post.profiles?.name ||
                                    "Student"}
                                </h3>

                                <p>
                                  @
                                  {post.profiles?.username ||
                                    "student"}
                                </p>

                              </div>

                            </div>

                            <p className="explore-post-content">
                              {post.content}
                            </p>

                            <div className="explore-post-footer">

                              <span>
                                {new Date(
                                  post.created_at
                                ).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/dashboard?post=${post.id}`
                                  )
                                }
                              >
                                Open Post →
                              </button>

                            </div>

                          </article>

                        )
                      )}

                    </div>

                  )}

                </section>

              )}

            </div>

          )}

        </div>

      </main>

    </div>
  );
}

export default Explore;