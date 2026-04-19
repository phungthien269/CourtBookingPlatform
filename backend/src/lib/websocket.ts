/**
 * WebSocket Module - Phase 3 + Phase 5
 * Centralized WebSocket server with broadcast + targeted messaging
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { appConfig } from './config.js';
import { logger } from './logger.js';

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
        logger.info({
            event: 'ws.client_connected',
            ip: req.socket.remoteAddress || null,
            userAgent: req.headers['user-agent'] || null,
        });

        let authenticatedUserId: string | null = null;

        // Phase 5: Try to authenticate via query param token
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const token = url.searchParams.get('token');

        if (token) {
            try {
                const decoded = jwt.verify(token, appConfig.jwtSecret) as JwtPayload;
                authenticatedUserId = decoded.userId;

                // Register socket for this user
                if (!userSockets.has(authenticatedUserId)) {
                    userSockets.set(authenticatedUserId, new Set());
                }
                userSockets.get(authenticatedUserId)!.add(ws);

                logger.info({
                    event: 'ws.client_authenticated',
                    userId: authenticatedUserId,
                });
            } catch (err) {
                logger.warn({
                    event: 'ws.invalid_token',
                    error: err,
                });
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
            logger.info({
                event: 'ws.client_disconnected',
                userId: authenticatedUserId,
            });

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
            logger.error({
                event: 'ws.client_error',
                userId: authenticatedUserId,
                error,
            });
        });
    });

    logger.info({
        event: 'ws.server_initialized',
        path: '/ws',
    });
    return wss;
}

/**
 * Broadcast event to all connected clients
 */
export function broadcast(event: Omit<WsEvent, 'timestamp'>): void {
    if (!wss) {
        logger.warn({
            event: 'ws.broadcast_skipped',
            reason: 'server_not_initialized',
            type: event.type,
        });
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

    logger.debug({
        event: 'ws.broadcast',
        type: event.type,
        payload: event.payload,
        clientCount: wss.clients.size,
    });
}

/**
 * Phase 5: Send event to a specific user (all their connected sockets)
 */
export function sendToUser(userId: string, event: Omit<WsEvent, 'timestamp'>): void {
    const sockets = userSockets.get(userId);

    if (!sockets || sockets.size === 0) {
        logger.debug({
            event: 'ws.send_to_user_skipped',
            userId,
            reason: 'no_active_sockets',
            type: event.type,
        });
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

    logger.debug({
        event: 'ws.send_to_user',
        userId,
        type: event.type,
        payload: event.payload,
        socketCount: sockets.size,
    });
}

/**
 * Get WebSocket server instance
 */
export function getWss(): WebSocketServer | null {
    return wss;
}
