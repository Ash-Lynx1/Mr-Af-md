import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';

interface BotSession {
  sessionId: string;
  socket: any;
  qrCode ? : string;
  isConnected: boolean;
  userId: string;
}

const activeSessions = new Map < string,
  BotSession > ();

export async function createWhatsAppBot(sessionName: string, userId: string): Promise < {
  sessionId: string;
  qrCode ? : string;
} > {
  const sessionId = `${userId}-${sessionName}`;
  const authDir = path.join(process.cwd(), 'auth_sessions', sessionId);
  
  // Ensure auth directory exists
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  
  return new Promise((resolve, reject) => {
    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });
    
    let qrCodeGenerated = false;
    
    socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr && !qrCodeGenerated) {
        qrCodeGenerated = true;
        resolve({
          sessionId,
          qrCode: qr,
        });
      }
      
      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        
        console.log('Connection closed due to:', lastDisconnect?.error);
        
        if (shouldReconnect) {
          // Attempt to reconnect
          setTimeout(() => {
            createWhatsAppBot(sessionName, userId);
          }, 5000);
        } else {
          // Remove from active sessions
          activeSessions.delete(sessionId);
        }
      } else if (connection === 'open') {
        console.log('WhatsApp bot connected successfully for session:', sessionId);
        
        // Update session status
        const session = activeSessions.get(sessionId);
        if (session) {
          session.isConnected = true;
        }
      }
    });
    
    socket.ev.on('creds.update', saveCreds);
    
    // Store session
    activeSessions.set(sessionId, {
      sessionId,
      socket,
      isConnected: false,
      userId,
    });
    
    // If no QR code is generated within 10 seconds, reject
    setTimeout(() => {
      if (!qrCodeGenerated) {
        reject(new Error('Failed to generate QR code'));
      }
    }, 10000);
  });
}

export function getSessionStatus(sessionId: string): BotSession | undefined {
  return activeSessions.get(sessionId);
}

export function disconnectBot(sessionId: string): boolean {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.socket?.end();
    activeSessions.delete(sessionId);
    return true;
  }
  return false;
}

export function getActiveSessions(): BotSession[] {
  return Array.from(activeSessions.values());
}