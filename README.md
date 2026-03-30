# CourtBooking Platform (Pickleball & Badminton)

## Project Overview
CourtBooking is a comprehensive marketplace web application designed for booking sports courts (specifically Badminton and Pickleball). The platform connects sports players ("Users") with court owners ("Managers") through a centralized system.

## Key Features

### 🏸 For Users
- **Map & Search**: View available courts near you on an interactive map. Search by sports type or location.
- **Hourly Booking**: Book courts by the hour with real-time slot availability.
- **Real-time Updates**: Live updates on court availability using WebSockets to prevent double-booking.
- **Manual Payment Workflow**: Supports payment via cash or manual bank transfer (VietQR).
- **Booking Management**: View booking history and cancel bookings (with condition >2 hours prior to playtime).

### 🏢 For Managers
- **Court Management**: Add, configure, and manage court layouts, availability schedules, and pricing.
- **Booking Dashboard**: View daily and weekly timelines of court reservations.
- **Order Confirmations**: Review and approve manual payments (cash/transfer).
- **Financial Stats**: View statistics and actionable revenue reports.

### 🛡️ For Admins
- **Platform Management**: Approve/reject manager venues and suspend malicious accounts.
- **Audit Logs**: Maintain a secure log of all activities and booking disputes.

## Tech Stack

### Frontend
- **Framework**: React 18, Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Maps**: Leaflet + `react-leaflet`
- **Routing**: React Router DOM
- **Icons**: Lucide React

### Backend
- **Framework**: Node.js, Express
- **Language**: TypeScript
- **Database / ORM**: PostgreSQL, Prisma
- **Real-time Engine**: WebSocket (`ws`)
- **Validation**: Zod
- **Authentication**: JWT & `bcryptjs`

## Getting Started

### Prerequisites
- Node.js (v18+)
- Docker (for the local PostgreSQL instance)

### 1. Database Setup
Start the local PostgreSQL database using Docker Compose from the root directory:
```bash
docker compose up -d
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

*Note: The backend will run on `http://localhost:3000` by default. Seeding includes test accounts.*

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

*Note: The frontend will run on `http://localhost:5173` by default.*

## Demo Credentials (from db:seed)
- **Admin**: `admin@courtbooking.vn` / `Admin@123`
- **Manager**: `manager1@courtbooking.vn` / `Manager@123`
- **User**: `user@courtbooking.vn` / `User@123`

## Business Logic Highlights
- Slots are booked on the hour boundaries (e.g., 7:00, 8:00, no halves or quarters).
- Sessions must be between 1 and 4 hours long.
- **Pending Payment Hold**: Checking out holds a slot for exactly 5 minutes. If no payment action is taken, the slot is released.
- **Auto Cancellation**: If the manager does not confirm an order within 1 hour, it falls back to an automatic cancellation.
- **User Cancellation**: Users can cancel only if there are >2 hours remaining before the scheduled playtime.
