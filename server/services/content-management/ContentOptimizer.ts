import OpenAI from 'openai';
import { z } from 'zod';
import { seoOptimizer } from './SEOOptimizer';

interface OptimizationResult {
  optimizedContent: string;
  metrics: {
    readability: number;
    engagement: number;
    seo: number;
    accuracy: number;
    coherence: number;
  };
  seoAnalysis?: any;
}

export class ContentOptimizer {
  private client: OpenAI;
  private model: string = 'gpt-4';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required for content optimization');
    }

    this.client = new OpenAI({ 
      apiKey,
      timeout: 60000,
      maxRetries: 5,
      defaultHeaders: {
        'OpenAI-Beta': 'assistants=v1'
      }
    });
  }

  private async retryOperation<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        if (attempt === maxAttempts) throw error;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    throw new Error('All retry attempts failed');
  }

  async optimizeContent(
    content: string, 
    keywords: string[]
  ): Promise<OptimizationResult> {
    try {
      // Check content quality
      const [metrics, seoAnalysis] = await Promise.all([
        this.checkQuality(content),
        seoOptimizer.optimizeContent(content, keywords)
      ]);
      
      // Improve content if needed
      let optimizedContent = content;
      const needsImprovement = Object.values(metrics).some(score => score < 0.8);
      
      if (needsImprovement) {
        const issues = Object.entries(metrics)
          .filter(([_, score]) => score < 0.8)
          .map(([key]) => key);
          
        // Improve content with enhanced quality checks
        optimizedContent = await this.improveContent(content, issues, keywords, seoAnalysis);
        
        // Recheck quality after improvements
        const [updatedMetrics, updatedSeoAnalysis] = await Promise.all([
          this.checkQuality(optimizedContent),
          seoOptimizer.optimizeContent(optimizedContent, keywords)
        ]);

        return {
          optimizedContent,
          metrics: updatedMetrics,
          seoAnalysis: updatedSeoAnalysis
        };
      }

      return {
        optimizedContent,
        metrics,
        seoAnalysis
      };
    } catch (error) {
      console.error('Content optimization failed:', error);
      throw new Error(`Failed to optimize content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkQuality(content: string): Promise<OptimizationResult['metrics']> {
    const prompt = `
      Analyze this content against these criteria.
      Rate each from 0-1.
      Return only JSON with scores.

      Criteria: readability, engagement, seo, accuracy, coherence

      Content:
      ${content.substring(0, 1000)}... (truncated)
    `;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: "You are a content quality expert." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private async improveContent(
    content: string, 
    issues: string[],
    keywords: string[],
    seoAnalysis: any
  ): Promise<string> {
    const prompt = `
      Improve this content focusing on: ${issues.join(', ')}
      
      SEO Analysis:
      ${JSON.stringify(seoAnalysis, null, 2)}
      
      Requirements:
      - Address SEO improvements suggested in the analysis
      - Maintain the same structure and key points
      - Naturally incorporate these keywords: ${keywords.join(', ')}
      - Keep the tone consistent
      - Return in markdown format
      
      Content:
      ${content}
    `;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: "You are a content improvement expert." },
        { role: "user", content: prompt }
      ]
    });

    return response.choices[0].message.content || content;
  }
}

export const contentOptimizer = new ContentOptimizer();
