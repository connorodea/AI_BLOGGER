import express from 'express';
import { z } from 'zod';
import { db } from '../../db';
import { posts } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { contentGenerator } from '../services/content-generator';
import { seoOptimizer } from '../services/content-management/SEOOptimizer';

export const contentRouter = express.Router();

// Schema for content generation request
const generateContentSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  keywords: z.array(z.string()).min(1, "At least one keyword is required"),
  contentType: z.enum(['blog_post', 'article', 'social_post']).default('blog_post'),
  tone: z.enum(['professional', 'casual', 'technical']).default('professional'),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
});

// Generate content endpoint
contentRouter.post('/generate', async (req, res) => {
  try {
    const validatedData = generateContentSchema.parse(req.body);
    
    // Generate blog content
    const contentResult = await contentGenerator.generateContent(
      validatedData.topic,
      validatedData.keywords,
      {
        contentType: validatedData.contentType,
        tone: validatedData.tone,
        length: validatedData.length
      }
    );

    // Create slug from topic
    const slug = validatedData.topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Save to database
    const [post] = await db.insert(posts).values({
      title: validatedData.topic,
      content: contentResult.content,
      slug,
      keywords: validatedData.keywords,
      category: validatedData.contentType,
      status: 'draft',
      metadata: {
        generationDetails: {
          model: contentResult.model,
          tone: validatedData.tone,
          length: validatedData.length,
          tokenUsage: contentResult.usage
        }
      }
    }).returning();

    res.json({
      success: true,
      post,
      generationDetails: {
        tokenUsage: contentResult.usage,
        model: contentResult.model
      }
    });
  } catch (error) {
    console.error('Content generation error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
});

// Get post by ID
contentRouter.get('/:id', async (req, res) => {
  try {
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, parseInt(req.params.id))
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    res.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch post'
    });
  }
});

// Optimize content
contentRouter.post('/:id/optimize', async (req, res) => {
  try {
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, parseInt(req.params.id))
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    const optimizationResult = await seoOptimizer.optimizeContent(
      post.content,
      post.keywords
    );

    // Update post with optimized content and SEO analysis
    const [updatedPost] = await db.update(posts)
      .set({
        content: optimizationResult.content,
        metadata: {
          ...post.metadata,
          seo: {
            scores: {
              titleScore: optimizationResult.titleScore,
              contentScore: optimizationResult.contentScore,
              keywordScore: optimizationResult.keywordScore,
              readabilityScore: optimizationResult.readabilityScore,
              structureScore: optimizationResult.structureScore
            },
            suggestions: optimizationResult.optimizationSuggestions,
            keywordDensity: optimizationResult.keywordDensity,
            readabilityMetrics: optimizationResult.readabilityMetrics
          }
        }
      })
      .where(eq(posts.id, post.id))
      .returning();

    res.json({
      success: true,
      post: updatedPost,
      seoAnalysis: optimizationResult
    });
  } catch (error) {
    console.error('Content optimization error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});
