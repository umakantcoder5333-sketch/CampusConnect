import { useState } from "react";
import { supabase } from "../lib/supabase";

function Register() {
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    college: "",
    department: "",
    year: "",
    studentId: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    const name = form.name.trim();
    const username = form.username.trim().replace(/^@+/, "").toLowerCase();
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    const college = form.college.trim();
    const department = form.department.trim();
    const studentId = form.studentId.trim();
    const year = form.year ? Number(form.year) : null;

    if (!name) {
      setMessage("Full name is required.");
      return;
    }

    if (!username) {
      setMessage("Username is required.");
      return;
    }

    if (!/^[a-z0-9._-]+$/.test(username)) {
      setMessage(
        "Username can contain only letters, numbers, dot, underscore and hyphen."
      );
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== form.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data: existingUsername, error: usernameCheckError } =
        await supabase
          .from("profiles")
          .select("id")
          .eq("username", username)
          .maybeSingle();

      if (usernameCheckError) {
        console.error("Username check error:", usernameCheckError);
        setMessage(usernameCheckError.message);
        return;
      }

      if (existingUsername) {
        setMessage(`@${username} is already taken.`);
        return;
      }

      if (studentId) {
        const { data: existingStudentId, error: studentIdCheckError } =
          await supabase
            .from("profiles")
            .select("id")
            .eq("student_id", studentId)
            .maybeSingle();

        if (studentIdCheckError) {
          console.error("Student ID check error:", studentIdCheckError);
          setMessage(studentIdCheckError.message);
          return;
        }

        if (existingStudentId) {
          setMessage("That Student ID is already registered.");
          return;
        }
      }

      // Profile data is saved in Auth metadata and copied into public.profiles
      // by the database trigger after auth.users is created.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            username,
            college: college || null,
            department: department || null,
            year,
            student_id: studentId || null,
          },
        },
      });

      if (error) {
        console.error("Registration error:", error);
        setMessage(error.message);
        return;
      }

      if (!data?.user) {
        setMessage("Registration could not be completed.");
        return;
      }

      setMessage(
        data.session
          ? "Registration successful! You can now log in. ✅"
          : "Registration successful! Check your email for verification. ✅"
      );

      setForm({
        name: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        college: "",
        department: "",
        year: "",
        studentId: "",
      });
    } catch (error) {
      console.error("Unexpected registration error:", error);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-header">
          <div className="logo-icon">🎓</div>
          <h1>Campus Connect</h1>
          <p>Create Your Account</p>
          <span>Join your campus community</span>
        </div>

        <form className="register-form" onSubmit={handleRegister}>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="Umakant Sah"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                name="username"
                placeholder="@username"
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group full-width">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="Create password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group full-width">
              <label>College</label>
              <input
                type="text"
                name="college"
                placeholder="Your college name"
                value={form.college}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                name="department"
                placeholder="Computer Science"
                value={form.department}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Year</label>
              <select
                name="year"
                value={form.year}
                onChange={handleChange}
              >
                <option value="">Select year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Student ID</label>
              <input
                type="text"
                name="studentId"
                placeholder="Enter your student ID"
                value={form.studentId}
                onChange={handleChange}
              />
            </div>
          </div>

          <label className="terms">
            <input type="checkbox" required />
            <span>I agree to the Terms &amp; Conditions</span>
          </label>

          <button
            className="register-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          {message && (
            <p className="register-message">{message}</p>
          )}

          <p className="login-link">
            Already have an account? <a href="/login">Login</a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;
