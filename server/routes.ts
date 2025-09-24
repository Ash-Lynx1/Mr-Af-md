import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertDeploymentSchema, insertCoinTransferSchema } from "@shared/schema";
import * as whatsappService from "./services/whatsapp";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  // Coin collection endpoint
  app.post("/api/collect-coins", requireAuth, async (req, res, next) => {
    try {
      const user = req.user!;
      const now = new Date();
      
      // Check if user can collect coins (24 hour cooldown)
      if (user.lastCoinCollection) {
        const timeDiff = now.getTime() - new Date(user.lastCoinCollection).getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          return res.status(400).json({ 
            message: "You can only collect coins once every 24 hours",
            nextCollection: new Date(new Date(user.lastCoinCollection).getTime() + 24 * 60 * 60 * 1000)
          });
        }
      }

      const updatedUser = await storage.updateUser(user.id, {
        coins: user.coins + 20,
        lastCoinCollection: now,
      });

      res.json({ 
        message: "Successfully collected 20 coins!",
        user: updatedUser 
      });
    } catch (error) {
      next(error);
    }
  });

  // Deploy bot endpoint
  app.post("/api/deploy-bot", requireAuth, async (req, res, next) => {
    try {
      const user = req.user!;
      
      if (user.coins < 10) {
        return res.status(400).json({ message: "Insufficient coins. You need 10 coins to deploy a bot." });
      }

      const validatedData = insertDeploymentSchema.parse(req.body);
      
      // Deduct coins
      await storage.updateUser(user.id, {
        coins: user.coins - 10,
      });

      // Create deployment record
      const deployment = await storage.createDeployment({
        ...validatedData,
        userId: user.id,
        status: "deploying",
      });

      // Start WhatsApp bot
      try {
        const botSession = await whatsappService.createWhatsAppBot(
          validatedData.sessionName || `bot-${deployment.id}`,
          user.id
        );

        // Update deployment with session info
        await storage.updateDeployment(deployment.id, {
          status: "pairing",
          sessionName: botSession.sessionId,
        });

        res.json({
          deployment,
          qrCode: botSession.qrCode,
          sessionId: botSession.sessionId,
        });
      } catch (error) {
        // If bot creation fails, refund coins and mark deployment as failed
        await storage.updateUser(user.id, {
          coins: user.coins, // Restore original coins
        });
        
        await storage.updateDeployment(deployment.id, {
          status: "failed",
        });

        throw error;
      }
    } catch (error) {
      next(error);
    }
  });

  // Get user's deployments
  app.get("/api/deployments", requireAuth, async (req, res, next) => {
    try {
      const deployments = await storage.getDeploymentsByUserId(req.user!.id);
      res.json(deployments);
    } catch (error) {
      next(error);
    }
  });

  // Transfer coins endpoint
  app.post("/api/transfer-coins", requireAuth, async (req, res, next) => {
    try {
      const fromUser = req.user!;
      const { recipientEmail, amount, message } = insertCoinTransferSchema.parse(req.body);
      
      if (amount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" });
      }

      if (fromUser.coins < amount) {
        return res.status(400).json({ message: "Insufficient coins" });
      }

      // Find recipient
      const toUser = await storage.getUserByEmail(recipientEmail);
      if (!toUser) {
        return res.status(404).json({ message: "Recipient not found" });
      }

      if (fromUser.id === toUser.id) {
        return res.status(400).json({ message: "Cannot transfer coins to yourself" });
      }

      // Perform transfer
      await storage.updateUser(fromUser.id, {
        coins: fromUser.coins - amount,
      });

      await storage.updateUser(toUser.id, {
        coins: toUser.coins + amount,
      });

      // Record transfer
      const transfer = await storage.createCoinTransfer({
        fromUserId: fromUser.id,
        toUserId: toUser.id,
        amount,
        message,
      });

      res.json({ 
        message: `Successfully transferred ${amount} coins to ${recipientEmail}`,
        transfer 
      });
    } catch (error) {
      next(error);
    }
  });

  // Get transfer history
  app.get("/api/transfers", requireAuth, async (req, res, next) => {
    try {
      const transfers = await storage.getCoinTransfersByUserId(req.user!.id);
      res.json(transfers);
    } catch (error) {
      next(error);
    }
  });

  // Update profile
  app.put("/api/profile", requireAuth, async (req, res, next) => {
    try {
      const { name, username, email } = req.body;
      const user = req.user!;

      // Check if username/email already exists (excluding current user)
      if (username !== user.username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== user.id) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }

      if (email !== user.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== user.id) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }

      const updatedUser = await storage.updateUser(user.id, {
        name,
        username,
        email,
      });

      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  });

  // Admin endpoints
  app.get("/api/admin/users", requireAdmin, async (req, res, next) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (req, res, next) => {
    try {
      const stats = await storage.getTotalStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  // Bot session status
  app.get("/api/bot-status/:sessionId", requireAuth, async (req, res, next) => {
    try {
      const { sessionId } = req.params;
      const session = whatsappService.getSessionStatus(sessionId);
      
      if (!session || session.userId !== req.user!.id) {
        return res.status(404).json({ message: "Session not found" });
      }

      res.json({
        sessionId: session.sessionId,
        isConnected: session.isConnected,
      });
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
