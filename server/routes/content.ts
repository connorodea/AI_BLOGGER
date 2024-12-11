import express from 'express';
import { z } from 'zod';
import { db } from '../../db';
import { posts } from '../../db/schema';
import { contentGenerator } from '../services/content-generator';
import { imageGenerator } from '../services/image-generator';
import { contentOptimizer } from '../services/content-management/ContentOptimizer';
import { contentResearcher } from '../services/content-management/ContentResearcher';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Enhanced schema for content generation request
const generateContentSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  keywords: z.array(z.string()).min(1, "At least one keyword is required"),
  contentType: z.enum(['blog_post']).default('blog_post'),
  tone: z.enum(['professional', 'casual', 'technical']).default('professional'),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  researchEnabled: z.boolean().default(true),
  optimizationEnabled: z.boolean().default(true),
});

// Generate content endpoint with enhanced workflow
router.post('/generate', async (req, res) => {
  try {
    const validatedData = generateContentSchema.parse(req.body);
    
    try {
      // Step 1: Research phase (if enabled)
      let researchData = null;
      let contentPlan = null;
      
      if (validatedData.researchEnabled) {
        const researchTopic = {
          title: validatedData.topic,
          keywords: validatedData.keywords,
          searchVolume: "medium", // Default value
          competition: 0.5, // Default value
        };
        
        contentPlan = await contentResearcher.createContentPlan(researchTopic);
        console.log('Content plan created:', contentPlan);
      }

      // Step 2: Generate content and feature image in parallel
      const [contentResult, imageUrl] = await Promise.all([
        contentGenerator.generateContent(
          validatedData.topic,
          validatedData.keywords,
          {
            contentType: validatedData.contentType,
            tone: validatedData.tone,
            length: validatedData.length,
            contentPlan: contentPlan, // Pass content plan if available
          }
        ),
        imageGenerator.generateImage(validatedData.topic, {
          width: 1024,
          height: 1024,
          numInferenceSteps: 4,
          randomizeSeed: true,
        }),
      ]);

      // Step 3: Optimize content (if enabled)
      let optimizationResult = null;
      if (validatedData.optimizationEnabled) {
        optimizationResult = await contentOptimizer.optimizeContent(
          contentResult.content,
          validatedData.keywords
        );
        console.log('Content optimization completed:', optimizationResult.metrics);
      }

    // Create slug from topic
    const slug = validatedData.topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Save to database with enhanced metadata
      const [post] = await db.insert(posts).values({
        title: validatedData.topic,
        content: optimizationResult ? optimizationResult.optimizedContent : contentResult.content,
        slug,
        keywords: validatedData.keywords,
        category: validatedData.contentType,
        status: 'draft',
        metadata: {
          generationDetails: {
            model: contentResult.model,
            tone: validatedData.tone,
            length: validatedData.length,
            tokenUsage: contentResult.usage,
            featureImage: imageUrl
          },
          contentPlan: contentPlan,
          optimization: optimizationResult ? {
            metrics: optimizationResult.metrics,
            originalContent: contentResult.content
          } : null,
          research: researchData
        }
      }).returning();

      res.json({
        success: true,
        post,
        generationDetails: {
          tokenUsage: contentResult.usage,
          model: contentResult.model,
          featureImage: imageUrl,
          optimizationMetrics: optimizationResult?.metrics,
          contentPlan: contentPlan
        }
      });
    } catch (error) {
      console.error('Enhanced content generation failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  } catch (error) {
    console.error('Content generation error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Get generated content
router.get('/:id', async (req, res) => {
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

export default router;
