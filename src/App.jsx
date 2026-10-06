import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Explore from "./pages/Explore";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Communities from "./pages/Communities";
import CommunityDetails from "./pages/CommunityDetails";
import Events from "./pages/Events";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/register" />} />

        <Route path="/register" element={<Register />} />

        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/profile" element={<Profile />} />

        <Route path="/explore" element={<Explore />} />

        <Route
          path="/notifications"
          element={<Notifications />}
        />

        <Route path="/messages" element={<Messages />} />

        <Route
          path="/communities"
          element={<Communities />}
        />

        <Route
          path="/communities/:id"
          element={<CommunityDetails />}
        />

        <Route path="/events" element={<Events />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;