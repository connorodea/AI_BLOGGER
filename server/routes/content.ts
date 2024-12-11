import express from 'express';
import { z } from 'zod';
import { db } from '../../db';
import { posts } from '../../db/schema';
import { contentGenerator } from '../services/content-generator';
import { imageGenerator } from '../services/image-generator';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Schema for content generation request
const generateContentSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  keywords: z.array(z.string()).min(1, "At least one keyword is required"),
  contentType: z.enum(['blog_post']).default('blog_post'),
  tone: z.enum(['professional', 'casual', 'technical']).default('professional'),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
});

// Generate content endpoint
router.post('/generate', async (req, res) => {
  try {
    const validatedData = generateContentSchema.parse(req.body);
    
    // Generate content and feature image in parallel
    const [contentResult, imageUrl] = await Promise.all([
      contentGenerator.generateContent(
        validatedData.topic,
        validatedData.keywords,
        {
          contentType: validatedData.contentType,
          tone: validatedData.tone,
          length: validatedData.length,
        }
      ),
      imageGenerator.generateImage(validatedData.topic, {
        width: 1024,
        height: 1024,
        numInferenceSteps: 4,
        randomizeSeed: true,
      }),
    ]);

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
          tokenUsage: contentResult.usage,
          featureImage: imageUrl
        }
      }
    }).returning();

    res.json({
      success: true,
      post,
      generationDetails: {
        tokenUsage: contentResult.usage,
        model: contentResult.model,
        featureImage: imageUrl
      }
    });
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
