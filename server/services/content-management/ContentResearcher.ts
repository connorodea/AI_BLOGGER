import OpenAI from 'openai';
import { z } from 'zod';

export interface ResearchTopic {
  title: string;
  keywords: string[];
  searchVolume: string;
  competition: number;
  difficulty?: string;
  estimatedTraffic?: number;
  contentBrief?: string;
}

export interface ContentPlan {
  topic: ResearchTopic;
  outline: string[];
  targetWordCount: number;
  keyPoints: string[];
  references: string[];
  targetAudience: string;
  estimatedCompletionTime: number;
}

export class ContentResearcher {
  private client: OpenAI;
  private model: string = 'gpt-4';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required for content research');
    }

    this.client = new OpenAI({ 
      apiKey,
      timeout: 30000,
      maxRetries: 3
    });
  }

  async researchTopic(niche: string, count: number = 5): Promise<ResearchTopic[]> {
    try {
      const prompt = `
        Suggest ${count} blog post topics in the ${niche} niche.
        For each topic:
        1. Create an SEO-optimized title
        2. Suggest 3-5 target keywords
        3. Estimate search volume (low/medium/high)
        4. Estimate competition level (0-1)
        5. Suggest target audience
        6. Brief content outline

        Format response as JSON with this structure:
        {
          "topics": [{
            "title": "str",
            "keywords": ["str"],
            "searchVolume": "str",
            "competition": float,
            "audience": "str",
            "outline": ["str"]
          }]
        }
      `;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "You are a content research expert." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.topics || [];
    } catch (error) {
      console.error('Topic research failed:', error);
      throw new Error(`Failed to research topics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createContentPlan(topic: ResearchTopic): Promise<ContentPlan> {
    try {
      const prompt = `
        Create a detailed content plan for: ${topic.title}
        Keywords: ${topic.keywords.join(', ')}

        Include:
        1. Detailed outline with sections and subsections
        2. Key points to cover
        3. Target word count
        4. Potential reference sources
        5. Target audience analysis
        6. Estimated writing time

        Format as JSON:
        {
          "outline": ["str"],
          "keyPoints": ["str"],
          "wordCount": int,
          "references": ["str"],
          "audience": "str",
          "writingTime": int
        }
      `;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "You are a content planning expert." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        topic,
        outline: result.outline || [],
        targetWordCount: result.wordCount || 1500,
        keyPoints: result.keyPoints || [],
        references: result.references || [],
        targetAudience: result.audience || 'general',
        estimatedCompletionTime: result.writingTime || 60
      };
    } catch (error) {
      console.error('Content plan creation failed:', error);
      throw new Error(`Failed to create content plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const contentResearcher = new ContentResearcher();
