import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import venueRouter from './routes/venue.js';
import courtRouter from './routes/court.js';
import bookingRouter from './routes/booking.js';
import managerRouter from './routes/manager.js';  // Phase 4
import reviewRouter from './routes/review.js';    // Phase 5
import chatRouter from './routes/chat.js';        // Phase 5
import { initWebSocket } from './lib/websocket.js';
import { startExpiryScheduler } from './scheduler/pendingExpiry.js';
import { startManagerConfirmTimeoutScheduler } from './scheduler/managerConfirmTimeout.js';  // Phase 4

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/venues', venueRouter);
app.use('/api/courts', courtRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/manager', managerRouter);  // Phase 4
app.use('/api', reviewRouter);           // Phase 5: /api/reviews, /api/venues/:id/reviews, /api/me/review-eligibility
app.use('/api/chat', chatRouter);        // Phase 5: /api/chat/threads, /api/chat/manager/inbox

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket (Phase 3)
initWebSocket(server);

// Start schedulers
startExpiryScheduler();                  // Phase 3: pending hold expiry
startManagerConfirmTimeoutScheduler();   // Phase 4: 1h manager timeout

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket available at ws://localhost:${PORT}/ws`);
});
