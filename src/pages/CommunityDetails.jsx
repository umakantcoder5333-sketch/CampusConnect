import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./UnifiedPages.css";

function formatDate(value) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "";

  return new Date(`1970-01-01T${value}`).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function Avatar({ profile, size = 42 }) {
  const initial =
    profile?.name?.charAt(0).toUpperCase() || "U";

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: "#dbeafe",
        color: "#1d4ed8",
        display: "grid",
        placeItems: "center",
        fontWeight: "800",
        flexShrink: 0,
      }}
    >
      {profile?.profile_image_url ? (
        <img
          src={profile.profile_image_url}
          alt={profile.name || "User"}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        initial
      )}
    </div>
  );
}

function CommunityDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [user, setUser] = useState(null);
  const [community, setCommunity] = useState(null);

  const [members, setMembers] = useState([]);
  const [membership, setMembership] = useState(null);

  const [posts, setPosts] = useState([]);
  const [likes, setLikes] = useState(new Set());
  const [comments, setComments] = useState({});

  const [announcements, setAnnouncements] =
    useState([]);

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});

  const [events, setEvents] = useState([]);

  const [activeTab, setActiveTab] = useState("posts");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [postContent, setPostContent] = useState("");
  const [posting, setPosting] = useState(false);

  const [commentText, setCommentText] = useState({});

  const [announcementForm, setAnnouncementForm] =
    useState({
      title: "",
      content: "",
      priority: "normal",
    });

  const [questionForm, setQuestionForm] =
    useState({
      title: "",
      details: "",
    });

  const [answerText, setAnswerText] = useState({});

  const [eventForm, setEventForm] =
    useState({
      title: "",
      description: "",
      event_date: "",
      start_time: "",
      end_time: "",
      location: "",
    });

  const canAdmin = useMemo(() => {
    return ["owner", "admin", "moderator"].includes(
      membership?.role
    );
  }, [membership]);

  useEffect(() => {
    loadCommunity();
  }, [id]);

  const loadCommunity = async () => {
    setLoading(true);
    setMessage("");

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      navigate("/login");
      return;
    }

    setUser(authUser);

    // =========================================
    // COMMUNITY
    // =========================================

    const {
      data: communityData,
      error: communityError,
    } = await supabase
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
      .eq("id", id)
      .single();

    if (communityError) {
      setMessage(communityError.message);
      setLoading(false);
      return;
    }

    setCommunity(communityData);

    // =========================================
    // LOAD EVERYTHING
    // =========================================

    const [
      membershipResult,
      membersResult,
      postsResult,
      announcementsResult,
      questionsResult,
      eventsResult,
    ] = await Promise.all([
      supabase
        .from("community_members")
        .select(
          "community_id, user_id, role, joined_at"
        )
        .eq("community_id", id)
        .eq("user_id", authUser.id)
        .maybeSingle(),

      supabase
        .from("community_members")
        .select(
          `
          community_id,
          user_id,
          role,
          joined_at,
          profiles (
            id,
            name,
            username,
            profile_image_url,
            department,
            year
          )
          `
        )
        .eq("community_id", id)
        .order("joined_at", {
          ascending: true,
        }),

      supabase
        .from("community_posts")
        .select(
          `
          id,
          community_id,
          user_id,
          content,
          created_at,
          updated_at,
          profiles (
            id,
            name,
            username,
            profile_image_url
          )
          `
        )
        .eq("community_id", id)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("community_announcements")
        .select(
          `
          id,
          community_id,
          created_by,
          title,
          content,
          priority,
          created_at,
          profiles (
            id,
            name,
            username,
            profile_image_url
          )
          `
        )
        .eq("community_id", id)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("community_questions")
        .select(
          `
          id,
          community_id,
          user_id,
          title,
          details,
          solved,
          created_at,
          profiles (
            id,
            name,
            username,
            profile_image_url
          )
          `
        )
        .eq("community_id", id)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("community_events")
        .select(
          `
          id,
          community_id,
          created_by,
          title,
          description,
          event_date,
          start_time,
          end_time,
          location,
          created_at,
          profiles (
            id,
            name,
            username,
            profile_image_url
          )
          `
        )
        .eq("community_id", id)
        .order("event_date", {
          ascending: true,
        }),
    ]);

    console.log(
      "MEMBERS DATA:",
      membersResult.data
    );
    console.log(
      "MEMBERS ERROR:",
      membersResult.error
    );

    // =========================================
    // MEMBERSHIP
    // =========================================

    setMembership(
      membershipResult.data || null
    );

    setMembers(
      membersResult.data || []
    );

    // =========================================
    // POSTS
    // =========================================

    if (!postsResult.error) {
      setPosts(postsResult.data || []);
    } else {
      setPosts([]);
    }

    // =========================================
    // ANNOUNCEMENTS
    // =========================================

    setAnnouncements(
      announcementsResult.data || []
    );

    // =========================================
    // QUESTIONS
    // =========================================

    setQuestions(
      questionsResult.data || []
    );

    // =========================================
    // EVENTS
    // =========================================

    setEvents(
      eventsResult.data || []
    );

    // =========================================
    // POST LIKES + COMMENTS
    // =========================================

    if (membershipResult.data) {
      const postIds = (
        postsResult.data || []
      ).map((post) => post.id);

      if (postIds.length > 0) {
        const [
          likeResult,
          commentResult,
        ] = await Promise.all([
          supabase
            .from("community_post_likes")
            .select(
              "post_id, user_id"
            )
            .in(
              "post_id",
              postIds
            ),

          supabase
            .from(
              "community_post_comments"
            )
            .select(
              `
              id,
              post_id,
              user_id,
              content,
              created_at,
              profiles (
                id,
                name,
                username,
                profile_image_url
              )
              `
            )
            .in(
              "post_id",
              postIds
            )
            .order("created_at", {
              ascending: true,
            }),
        ]);

        const likedPostIds = new Set(
          (likeResult.data || [])
            .filter(
              (item) =>
                item.user_id ===
                authUser.id
            )
            .map(
              (item) => item.post_id
            )
        );

        setLikes(
          likedPostIds
        );

        const groupedComments = {};

        (
          commentResult.data || []
        ).forEach((comment) => {
          if (
            !groupedComments[
              comment.post_id
            ]
          ) {
            groupedComments[
              comment.post_id
            ] = [];
          }

          groupedComments[
            comment.post_id
          ].push(comment);
        });

        setComments(
          groupedComments
        );
      }

      // =====================================
      // ANSWERS
      // =====================================

      const questionIds = (
        questionsResult.data || []
      ).map(
        (question) => question.id
      );

      if (questionIds.length > 0) {
        const {
          data: answerRows,
        } = await supabase
          .from(
            "community_answers"
          )
          .select(
            `
            id,
            question_id,
            user_id,
            content,
            is_accepted,
            created_at,
            profiles (
              id,
              name,
              username,
              profile_image_url
            )
            `
          )
          .in(
            "question_id",
            questionIds
          )
          .order("created_at", {
            ascending: true,
          });

        const groupedAnswers = {};

        (answerRows || []).forEach(
          (answer) => {
            if (
              !groupedAnswers[
                answer.question_id
              ]
            ) {
              groupedAnswers[
                answer.question_id
              ] = [];
            }

            groupedAnswers[
              answer.question_id
            ].push(answer);
          }
        );

        setAnswers(
          groupedAnswers
        );
      }
    }

    await loadCommunityPosts(id);

    setLoading(false);
  };

  const loadCommunityPosts = async (communityId) => {
    try {
      const { data: postsData, error: postsError } =
        await supabase
          .from("community_posts")
          .select(
            `
            id,
            community_id,
            user_id,
            content,
            created_at
            `
          )
          .eq("community_id", communityId)
          .order("created_at", {
            ascending: false,
          });

      if (postsError) {
        console.error(
          "Community posts loading error:",
          postsError
        );
        setMessage(
          `Failed to load posts: ${postsError.message}`
        );
        return;
      }

      const posts = postsData || [];
      const userIds = [
        ...new Set(
          posts.map((post) => post.user_id)
        ),
      ];

      let profilesMap = {};

      if (userIds.length > 0) {
        const {
          data: profilesData,
          error: profilesError,
        } = await supabase
          .from("profiles")
          .select(
            "id, name, username, profile_image_url"
          )
          .in("id", userIds);

        if (profilesError) {
          console.error(
            "Profiles loading error:",
            profilesError
          );
        } else {
          profilesMap = Object.fromEntries(
            (profilesData || []).map((profile) => [
              profile.id,
              profile,
            ])
          );
        }
      }

      const formattedPosts = posts.map((post) => ({
        ...post,
        profiles:
          profilesMap[post.user_id] || null,
      }));

      console.log(
        "COMMUNITY POSTS LOADED:",
        formattedPosts
      );

      setPosts(formattedPosts);
    } catch (error) {
      console.error(
        "Community posts exception:",
        error
      );
    }
  };

  // =========================================
  // JOIN
  // =========================================

  const joinCommunity = async () => {
    setMessage("");

    const { error } =
      await supabase.rpc(
        "join_community",
        {
          p_community_id: id,
        }
      );

    if (error) {
      setMessage(
        error.message
      );
      return;
    }

    await loadCommunity();
  };

  // =========================================
  // LEAVE
  // =========================================

  const leaveCommunity = async () => {
    setMessage("");

    const { error } =
      await supabase.rpc(
        "leave_community",
        {
          p_community_id: id,
        }
      );

    if (error) {
      setMessage(
        error.message
      );
      return;
    }

    await loadCommunity();
  };

  // =========================================
  // CREATE POST
  // =========================================

  const handleCreatePost = async (e) => {
    e?.preventDefault();

    const content = postContent.trim();

    if (!content) {
      setMessage("Please write something first.");
      return;
    }

    try {
      setPosting(true);
      setMessage("");

      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!authUser) {
        setMessage("You are not logged in.");
        return;
      }

      console.log("Creating community post...");
      console.log("Community ID:", community.id);
      console.log("User ID:", authUser.id);
      console.log("Content:", content);

      const {
        data: newPost,
        error: postError,
      } = await supabase
        .from("community_posts")
        .insert({
          community_id: community.id,
          user_id: authUser.id,
          content,
        })
        .select()
        .single();

      if (postError) {
        console.error(
          "COMMUNITY POST ERROR:",
          postError
        );
        setMessage(`Post failed: ${postError.message}`);
        return;
      }

      console.log("POST CREATED:", newPost);

      setPostContent("");

      setMessage("Post published successfully! ✅");

      await loadCommunityPosts(community.id);
    } catch (error) {
      console.error("CREATE POST ERROR:", error);
      setMessage(
        `Something went wrong: ${error.message}`
      );
    } finally {
      setPosting(false);
    }
  };

  // =========================================
  // LIKE / UNLIKE
  // =========================================

  const toggleLike = async (
    postId
  ) => {
    if (likes.has(postId)) {
      const { error } =
        await supabase
          .from(
            "community_post_likes"
          )
          .delete()
          .eq(
            "post_id",
            postId
          )
          .eq(
            "user_id",
            user.id
          );

      if (error) {
        setMessage(
          error.message
        );
        return;
      }

      setLikes(
        (previous) => {
          const next =
            new Set(
              previous
            );

          next.delete(
            postId
          );

          return next;
        }
      );

      return;
    }

    const { error } =
      await supabase
        .from(
          "community_post_likes"
        )
        .insert({
          post_id:
            postId,
          user_id:
            user.id,
        });

    if (error) {
      setMessage(
        error.message
      );
      return;
    }

    setLikes(
      (previous) =>
        new Set([
          ...previous,
          postId,
        ])
    );
  };

  // =========================================
  // COMMENT
  // =========================================

  const addComment = async (
    postId
  ) => {
    const text =
      (
        commentText[
          postId
        ] || ""
      ).trim();

    if (!text) {
      return;
    }

    const { error } =
      await supabase
        .from(
          "community_post_comments"
        )
        .insert({
          post_id:
            postId,
          user_id:
            user.id,
          content: text,
        });

    if (error) {
      setMessage(
        error.message
      );
      return;
    }

    setCommentText(
      (previous) => ({
        ...previous,
        [postId]: "",
      })
    );

    await loadCommunity();
  };

  // =========================================
  // ANNOUNCEMENT
  // =========================================

  const createAnnouncement =
    async (event) => {
      event.preventDefault();

      if (
        !announcementForm.title.trim() ||
        !announcementForm.content.trim()
      ) {
        return;
      }

      const { error } =
        await supabase
          .from(
            "community_announcements"
          )
          .insert({
            community_id:
              id,
            created_by:
              user.id,
            title:
              announcementForm.title.trim(),
            content:
              announcementForm.content.trim(),
            priority:
              announcementForm.priority,
          });

      if (error) {
        setMessage(
          error.message
        );
        return;
      }

      setAnnouncementForm({
        title: "",
        content: "",
        priority: "normal",
      });

      await loadCommunity();
    };

  // =========================================
  // QUESTION
  // =========================================

  const createQuestion =
    async (event) => {
      event.preventDefault();

      if (
        !questionForm.title.trim()
      ) {
        return;
      }

      const { error } =
        await supabase
          .from(
            "community_questions"
          )
          .insert({
            community_id:
              id,
            user_id:
              user.id,
            title:
              questionForm.title.trim(),
            details:
              questionForm.details.trim() ||
              null,
          });

      if (error) {
        setMessage(
          error.message
        );
        return;
      }

      setQuestionForm({
        title: "",
        details: "",
      });

      await loadCommunity();
    };

  // =========================================
  // ANSWER
  // =========================================

  const createAnswer = async (
    questionId
  ) => {
    const text =
      (
        answerText[
          questionId
        ] || ""
      ).trim();

    if (!text) {
      return;
    }

    const { error } =
      await supabase
        .from(
          "community_answers"
        )
        .insert({
          question_id:
            questionId,
          user_id:
            user.id,
          content: text,
        });

    if (error) {
      setMessage(
        error.message
      );
      return;
    }

    setAnswerText(
      (previous) => ({
        ...previous,
        [questionId]: "",
      })
    );

    await loadCommunity();
  };

  // =========================================
  // COMMUNITY EVENT
  // =========================================

  const createEvent = async (
    event
  ) => {
    event.preventDefault();

    if (
      !eventForm.title.trim() ||
      !eventForm.event_date
    ) {
      return;
    }

    const { error } =
      await supabase
        .from(
          "community_events"
        )
        .insert({
          community_id:
            id,
          created_by:
            user.id,
          title:
            eventForm.title.trim(),
          description:
            eventForm.description.trim() ||
            null,
          event_date:
            eventForm.event_date,
          start_time:
            eventForm.start_time ||
            null,
          end_time:
            eventForm.end_time ||
            null,
          location:
            eventForm.location.trim() ||
            null,
        });

    if (error) {
      setMessage(
        error.message
      );
      return;
    }

    setEventForm({
      title: "",
      description: "",
      event_date: "",
      start_time: "",
      end_time: "",
      location: "",
    });

    await loadCommunity();
  };

  if (loading) {
    return (
      <div
        className="unified-dark-page community-details-page"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        Loading community...
      </div>
    );
  }

  if (!community) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        Community not found.
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "30px 20px 60px",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        {/* BACK */}

        <button
          type="button"
          onClick={() =>
            navigate(
              "/communities"
            )
          }
          style={{
            border: "none",
            background:
              "transparent",
            color: "#2563eb",
            cursor:
              "pointer",
            fontWeight:
              "700",
            marginBottom:
              "18px",
          }}
        >
          ← All Communities
        </button>

        {/* HERO */}

        <div
          style={{
            background:
              "white",
            border:
              "1px solid #e2e8f0",
            borderRadius:
              "18px",
            overflow:
              "hidden",
            marginBottom:
              "20px",
          }}
        >
          <div
            style={{
              height: "180px",
              background:
                "#dbeafe",
              display: "grid",
              placeItems:
                "center",
              fontSize:
                "60px",
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
              padding:
                "22px",
            }}
          >
            <span
              style={{
                display:
                  "inline-block",
                padding:
                  "5px 10px",
                borderRadius:
                  "999px",
                background:
                  "#eff6ff",
                color:
                  "#1d4ed8",
                fontSize:
                  "11px",
                fontWeight:
                  "800",
                textTransform:
                  "capitalize",
              }}
            >
              {
                community.community_type
              }
            </span>

            <h1
              style={{
                margin:
                  "10px 0 4px",
                color:
                  "#0f172a",
              }}
            >
              {community.name}
            </h1>

            <p
              style={{
                margin:
                  "0 0 10px",
                color:
                  "#94a3b8",
              }}
            >
              @{community.slug}
            </p>

            <p
              style={{
                color:
                  "#64748b",
                lineHeight:
                  "1.6",
              }}
            >
              {community.description ||
                "Campus community on CampusConnect."}
            </p>

            <div
              style={{
                display:
                  "flex",
                gap: "10px",
                flexWrap:
                  "wrap",
                margin:
                  "14px 0",
                color:
                  "#475569",
                fontSize:
                  "13px",
              }}
            >
              {community.department && (
                <span>
                  📚{" "}
                  {
                    community.department
                  }
                </span>
              )}

              {community.category && (
                <span>
                  🏷️{" "}
                  {
                    community.category
                  }
                </span>
              )}

              {community.college && (
                <span>
                  🏛️{" "}
                  {
                    community.college
                  }
                </span>
              )}

              <span>
                👥{" "}
                {
                  members.length
                }{" "}
                members
              </span>
            </div>

            {membership ? (
              membership.role ===
              "owner" ? (
                <span
                  style={{
                    display:
                      "inline-block",
                    padding:
                      "7px 11px",
                    borderRadius:
                      "999px",
                    background:
                      "#dcfce7",
                    color:
                      "#166534",
                    fontWeight:
                      "800",
                    fontSize:
                      "12px",
                  }}
                >
                  Owner
                </span>
              ) : (
                <button
                  type="button"
                  onClick={
                    leaveCommunity
                  }
                  style={{
                    padding:
                      "10px 15px",
                    borderRadius:
                      "10px",
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
                  Leave Community
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={
                  joinCommunity
                }
                style={{
                  padding:
                    "10px 15px",
                  borderRadius:
                    "10px",
                  border:
                    "none",
                  background:
                    "#2563eb",
                  color:
                    "white",
                  cursor:
                    "pointer",
                  fontWeight:
                    "700",
                }}
              >
                Join Community
              </button>
            )}
          </div>
        </div>

        {/* MESSAGE */}

        {message && (
          <div
            style={{
              marginBottom:
                "18px",
              padding:
                "12px 15px",
              borderRadius:
                "10px",
              background:
                "#fff7ed",
              border:
                "1px solid #fed7aa",
              color:
                "#9a3412",
            }}
          >
            {message}
          </div>
        )}

        {/* MEMBER ONLY */}

        {!membership ? (
          <div
            style={{
              background:
                "white",
              border:
                "1px solid #e2e8f0",
              borderRadius:
                "16px",
              padding:
                "60px 20px",
              textAlign:
                "center",
            }}
          >
            <div
              style={{
                fontSize:
                  "45px",
              }}
            >
              🔒
            </div>

            <h2
              style={{
                color:
                  "#0f172a",
              }}
            >
              Join this community
            </h2>

            <p
              style={{
                color:
                  "#64748b",
              }}
            >
              Join the community to
              access posts,
              announcements,
              Q&A, events and
              members.
            </p>

            <button
              type="button"
              onClick={
                joinCommunity
              }
              style={{
                padding:
                  "11px 17px",
                borderRadius:
                  "10px",
                border:
                  "none",
                background:
                  "#2563eb",
                color:
                  "white",
                cursor:
                  "pointer",
                fontWeight:
                  "700",
              }}
            >
              Join Community
            </button>
          </div>
        ) : (
          <>
            {/* TABS */}

            <div
              style={{
                display:
                  "flex",
                gap: "8px",
                overflowX:
                  "auto",
                marginBottom:
                  "18px",
              }}
            >
              {[
                ["posts", "Posts"],
                [
                  "announcements",
                  "Announcements",
                ],
                ["qa", "Q&A"],
                ["events", "Events"],
                ["members", "Members"],
              ].map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        value
                      )
                    }
                    style={{
                      padding:
                        "10px 14px",
                      borderRadius:
                        "9px",
                      border:
                        "1px solid #cbd5e1",
                      background:
                        activeTab ===
                        value
                          ? "#2563eb"
                          : "white",
                      color:
                        activeTab ===
                        value
                          ? "white"
                          : "#334155",
                      cursor:
                        "pointer",
                      fontWeight:
                        "700",
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    {label}
                  </button>
                )
              )}
            </div>

            {/* =================================
                POSTS
            ================================= */}

            {activeTab ===
              "posts" && (
              <div
                style={{
                  display:
                    "grid",
                  gap: "16px",
                }}
              >
                <form
                  style={{
                    background:
                      "white",
                    border:
                      "1px solid #e2e8f0",
                    borderRadius:
                      "16px",
                    padding:
                      "20px",
                  }}
                >
                  <h2>
                    Create a community post
                  </h2>

                  <textarea
                    placeholder="Share something with this community..."
                    value={postContent}
                    onChange={(e) =>
                      setPostContent(e.target.value)
                    }
                    rows="4"
                    style={{
                      width:
                        "100%",
                      boxSizing:
                        "border-box",
                      padding:
                        "12px",
                      borderRadius:
                        "10px",
                      border:
                        "1px solid #cbd5e1",
                      resize:
                        "vertical",
                    }}
                  />

                  <button
                    type="button"
                    onClick={handleCreatePost}
                    disabled={posting}
                  >
                    {posting
                      ? "Publishing..."
                      : "Publish Post"}
                  </button>
                </form>

                {posts.length ===
                0 ? (
                  <div
                    style={{
                      background:
                        "white",
                      border:
                        "1px solid #e2e8f0",
                      borderRadius:
                        "16px",
                      padding:
                        "50px 20px",
                      textAlign:
                        "center",
                      color:
                        "#64748b",
                    }}
                  >
                    No community
                    posts yet.
                  </div>
                ) : (
                  posts.map(
                    (post) => (
                      <article
                        key={
                          post.id
                        }
                        style={{
                          background:
                            "white",
                          border:
                            "1px solid #e2e8f0",
                          borderRadius:
                            "16px",
                          padding:
                            "20px",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            gap:
                              "10px",
                            alignItems:
                              "center",
                          }}
                        >
                          <Avatar
                            profile={
                              post.profiles
                            }
                          />

                          <div>
                            <strong>
                              {post
                                .profiles
                                ?.name ||
                                "Student"}
                            </strong>

                            <div
                              style={{
                                color:
                                  "#94a3b8",
                                fontSize:
                                  "12px",
                              }}
                            >
                              @
                              {post
                                .profiles
                                ?.username ||
                                "student"}{" "}
                              ·{" "}
                              {formatDate(
                                post.created_at
                              )}
                            </div>
                          </div>
                        </div>

                        <p
                          style={{
                            color:
                              "#334155",
                            lineHeight:
                              "1.6",
                            whiteSpace:
                              "pre-wrap",
                          }}
                        >
                          {post.content}
                        </p>

                        <div
                          style={{
                            display:
                              "flex",
                            gap:
                              "15px",
                            alignItems:
                              "center",
                            marginBottom:
                              "12px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              toggleLike(
                                post.id
                              )
                            }
                            style={{
                              border:
                                "none",
                              background:
                                "transparent",
                              cursor:
                                "pointer",
                              color:
                                likes.has(
                                  post.id
                                )
                                  ? "#dc2626"
                                  : "#475569",
                              fontWeight:
                                "700",
                            }}
                          >
                            {likes.has(
                              post.id
                            )
                              ? "❤️"
                              : "🤍"}{" "}
                            Like
                          </button>

                          <span
                            style={{
                              color:
                                "#94a3b8",
                              fontSize:
                                "13px",
                            }}
                          >
                            {
                              (
                                comments[
                                  post.id
                                ] ||
                                []
                              ).length
                            }{" "}
                            comments
                          </span>
                        </div>

                        {/* COMMENTS */}

                        <div
                          style={{
                            display:
                              "grid",
                            gap:
                              "8px",
                            marginBottom:
                              "10px",
                          }}
                        >
                          {(
                            comments[
                              post.id
                            ] ||
                            []
                          ).map(
                            (
                              comment
                            ) => (
                              <div
                                key={
                                  comment.id
                                }
                                style={{
                                  display:
                                    "flex",
                                  gap:
                                    "9px",
                                  background:
                                    "#f8fafc",
                                  padding:
                                    "9px",
                                  borderRadius:
                                    "10px",
                                }}
                              >
                                <Avatar
                                  profile={
                                    comment.profiles
                                  }
                                  size={
                                    34
                                  }
                                />

                                <div>
                                  <strong>
                                    {comment
                                      .profiles
                                      ?.name ||
                                      "Student"}
                                  </strong>

                                  <p
                                    style={{
                                      margin:
                                        "3px 0 0",
                                      color:
                                        "#475569",
                                    }}
                                  >
                                    {
                                      comment.content
                                    }
                                  </p>
                                </div>
                              </div>
                            )
                          )}
                        </div>

                        {/* COMMENT INPUT */}

                        <div
                          style={{
                            display:
                              "flex",
                            gap:
                              "8px",
                          }}
                        >
                          <input
                            value={
                              commentText[
                                post.id
                              ] ||
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              setCommentText(
                                (
                                  previous
                                ) => ({
                                  ...previous,
                                  [post.id]:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                            placeholder="Write a comment..."
                            style={{
                              flex:
                                1,
                              padding:
                                "10px",
                              borderRadius:
                                "9px",
                              border:
                                "1px solid #cbd5e1",
                            }}
                          />

                          <button
                            type="button"
                            onClick={() =>
                              addComment(
                                post.id
                              )
                            }
                            style={{
                              padding:
                                "10px 13px",
                              borderRadius:
                                "9px",
                              border:
                                "none",
                              background:
                                "#2563eb",
                              color:
                                "white",
                              cursor:
                                "pointer",
                              fontWeight:
                                "700",
                            }}
                          >
                            Comment
                          </button>
                        </div>
                      </article>
                    )
                  )
                )}
              </div>
            )}

            {/* =================================
                ANNOUNCEMENTS
            ================================= */}

            {activeTab ===
              "announcements" && (
              <div
                style={{
                  display:
                    "grid",
                  gap:
                    "16px",
                }}
              >
                {canAdmin && (
                  <form
                    onSubmit={
                      createAnnouncement
                    }
                    style={{
                      background:
                        "white",
                      border:
                        "1px solid #e2e8f0",
                      borderRadius:
                        "16px",
                      padding:
                        "20px",
                      display:
                        "grid",
                      gap:
                        "10px",
                    }}
                  >
                    <h2>
                      Create Announcement
                    </h2>

                    <input
                      required
                      value={
                        announcementForm.title
                      }
                      onChange={(
                        event
                      ) =>
                        setAnnouncementForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            title:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="Announcement title"
                    />

                    <textarea
                      required
                      rows="4"
                      value={
                        announcementForm.content
                      }
                      onChange={(
                        event
                      ) =>
                        setAnnouncementForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            content:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="Write announcement..."
                    />

                    <select
                      value={
                        announcementForm.priority
                      }
                      onChange={(
                        event
                      ) =>
                        setAnnouncementForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            priority:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    >
                      <option value="normal">
                        Normal
                      </option>

                      <option value="important">
                        Important
                      </option>

                      <option value="urgent">
                        Urgent
                      </option>
                    </select>

                    <button
                      type="submit"
                      style={{
                        padding:
                          "10px 15px",
                        borderRadius:
                          "9px",
                        border:
                          "none",
                        background:
                          "#2563eb",
                        color:
                          "white",
                        cursor:
                          "pointer",
                        fontWeight:
                          "700",
                      }}
                    >
                      Publish Announcement
                    </button>
                  </form>
                )}

                {announcements.length ===
                0 ? (
                  <div
                    style={{
                      background:
                        "white",
                      border:
                        "1px solid #e2e8f0",
                      borderRadius:
                        "16px",
                      padding:
                        "50px 20px",
                      textAlign:
                        "center",
                      color:
                        "#64748b",
                    }}
                  >
                    No announcements yet.
                  </div>
                ) : (
                  announcements.map(
                    (item) => (
                      <article
                        key={
                          item.id
                        }
                        style={{
                          background:
                            "white",
                          border:
                            "1px solid #e2e8f0",
                          borderRadius:
                            "16px",
                          padding:
                            "20px",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                          }}
                        >
                          <strong>
                            {item.title}
                          </strong>

                          <span>
                            {item.priority ===
                            "urgent"
                              ? "🔴"
                              : item.priority ===
                                "important"
                              ? "🟡"
                              : "🔵"}{" "}
                            {
                              item.priority
                            }
                          </span>
                        </div>

                        <p
                          style={{
                            color:
                              "#475569",
                            whiteSpace:
                              "pre-wrap",
                            lineHeight:
                              "1.6",
                          }}
                        >
                          {item.content}
                        </p>

                        <small
                          style={{
                            color:
                              "#94a3b8",
                          }}
                        >
                          Posted by{" "}
                          {item
                            .profiles
                            ?.name ||
                            "Admin"}{" "}
                          ·{" "}
                          {formatDate(
                            item.created_at
                          )}
                        </small>
                      </article>
                    )
                  )
                )}
              </div>
            )}

            {/* =================================
                Q&A
            ================================= */}

            {activeTab === "qa" && (
              <div
                style={{
                  display:
                    "grid",
                  gap:
                    "16px",
                }}
              >
                <form
                  onSubmit={
                    createQuestion
                  }
                  style={{
                    background:
                      "white",
                    border:
                      "1px solid #e2e8f0",
                    borderRadius:
                      "16px",
                    padding:
                      "20px",
                    display:
                      "grid",
                    gap:
                      "10px",
                  }}
                >
                  <h2>
                    Ask a Question
                  </h2>

                  <input
                    required
                    value={
                      questionForm.title
                    }
                    onChange={(
                      event
                    ) =>
                      setQuestionForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          title:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    placeholder="What do you want to ask?"
                  />

                  <textarea
                    rows="4"
                    value={
                      questionForm.details
                    }
                    onChange={(
                      event
                    ) =>
                      setQuestionForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          details:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    placeholder="Add more details..."
                  />

                  <button
                    type="submit"
                    style={{
                      padding:
                        "10px 15px",
                      borderRadius:
                        "9px",
                      border:
                        "none",
                      background:
                        "#2563eb",
                      color:
                        "white",
                      cursor:
                        "pointer",
                      fontWeight:
                        "700",
                    }}
                  >
                    Ask Question
                  </button>
                </form>

                {questions.length ===
                0 ? (
                  <div
                    style={{
                      background:
                        "white",
                      border:
                        "1px solid #e2e8f0",
                      borderRadius:
                        "16px",
                      padding:
                        "50px 20px",
                      textAlign:
                        "center",
                      color:
                        "#64748b",
                    }}
                  >
                    No questions yet.
                  </div>
                ) : (
                  questions.map(
                    (question) => (
                      <article
                        key={
                          question.id
                        }
                        style={{
                          background:
                            "white",
                          border:
                            "1px solid #e2e8f0",
                          borderRadius:
                            "16px",
                          padding:
                            "20px",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            gap:
                              "15px",
                          }}
                        >
                          <div>
                            <span
                              style={{
                                display:
                                  "inline-block",
                                padding:
                                  "5px 9px",
                                borderRadius:
                                  "999px",
                                background:
                                  question.solved
                                    ? "#dcfce7"
                                    : "#dbeafe",
                                color:
                                  question.solved
                                    ? "#166534"
                                    : "#1d4ed8",
                                fontSize:
                                  "11px",
                                fontWeight:
                                  "800",
                              }}
                            >
                              {question.solved
                                ? "Solved"
                                : "Open"}
                            </span>

                            <h3>
                              {
                                question.title
                              }
                            </h3>
                          </div>

                          <small
                            style={{
                              color:
                                "#94a3b8",
                            }}
                          >
                            {formatDate(
                              question.created_at
                            )}
                          </small>
                        </div>

                        {question.details && (
                          <p
                            style={{
                              color:
                                "#475569",
                              whiteSpace:
                                "pre-wrap",
                            }}
                          >
                            {
                              question.details
                            }
                          </p>
                        )}

                        <p
                          style={{
                            color:
                              "#94a3b8",
                            fontSize:
                              "12px",
                          }}
                        >
                          Asked by{" "}
                          {question
                            .profiles
                            ?.name ||
                            "Student"}
                        </p>

                        {/* ANSWERS */}

                        <div
                          style={{
                            display:
                              "grid",
                            gap:
                              "10px",
                            margin:
                              "15px 0",
                          }}
                        >
                          {(
                            answers[
                              question.id
                            ] || []
                          ).map(
                            (answer) => (
                              <div
                                key={
                                  answer.id
                                }
                                style={{
                                  background:
                                    "#f8fafc",
                                  padding:
                                    "12px",
                                  borderRadius:
                                    "10px",
                                }}
                              >
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    gap:
                                      "8px",
                                    alignItems:
                                      "center",
                                  }}
                                >
                                  <Avatar
                                    profile={
                                      answer.profiles
                                    }
                                    size={
                                      34
                                    }
                                  />

                                  <strong>
                                    {answer
                                      .profiles
                                      ?.name ||
                                      "Student"}
                                  </strong>
                                </div>

                                <p
                                  style={{
                                    color:
                                      "#475569",
                                  }}
                                >
                                  {
                                    answer.content
                                  }
                                </p>

                                {answer.is_accepted && (
                                  <span
                                    style={{
                                      color:
                                        "#166534",
                                      fontWeight:
                                        "700",
                                      fontSize:
                                        "12px",
                                    }}
                                  >
                                    ✅ Accepted
                                    answer
                                  </span>
                                )}
                              </div>
                            )
                          )}
                        </div>

                        {/* ANSWER INPUT */}

                        <div
                          style={{
                            display:
                              "flex",
                            gap:
                              "8px",
                          }}
                        >
                          <input
                            value={
                              answerText[
                                question.id
                              ] ||
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              setAnswerText(
                                (
                                  previous
                                ) => ({
                                  ...previous,
                                  [question.id]:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                            placeholder="Write an answer..."
                          />

                          <button
                            type="button"
                            onClick={() =>
                              createAnswer(
                                question.id
                              )
                            }
                            style={{
                              padding:
                                "10px 13px",
                              borderRadius:
                                "9px",
                              border:
                                "none",
                              background:
                                "#2563eb",
                              color:
                                "white",
                              cursor:
                                "pointer",
                              fontWeight:
                                "700",
                            }}
                          >
                            Answer
                          </button>
                        </div>
                      </article>
                    )
                  )
                )}
              </div>
            )}

            {/* =================================
                EVENTS
            ================================= */}

            {activeTab ===
              "events" && (
              <div
                style={{
                  display:
                    "grid",
                  gap:
                    "16px",
                }}
              >
                {canAdmin && (
                  <form
                    onSubmit={
                      createEvent
                    }
                    style={{
                      background:
                        "white",
                      border:
                        "1px solid #e2e8f0",
                      borderRadius:
                        "16px",
                      padding:
                        "20px",
                      display:
                        "grid",
                      gap:
                        "12px",
                    }}
                  >
                    <h2>
                      Create Event
                    </h2>

                    <input
                      required
                      value={
                        eventForm.title
                      }
                      onChange={(
                        event
                      ) =>
                        setEventForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            title:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="Event title"
                    />

                    <textarea
                      rows="3"
                      value={
                        eventForm.description
                      }
                      onChange={(
                        event
                      ) =>
                        setEventForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            description:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="Event description"
                    />

                    <label>
                      Date
                      <input
                        required
                        type="date"
                        value={
                          eventForm.event_date
                        }
                        onChange={(
                          event
                        ) =>
                          setEventForm(
                            (
                              previous
                            ) => ({
                              ...previous,
                              event_date:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </label>

                    <label>
                      Start time
                      <input
                        type="time"
                        value={
                          eventForm.start_time
                        }
                        onChange={(
                          event
                        ) =>
                          setEventForm(
                            (
                              previous
                            ) => ({
                              ...previous,
                              start_time:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </label>

                    <label>
                      End time
                      <input
                        type="time"
                        value={
                          eventForm.end_time
                        }
                        onChange={(
                          event
                        ) =>
                          setEventForm(
                            (
                              previous
                            ) => ({
                              ...previous,
                              end_time:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </label>

                    <input
                      value={
                        eventForm.location
                      }
                      onChange={(
                        event
                      ) =>
                        setEventForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            location:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="Location"
                    />

                    <button
                      type="submit"
                      style={{
                        padding:
                          "10px 15px",
                        borderRadius:
                          "9px",
                        border:
                          "none",
                        background:
                          "#2563eb",
                        color:
                          "white",
                        cursor:
                          "pointer",
                        fontWeight:
                          "700",
                      }}
                    >
                      Create Event
                    </button>
                  </form>
                )}

                {events.length ===
                0 ? (
                  <div
                    style={{
                      background:
                        "white",
                      border:
                        "1px solid #e2e8f0",
                      borderRadius:
                        "16px",
                      padding:
                        "50px 20px",
                      textAlign:
                        "center",
                      color:
                        "#64748b",
                    }}
                  >
                    No community events yet.
                  </div>
                ) : (
                  events.map(
                    (eventItem) => (
                      <article
                        key={
                          eventItem.id
                        }
                        style={{
                          background:
                            "white",
                          border:
                            "1px solid #e2e8f0",
                          borderRadius:
                            "16px",
                          padding:
                            "20px",
                        }}
                      >
                        <h3
                          style={{
                            margin:
                              "0 0 8px",
                            color:
                              "#0f172a",
                          }}
                        >
                          {
                            eventItem.title
                          }
                        </h3>

                        <div
                          style={{
                            color:
                              "#475569",
                            fontSize:
                              "13px",
                          }}
                        >
                          📅{" "}
                          {formatDate(
                            eventItem.event_date
                          )}

                          {eventItem.start_time &&
                            ` · ${formatTime(
                              eventItem.start_time
                            )}`}

                          {eventItem.end_time &&
                            ` - ${formatTime(
                              eventItem.end_time
                            )}`}
                        </div>

                        {eventItem.location && (
                          <div
                            style={{
                              color:
                                "#475569",
                              marginTop:
                                "6px",
                            }}
                          >
                            📍{" "}
                            {
                              eventItem.location
                            }
                          </div>
                        )}

                        {eventItem.description && (
                          <p
                            style={{
                              color:
                                "#475569",
                              lineHeight:
                                "1.6",
                            }}
                          >
                            {
                              eventItem.description
                            }
                          </p>
                        )}
                      </article>
                    )
                  )
                )}
              </div>
            )}

            {/* =================================
                MEMBERS
            ================================= */}

            {activeTab ===
              "members" && (
              <div
                style={{
                  background:
                    "white",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius:
                    "16px",
                  padding:
                    "20px",
                }}
              >
                <h2>
                  Community Members
                </h2>

                <p
                  style={{
                    color:
                      "#64748b",
                  }}
                >
                  {
                    members.length
                  }{" "}
                  members
                </p>

                <div>
                  {members.map(
                    (member) => (
                      <div
                        key={
                          member.user_id
                        }
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap:
                            "10px",
                          padding:
                            "12px 0",
                          borderBottom:
                            "1px solid #eef2f7",
                        }}
                      >
                        <Avatar
                          profile={
                            member.profiles
                          }
                        />

                        <div
                          style={{
                            flex: 1,
                          }}
                        >
                          <strong>
                            {
                              member
                                .profiles
                                ?.name ||
                              "Student"
                            }
                          </strong>

                          <div
                            style={{
                              color:
                                "#94a3b8",
                              fontSize:
                                "12px",
                            }}
                          >
                            @
                            {member
                              .profiles
                              ?.username ||
                              "student"}
                          </div>
                        </div>

                        <span
                          style={{
                            padding:
                              "5px 9px",
                            borderRadius:
                              "999px",
                            background:
                              "#f1f5f9",
                            color:
                              "#475569",
                            fontSize:
                              "11px",
                            fontWeight:
                              "800",
                            textTransform:
                              "capitalize",
                          }}
                        >
                          {
                            member.role
                          }
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CommunityDetails;