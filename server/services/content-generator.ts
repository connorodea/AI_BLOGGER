import OpenAI from 'openai';
import { z } from 'zod';

// Types for content generation
export interface GenerationConfig {
  contentType?: 'blog_post' | 'article' | 'social_post';
  tone?: 'professional' | 'casual' | 'technical';
  length?: 'short' | 'medium' | 'long';
}

export interface GenerationResult {
  content: string;
  usage: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
  model: string;
}

class ContentGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentGenerationError';
  }
}

class AIContentGenerator {
  private client: OpenAI;
  private model: string;
  private temperature: number;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({ apiKey });
    this.model = 'gpt-4';
    this.temperature = 0.7;
  }

  async generateContent(
    topic: string,
    keywords: string[],
    config: GenerationConfig = {}
  ): Promise<GenerationResult> {
    try {
      const prompt = this.createPrompt(
        topic,
        keywords,
        config.contentType || 'blog_post',
        config.tone || 'professional',
        config.length || 'medium'
      );

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are a professional content writer specializing in creating engaging, well-researched blog posts."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: this.temperature,
        max_tokens: this.getMaxTokens(config.length || 'medium')
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new ContentGenerationError('No content generated');
      }

      return {
        content,
        usage: {
          total_tokens: response.usage?.total_tokens || 0,
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0
        },
        model: this.model
      };
    } catch (error) {
      console.error('Content generation failed:', error);
      throw new ContentGenerationError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  private createPrompt(
    topic: string,
    keywords: string[],
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
Write a high-quality ${contentType} about ${topic}.

Content Requirements:
1. Style and Tone:
   - Write in a ${tone} tone
   - Target length: ${lengthGuides[length as keyof typeof lengthGuides]}

2. SEO Optimization:
   - Include these keywords naturally: ${keywords.join(', ')}
   - Optimize headings for SEO
   - Include meta description suggestions

3. Structure (Use Markdown):
   - Compelling title (H1)
   - Clear section headings (H2) and subheadings (H3)
   - Engaging introduction with hook
   - Well-structured main content with examples
   - Actionable conclusion
   - Call to action

4. Engagement Elements:
   - Include 2-3 relevant statistics or data points
   - Add practical examples or case studies
   - Suggest pull quotes for social media
   - Include questions to engage readers

Make the content informative, engaging, and optimized for both readers and search engines.
    `.trim();
  }

  private getMaxTokens(length: string): number {
    return {
      short: 1500,
      medium: 2500,
      long: 4000
    }[length] || 2500;
  }
}

// Export singleton instance
export const contentGenerator = new AIContentGenerator();
