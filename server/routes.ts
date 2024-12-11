import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db/index";
import { posts, analytics, distributions } from "@db/schema";
import { desc, eq, sql, and } from "drizzle-orm";
import contentRoutes from "./routes/content";
import { analyzeTopics, optimizeForSEO } from "./services/openai";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  // Register content generation routes
  app.use("/api/content", contentRoutes);

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
    try {
      const { content, keywords } = req.body;
      const result = await optimizeForSEO(content, keywords);
      res.json({ optimizedContent: result.optimizedContent });
    } catch (error) {
      console.error("Error optimizing content:", error);
      res.status(500).json({ message: "Failed to optimize content" });
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
