import OpenAI from 'openai';
import { z } from 'zod';

interface SEOAnalysis {
  titleScore: number;
  contentScore: number;
  keywordScore: number;
  readabilityScore: number;
  structureScore: number;
  optimizationSuggestions: string[];
  keywordDensity: Record<string, number>;
  readabilityMetrics: Record<string, number>;
  improvements: Record<string, string[]>;
}

export class SEOOptimizer {
  private client: OpenAI;
  private model: string = 'gpt-4';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required for SEO optimization');
    }

    this.client = new OpenAI({ 
      apiKey,
      timeout: 30000,
      maxRetries: 3
    });
  }

  async optimizeContent(content: string, keywords: string[]): Promise<SEOAnalysis> {
    try {
      const analysis = await this.analyzeContent(content, keywords);
      
      if (this.needsOptimization(analysis)) {
        const optimizedContent = await this.improveContent(content, keywords, analysis);
        return await this.analyzeContent(optimizedContent, keywords);
      }
      
      return analysis;
    } catch (error) {
      console.error('SEO optimization failed:', error);
      throw new Error(`Failed to optimize content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeContent(content: string, keywords: string[]): Promise<SEOAnalysis> {
    const prompt = `
      Analyze this content for SEO optimization. Provide scores and suggestions.
      Keywords to focus on: ${keywords.join(', ')}

      Content:
      ${content.substring(0, 1000)}... (truncated)

      Return a JSON object with:
      - Scores (0-1) for: title, content, keywords, readability, structure
      - Optimization suggestions
      - Keyword density analysis
      - Readability metrics
      - Specific improvements for each aspect
    `;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: "You are an SEO optimization expert." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private needsOptimization(analysis: SEOAnalysis): boolean {
    const minScore = 0.7;
    return (
      analysis.titleScore < minScore ||
      analysis.contentScore < minScore ||
      analysis.keywordScore < minScore ||
      analysis.readabilityScore < minScore ||
      analysis.structureScore < minScore
    );
  }

  private async improveContent(
    content: string,
    keywords: string[],
    analysis: SEOAnalysis
  ): Promise<string> {
    const prompt = `
      Improve this content based on SEO analysis:
      Keywords: ${keywords.join(', ')}
      
      Current scores:
      ${JSON.stringify(analysis, null, 2)}
      
      Content:
      ${content}
      
      Improve the content while maintaining its core message and structure.
      Return only the improved content in markdown format.
    `;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: "You are an SEO content optimization expert." },
        { role: "user", content: prompt }
      ]
    });

    return response.choices[0].message.content || content;
  }
}

export const seoOptimizer = new SEOOptimizer();
