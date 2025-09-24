import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "fallback-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "username" },
      async (username, password, done) => {
        try {
          // Check if username is email or username
          let user = await storage.getUserByEmail(username);
          if (!user) {
            user = await storage.getUserByUsername(username);
          }

          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false);
          }

          if (!user.isVerified) {
            return done(null, false, { message: "Please verify your email first" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { name, username, email, password } = req.body;

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Generate verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      const user = await storage.createUser({
        name,
        username,
        email,
        password: await hashPassword(password),
        verificationCode,
      });

      // Send verification email
      const emailService = await import("./services/email");
      await emailService.sendVerificationEmail(email, verificationCode);

      res.status(201).json({ 
        message: "User created successfully. Please check your email for verification code.",
        userId: user.id 
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/verify-email", async (req, res, next) => {
    try {
      const { email, code } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      if (user.verificationCode !== code) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      const updatedUser = await storage.updateUser(user.id, {
        isVerified: true,
        verificationCode: null,
      });

      req.login(updatedUser!, (err) => {
        if (err) return next(err);
        res.status(200).json(updatedUser);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
