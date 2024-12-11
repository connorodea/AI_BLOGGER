import OpenAI from 'openai';
import { z } from 'zod';
import { db } from '../../db';
import { posts, type Post } from '../../db/schema';
import { eq } from 'drizzle-orm';

// Content generation related interfaces
interface GenerationConfig {
  contentType?: string;
  tone?: string;
  length?: string;
}

interface GenerationResult {
  content: string;
  usage: number;
  model: string;
}

interface TopicAnalysis {
  title: string;
  keywords: string[];
  searchVolume: string;
  competition: number;
  outline: string[];
}

class ContentGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentGenerationError';
  }
}

class AIContentGenerator {
  private client: OpenAI;
  private defaultModel: string;
  private defaultTemperature: number;
  private customPrompts: Record<string, string>;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({ 
      apiKey,
      timeout: 30000, // 30 second timeout
      maxRetries: 3
    });
    this.defaultModel = 'gpt-4';
    this.defaultTemperature = 0.7;
    this.customPrompts = {};

    // Verify API key validity
    this.validateApiKey().catch(error => {
      console.error('OpenAI API key validation failed:', error);
      throw new Error('Invalid OpenAI API key configuration');
    });
  }

  private async validateApiKey(): Promise<void> {
    try {
      await this.client.models.list();
    } catch (error) {
      throw new Error(`OpenAI API key validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateContent(
    topic: string,
    keywords: string[],
    config: GenerationConfig = {}
  ): Promise<GenerationResult> {
    try {
      const prompt = this.getPromptTemplate(
        config.contentType || 'blog_post',
        config.tone || 'professional',
        config.length || 'medium'
      );

      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: "system",
            content: "You are a professional blog writer with expertise in creating engaging, well-researched content. Focus on providing value while maintaining SEO best practices."
          },
          {
            role: "user",
            content: prompt.replace('{topic}', topic)
              .replace('{keywords}', keywords.join(', '))
          }
        ],
        temperature: this.defaultTemperature,
        max_tokens: 4000
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new ContentGenerationError('No content generated');
      }

      // Validate content
      this.validateContent(content, keywords);

      return {
        content,
        usage: response.usage?.total_tokens || 0,
        model: this.defaultModel
      };
    } catch (error) {
      console.error('Content generation failed:', error);
      throw new ContentGenerationError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  async analyzeTopics(niche: string, count: number = 5): Promise<TopicAnalysis[]> {
    try {
      const prompt = `
        Suggest ${count} blog post topics in the ${niche} niche.
        For each topic:
        1. Create an SEO-optimized title
        2. Suggest 3-5 target keywords
        3. Estimate search volume (low/medium/high)
        4. Estimate competition level (0-1)
        5. Brief content outline

        Format response as JSON with structure:
        {
          "topics": [{
            "title": "string",
            "keywords": ["string"],
            "searchVolume": "string",
            "competition": number,
            "outline": ["string"]
          }]
        }
      `;

      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: "system", content: "You are a content research expert." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new ContentGenerationError('No topics generated');
      }

      const result = JSON.parse(content);
      return result.topics;
    } catch (error) {
      console.error("Failed to analyze topics:", error);
      throw new ContentGenerationError(
        `Topic analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private getPromptTemplate(
    contentType: string,
    tone: string,
    length: string
  ): string {
    const lengthGuides = {
      short: '800-1200 words',
      medium: '1500-2000 words',
      long: '2500-3000 words'
    };

    return `
Write a comprehensive blog post about {topic}.

Key requirements:
- Write in a ${tone} tone
- Target length: ${lengthGuides[length as keyof typeof lengthGuides]}
- Include these keywords naturally: {keywords}
- Use markdown formatting
- Include:
  * A compelling title
  * Clear headings and subheadings
  * An engaging introduction
  * Well-structured main content
  * A conclusive summary
  * Call to action

Structure the content to be easy to read and engage with.
    `.trim();
  }

  private validateContent(content: string, keywords: string[]): void {
    // Check minimum length
    if (content.split(' ').length < 100) {
      throw new ContentGenerationError('Generated content is too short');
    }

    // Check keyword inclusion
    for (const keyword of keywords) {
      if (!content.toLowerCase().includes(keyword.toLowerCase())) {
        throw new ContentGenerationError(`Keyword '${keyword}' not found in content`);
      }
    }

    // Check markdown formatting
    if (!content.includes('# ')) {
      throw new ContentGenerationError('Content lacks proper markdown headings');
    }
  }
}

// Export singleton instance
export const contentGenerator = new AIContentGenerator();
