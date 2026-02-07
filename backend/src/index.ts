import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import venueRouter from './routes/venue.js';
import courtRouter from './routes/court.js';
import bookingRouter from './routes/booking.js';
import { initWebSocket } from './lib/websocket.js';
import { startExpiryScheduler } from './scheduler/pendingExpiry.js';

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

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket (Phase 3)
initWebSocket(server);

// Start pending expiry scheduler (Phase 3)
startExpiryScheduler();

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket available at ws://localhost:${PORT}/ws`);
});

