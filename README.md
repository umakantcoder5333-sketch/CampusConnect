CampusConnect
A modern student community platform built to connect students, communities, and campus activities in one place.

<p align="center">
  <strong>Connect. Collaborate. Grow.</strong>
</p>

<p align="center">
  A full-stack-style campus networking MVP built with React and Supabase, featuring authentication, student profiles, social posts, communities, messaging, notifications, events, and real-time interactions.
</p>


✨ Features
Authentication & Profiles
- Student registration and login with Supabase Authentication
- Automatic profile creation after registration
- Student profile with name, username, college, department, year, bio, skills, and social links
- Profile image and cover image support
  
Social Feed
- Create and view posts
- Like, comment, reply, share, and save posts
- Post media support
- Poll support
- Real-time notifications for social activity

Communities
- Create campus communities
- Join and leave communities
- Community member management and visibility
- Community posts
- Announcements
- Questions & answers
- Community events
  
Messaging
- One-to-one conversations
- Real-time message delivery
- Online/offline presence
- Read/unread message state
- Message edit, delete, and reply
- File and media attachments
  
Notifications
- Follow notifications
- Like notifications
- Comment and reply notifications
- Share notifications
- Message notifications
- Real-time notification updates
- Mark one or all notifications as read
  
Events
- Campus/community event management and discovery
- Event information connected with communities
  
Backend & Data
- Supabase PostgreSQL database
- Row Level Security (RLS)
- Supabase Storage for media and documents
- Realtime database subscriptions
  
🛠️ Tech Stack
Layer	Technology
Frontend	React
Build Tool	Vite
Language	JavaScript (JSX)
Backend / BaaS	Supabase
Database	PostgreSQL
Authentication	Supabase Auth
Storage	Supabase Storage
Realtime	Supabase Realtime
Styling	CSS
Version Control	Git & GitHub


📁 Project Structure
CampusConnect/
├── public/
├── src/
│   ├── assets/
│   ├── lib/
│   │   └── supabase.js
│   ├── pages/
│   │   ├── Communities.jsx
│   │   ├── CommunityDetails.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Events.jsx
│   │   ├── Explore.jsx
│   │   ├── Login.jsx
│   │   ├── Messages.jsx
│   │   ├── Notifications.jsx
│   │   ├── Profile.jsx
│   │   └── Register.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── vite.config.js
🚀 Getting Started
Prerequisites
Make sure you have installed:
- Node.js 18+
- npm
- A Supabase project
1. Clone the repository
git clone https://github.com/umakantcoder5333-sketch/CampusConnect.git
cd CampusConnect
2. Install dependencies
npm install
3. Configure environment variables
Create a .env file in the project root:
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
Never commit .env to GitHub. The repository already ignores environment files through .gitignore.

4. Start the development server
npm run dev
The app will normally be available at:
http://localhost:5173
🔐 Security
CampusConnect uses Supabase security features including:
- Supabase Authentication
- Row Level Security (RLS)
- Private storage for sensitive verification documents
- Public storage buckets only for intended media assets
- Environment variables for client configuration
The Supabase publishable key is designed for client-side use, but database access is still controlled through authentication and RLS policies.

🎯 Project Goals
CampusConnect is designed around a simple idea: students should have one platform to discover people, communities, conversations, and campus activities without switching between multiple disconnected tools.
The project focuses on building practical product features while applying modern frontend, database, authentication, realtime, and security concepts.
🧭 Future Roadmap
Planned areas for future versions include:
- Smarter opportunity discovery
- Student skill exchange
- Campus problem reporting
- AI-powered campus assistance
- Live digital campus capabilities
- Further production hardening and deployment improvements
  
👨‍💻 Author
Umakant Sah
Computer Science & Engineering Student
CampusConnect is developed as a portfolio project focused on building real-world software engineering skills and a practical student-focused product.

📄 License
This project is currently intended as a personal/portfolio project. Add a formal open-source license when you are ready to define how others may use, modify, and distribute the code.

⭐ Support the Project
If you find CampusConnect interesting, consider giving the repository a ⭐ on GitHub and following the project as it evolves.
