import OpenAI from 'openai';
import { z } from 'zod';

// Define schemas for validation
const readabilityMetricsSchema = z.object({
  fleschScore: z.number(),
  avgSentenceLength: z.number(),
  avgWordLength: z.number()
});

const seoAnalysisSchema = z.object({
  titleScore: z.number(),
  contentScore: z.number(),
  keywordScore: z.number(),
  readabilityScore: z.number(),
  structureScore: z.number(),
  optimizationSuggestions: z.array(z.string()),
  keywordDensity: z.record(z.string(), z.number()),
  readabilityMetrics: readabilityMetricsSchema,
  improvements: z.record(z.string(), z.array(z.string()))
});

// TypeScript types based on Zod schemas
type ReadabilityMetrics = z.infer<typeof readabilityMetricsSchema>;
type SEOAnalysis = z.infer<typeof seoAnalysisSchema>;

interface OptimizationResult {
  content: string;
  seoAnalysis: SEOAnalysis;
  metrics: {
    readability: number;
    engagement: number;
    seo: number;
    accuracy: number;
    coherence: number;
  };
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
      maxRetries: 5
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
      // Initial analysis
      const [metrics, seoAnalysis] = await Promise.all([
        this.analyzeContent(content),
        this.analyzeSEO(content, keywords)
      ]);

      // Improve content if needed
      let optimizedContent = content;
      const needsImprovement = this.needsOptimization(seoAnalysis) || 
                             Object.values(metrics).some(score => score < 0.8);

      if (needsImprovement) {
        optimizedContent = await this.improveContent(content, keywords, seoAnalysis);
        
        // Re-analyze after improvements
        const [updatedMetrics, updatedSeoAnalysis] = await Promise.all([
          this.analyzeContent(optimizedContent),
          this.analyzeSEO(optimizedContent, keywords)
        ]);

        return {
          content: optimizedContent,
          seoAnalysis: updatedSeoAnalysis,
          metrics: updatedMetrics
        };
      }

      return {
        content,
        seoAnalysis,
        metrics
      };
    } catch (error) {
      console.error('Content optimization failed:', error);
      throw new Error(
        `Content optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private needsOptimization(analysis: SEOAnalysis, minScore: number = 0.8): boolean {
    return (
      analysis.titleScore < minScore ||
      analysis.contentScore < minScore ||
      analysis.keywordScore < minScore ||
      analysis.readabilityScore < minScore ||
      analysis.structureScore < minScore
    );
  }

  private async analyzeContent(content: string): Promise<OptimizationResult['metrics']> {
    return this.retryOperation(async () => {
      const prompt = `
        Analyze this content for quality metrics.
        Rate each metric from 0-1:
        - readability: ease of understanding
        - engagement: how compelling the content is
        - seo: search engine optimization
        - accuracy: factual correctness
        - coherence: logical flow and structure

        Content:
        ${content.substring(0, 1000)}... (truncated)

        Return only JSON with scores.
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
    });
  }

  private async analyzeSEO(content: string, keywords: string[]): Promise<SEOAnalysis> {
    return this.retryOperation(async () => {
      const prompt = `
        Analyze this content for SEO optimization. Focus on:
        - Title effectiveness
        - Keyword usage and placement
        - Content structure and headings
        - Readability metrics
        - Meta description potential

        Keywords to analyze: ${keywords.join(', ')}

        Content:
        ${content.substring(0, 1000)}... (truncated)

        Return a JSON object following the SEOAnalysis schema.
      `;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "You are an SEO expert." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      return seoAnalysisSchema.parse(JSON.parse(response.choices[0].message.content || '{}'));
    });
  }

  private async improveContent(
    content: string, 
    keywords: string[],
    seoAnalysis: SEOAnalysis
  ): Promise<string> {
    return this.retryOperation(async () => {
      const prompt = `
        Improve this content based on SEO analysis and quality metrics.
        
        SEO Analysis:
        ${JSON.stringify(seoAnalysis, null, 2)}
        
        Requirements:
        1. Maintain core message and expertise level
        2. Optimize keyword placement: ${keywords.join(', ')}
        3. Enhance readability and engagement
        4. Improve structure and formatting
        5. Add engaging transitions
        6. Optimize headings hierarchy
        7. Improve sentence variety
        
        Original Content:
        ${content}
        
        Return the improved content in markdown format.
      `;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { 
            role: "system", 
            content: "You are a content optimization expert specializing in SEO and readability improvements." 
          },
          { role: "user", content: prompt }
        ]
      });

      return response.choices[0].message.content || content;
    });
  }
}

export const contentOptimizer = new ContentOptimizer();
