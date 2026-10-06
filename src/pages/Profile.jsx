import { useEffect, useMemo, useState } from "react";

import {

  Link,

  useNavigate,

  useSearchParams,

} from "react-router-dom";

import { supabase } from "../lib/supabase";

import "./Dashboard.css";

import "./Profile.css";
function AvatarContent({ profile, alt = "Profile" }) {
  const initial = profile?.name?.charAt(0).toUpperCase() || "U";

  if (profile?.profile_image_url) {
    return (
      <img
        src={profile.profile_image_url}
        alt={alt}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
        }}
      />
    );
  }

  return initial;
}


function Profile() {

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const usernameParam = searchParams.get("username");

  // =========================

  // USER / PROFILE

  // =========================

  const [currentUser, setCurrentUser] = useState(null);

  const [profile, setProfile] = useState(null);

  // =========================

  // PROFILE POSTS

  // =========================

  const [posts, setPosts] = useState([]);

  // =========================

  // FOLLOW SYSTEM

  // =========================

  const [followersCount, setFollowersCount] = useState(0);

  const [followingCount, setFollowingCount] = useState(0);

  const [followingUsers, setFollowingUsers] = useState([]);

  const [followersUsers, setFollowersUsers] = useState([]);

  const [showFollowing, setShowFollowing] = useState(false);

  const [showFollowers, setShowFollowers] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);

  const [followLoading, setFollowLoading] = useState(false);

  // =========================

  // PAGE / EDIT

  // =========================

  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [profileImageFile, setProfileImageFile] = useState(null);

  const [profileImagePreview, setProfileImagePreview] = useState("");

  const [form, setForm] = useState({

    name: "",

    username: "",

    college: "",

    department: "",

    year: "",

    student_id: "",

    bio: "",

    skills: "",

    github_url: "",

    linkedin_url: "",

    portfolio_url: "",

  });

  // =========================

  // CHECK OWN PROFILE

  // =========================

  const isOwnProfile = useMemo(() => {

    return (

      currentUser &&

      profile &&

      currentUser.id === profile.id

    );

  }, [currentUser, profile]);

  // =========================

  // LOAD PAGE

  // =========================

  useEffect(() => {

    loadProfilePage();

  }, [usernameParam]);

  // =========================

  // LOAD PROFILE PAGE

  // =========================

  const loadProfilePage = async () => {

    setLoading(true);

    const {

      data: { user },

    } = await supabase.auth.getUser();

    if (!user) {

      navigate("/login");

      return;

    }

    setCurrentUser(user);

    let profileQuery = supabase

      .from("profiles")

      .select("*");

    if (usernameParam) {

      profileQuery = profileQuery.eq(

        "username",

        usernameParam

      );

    } else {

      profileQuery = profileQuery.eq(

        "id",

        user.id

      );

    }

    const {

      data: profileData,

      error: profileError,

    } = await profileQuery.single();

    if (profileError) {

      console.error(

        "Profile loading error:",

        profileError.message

      );

      setMessage("Profile not found.");

      setLoading(false);

      return;

    }

    setProfile(profileData);

    setForm({

      name: profileData.name || "",

      username: profileData.username || "",

      college: profileData.college || "",

      department: profileData.department || "",

      year: profileData.year || "",

      student_id: profileData.student_id || "",

      bio: profileData.bio || "",

      skills: Array.isArray(profileData.skills)

        ? profileData.skills.join(", ")

        : "",

      github_url: profileData.github_url || "",

      linkedin_url: profileData.linkedin_url || "",

      portfolio_url: profileData.portfolio_url || "",

    });

    await loadUserPosts(profileData.id);

    await loadFollowerStats(

      profileData.id,

      user.id

    );

    await loadFollowingUsers(profileData.id);

    await loadFollowersUsers(profileData.id);

    setLoading(false);

  };

  // =========================

  // LOAD USER POSTS

  // =========================

  const loadUserPosts = async (userId) => {

    const { data, error } = await supabase

      .from("posts")

      .select(`

        id,

        content,

        post_type,

        created_at

      `)

      .eq("user_id", userId)

      .order("created_at", {

        ascending: false,

      });

    if (error) {

      console.error(

        "User posts error:",

        error.message

      );

      return;

    }    const postIds = (data || []).map((post) => post.id);

    let mediaData = [];

    if (postIds.length > 0) {

      const { data: loadedMedia, error: mediaError } = await supabase
        .from("post_media")
        .select("post_id, media_url, media_type")
        .in("post_id", postIds);

      if (mediaError) {

        console.error(
          "Profile post media error:",
          mediaError.message
        );
      } else {
        mediaData = loadedMedia || [];
      }
    }

    const mediaByPost = {};

    mediaData.forEach((media) => {

      if (!mediaByPost[media.post_id]) {
        mediaByPost[media.post_id] = [];
      }

      mediaByPost[media.post_id].push(media);
    });

    setPosts(
      (data || []).map((post) => ({
        ...post,
        media: mediaByPost[post.id] || [],
      }))
    );

  };

  // =========================

  // LOAD FOLLOWER STATS

  // =========================

  const loadFollowerStats = async (

    profileUserId,

    currentUserId

  ) => {

    // Followers count

    const {

      count: followers,

      error: followersError,

    } = await supabase

      .from("followers")

      .select("*", {

        count: "exact",

        head: true,

      })

      .eq(

        "following_id",

        profileUserId

      );

    if (followersError) {

      console.error(

        "Followers count error:",

        followersError.message

      );

    }

    // Following count

    const {

      count: following,

      error: followingError,

    } = await supabase

      .from("followers")

      .select("*", {

        count: "exact",

        head: true,

      })

      .eq(

        "follower_id",

        profileUserId

      );

    if (followingError) {

      console.error(

        "Following count error:",

        followingError.message

      );

    }

    setFollowersCount(followers || 0);

    setFollowingCount(following || 0);

    // Own profile does not need follow status

    if (profileUserId === currentUserId) {

      setIsFollowing(false);

      return;

    }

    // Check whether current user follows this profile

    const {

      data: followData,

      error: followError,

    } = await supabase

      .from("followers")

      .select("id")

      .eq(

        "follower_id",

        currentUserId

      )

      .eq(

        "following_id",

        profileUserId

      )

      .maybeSingle();

    if (followError) {

      console.error(

        "Follow status error:",

        followError.message

      );

      return;

    }

    setIsFollowing(

      Boolean(followData)

    );

  };

  const loadFollowingUsers = async (userId) => {

    const { data: followData, error: followError } =

      await supabase

        .from("followers")

        .select("following_id")

        .eq("follower_id", userId);

    if (followError) {

      console.error(

        "Following users error:",

        followError.message

      );

      return;

    }

    const followingIds = (followData || []).map(

      (item) => item.following_id

    );

    if (followingIds.length === 0) {

      setFollowingUsers([]);

      return;

    }

    const { data: users, error: usersError } =

      await supabase

        .from("profiles")

        .select(`

          id,

          name,

          username,

          department,

          college,

          profile_image_url

        `)

        .in("id", followingIds);

    if (usersError) {

      console.error(

        "Following profiles error:",

        usersError.message

      );

      return;

    }

    setFollowingUsers(users || []);

  };

  const loadFollowersUsers = async (userId) => {

    const { data: followData, error: followError } =

      await supabase

        .from("followers")

        .select("follower_id")

        .eq("following_id", userId);

    if (followError) {

      console.error(

        "Followers users error:",

        followError.message

      );

      return;

    }

    const followerIds = (followData || []).map(

      (item) => item.follower_id

    );

    if (followerIds.length === 0) {

      setFollowersUsers([]);

      return;

    }

    const { data: users, error: usersError } =

      await supabase

        .from("profiles")

        .select(`

          id,

          name,

          username,

          department,

          college,

          profile_image_url

        `)

        .in("id", followerIds);

    if (usersError) {

      console.error(

        "Followers profiles error:",

        usersError.message

      );

      return;

    }

    setFollowersUsers(users || []);

  };

  // =========================

  // FOLLOW / UNFOLLOW

  // =========================

  const handleFollowToggle = async () => {

    if (!currentUser || !profile) {

      return;

    }

    // Prevent following yourself

    if (

      currentUser.id === profile.id

    ) {

      return;

    }

    setFollowLoading(true);

    setMessage("");

    // =========================

    // UNFOLLOW

    // =========================

    if (isFollowing) {

      const { error } = await supabase

        .from("followers")

        .delete()

        .eq(

          "follower_id",

          currentUser.id

        )

        .eq(

          "following_id",

          profile.id

        );

      if (error) {

        console.error(

          "Unfollow error:",

          error.message

        );

        setMessage(error.message);

        setFollowLoading(false);

        return;

      }

      setIsFollowing(false);

      setFollowersCount((prev) =>

        Math.max(0, prev - 1)

      );

      setMessage(

        `You unfollowed @${profile.username}`

      );

    }

    // =========================

    // FOLLOW

    // =========================

    else {

      const { error } = await supabase

        .from("followers")

        .insert({

          follower_id:

            currentUser.id,

          following_id:

            profile.id,

        });

      if (error) {

        console.error(

          "Follow error:",

          error.message

        );

        // Duplicate follow protection

        if (error.code === "23505") {

          setIsFollowing(true);

        } else {

          setMessage(

            error.message

          );

        }

        setFollowLoading(false);

        return;

      }

      setIsFollowing(true);

      setFollowersCount(

        (prev) => prev + 1

      );

      setMessage(

        `You are now following @${profile.username}`

      );

    }

    setFollowLoading(false);

    setTimeout(() => {

      setMessage("");

    }, 2500);

  };

  // =========================

  // FORM CHANGE

  // =========================

  const handleProfileImageSelect = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Profile image must be smaller than 5MB.");
      return;
    }

    if (profileImagePreview) {
      URL.revokeObjectURL(profileImagePreview);
    }

    setProfileImageFile(file);
    setProfileImagePreview(URL.createObjectURL(file));
    setMessage("");
  };

  const clearProfileImageSelection = () => {
    if (profileImagePreview) {
      URL.revokeObjectURL(profileImagePreview);
    }

    setProfileImageFile(null);
    setProfileImagePreview("");
  };

  const handleChange = (e) => {

    const { name, value } = e.target;

    setForm((prev) => ({

      ...prev,

      [name]: value,

    }));

  };

  // =========================

  // UPDATE PROFILE

  // =========================

  const handleUpdateProfile = async (e) => {

    e.preventDefault();

    if (!form.name.trim()) {

      setMessage(

        "Name is required."

      );

      return;

    }

    if (!form.username.trim()) {

      setMessage(

        "Username is required."

      );

      return;

    }

    setSaving(true);

    setMessage("");

    const skillsArray = form.skills

      .split(",")

      .map((skill) => skill.trim())

      .filter(Boolean);

    let profileImageUrl = profile.profile_image_url || null;

    if (profileImageFile) {
      const fileExt =
        profileImageFile.name.split(".").pop()?.toLowerCase() ||
        "jpg";

      const filePath = `${currentUser.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, profileImageFile);

      if (uploadError) {
        console.error(
          "Profile image upload error:",
          uploadError.message
        );
        setMessage(uploadError.message);
        setSaving(false);
        return;
      }

      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      profileImageUrl = publicData.publicUrl;
    }

    const { data, error } =
      await supabase
        .from("profiles")

        .update({

          name: form.name.trim(),

          username:

            form.username.trim(),

          college:

            form.college.trim() ||

            null,

          department:

            form.department.trim() ||

            null,

          year: form.year

            ? Number(form.year)

            : null,

          student_id:

            form.student_id.trim() ||

            null,

          bio:

            form.bio.trim() ||

            null,

          skills: skillsArray,

          github_url:

            form.github_url.trim() ||

            null,

          linkedin_url:

            form.linkedin_url.trim() ||

            null,

          profile_image_url: profileImageUrl,

          portfolio_url:

            form.portfolio_url.trim() ||

            null,

        })

        .eq(

          "id",

          currentUser.id

        )

        .select()

        .single();

    if (error) {

      console.error(

        "Profile update error:",

        error.message

      );

      setMessage(

        error.message

      );

      setSaving(false);

      return;

    }

    setProfile(data);

    clearProfileImageSelection();

    setEditing(false);

    setMessage(

      "Profile updated successfully! ✅"

    );

    setSaving(false);

    setTimeout(() => {

      setMessage("");

    }, 2500);

    if (

      usernameParam &&

      data.username !==

        usernameParam

    ) {

      navigate(

        `/profile?username=${encodeURIComponent(

          data.username

        )}`,

        {

          replace: true,

        }

      );

    }

  };

  // =========================

  // LOGOUT

  // =========================

  const handleLogout = async () => {

    await supabase.auth.signOut();

    navigate("/login");

  };

  // =========================

  // DATE FORMAT

  // =========================

  const formatDate = (date) => {

    return new Date(

      date

    ).toLocaleDateString(

      "en-IN",

      {

        day: "2-digit",

        month: "short",

        year: "numeric",

      }

    );

  };

  // =========================

  // LOADING

  // =========================

  if (loading) {

    return (

      <div className="profile-loading">

        Loading profile...

      </div>

    );

  }

  // =========================

  // PROFILE NOT FOUND

  // =========================

  if (!profile) {

    return (

      <div className="profile-loading">

        <h2>

          Profile not found

        </h2>

        <button

          type="button"

          onClick={() =>

            navigate("/dashboard")

          }

        >

          Back to Dashboard

        </button>

      </div>

    );

  }

  return (

    <div className="dashboard">

      {/* =========================

          SIDEBAR

      ========================= */}

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

            className="nav-item"

            type="button"

            onClick={() =>

              navigate("/explore")

            }

          >

            🔍

            <span>Explore</span>

          </button>

          <button

            className="nav-item"

            type="button"

            onClick={() =>
              navigate("/communities")
            }

          >

            👥

            <span>Communities</span>

          </button>

          <button

            className="nav-item"

            type="button"

            onClick={() =>
              navigate("/messages")
            }

          >

            💬

            <span>Messages</span>

          </button>

          <button

            className="nav-item"

            type="button"

            onClick={() =>
              navigate("/notifications")
            }

          >

            🔔

            <span>Notifications</span>

          </button>

          <button

            className="nav-item"

            type="button"

            onClick={() =>
              navigate("/events")
            }

          >

            📅

            <span>Events</span>

          </button>

          <button

            className="nav-item active"

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

            className="logout-btn"

            type="button"

            onClick={handleLogout}

          >

            🚪

            <span>Logout</span>

          </button>

        </div>

      </aside>

      {/* =========================

          MAIN CONTENT

      ========================= */}

      <main className="main-content">

        {/* TOPBAR */}

        <header className="topbar">

          <div className="mobile-brand">

            🎓 CampusConnect

          </div>

          <div className="search-box">

            🔍

            <input

              type="text"

              placeholder="Search students, posts, events..."

              onFocus={() =>

                navigate("/explore")

              }

            />

          </div>

          <div className="topbar-actions">

            <button

              type="button"

              onClick={() =>

                navigate("/explore")

              }

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

                <AvatarContent profile={profile} alt={profile.name || "Profile"} />

              </div>

              <span>

                {profile.name}

              </span>

            </button>

          </div>

        </header>

        {/* =========================

            PROFILE PAGE

        ========================= */}

        <div className="profile-page content-wrapper">

          {/* PROFILE HERO */}

          <div className="profile-hero card">

            <div className="profile-cover-large"></div>

            <div className="profile-hero-content">

              <div className="profile-large-avatar">

                <AvatarContent profile={profile} alt={profile.name || "Profile"} />

              </div>

              <div className="profile-main-info">

                <h1>

                  {profile.name}

                </h1>

                <p className="profile-username">

                  @{profile.username}

                </p>

                <p className="profile-bio">

                  {profile.bio ||

                    "CampusConnect student"}

                </p>

              </div>

              <div className="profile-hero-actions">

                {/* OWN PROFILE */}

                {isOwnProfile ? (

                  <button

                    type="button"

                    className="profile-edit-btn"

                    onClick={() =>

                      setEditing(

                        !editing

                      )

                    }

                  >

                    {editing

                      ? "Close Editor"

                      : "✏️ Edit Profile"}

                  </button>

                ) : (

                  /* OTHER PROFILE */

                  <button

                    type="button"

                    className={

                      isFollowing

                        ? "profile-follow-btn following"

                        : "profile-follow-btn"

                    }

                    onClick={

                      handleFollowToggle

                    }

                    disabled={

                      followLoading

                    }

                  >

                    {followLoading

                      ? "Please wait..."

                      : isFollowing

                      ? "✓ Following"

                      : "+ Follow"}

                  </button>

                )}

              </div>

            </div>

            {/* PROFILE STATS */}

            <div className="profile-stats">

              <div>

                <strong>{posts.length}</strong>

                <span>Posts</span>

              </div>

              <div

                onClick={() => setShowFollowers(true)}

                style={{ cursor: "pointer" }}

              >

                <strong>{followersCount}</strong>

                <span>Followers</span>

              </div>

              <div

                onClick={() => setShowFollowing(true)}

                style={{ cursor: "pointer" }}

              >

                <strong>{followingCount}</strong>

                <span>Following</span>

              </div>

            </div>

          </div>

          {/* MESSAGE */}

          {message && (

            <p className="profile-message">

              {message}

            </p>

          )}

          <div className="profile-grid">

            {/* =========================

                LEFT SIDE

            ========================= */}

            <section>

              {/* EDIT PROFILE */}

              {isOwnProfile &&

                editing && (

                  <form

                    className="profile-edit-card card"

                    onSubmit={

                      handleUpdateProfile

                    }

                  >

                    <div className="profile-section-header">

                      <div>

                        <h2>

                          Edit Profile

                        </h2>

                        <p>

                          Update your CampusConnect information.

                        </p>

                      </div>

                    </div>

                    <div className="profile-form-grid">

                    <div className="profile-form-group full">

                      <label>

                        Profile Picture

                      </label>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            width: "72px",
                            height: "72px",
                            borderRadius: "50%",
                            overflow: "hidden",
                            background: "#2563eb",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "700",
                            fontSize: "26px",
                            flexShrink: 0,
                          }}
                        >
                          {profileImagePreview || profile.profile_image_url ? (
                            <img
                              src={
                                profileImagePreview ||
                                profile.profile_image_url
                              }
                              alt="Profile preview"
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          ) : (
                            profile.name?.charAt(0).toUpperCase() || "U"
                          )}
                        </div>

                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProfileImageSelect}
                          />
                          <small
                            style={{
                              display: "block",
                              marginTop: "6px",
                            }}
                          >
                            Image up to 5MB.
                          </small>
                        </div>
                      </div>

                    </div>

                    <div className="profile-form-group">

                      <label>

                        Full Name

                        </label>

                        <input

                          type="text"

                          name="name"

                          value={

                            form.name

                          }

                          onChange={

                            handleChange

                          }

                        />

                      </div>

                      <div className="profile-form-group">

                        <label>

                          Username

                        </label>

                        <input

                          type="text"

                          name="username"

                          value={

                            form.username

                          }

                          onChange={

                            handleChange

                          }

                        />

                      </div>

                      <div className="profile-form-group">

                        <label>

                          College

                        </label>

                        <input

                          type="text"

                          name="college"

                          value={

                            form.college

                          }

                          onChange={

                            handleChange

                          }

                        />

                      </div>

                      <div className="profile-form-group">

                        <label>

                          Department

                        </label>

                        <input

                          type="text"

                          name="department"

                          value={

                            form.department

                          }

                          onChange={

                            handleChange

                          }

                        />

                      </div>

                      <div className="profile-form-group">

                        <label>

                          Year

                        </label>

                        <input

                          type="number"

                          name="year"

                          min="1"

                          max="8"

                          value={

                            form.year

                          }

                          onChange={

                            handleChange

                          }

                        />

                      </div>

                      <div className="profile-form-group">

                        <label>

                          Student ID

                        </label>

                        <input

                          type="text"

                          name="student_id"

                          value={

                            form.student_id

                          }

                          onChange={

                            handleChange

                          }

                        />

                      </div>

                      <div className="profile-form-group full">

                        <label>

                          Bio

                        </label>

                        <textarea

                          name="bio"

                          rows="4"

                          value={

                            form.bio

                          }

                          onChange={

                            handleChange

                          }

                        />

                      </div>

                      <div className="profile-form-group full">

                        <label>

                          Skills

                        </label>

                        <input

                          type="text"

                          name="skills"

                          placeholder="Java, Spring Boot, React"

                          value={

                            form.skills

                          }

                          onChange={

                            handleChange

                          }

                        />

                        <small>

                          Separate skills with commas.

                        </small>

                      </div>

                      <div className="profile-form-group">

                        <label>

                          GitHub URL

                        </label>

                        <input

                          type="url"

                          name="github_url"

                          placeholder="https://github.com/..."

                          value={

                            form.github_url

                          }

                          onChange={

                            handleChange

                          }

                        />

                      </div>

                      <div className="profile-form-group">

                        <label>

                          LinkedIn URL

                        </label>

                        <input

                          type="url"

                          name="linkedin_url"

                          placeholder="https://linkedin.com/in/..."

                          value={

                            form.linkedin_url

                          }

                          onChange={

                            handleChange

                          }

                        />

                      </div>

                      <div className="profile-form-group full">

                        <label>

                          Portfolio URL

                        </label>

                        <input

                          type="url"

                          name="portfolio_url"

                          placeholder="https://..."

                          value={

                            form.portfolio_url

                          }

                          onChange={

                            handleChange

                          }

                        />

                      </div>

                    </div>

                    <div className="profile-edit-footer">

                      <button

                        type="button"

                        className="profile-cancel-btn"

                        onClick={() => {
                          clearProfileImageSelection();
                          setEditing(false);
                        }}

                      >

                        Cancel

                      </button>

                      <button

                        type="submit"

                        className="profile-save-btn"

                        disabled={

                          saving

                        }

                      >

                        {saving

                          ? "Saving..."

                          : "Save Profile"}

                      </button>

                    </div>

                  </form>

                )}

              {/* ABOUT */}

              <div className="profile-info-card card">

                <div className="profile-section-header">

                  <div>

                    <h2>

                      About

                    </h2>

                    <p>

                      Student information

                    </p>

                  </div>

                </div>

                <div className="profile-info-list">

                  <div className="profile-info-item">

                    <span>

                      🏫 College

                    </span>

                    <strong>

                      {profile.college ||

                        "Not added"}

                    </strong>

                  </div>

                  <div className="profile-info-item">

                    <span>

                      💻 Department

                    </span>

                    <strong>

                      {profile.department ||

                        "Not added"}

                    </strong>

                  </div>

                  <div className="profile-info-item">

                    <span>

                      🎓 Year

                    </span>

                    <strong>

                      {profile.year ||

                        "Not added"}

                    </strong>

                  </div>

                  <div className="profile-info-item">

                    <span>

                      🆔 Student ID

                    </span>

                    <strong>

                      {profile.student_id ||

                        "Not added"}

                    </strong>

                  </div>

                </div>

              </div>

              {/* SKILLS */}

              <div className="profile-info-card card">

                <div className="profile-section-header">

                  <div>

                    <h2>

                      Skills

                    </h2>

                  </div>

                </div>

                <div className="skills-container">

                  {profile.skills &&

                  profile.skills.length > 0 ? (

                    profile.skills.map(

                      (skill) => (

                        <span

                          className="skill-chip"

                          key={skill}

                        >

                          {skill}

                        </span>

                      )

                    )

                  ) : (

                    <p className="muted-text">

                      No skills added yet.

                    </p>

                  )}

                </div>

              </div>

              {/* LINKS */}

              <div className="profile-info-card card">

                <div className="profile-section-header">

                  <div>

                    <h2>

                      Links

                    </h2>

                  </div>

                </div>

                <div className="profile-links">

                  {profile.github_url && (

                    <a

                      href={

                        profile.github_url

                      }

                      target="_blank"

                      rel="noreferrer"

                    >

                      💻 GitHub

                    </a>

                  )}

                  {profile.linkedin_url && (

                    <a

                      href={

                        profile.linkedin_url

                      }

                      target="_blank"

                      rel="noreferrer"

                    >

                      🔗 LinkedIn

                    </a>

                  )}

                  {profile.portfolio_url && (

                    <a

                      href={

                        profile.portfolio_url

                      }

                      target="_blank"

                      rel="noreferrer"

                    >

                      🌐 Portfolio

                    </a>

                  )}

                  {!profile.github_url &&

                    !profile.linkedin_url &&

                    !profile.portfolio_url && (

                      <p className="muted-text">

                        No links added yet.

                      </p>

                    )}

                </div>

              </div>

            </section>

            {/* =========================

                RIGHT SIDE

            ========================= */}

            <aside>

              {/* POSTS */}

              <div className="profile-posts-card card">

                <div className="profile-section-header">

                  <div>

                    <h2>

                      Posts

                    </h2>

                    <p>

                      Recent posts

                    </p>

                  </div>

                </div>

                {posts.length === 0 ? (

                  <div className="empty-profile-posts">

                    No posts yet.

                  </div>

                ) : (

                  posts.map(

                    (post) => (

                      <article

                        className="profile-post-item"

                        key={post.id}

                      >

                        <p>

                          {post.content}

                        </p>

                        {/* POST MEDIA */}
                        {post.media?.length > 0 && (
                          <div
                            style={{
                              marginTop: "12px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px",
                            }}
                          >
                            {post.media.map((media) =>
                              media.media_type === "video" ? (
                                <video
                                  key={media.media_url}
                                  src={media.media_url}
                                  controls
                                  style={{
                                    width: "100%",
                                    maxHeight: "420px",
                                    borderRadius: "12px",
                                    objectFit: "contain",
                                    background: "#000",
                                  }}
                                />
                              ) : (
                                <img
                                  key={media.media_url}
                                  src={media.media_url}
                                  alt="Post media"
                                  loading="lazy"
                                  style={{
                                    width: "100%",
                                    maxHeight: "420px",
                                    borderRadius: "12px",
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                />
                              )
                            )}
                          </div>
                        )}

                        <span>

                          {formatDate(

                            post.created_at

                          )}

                        </span>

                      </article>

                    )

                  )

                )}

              </div>

              {/* QUICK NAVIGATION */}

              <div className="profile-quick-card card">

                <h3>

                  Quick Navigation

                </h3>

                <Link to="/dashboard">

                  🏠 Home Feed

                </Link>

                <Link to="/explore">

                  🔍 Explore

                </Link>

              </div>

            </aside>

          </div>

          {/* FOLLOWING MODAL */}

          {showFollowing && (

            <div

              onClick={() => setShowFollowing(false)}

              style={{

                position: "fixed",

                inset: 0,

                background: "rgba(0, 0, 0, 0.45)",

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                zIndex: 9999,

                padding: "20px",

              }}

            >

              <div

                onClick={(e) => e.stopPropagation()}

                style={{

                  width: "100%",

                  maxWidth: "500px",

                  maxHeight: "80vh",

                  overflowY: "auto",

                  background: "#ffffff",

                  borderRadius: "16px",

                  padding: "20px",

                  boxShadow: "0 20px 50px rgba(0,0,0,0.2)",

                }}

              >

                <div

                  style={{

                    display: "flex",

                    justifyContent: "space-between",

                    alignItems: "center",

                    marginBottom: "20px",

                  }}

                >

                  <h2 style={{ margin: 0 }}>Following</h2>

                  <button

                    type="button"

                    onClick={() => setShowFollowing(false)}

                    style={{

                      border: "none",

                      background: "transparent",

                      fontSize: "22px",

                      cursor: "pointer",

                    }}

                  >

                    ✕

                  </button>

                </div>

                {followingUsers.length === 0 ? (

                  <p style={{ color: "#64748b" }}>

                    This user is not following anyone.

                  </p>

                ) : (

                  followingUsers.map((person) => (

                    <div

                      key={person.id}

                      style={{

                        display: "flex",

                        alignItems: "center",

                        gap: "12px",

                        padding: "12px 0",

                        borderBottom: "1px solid #e2e8f0",

                      }}

                    >

                      <div

                        style={{

                          width: "45px",

                          height: "45px",

                          borderRadius: "50%",

                          background: "#2563eb",

                          color: "white",

                          display: "flex",

                          alignItems: "center",

                          justifyContent: "center",

                          fontWeight: "700",

                          flexShrink: 0,

                        }}

                      >

                        <AvatarContent profile={person} alt={person.name || "Student"} />

                      </div>

                      <div style={{ flex: 1 }}>

                        <strong>{person.name || "Student"}</strong>

                        <div

                          style={{

                            color: "#64748b",

                            fontSize: "14px",

                            marginTop: "2px",

                          }}

                        >

                          @{person.username}

                        </div>

                        <div

                          style={{

                            color: "#94a3b8",

                            fontSize: "13px",

                            marginTop: "2px",

                          }}

                        >

                          {person.department ||

                            person.college ||

                            "Student"}

                        </div>

                      </div>

                      <button

                        type="button"

                        onClick={() =>

                          navigate(

                            `/profile?username=${encodeURIComponent(

                              person.username

                            )}`

                          )

                        }

                        style={{

                          border: "1px solid #2563eb",

                          background: "white",

                          color: "#2563eb",

                          borderRadius: "8px",

                          padding: "7px 12px",

                          cursor: "pointer",

                          fontWeight: "600",

                        }}

                      >

                        View

                      </button>

                    </div>

                  ))

                )}

              </div>

            </div>

          )}

          {/* FOLLOWERS MODAL */}

          {showFollowers && (

            <div

              onClick={() => setShowFollowers(false)}

              style={{

                position: "fixed",

                inset: 0,

                background: "rgba(0, 0, 0, 0.45)",

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                zIndex: 9999,

                padding: "20px",

              }}

            >

              <div

                onClick={(e) => e.stopPropagation()}

                style={{

                  width: "100%",

                  maxWidth: "500px",

                  maxHeight: "80vh",

                  overflowY: "auto",

                  background: "#ffffff",

                  borderRadius: "16px",

                  padding: "20px",

                  boxShadow: "0 20px 50px rgba(0,0,0,0.2)",

                }}

              >

                <div

                  style={{

                    display: "flex",

                    justifyContent: "space-between",

                    alignItems: "center",

                    marginBottom: "20px",

                  }}

                >

                  <h2 style={{ margin: 0 }}>Followers</h2>

                  <button

                    type="button"

                    onClick={() => setShowFollowers(false)}

                    style={{

                      border: "none",

                      background: "transparent",

                      fontSize: "22px",

                      cursor: "pointer",

                    }}

                  >

                    ✕

                  </button>

                </div>

                {followersUsers.length === 0 ? (

                  <p style={{ color: "#64748b" }}>

                    No followers yet.

                  </p>

                ) : (

                  followersUsers.map((person) => (

                    <div

                      key={person.id}

                      style={{

                        display: "flex",

                        alignItems: "center",

                        gap: "12px",

                        padding: "12px 0",

                        borderBottom: "1px solid #e2e8f0",

                      }}

                    >

                      <div

                        style={{

                          width: "45px",

                          height: "45px",

                          borderRadius: "50%",

                          background: "#16a34a",

                          color: "white",

                          display: "flex",

                          alignItems: "center",

                          justifyContent: "center",

                          fontWeight: "700",

                          flexShrink: 0,

                        }}

                      >

                        <AvatarContent profile={person} alt={person.name || "Student"} />

                      </div>

                      <div style={{ flex: 1 }}>

                        <strong>{person.name || "Student"}</strong>

                        <div

                          style={{

                            color: "#64748b",

                            fontSize: "14px",

                            marginTop: "2px",

                          }}

                        >

                          @{person.username}

                        </div>

                        <div

                          style={{

                            color: "#94a3b8",

                            fontSize: "13px",

                            marginTop: "2px",

                          }}

                        >

                          {person.department ||

                            person.college ||

                            "Student"}

                        </div>

                      </div>

                      <button

                        type="button"

                        onClick={() =>

                          navigate(

                            `/profile?username=${encodeURIComponent(

                              person.username

                            )}`

                          )

                        }

                        style={{

                          border: "1px solid #16a34a",

                          background: "white",

                          color: "#16a34a",

                          borderRadius: "8px",

                          padding: "7px 12px",

                          cursor: "pointer",

                          fontWeight: "600",

                        }}

                      >

                        View

                      </button>

                    </div>

                  ))

                )}

              </div>

            </div>

          )}

        </div>

      </main>

    </div>

  );

}

export default Profile;
