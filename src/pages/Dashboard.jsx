import { useEffect, useState } from "react";

import {

  useNavigate,

  useSearchParams,

} from "react-router-dom";

import { supabase } from "../lib/supabase";

import "./Dashboard.css";
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


function Dashboard() {

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const focusPostId = searchParams.get("post");

  const [profile, setProfile] = useState(null);

  const [currentUserId, setCurrentUserId] = useState(null);

  const [postContent, setPostContent] = useState("");

  const [posts, setPosts] = useState([]);

  const [posting, setPosting] = useState(false);

  const [message, setMessage] = useState("");

  const [comments, setComments] = useState({});

  const [commentText, setCommentText] = useState({});

  const [savedPosts, setSavedPosts] = useState({});

  const [suggestions, setSuggestions] = useState([]);

  const [unreadMessages, setUnreadMessages] =
    useState(0);

  const [unreadNotifications, setUnreadNotifications] =
    useState(0);

  const [selectedMedia, setSelectedMedia] = useState(null);

  const [mediaPreview, setMediaPreview] = useState("");

  const [mediaType, setMediaType] = useState("");

  const [pollMode, setPollMode] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const [eventMode, setEventMode] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");

  const [editingPostId, setEditingPostId] = useState(null);

  const [editingContent, setEditingContent] = useState("");

  const [searchText, setSearchText] = useState("");

  useEffect(() => {

    loadDashboard();

  }, []);

  // =========================

  // LOAD DASHBOARD

  // =========================

  const loadDashboard = async () => {

    await loadProfile();

    await loadPosts();

    await loadComments();

    await loadSavedPosts();

    await loadSuggestions();

    await loadUnreadMessages();
    await loadUnreadNotifications();

  };

  // =========================

  // LOAD PROFILE

  // =========================

  const loadProfile = async () => {

    const {

      data: { user },

    } = await supabase.auth.getUser();

    if (!user) {

      navigate("/login");

      return;

    }

    setCurrentUserId(user.id);

    const { data, error } = await supabase

      .from("profiles")

      .select("*")

      .eq("id", user.id)

      .single();

    console.log("Logged in user:", user.id);

    console.log("Loaded profile:", data);

    if (error) {

      console.error("Profile loading error:", error.message);

      return;

    }

    setProfile(data);

  };

  // =========================

  // LOAD POSTS

  // =========================

  const loadPosts = async () => {

    const {

      data: { user },

    } = await supabase.auth.getUser();

    if (!user) {

      navigate("/login");

      return;

    }

    const { data: postsData, error: postsError } = await supabase

      .from("posts")

      .select(`

        id,

        content,

        post_type,

        created_at,

        user_id,

        profiles (

          name,

          username,

          profile_image_url

        )

      `)

      .order("created_at", { ascending: false });

    if (postsError) {

      console.error("Posts loading error:", postsError.message);

      return;

    }

    const { data: likesData, error: likesError } = await supabase

      .from("post_likes")

      .select("post_id, user_id");

    if (likesError) {

      console.error("Likes loading error:", likesError.message);

    }

    const { data: sharesData, error: sharesError } = await supabase

      .from("post_shares")

      .select("post_id");

    if (sharesError) {

      console.error("Shares loading error:", sharesError.message);

    }

    const { data: mediaData, error: mediaError } = await supabase
      .from("post_media")
      .select("post_id, media_url, media_type");

    if (mediaError) {

      console.error("Post media loading error:", mediaError.message);

    }

    const { data: pollsData, error: pollsError } = await supabase
      .from("polls")
      .select(`
        id,
        post_id,
        question,
        poll_options (
          id,
          option_text,
          poll_votes (
            user_id
          )
        )
      `);

    if (pollsError) {
      console.error("Polls loading error:", pollsError.message);
    }

    const { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select(`
        id,
        post_id,
        title,
        description,
        event_date,
        start_time,
        end_time,
        location
      `);

    if (eventsError) {
      console.error("Events loading error:", eventsError.message);
    }

    const likes = likesData || [];

    const shares = sharesData || [];

    const media = mediaData || [];
    const polls = pollsData || [];
    const events = eventsData || [];

    const pollByPost = {};
    polls.forEach((poll) => {
      pollByPost[poll.post_id] = poll;
    });

    const eventByPost = {};
    events.forEach((event) => {
      eventByPost[event.post_id] = event;
    });

    const mediaByPost = {};

    media.forEach((item) => {

      if (!mediaByPost[item.post_id]) {

        mediaByPost[item.post_id] = [];

      }

      mediaByPost[item.post_id].push(item);

    });

    const updatedPosts = (postsData || []).map((post) => {

      const postLikes = likes.filter(

        (like) => like.post_id === post.id

      );

      const postShares = shares.filter(

        (share) => share.post_id === post.id

      );

      const userLiked = postLikes.some(

        (like) => like.user_id === user.id

      );

      return {

        ...post,

        media: mediaByPost[post.id] || [],

        poll: pollByPost[post.id] || null,

        event: eventByPost[post.id] || null,

        likeCount: postLikes.length,

        shareCount: postShares.length,

        likedByMe: userLiked,

      };

    });

    setPosts(updatedPosts);

    // Scroll to a shared post

    if (focusPostId) {

      const foundPost = updatedPosts.find(

        (post) => String(post.id) === String(focusPostId)

      );

      if (foundPost) {

        setTimeout(() => {

          document

            .getElementById(`post-${focusPostId}`)

            ?.scrollIntoView({

              behavior: "smooth",

              block: "center",

            });

        }, 300);

      }

    }

  };

  // =========================

  // LOAD COMMENTS

  // =========================

  const loadComments = async () => {

    const { data, error } = await supabase

      .from("comments")

      .select(`

        id,

        post_id,

        content,

        created_at,

        user_id,

        profiles (

          name,

          username,

          profile_image_url

        )

      `)

      .order("created_at", { ascending: true });

    if (error) {

      console.error("Comments loading error:", error.message);

      return;

    }

    const groupedComments = {};

    (data || []).forEach((comment) => {

      if (!groupedComments[comment.post_id]) {

        groupedComments[comment.post_id] = [];

      }

      groupedComments[comment.post_id].push(comment);

    });

    setComments(groupedComments);

  };

  // =========================

  // LOAD SAVED POSTS

  // =========================

  const loadSavedPosts = async () => {

    const {

      data: { user },

    } = await supabase.auth.getUser();

    if (!user) {

      navigate("/login");

      return;

    }

    const { data, error } = await supabase

      .from("saved_posts")

      .select("post_id")

      .eq("user_id", user.id);

    if (error) {

      console.error("Saved posts loading error:", error.message);

      return;

    }

    const saved = {};

    (data || []).forEach((item) => {

      saved[item.post_id] = true;

    });

    setSavedPosts(saved);

  };

  const loadSuggestions = async () => {

    const {

      data: { user },

    } = await supabase.auth.getUser();

    if (!user) {

      navigate("/login");

      return;

    }

    // Get the people I am already following

    const { data: followingData, error: followingError } =

      await supabase

        .from("followers")

        .select("following_id")

        .eq("follower_id", user.id);

    if (followingError) {

      console.error(

        "Following list error:",

        followingError.message

      );

    }

    const followingIds = (followingData || []).map(

      (item) => item.following_id

    );

    // Get all profiles except my own

    const { data, error } = await supabase

      .from("profiles")

      .select(`

        id,

        name,

        username,

        profile_image_url,

        college,

        department

      `)

      .neq("id", user.id)

      .order("created_at", { ascending: false })

      .limit(20);

    if (error) {

      console.error(

        "Suggestions loading error:",

        error.message

      );

      return;

    }

    // Remove people I already follow

    const excludedIds = new Set([

      user.id,

      ...followingIds,

    ]);

    const filteredSuggestions = (data || [])

      .filter((person) => !excludedIds.has(person.id))

      .slice(0, 6);

    setSuggestions(filteredSuggestions);

  };

  const loadUnreadMessages = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const {
      data: memberships,
      error: membershipError,
    } = await supabase
      .from("conversation_members")
      .select(
        "conversation_id, last_read_at"
      )
      .eq("user_id", user.id);

    if (membershipError) {
      console.error(
        "Unread membership error:",
        membershipError.message
      );
      return;
    }

    if (!memberships || memberships.length === 0) {
      setUnreadMessages(0);
      return;
    }

    const conversationIds =
      memberships.map(
        (item) => item.conversation_id
      );

    const {
      data: messageRows,
      error: messageError,
    } = await supabase
      .from("messages")
      .select(
        "conversation_id, sender_id, created_at"
      )
      .in(
        "conversation_id",
        conversationIds
      )
      .neq("sender_id", user.id);

    if (messageError) {
      console.error(
        "Unread messages error:",
        messageError.message
      );
      return;
    }

    let totalUnread = 0;

    (messageRows || []).forEach(
      (message) => {
        const membership =
          memberships.find(
            (item) =>
              item.conversation_id ===
              message.conversation_id
          );

        if (!membership) {
          return;
        }

        const lastRead =
          membership.last_read_at
            ? new Date(
                membership.last_read_at
              ).getTime()
            : 0;

        const messageTime = new Date(
          message.created_at
        ).getTime();

        if (messageTime > lastRead) {
          totalUnread++;
        }
      }
    );

    setUnreadMessages(totalUnread);
  };

  const loadUnreadNotifications = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error(
        "Unread notifications error:",
        error.message
      );
      return;
    }

    setUnreadNotifications(count || 0);
  };

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`dashboard-notifications-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          loadUnreadNotifications();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          loadUnreadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const handleFollowSuggestion = async (person) => {

    const {

      data: { user },

    } = await supabase.auth.getUser();

    if (!user) {

      navigate("/login");

      return;

    }

    const { error } = await supabase

      .from("followers")

      .insert({

        follower_id: user.id,

        following_id: person.id,

      });

    if (error) {

      // Already following this person

      if (error.code === "23505") {

        setSuggestions((prev) =>

          prev.filter((item) => item.id !== person.id)

        );

        return;

      }

      console.error(

        "Suggestion follow error:",

        error.message

      );

      setMessage(error.message);

      return;

    }

    // Remove the person from suggestions

    setSuggestions((prev) =>

      prev.filter((item) => item.id !== person.id)

    );

    setMessage(

      `You are now following @${person.username} ✅`

    );

    setTimeout(() => {

      setMessage("");

    }, 2500);

  };

  // =========================
  // CREATE POST
  // =========================

  const clearSelectedMedia = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }

    setSelectedMedia(null);
    setMediaPreview("");
    setMediaType("");
  };

  const resetPoll = () => {
    setPollMode(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
  };

  const resetEvent = () => {
    setEventMode(false);
    setEventTitle("");
    setEventDate("");
    setEventStartTime("");
    setEventEndTime("");
    setEventLocation("");
  };

  const openEventCreator = () => {
    clearSelectedMedia();
    resetPoll();
    setEventMode((prev) => !prev);
    setMessage("");
  };

  const formatEventDate = (dateString) => {
    if (!dateString) return "";
    return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatEventTime = (timeString) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":").map(Number);
    const suffix = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
  };

  const selectMedia = (file, type) => {
    if (!file) {
      return;
    }

    resetPoll();
    resetEvent();

    if (type === "image") {
      if (!file.type.startsWith("image/")) {
        setMessage("Please select an image file.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setMessage("Image must be smaller than 5MB.");
        return;
      }
    }

    if (type === "video") {
      if (!file.type.startsWith("video/")) {
        setMessage("Please select a video file.");
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        setMessage("Video must be smaller than 50MB.");
        return;
      }
    }

    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }

    setSelectedMedia(file);
    setMediaType(type);
    setMediaPreview(URL.createObjectURL(file));
    setMessage("");
  };

  const handleImageSelect = (e) => {
    selectMedia(e.target.files?.[0], "image");
    e.target.value = "";
  };

  const handleVideoSelect = (e) => {
    selectMedia(e.target.files?.[0], "video");
    e.target.value = "";
  };

  const openPollCreator = () => {
    clearSelectedMedia();
    resetEvent();
    setPollMode((prev) => !prev);
    setMessage("");
  };

  const updatePollOption = (index, value) => {
    setPollOptions((prev) =>
      prev.map((option, i) => (i === index ? value : option))
    );
  };

  const addPollOption = () => {
    if (pollOptions.length >= 6) {
      setMessage("You can add up to 6 poll options.");
      return;
    }

    setPollOptions((prev) => [...prev, ""]);
    setMessage("");
  };

  const removePollOption = (index) => {
    if (pollOptions.length <= 2) {
      setMessage("A poll needs at least 2 options.");
      return;
    }

    setPollOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVotePoll = async (pollId, optionId) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    const { error } = await supabase
      .from("poll_votes")
      .upsert(
        {
          poll_id: pollId,
          option_id: optionId,
          user_id: user.id,
        },
        { onConflict: "poll_id,user_id" }
      );

    if (error) {
      console.error("Poll vote error:", error.message);
      setMessage(error.message);
      return;
    }

    setMessage("Vote recorded ✅");
    await loadPosts();

    setTimeout(() => {
      setMessage("");
    }, 2000);
  };

  const handleCreatePost = async () => {
    const cleanPollOptions = pollOptions
      .map((option) => option.trim())
      .filter(Boolean);

    const uniquePollOptions = [...new Set(cleanPollOptions)];

    if (pollMode) {
      if (!pollQuestion.trim()) {
        setMessage("Please enter a poll question.");
        return;
      }

      if (uniquePollOptions.length < 2) {
        setMessage("Please add at least 2 different options.");
        return;
      }
    } else if (eventMode) {
      if (!eventTitle.trim()) {
        setMessage("Please enter an event title.");
        return;
      }

      if (!eventDate) {
        setMessage("Please select an event date.");
        return;
      }

      if (eventStartTime && eventEndTime && eventEndTime <= eventStartTime) {
        setMessage("Event end time must be after start time.");
        return;
      }
    } else if (!postContent.trim() && !selectedMedia) {
      setMessage("Write something or select a photo/video.");
      return;
    }

    setPosting(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      setPosting(false);
      return;
    }

    const postType = pollMode
      ? "poll"
      : eventMode
      ? "event"
      : selectedMedia
      ? mediaType
      : "text";

    const postContentValue = pollMode
      ? pollQuestion.trim()
      : eventMode
      ? eventTitle.trim()
      : postContent.trim();

    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        content: postContentValue,
        post_type: postType,
      })
      .select("id")
      .single();

    if (postError) {
      console.error("Create post error:", postError.message);
      setMessage(postError.message);
      setPosting(false);
      return;
    }

    if (pollMode) {
      const { data: poll, error: pollError } = await supabase
        .from("polls")
        .insert({
          post_id: post.id,
          question: pollQuestion.trim(),
        })
        .select("id")
        .single();

      if (pollError) {
        console.error("Create poll error:", pollError.message);
        await supabase
          .from("posts")
          .delete()
          .eq("id", post.id)
          .eq("user_id", user.id);
        setMessage(pollError.message);
        setPosting(false);
        return;
      }

      const { error: optionsError } = await supabase
        .from("poll_options")
        .insert(
          uniquePollOptions.map((option) => ({
            poll_id: poll.id,
            option_text: option,
          }))
        );

      if (optionsError) {
        console.error("Create poll options error:", optionsError.message);
        await supabase
          .from("posts")
          .delete()
          .eq("id", post.id)
          .eq("user_id", user.id);
        setMessage(optionsError.message);
        setPosting(false);
        return;
      }
    }

    if (eventMode) {
      const { error: eventError } = await supabase
        .from("events")
        .insert({
          post_id: post.id,
          title: eventTitle.trim(),
          description: postContent.trim() || null,
          event_date: eventDate,
          start_time: eventStartTime || null,
          end_time: eventEndTime || null,
          location: eventLocation.trim() || null,
        });

      if (eventError) {
        console.error("Create event error:", eventError.message);
        await supabase
          .from("posts")
          .delete()
          .eq("id", post.id)
          .eq("user_id", user.id);
        setMessage(eventError.message);
        setPosting(false);
        return;
      }
    }

    if (selectedMedia) {
      const fileExt =
        selectedMedia.name.split(".").pop()?.toLowerCase() ||
        (mediaType === "video" ? "mp4" : "jpg");

      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(filePath, selectedMedia);

      if (uploadError) {
        console.error("Media upload error:", uploadError.message);
        await supabase
          .from("posts")
          .delete()
          .eq("id", post.id)
          .eq("user_id", user.id);
        setMessage(uploadError.message);
        setPosting(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("post-media")
        .getPublicUrl(filePath);

      const { error: mediaError } = await supabase
        .from("post_media")
        .insert({
          post_id: post.id,
          media_url: publicUrl,
          media_type: mediaType,
        });

      if (mediaError) {
        console.error("Post media error:", mediaError.message);
        setMessage(mediaError.message);
        setPosting(false);
        return;
      }
    }

    setPostContent("");
    clearSelectedMedia();
    resetPoll();
    resetEvent();
    setMessage(
      pollMode
        ? "Poll created successfully! ✅"
        : eventMode
        ? "Event created successfully! ✅"
        : "Post created successfully! ✅"
    );

    await loadPosts();

    setPosting(false);

    setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  // =========================

  // LIKE / UNLIKE

  // =========================

  const handleLike = async (post) => {

    const {

      data: { user },

    } = await supabase.auth.getUser();

    if (!user) {

      navigate("/login");

      return;

    }

    if (post.likedByMe) {

      const { error } = await supabase

        .from("post_likes")

        .delete()

        .eq("post_id", post.id)

        .eq("user_id", user.id);

      if (error) {

        console.error("Unlike error:", error.message);

        return;

      }

    } else {

      const { error } = await supabase

        .from("post_likes")

        .insert({

          post_id: post.id,

          user_id: user.id,

        });

      if (error) {

        console.error("Like error:", error.message);

        return;

      }

    }

    await loadPosts();

  };

  // =========================

  // ADD COMMENT

  // =========================

  const handleAddComment = async (postId) => {

    const text = commentText[postId]?.trim();

    if (!text) {

      return;

    }

    const {

      data: { user },

    } = await supabase.auth.getUser();

    if (!user) {

      navigate("/login");

      return;

    }

    const { error } = await supabase

      .from("comments")

      .insert({

        post_id: postId,

        user_id: user.id,

        content: text,

      });

    if (error) {

      console.error("Comment error:", error.message);

      return;

    }

    setCommentText((prev) => ({

      ...prev,

      [postId]: "",

    }));

    await loadComments();

  };

  // =========================

  // SAVE / UNSAVE POST

  // =========================

  const handleSavePost = async (postId) => {

    const {

      data: { user },

    } = await supabase.auth.getUser();

    if (!user) {

      navigate("/login");

      return;

    }

    if (savedPosts[postId]) {

      const { error } = await supabase

        .from("saved_posts")

        .delete()

        .eq("post_id", postId)

        .eq("user_id", user.id);

      if (error) {

        console.error("Unsave error:", error.message);

        return;

      }

      setSavedPosts((prev) => {

        const updated = { ...prev };

        delete updated[postId];

        return updated;

      });

      return;

    }

    const { error } = await supabase

      .from("saved_posts")

      .insert({

        post_id: postId,

        user_id: user.id,

      });

    if (error) {

      console.error("Save error:", error.message);

      return;

    }

    setSavedPosts((prev) => ({

      ...prev,

      [postId]: true,

    }));

  };

  // =========================

  // EDIT POST

  // =========================

  const startEditPost = (post) => {

    setEditingPostId(post.id);

    setEditingContent(post.content);

  };

  const cancelEditPost = () => {

    setEditingPostId(null);

    setEditingContent("");

  };

  const handleUpdatePost = async (postId) => {

    if (!editingContent.trim()) {

      setMessage("Post cannot be empty.");

      return;

    }

    const {

      data: { user },

    } = await supabase.auth.getUser();

    if (!user) {

      navigate("/login");

      return;

    }

    const { error } = await supabase

      .from("posts")

      .update({

        content: editingContent.trim(),

      })

      .eq("id", postId)

      .eq("user_id", user.id);

    if (error) {

      console.error("Update post error:", error.message);

      setMessage(error.message);

      return;

    }

    setEditingPostId(null);

    setEditingContent("");

    setMessage("Post updated successfully! ✅");

    await loadPosts();

    setTimeout(() => {

      setMessage("");

    }, 2500);

  };

  // =========================

  // DELETE POST

  // =========================

  const handleDeletePost = async (postId) => {

    const confirmDelete = window.confirm(

      "Are you sure you want to delete this post?"

    );

    if (!confirmDelete) {

      return;

    }

    const {

      data: { user },

    } = await supabase.auth.getUser();

    if (!user) {

      navigate("/login");

      return;

    }

    const { error } = await supabase

      .from("posts")

      .delete()

      .eq("id", postId)

      .eq("user_id", user.id);

    if (error) {

      console.error("Delete post error:", error.message);

      setMessage(error.message);

      return;

    }

    setMessage("Post deleted successfully! ✅");

    await loadPosts();

    await loadComments();

    await loadSavedPosts();

    setTimeout(() => {

      setMessage("");

    }, 2500);

  };

  // =========================

  // SHARE POST

  // =========================

  const handleShare = async (post) => {

    const {

      data: { user },

    } = await supabase.auth.getUser();

    if (!user) {

      navigate("/login");

      return;

    }

    const shareUrl = `${window.location.origin}/dashboard?post=${post.id}`;

    try {

      if (navigator.share) {

        await navigator.share({

          title: "CampusConnect Post",

          text: post.content,

          url: shareUrl,

        });

      } else {

        const whatsappText = encodeURIComponent(

          `${post.content}\n\n${shareUrl}`

        );

        window.open(

          `https://wa.me/?text=${whatsappText}`,

          "_blank"

        );

      }

    } catch (error) {

      console.log("Share cancelled.");

      return;

    }

    const { error } = await supabase

      .from("post_shares")

      .insert({

        post_id: post.id,

        user_id: user.id,

      });

    if (error) {

      console.error("Share database error:", error.message);

      return;

    }

    await loadPosts();

  };

  // =========================

  // SEARCH

  // =========================

  const handleSearch = (e) => {

    e.preventDefault();

    if (!searchText.trim()) {

      navigate("/explore");

      return;

    }

    navigate(

      `/explore?q=${encodeURIComponent(searchText.trim())}`

    );

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

          <div className="brand-logo">🎓</div>

          <h2>CampusConnect</h2>

        </div>

        <nav className="sidebar-nav">

          <button

            className="nav-item active"

            type="button"

            onClick={() => navigate("/dashboard")}

          >

            🏠

            <span>Home</span>

          </button>

          <button

            className="nav-item"

            type="button"

            onClick={() => navigate("/explore")}

          >

            🔍

            <span>Explore</span>

          </button>

          <button

            className="nav-item"

            type="button"

            onClick={() => navigate("/communities")}

          >

            👥

            <span>Communities</span>

          </button>

          <button

            className="nav-item"

            type="button"

            onClick={() => navigate("/messages")}

          >

            💬

            <span>Messages</span>

            {unreadMessages > 0 && (
              <span
                style={{
                  marginLeft: "auto",
                  minWidth: "20px",
                  height: "20px",
                  padding: "0 6px",
                  borderRadius: "999px",
                  background: "#2563eb",
                  color: "white",
                  fontSize: "11px",
                  fontWeight: "700",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {unreadMessages > 99
                  ? "99+"
                  : unreadMessages}
              </span>
            )}

          </button>

          <button

            className="nav-item"

            type="button"

            onClick={() => navigate("/notifications")}

          >

            🔔

            <span>Notifications</span>

            {unreadNotifications > 0 && (
              <span
                style={{
                  marginLeft: "auto",
                  minWidth: "20px",
                  height: "20px",
                  padding: "0 6px",
                  borderRadius: "999px",
                  background: "#2563eb",
                  color: "white",
                  fontSize: "11px",
                  fontWeight: "700",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            )}

          </button>

          <button

            className="nav-item"

            type="button"

            onClick={() => navigate("/events")}

          >

            📅

            <span>Events</span>

          </button>

          <button

            className="nav-item"

            type="button"

            onClick={() => navigate("/profile")}

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

                setSearchText(e.target.value)

              }

            />

          </form>

          <div className="topbar-actions">

            <button

              type="button"

              onClick={() => navigate("/notifications")}

              style={{
                position: "relative",
              }}

            >

              🔔

              {unreadNotifications > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    minWidth: "18px",
                    height: "18px",
                    padding: "0 4px",
                    borderRadius: "999px",
                    background: "#2563eb",
                    color: "white",
                    fontSize: "10px",
                    fontWeight: "700",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}

            </button>

            <button

              className="mini-profile"

              type="button"

              onClick={() => navigate("/profile")}

            >

              <div className="avatar">

                <AvatarContent profile={profile} alt={profile?.name || "Profile"} />

              </div>

              <span>

                {profile?.name || "Student"}

              </span>

            </button>

          </div>

        </header>

        {/* CONTENT */}

        <div className="content-wrapper">

          {/* WELCOME */}

          <section className="welcome-card">

            <div>

              <p className="welcome-small">

                Welcome back 👋

              </p>

              <h1>

                {profile?.name || "Student"}

              </h1>

              <p className="welcome-description">

                Stay connected with your campus community.

              </p>

            </div>

            <div className="welcome-icon">

              🎓

            </div>

          </section>

          {message && (

            <p className="register-message">

              {message}

            </p>

          )}

          <div className="dashboard-grid">

            {/* FEED */}

            <section className="feed">

              {/* CREATE POST */}

              <div className="create-post card">

                <div className="post-user">

                  <div className="avatar large">

                    <AvatarContent profile={profile} alt={profile?.name || "Profile"} />

                  </div>

                  <input

                    type="text"

                    placeholder="What's happening on your campus?"

                    value={postContent}

                    onChange={(e) =>

                      setPostContent(e.target.value)

                    }

                    onKeyDown={(e) => {

                      if (e.key === "Enter") {

                        handleCreatePost();

                      }

                    }}

                  />

                </div>

                <div className="post-actions">

                  <label

                    htmlFor="post-image-upload"

                    className="post-action-button"

                  >

                    🖼️ Photo

                  </label>

                  <input

                    id="post-image-upload"

                    type="file"

                    accept="image/*"

                    onChange={handleImageSelect}

                    style={{ display: "none" }}

                  />

                  <label
                    htmlFor="post-video-upload"
                    className="post-action-button"
                  >
                    🎥 Video
                  </label>

                  <input
                    id="post-video-upload"
                    type="file"
                    accept="video/*"
                    onChange={handleVideoSelect}
                    style={{ display: "none" }}
                  />

                  <button
                    type="button"
                    className="post-action-button"
                    onClick={openPollCreator}
                  >
                    📊 Poll
                  </button>

                  <button
                    type="button"
                    className="post-action-button"
                    onClick={openEventCreator}
                  >
                    📅 Event
                  </button>

                  <button

                    className="post-button"

                    type="button"

                    onClick={handleCreatePost}

                    disabled={posting}

                  >

                    {posting
                      ? "Posting..."
                      : pollMode
                      ? "Create Poll"
                      : eventMode
                      ? "Create Event"
                      : "Create Post"}

                  </button>

                </div>

                {pollMode && (
                  <div
                    style={{
                      marginTop: "15px",
                      padding: "16px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      background: "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <strong>Create Poll</strong>
                      <button
                        type="button"
                        onClick={resetPoll}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Ask a question..."
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      style={{
                        width: "100%",
                        marginBottom: "10px",
                        padding: "10px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        boxSizing: "border-box",
                      }}
                    />

                    {pollOptions.map((option, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          gap: "8px",
                          marginBottom: "8px",
                        }}
                      >
                        <input
                          type="text"
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) =>
                            updatePollOption(index, e.target.value)
                          }
                          style={{
                            flex: 1,
                            padding: "10px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                          }}
                        />
                        {pollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removePollOption(index)}
                            style={{
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                            }}
                            title="Remove option"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}

                    {pollOptions.length < 6 && (
                      <button
                        type="button"
                        onClick={addPollOption}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#2563eb",
                          cursor: "pointer",
                          padding: "4px 0",
                        }}
                      >
                        + Add option
                      </button>
                    )}
                  </div>
                )}

                {eventMode && (
                  <div style={{ marginTop: "15px", padding: "16px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#f8fafc" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <strong>Create Event</strong>
                      <button type="button" onClick={resetEvent} style={{ border: "none", background: "transparent", cursor: "pointer" }}>✕</button>
                    </div>
                    <input type="text" placeholder="Event title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} style={{ width: "100%", marginBottom: "10px", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", boxSizing: "border-box" }} />
                    <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={{ width: "100%", marginBottom: "10px", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", boxSizing: "border-box" }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                      <input type="time" value={eventStartTime} onChange={(e) => setEventStartTime(e.target.value)} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", boxSizing: "border-box" }} />
                      <input type="time" value={eventEndTime} onChange={(e) => setEventEndTime(e.target.value)} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", boxSizing: "border-box" }} />
                    </div>
                    <input type="text" placeholder="Location (e.g. Seminar Hall)" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} style={{ width: "100%", marginBottom: "10px", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", boxSizing: "border-box" }} />
                    <textarea placeholder="Event description (optional)" value={postContent} onChange={(e) => setPostContent(e.target.value)} rows={3} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", boxSizing: "border-box", resize: "vertical" }} />
                  </div>
                )}

                {mediaPreview && (

                  <div
                    style={{
                      marginTop: "15px",
                      position: "relative",
                    }}
                  >
                    {mediaType === "video" ? (
                      <video
                        src={mediaPreview}
                        controls
                        style={{
                          width: "100%",
                          maxHeight: "300px",
                          borderRadius: "12px",
                          objectFit: "contain",
                          background: "#000",
                          display: "block",
                        }}
                      />
                    ) : (
                      <img
                        src={mediaPreview}
                        alt="Selected"
                        style={{
                          width: "100%",
                          maxHeight: "300px",
                          objectFit: "cover",
                          borderRadius: "12px",
                          display: "block",
                        }}
                      />
                    )}

                    <button
                      type="button"
                      onClick={clearSelectedMedia}
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        border: "none",
                        background: "rgba(0,0,0,0.7)",
                        color: "white",
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* POSTS */}

              {posts.length === 0 ? (

                <div className="card post">

                  <p className="post-text">

                    No posts yet. Be the first to

                    create a post! 🚀

                  </p>

                </div>

              ) : (

                posts.map((post) => (

                  <article

                    className="post card"

                    key={post.id}

                    id={`post-${post.id}`}

                  >

                    {/* POST HEADER */}

                    <div className="post-header">

                      <div className="post-author">

                        <button

                          className="avatar"

                          type="button"

                          onClick={() =>

                            navigate(

                              `/profile?username=${encodeURIComponent(

                                post.profiles?.username || ""

                              )}`

                            )

                          }

                        >

                          <AvatarContent profile={post.profiles} alt={post.profiles?.name || "Student"} />

                        </button>

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

                      {currentUserId === post.user_id && (

                        <div className="post-owner-actions">

                          <button

                            type="button"

                            className="edit-post-btn"

                            onClick={() =>

                              startEditPost(post)

                            }

                          >

                            ✏️ Edit

                          </button>

                          <button

                            type="button"

                            className="delete-post-btn"

                            onClick={() =>

                              handleDeletePost(post.id)

                            }

                          >

                            🗑️ Delete

                          </button>

                        </div>

                      )}

                    </div>

                    {/* POST CONTENT */}

                    {editingPostId === post.id ? (

                      <div className="post-edit-box">

                        <textarea

                          value={editingContent}

                          onChange={(e) =>

                            setEditingContent(

                              e.target.value

                            )

                          }

                          rows={5}

                        />

                        <div className="post-edit-actions">

                          <button

                            type="button"

                            className="save-edit-btn"

                            onClick={() =>

                              handleUpdatePost(post.id)

                            }

                          >

                            Save Changes

                          </button>

                          <button

                            type="button"

                            className="cancel-edit-btn"

                            onClick={cancelEditPost}

                          >

                            Cancel

                          </button>

                        </div>

                      </div>

                    ) : (

                      !post.event && (
                        <p className="post-text">
                          {post.content}
                        </p>
                      )

                    )}

                    {post.event && (
                      <div style={{ marginTop: "16px", padding: "18px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#ffffff" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                          <div style={{ width: "50px", height: "50px", borderRadius: "10px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>📅</div>
                          <div>
                            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>CAMPUS EVENT</p>
                            <h4 style={{ margin: "3px 0 0", fontSize: "18px" }}>{post.event.title}</h4>
                          </div>
                        </div>
                        {post.event.description && <p style={{ margin: "0 0 12px", lineHeight: 1.5 }}>{post.event.description}</p>}
                        <div style={{ display: "grid", gap: "8px", fontSize: "14px", color: "#334155" }}>
                          <div>📅 {formatEventDate(post.event.event_date)}</div>
                          {(post.event.start_time || post.event.end_time) && (
                            <div>🕐 {formatEventTime(post.event.start_time)}{post.event.end_time ? ` - ${formatEventTime(post.event.end_time)}` : ""}</div>
                          )}
                          {post.event.location && <div>📍 {post.event.location}</div>}
                        </div>
                      </div>
                    )}

                    {/* POST MEDIA */}
                    {post.media?.length > 0 && (
                      <div
                        style={{
                          marginTop: "14px",
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
                                maxHeight: "600px",
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
                                maxHeight: "600px",
                                borderRadius: "12px",
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          )
                        )}
                      </div>
                    )}

                    {post.poll && (
                      <div
                        style={{
                          marginTop: "16px",
                          padding: "16px",
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          background: "#f8fafc",
                        }}
                      >
                        <h4
                          style={{
                            margin: "0 0 12px",
                            fontSize: "16px",
                          }}
                        >
                          {post.poll.question}
                        </h4>

                        {(() => {
                          const options = post.poll.poll_options || [];
                          const totalVotes = options.reduce(
                            (sum, option) =>
                              sum + (option.poll_votes?.length || 0),
                            0
                          );
                          const myVote = options.find((option) =>
                            option.poll_votes?.some(
                              (vote) => vote.user_id === currentUserId
                            )
                          );

                          return (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                              }}
                            >
                              {options.map((option) => {
                                const votes = option.poll_votes?.length || 0;
                                const percentage =
                                  totalVotes > 0
                                    ? Math.round((votes / totalVotes) * 100)
                                    : 0;

                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onClick={() =>
                                      handleVotePoll(
                                        post.poll.id,
                                        option.id
                                      )
                                    }
                                    style={{
                                      position: "relative",
                                      overflow: "hidden",
                                      textAlign: "left",
                                      padding: "12px",
                                      borderRadius: "8px",
                                      border: "1px solid #cbd5e1",
                                      background:
                                        myVote?.id === option.id
                                          ? "#eff6ff"
                                          : "#ffffff",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <span
                                      style={{
                                        position: "relative",
                                        zIndex: 1,
                                      }}
                                    >
                                      {option.option_text}
                                      <span
                                        style={{
                                          float: "right",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {percentage}%
                                      </span>
                                    </span>
                                    {totalVotes > 0 && (
                                      <span
                                        style={{
                                          position: "absolute",
                                          inset: 0,
                                          width: `${percentage}%`,
                                          background:
                                            "rgba(37, 99, 235, 0.08)",
                                        }}
                                      />
                                    )}
                                  </button>
                                );
                              })}
                              <small style={{ color: "#64748b" }}>
                                {totalVotes} {
                                  totalVotes === 1 ? "vote" : "votes"
                                }
                                {myVote ? " • You voted" : ""}
                              </small>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* STATS */}

                    <div className="post-stats">

                      <span>

                        ❤️ {post.likeCount} likes

                      </span>

                      <span>

                        💬{" "}

                        {comments[post.id]?.length || 0}

                        {" "}

                        comments

                      </span>

                      <span>

                        ↗️ {post.shareCount || 0} shares

                      </span>

                    </div>

                    {/* ACTIONS */}

                    <div className="post-buttons">

                      <button

                        type="button"

                        onClick={() =>

                          handleLike(post)

                        }

                        style={{

                          color: post.likedByMe

                            ? "#2563eb"

                            : undefined,

                          fontWeight: post.likedByMe

                            ? "700"

                            : undefined,

                        }}

                      >

                        {post.likedByMe

                          ? "💙 Liked"

                          : "❤️ Like"}

                      </button>

                      <button

                        type="button"

                        onClick={() => {

                          document

                            .getElementById(

                              `comment-${post.id}`

                            )

                            ?.focus();

                        }}

                      >

                        💬 Comment

                      </button>

                      <button

                        type="button"

                        onClick={() =>

                          handleShare(post)

                        }

                      >

                        ↗️ Share

                      </button>

                      <button

                        type="button"

                        onClick={() =>

                          handleSavePost(post.id)

                        }

                        style={{

                          color: savedPosts[post.id]

                            ? "#2563eb"

                            : undefined,

                          fontWeight: savedPosts[post.id]

                            ? "700"

                            : undefined,

                        }}

                      >

                        {savedPosts[post.id]

                          ? "🔖 Saved"

                          : "🔖 Save"}

                      </button>

                    </div>

                    {/* COMMENTS */}

                    <div className="comments-section">

                      {comments[post.id]?.map(

                        (comment) => (

                          <div

                            className="comment-item"

                            key={comment.id}

                          >

                            <button

                              className="avatar comment-avatar"

                              type="button"

                            >

                              <AvatarContent profile={comment.profiles} alt={comment.profiles?.name || "Student"} />

                            </button>

                            <div className="comment-content">

                              <strong>

                                {comment.profiles?.name ||

                                  "Student"}

                              </strong>

                              <span className="comment-username">

                                @

                                {comment.profiles?.username ||

                                  "student"}

                              </span>

                              <p>

                                {comment.content}

                              </p>

                            </div>

                          </div>

                        )

                      )}

                      {/* COMMENT INPUT */}

                      <div className="comment-input-row">

                        <div className="avatar comment-avatar">

                          <AvatarContent profile={profile} alt={profile?.name || "Profile"} />

                        </div>

                        <input

                          id={`comment-${post.id}`}

                          type="text"

                          placeholder="Write a comment..."

                          value={

                            commentText[post.id] || ""

                          }

                          onChange={(e) =>

                            setCommentText((prev) => ({

                              ...prev,

                              [post.id]:

                                e.target.value,

                            }))

                          }

                          onKeyDown={(e) => {

                            if (e.key === "Enter") {

                              handleAddComment(

                                post.id

                              );

                            }

                          }}

                        />

                        <button

                          type="button"

                          onClick={() =>

                            handleAddComment(post.id)

                          }

                        >

                          Send

                        </button>

                      </div>

                    </div>

                  </article>

                ))

              )}

            </section>

            {/* RIGHT SIDEBAR */}

            <aside className="right-sidebar">

              {/* PROFILE */}

              <div className="side-card profile-side-card">

                <div className="profile-cover"></div>

                <div className="profile-side-content">

                  <div className="avatar profile-avatar">

                    <AvatarContent profile={profile} alt={profile?.name || "Profile"} />

                  </div>

                  <h3>

                    {profile?.name || "Your Name"}

                  </h3>

                  <p>

                    @{profile?.username || "username"}

                  </p>

                  <p className="profile-college">

                    {profile?.college ||

                      "Your College"}

                  </p>

                  <button

                    className="view-profile-btn"

                    type="button"

                    onClick={() =>

                      navigate("/profile")

                    }

                  >

                    View Profile

                  </button>

                </div>

              </div>

              {/* EVENTS */}

              <div className="side-card">

                <div className="side-card-header">

                  <h3>

                    Upcoming Events

                  </h3>

                  <a href="#events">

                    View all

                  </a>

                </div>

                <div className="event-item">

                  <div className="event-date">

                    <strong>12</strong>

                    <span>OCT</span>

                  </div>

                  <div>

                    <h4>

                      Campus Hackathon

                    </h4>

                    <p>

                      10:00 AM • Seminar Hall

                    </p>

                  </div>

                </div>

                <div className="event-item">

                  <div className="event-date">

                    <strong>18</strong>

                    <span>OCT</span>

                  </div>

                  <div>

                    <h4>

                      Tech Meetup

                    </h4>

                    <p>

                      2:00 PM • Auditorium

                    </p>

                  </div>

                </div>

              </div>

              {/* SUGGESTIONS */}

              <div className="side-card">

                <div className="side-card-header">

                  <h3>

                    People You May Know

                  </h3>

                </div>

                {suggestions.length === 0 ? (

                  <p

                    style={{

                      color: "#94a3b8",

                      fontSize: "14px",

                      padding: "10px 0",

                    }}

                  >

                    No new people to suggest right now.

                  </p>

                ) : (

                  suggestions.map((person) => (

                    <div

                      className="suggestion"

                      key={person.id}

                    >

                      <button

                        className="avatar"

                        type="button"

                        onClick={() =>

                          navigate(

                            `/profile?username=${encodeURIComponent(

                              person.username

                            )}`

                          )

                        }

                      >

                        <AvatarContent profile={person} alt={person.name || "Student"} />

                      </button>

                      <div className="suggestion-info">

                        <h4>

                          {person.name || "Student"}

                        </h4>

                        <p>

                          {person.department ||

                            person.college ||

                            "Student"}

                        </p>

                        <small style={{ color: "#64748b" }}>

                          @{person.username}

                        </small>

                      </div>

                      <button

                        className="follow-btn"

                        type="button"

                        onClick={() =>

                          handleFollowSuggestion(person)

                        }

                      >

                        Follow

                      </button>

                    </div>

                  ))

                )}

              </div>

            </aside>

          </div>

        </div>

      </main>

    </div>

  );

}

export default Dashboard;