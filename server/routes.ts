import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db/index";
import { posts, analytics, distributions } from "@db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { generateContent, analyzeTopics } from "./services/openai";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    const totalPosts = await db.select({ count: sql`count(*)` }).from(posts);
    const publishedPosts = await db.select({ count: sql`count(*)` })
      .from(posts)
      .where(eq(posts.status, "published"));
    
    const totalViews = await db.select({ sum: sql`sum(views)` }).from(analytics);
    const totalRevenue = await db.select({ sum: sql`sum(revenue)` }).from(analytics);

    const performanceData = await db.select()
      .from(analytics)
      .orderBy(desc(analytics.date))
      .limit(30);

    res.json({
      totalPosts: totalPosts[0].count,
      publishedPosts: publishedPosts[0].count,
      totalViews: totalViews[0].sum || 0,
      totalRevenue: totalRevenue[0].sum || 0,
      performanceData
    });
  });

  // Recent posts
  app.get("/api/posts/recent", async (req, res) => {
    const recentPosts = await db.select()
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(5);
    
    res.json(recentPosts);
  });

  // Topic research
  app.get("/api/topics", async (req, res) => {
    const { niche } = req.query;
    const topics = await analyzeTopics(niche as string);
    res.json(topics);
  });

  // Generate content
  app.post("/api/generate/content", async (req, res) => {
    const { topic } = req.body;
    const content = await generateContent(topic);
    res.json({ content });
  });

  // SEO analysis
  app.post("/api/seo/analyze", async (req, res) => {
    try {
      const { content, keywords } = req.body;
      const result = await optimizeForSEO(content, keywords);
      res.json(result);
    } catch (error) {
      console.error("Error analyzing SEO:", error);
      res.status(500).json({ message: "Failed to analyze SEO" });
    }
  });

  // SEO optimization
  app.post("/api/seo/optimize", async (req, res) => {
    const { content } = req.body;
    // Implement SEO optimization logic
    res.json({
      optimizedContent: content // Replace with actual optimization
    });
  });

  return httpServer;
}
