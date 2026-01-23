# RUSwiping

A mobile app for Rutgers students to share dining hall meal swipes via guest swipes. Students with extra swipes can offer them, and students who need swipes can request them. The app automatically matches users and provides in-app chat for coordination.

## Features

- **Google OAuth** with @rutgers.edu email verification
- **Swipe Offers** - Post when you can give a swipe at a specific dining hall
- **Swipe Requests** - Request a swipe when you need one
- **Auto-Matching** - Automatically pairs givers with receivers at the same dining hall
- **Real-time Chat** - Coordinate meetups via in-app messaging
- **Push Notifications** - Get notified instantly when matched

## Tech Stack

### Backend

- Express.js + TypeScript
- PostgreSQL via Supabase
- Docker containerization
- Expo Push Notifications

### Frontend

- React Native + Expo
- Supabase Realtime for chat
- Google Sign-In

## Project Structure

```
RUSwiping/
├── backend/          # Express.js API server
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       └── types/
├── frontend/         # React Native Expo app
│   └── app/
│       ├── (tabs)/
│       └── chat/
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase account
- Google Cloud Console project with OAuth credentials
- Expo account (for push notifications)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env  # Fill in your credentials
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env  # Fill in your credentials
npx expo start
```

## Environment Variables

See `.env.example` files in both `backend/` and `frontend/` directories.

## License

MIT
