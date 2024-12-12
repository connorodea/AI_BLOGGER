import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "../db";
import { posts, analytics, distributions } from "../db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { contentRouter } from "./routes/content";
import OpenAI from "openai";
import { contentGenerator } from "./services/content-generator";
import { contentOptimizer } from "./services/content-management/ContentOptimizer";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000,
  maxRetries: 3
});

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  
  // Register content generation API routes
  app.use("/api/content", contentRouter);

  // Error handler for content routes
  app.use("/api/content", (err: Error, req: any, res: any, next: any) => {
    console.error("Content API error:", err);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === "production" 
        ? "Internal server error"
        : err.message
    });
  });
  
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy",
      timestamp: new Date().toISOString()
    });
  });

  // Dashboard stats with error handling
  app.get("/api/dashboard/stats", async (req, res, next) => {
    try {
      const [
        totalPosts,
        publishedPosts,
        totalViews,
        totalRevenue,
        performanceData
      ] = await Promise.all([
        db.select({ count: sql`count(*)` }).from(posts),
        db.select({ count: sql`count(*)` })
          .from(posts)
          .where(eq(posts.status, "published")),
        db.select({ sum: sql`sum(views)` }).from(analytics),
        db.select({ sum: sql`sum(revenue)` }).from(analytics),
        db.select()
          .from(analytics)
          .orderBy(desc(analytics.date))
          .limit(30)
      ]);

      res.json({
        totalPosts: totalPosts[0].count,
        publishedPosts: publishedPosts[0].count,
        totalViews: totalViews[0].sum || 0,
        totalRevenue: totalRevenue[0].sum || 0,
        performanceData
      });
    } catch (error) {
      next(error);
    }
  });

  // Global error handler
  app.use((err: Error, req: any, res: any, next: any) => {
    console.error('Server error:', err);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message
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
    try {
      const { niche } = req.query;
      if (!niche || typeof niche !== 'string') {
        return res.status(400).json({ 
          success: false, 
          error: "Niche parameter is required" 
        });
      }

      const prompt = `
        Suggest 5 engaging blog post topics for the niche: ${niche}
        Include for each topic:
        - Title
        - Target keywords (3-5)
        - Brief outline
        Return as JSON array.
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a content strategy expert." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      const topics = JSON.parse(completion.choices[0].message.content || '[]');
      res.json({ success: true, topics });
    } catch (error) {
      console.error("Topic research error:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to research topics" 
      });
    }
  });

  // Generate content
  app.post("/api/generate/content", async (req, res) => {
    try {
      const { topic } = req.body;
      if (!topic) {
        return res.status(400).json({
          success: false,
          error: "Topic is required"
        });
      }

      const result = await contentGenerator.generateContent(
        topic.title,
        topic.keywords,
        {
          contentType: 'blog_post',
          tone: 'professional',
          length: 'medium'
        }
      );

      res.json({ 
        success: true, 
        content: result.content,
        metadata: {
          model: result.model,
          usage: result.usage
        }
      });
    } catch (error) {
      console.error("Content generation error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate content"
      });
    }
  });

  // SEO analysis and optimization
  app.post("/api/seo/optimize", async (req, res) => {
    try {
      const { content, keywords } = req.body;
      if (!content || !keywords) {
        return res.status(400).json({
          success: false,
          error: "Content and keywords are required"
        });
      }

      const result = await contentOptimizer.optimizeContent(content, keywords);
      res.json({
        success: true,
        content: result.content,
        seoAnalysis: result.seoAnalysis,
        metrics: result.metrics
      });
    } catch (error) {
      console.error("SEO optimization error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to optimize content"
      });
    }
  });

  // Create post
  app.post("/api/posts", async (req, res) => {
    try {
      const { title, content, keywords, category } = req.body;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      const post = await db.insert(posts).values({
        title,
        content,
        keywords,
        category,
        slug,
        status: 'draft',
        metadata: {}
      }).returning();

      res.json(post[0]);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  // Get distributable posts
  app.get("/api/posts/distributable", async (req, res) => {
    try {
      const distributablePosts = await db.select({
        id: posts.id,
        title: posts.title,
        status: posts.status,
        distributions: distributions
      })
      .from(posts)
      .leftJoin(distributions, eq(posts.id, distributions.postId))
      .where(eq(posts.status, "published"))
      .orderBy(desc(posts.createdAt));

      const formattedPosts = distributablePosts.reduce((acc: any[], post) => {
        const existingPost = acc.find(p => p.id === post.id);
        if (existingPost) {
          if (post.distributions) {
            existingPost.distributions.push(post.distributions);
          }
        } else {
          acc.push({
            id: post.id,
            title: post.title,
            status: post.status,
            distributions: post.distributions ? [post.distributions] : []
          });
        }
        return acc;
      }, []);

      res.json(formattedPosts);
    } catch (error) {
      console.error("Error fetching distributable posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  // Distribute post
  app.post("/api/posts/:id/distribute", async (req, res) => {
    try {
      const { id } = req.params;
      const postId = parseInt(id);
      
      // Get post content
      const post = await db.query.posts.findFirst({
        where: eq(posts.id, postId)
      });

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Create distribution records for each platform
      const platforms = ['twitter', 'linkedin', 'facebook'];
      const distributionPromises = platforms.map(platform => 
        db.insert(distributions).values({
          postId,
          platform,
          status: 'pending',
          metadata: {}
        })
      );

      await Promise.all(distributionPromises);
      
      res.json({ message: "Distribution started" });
    } catch (error) {
      console.error("Error distributing post:", error);
      res.status(500).json({ message: "Failed to distribute post" });
    }
  });

  // Analytics endpoints
  app.get("/api/analytics", async (req, res) => {
    try {
      // Get time series data
      const timeSeriesData = await db.select({
        date: analytics.date,
        views: analytics.views,
        engagement: analytics.engagement,
        revenue: analytics.revenue
      })
      .from(analytics)
      .orderBy(analytics.date)
      .limit(30);

      // Get post performance
      const postPerformance = await db.select({
        id: posts.id,
        title: posts.title,
        views: analytics.views,
        engagement: analytics.engagement,
        revenue: analytics.revenue
      })
      .from(posts)
      .leftJoin(analytics, eq(posts.id, analytics.postId))
      .orderBy(desc(analytics.views))
      .limit(10);

      // Get platform distribution
      const platformData = await db.select({
        platform: distributions.platform,
        count: sql<number>`count(*)`
      })
      .from(distributions)
      .groupBy(distributions.platform);

      res.json({
        timeSeriesData,
        postPerformance,
        platformDistribution: platformData.map(({ platform, count }) => ({
          platform,
          value: Number(count)
        }))
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  return httpServer;
}
