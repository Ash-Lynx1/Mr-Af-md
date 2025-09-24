import { users, deployments, coinTransfers, type User, type InsertUser, type Deployment, type InsertDeployment, type CoinTransfer, type InsertCoinTransfer } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  createDeployment(deployment: InsertDeployment & { userId: string }): Promise<Deployment>;
  getDeploymentsByUserId(userId: string): Promise<Deployment[]>;
  updateDeployment(id: string, updates: Partial<Deployment>): Promise<Deployment | undefined>;
  
  createCoinTransfer(transfer: InsertCoinTransfer & { fromUserId: string; toUserId: string }): Promise<CoinTransfer>;
  getCoinTransfersByUserId(userId: string): Promise<CoinTransfer[]>;
  
  getAllUsers(): Promise<User[]>;
  getTotalStats(): Promise<{
    totalUsers: number;
    activeDeployments: number;
    totalCoinsDistributed: number;
  }>;
  
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      schemaName: 'public',
      tableName: 'session'
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async createDeployment(deployment: InsertDeployment & { userId: string }): Promise<Deployment> {
    const [newDeployment] = await db
      .insert(deployments)
      .values(deployment)
      .returning();
    return newDeployment;
  }

  async getDeploymentsByUserId(userId: string): Promise<Deployment[]> {
    return await db
      .select()
      .from(deployments)
      .where(eq(deployments.userId, userId))
      .orderBy(desc(deployments.createdAt));
  }

  async updateDeployment(id: string, updates: Partial<Deployment>): Promise<Deployment | undefined> {
    const [deployment] = await db
      .update(deployments)
      .set(updates)
      .where(eq(deployments.id, id))
      .returning();
    return deployment || undefined;
  }

  async createCoinTransfer(transfer: InsertCoinTransfer & { fromUserId: string; toUserId: string }): Promise<CoinTransfer> {
    const [newTransfer] = await db
      .insert(coinTransfers)
      .values(transfer)
      .returning();
    return newTransfer;
  }

  async getCoinTransfersByUserId(userId: string): Promise<CoinTransfer[]> {
    return await db
      .select()
      .from(coinTransfers)
      .where(eq(coinTransfers.fromUserId, userId))
      .orderBy(desc(coinTransfers.createdAt))
      .limit(10);
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getTotalStats(): Promise<{
    totalUsers: number;
    activeDeployments: number;
    totalCoinsDistributed: number;
  }> {
    const [userCount] = await db.select().from(users);
    const activeDeploymentsList = await db
      .select()
      .from(deployments)
      .where(eq(deployments.status, 'active'));
    const totalCoins = await db.select().from(users);
    
    return {
      totalUsers: userCount ? userCount.length || 0 : 0,
      activeDeployments: activeDeploymentsList.length,
      totalCoinsDistributed: totalCoins.reduce((sum, user) => sum + (user.coins || 0), 0)
    };
  }
}

export const storage = new DatabaseStorage();
