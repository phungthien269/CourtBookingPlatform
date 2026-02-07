/**
 * WebSocket Module - Phase 3
 * Centralized WebSocket server with broadcast capability
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

let wss: WebSocketServer | null = null;

export interface WsEvent {
    type: string;
    payload: Record<string, unknown>;
    timestamp: string;
}

/**
 * Initialize WebSocket server attached to HTTP server
 */
export function initWebSocket(server: Server): WebSocketServer {
    wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws) => {
        console.log('🔌 WebSocket client connected');

        // Send hello event on connect
        ws.send(JSON.stringify({
            type: 'hello',
            payload: { message: 'Connected to CourtBooking realtime' },
            timestamp: new Date().toISOString(),
        }));

        ws.on('close', () => {
            console.log('🔌 WebSocket client disconnected');
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
 * Get WebSocket server instance
 */
export function getWss(): WebSocketServer | null {
    return wss;
}
