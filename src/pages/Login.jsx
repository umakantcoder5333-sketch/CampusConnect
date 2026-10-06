import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Login successful!");

    setLoading(false);

    navigate("/dashboard");
  };

  return (
    <div className="register-page">
      <div className="register-card">

        <div className="register-header">
          <div className="logo-icon">🎓</div>

          <h1>Campus Connect</h1>

          <p>Welcome Back</p>
          <span>Login to your campus community</span>
        </div>

        <form className="register-form" onSubmit={handleLogin}>

          <div className="form-group">
            <label>Email Address</label>

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            className="register-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          {message && (
            <p className="register-message">
              {message}
            </p>
          )}

          <p className="login-link">
            Don't have an account?{" "}
            <a href="/register">Create Account</a>
          </p>

        </form>
      </div>
    </div>
  );
}

export default Login;