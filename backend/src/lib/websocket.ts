/**
 * WebSocket Module - Phase 3 + Phase 5
 * Centralized WebSocket server with broadcast + targeted messaging
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';

let wss: WebSocketServer | null = null;

// Phase 5: Track authenticated connections (userId -> Set of sockets)
const userSockets: Map<string, Set<WebSocket>> = new Map();

export interface WsEvent {
    type: string;
    payload: Record<string, unknown>;
    timestamp: string;
}

interface JwtPayload {
    userId: string;
    email: string;
    role: string;
}

/**
 * Initialize WebSocket server attached to HTTP server
 */
export function initWebSocket(server: Server): WebSocketServer {
    wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws, req) => {
        console.log('🔌 WebSocket client connected');

        let authenticatedUserId: string | null = null;

        // Phase 5: Try to authenticate via query param token
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const token = url.searchParams.get('token');

        if (token) {
            try {
                const secret = process.env.JWT_SECRET || 'courtbooking-jwt-secret';
                const decoded = jwt.verify(token, secret) as JwtPayload;
                authenticatedUserId = decoded.userId;

                // Register socket for this user
                if (!userSockets.has(authenticatedUserId)) {
                    userSockets.set(authenticatedUserId, new Set());
                }
                userSockets.get(authenticatedUserId)!.add(ws);

                console.log(`🔐 WebSocket authenticated for user: ${authenticatedUserId}`);
            } catch (err) {
                // Invalid token - keep as unauthenticated (legacy mode)
                console.log('🔓 WebSocket token invalid, using broadcast-only mode');
            }
        }

        // Send hello event on connect
        ws.send(JSON.stringify({
            type: 'hello',
            payload: {
                message: 'Connected to CourtBooking realtime',
                authenticated: !!authenticatedUserId,
            },
            timestamp: new Date().toISOString(),
        }));

        ws.on('close', () => {
            console.log('🔌 WebSocket client disconnected');

            // Phase 5: Remove from userSockets if authenticated
            if (authenticatedUserId) {
                const sockets = userSockets.get(authenticatedUserId);
                if (sockets) {
                    sockets.delete(ws);
                    if (sockets.size === 0) {
                        userSockets.delete(authenticatedUserId);
                    }
                }
            }
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    });

    console.log('🔌 WebSocket server initialized at /ws');
    return wss;
}

/**
 * Broadcast event to all connected clients
 */
export function broadcast(event: Omit<WsEvent, 'timestamp'>): void {
    if (!wss) {
        console.warn('WebSocket server not initialized');
        return;
    }

    const message = JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
    });

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });

    console.log(`📡 Broadcast: ${event.type}`, event.payload);
}

/**
 * Phase 5: Send event to a specific user (all their connected sockets)
 */
export function sendToUser(userId: string, event: Omit<WsEvent, 'timestamp'>): void {
    const sockets = userSockets.get(userId);

    if (!sockets || sockets.size === 0) {
        console.log(`📡 sendToUser: No active sockets for user ${userId}`);
        return;
    }

    const message = JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
    });

    sockets.forEach((socket) => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(message);
        }
    });

    console.log(`📡 sendToUser (${userId}): ${event.type}`, event.payload);
}

/**
 * Get WebSocket server instance
 */
export function getWss(): WebSocketServer | null {
    return wss;
}
