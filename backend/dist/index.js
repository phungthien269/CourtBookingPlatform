"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const ws_1 = require("ws");
const health_js_1 = __importDefault(require("./routes/health.js"));
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));
app.use(express_1.default.json());
// Routes
app.use('/api/health', health_js_1.default);
app.use('/api/auth', auth_js_1.default);
// Create HTTP server
const server = (0, http_1.createServer)(app);
// WebSocket setup
const wss = new ws_1.WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
    console.log('🔌 WebSocket client connected');
    // Send hello event on connect
    ws.send(JSON.stringify({
        type: 'hello',
        message: 'Connected to CourtBooking realtime',
        timestamp: new Date().toISOString(),
    }));
    ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
    });
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});
// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket available at ws://localhost:${PORT}/ws`);
});
//# sourceMappingURL=index.js.map