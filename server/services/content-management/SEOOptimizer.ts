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
  readabilityMetrics: {
    fleschScore: number;
    avgSentenceLength: number;
    avgWordLength: number;
  };
  improvements: Record<string, string[]>;
  originalScores?: {
    title: number;
    content: number;
    keywords: number;
    readability: number;
    structure: number;
  };
}

interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
}

export class SEOOptimizer {
  private client: OpenAI;
  private model: string = 'gpt-4';
  private retryConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
  };

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required for SEO optimization');
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

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let delay = this.retryConfig.initialDelay;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.error(`SEO optimization attempt ${attempt} failed:`, error);
        
        if (attempt === this.retryConfig.maxAttempts) {
          throw error;
        }
        
        delay = Math.min(delay * 2, this.retryConfig.maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('All retry attempts failed');
  }

  async optimizeContent(content: string, keywords: string[]): Promise<SEOAnalysis> {
    try {
      console.log('Starting SEO optimization for content with keywords:', keywords);

      // Initial analysis
      const initialAnalysis = await this.analyzeContent(content, keywords);
      console.log('Initial SEO analysis completed:', {
        scores: {
          title: initialAnalysis.titleScore,
          content: initialAnalysis.contentScore,
          keywords: initialAnalysis.keywordScore,
          readability: initialAnalysis.readabilityScore,
          structure: initialAnalysis.structureScore
        }
      });

      // Check if optimization is needed
      if (this.needsOptimization(initialAnalysis)) {
        console.log('Content needs optimization, proceeding with improvements...');
        
        // Improve content
        const optimizedContent = await this.improveContent(content, keywords, initialAnalysis);
        
        // Re-analyze after optimization
        const finalAnalysis = await this.analyzeContent(optimizedContent, keywords);
        
        console.log('Optimization completed. Improvement metrics:', {
          titleScoreImprovement: finalAnalysis.titleScore - initialAnalysis.titleScore,
          contentScoreImprovement: finalAnalysis.contentScore - initialAnalysis.contentScore,
          keywordScoreImprovement: finalAnalysis.keywordScore - initialAnalysis.keywordScore,
          readabilityScoreImprovement: finalAnalysis.readabilityScore - initialAnalysis.readabilityScore,
          structureScoreImprovement: finalAnalysis.structureScore - initialAnalysis.structureScore
        });

        return {
          ...finalAnalysis,
          originalScores: {
            title: initialAnalysis.titleScore,
            content: initialAnalysis.contentScore,
            keywords: initialAnalysis.keywordScore,
            readability: initialAnalysis.readabilityScore,
            structure: initialAnalysis.structureScore
          }
        };
      }

      console.log('Content already well-optimized, no improvements needed');
      return initialAnalysis;

    } catch (error) {
      console.error('SEO optimization failed:', error);
      
      // Provide detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = {
        timestamp: new Date().toISOString(),
        keywords,
        contentLength: content.length,
        error: errorMessage
      };
      
      console.error('Error details:', errorDetails);
      throw new Error(`SEO optimization failed: ${errorMessage}`);
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

  private async analyzeContent(content: string, keywords: string[]): Promise<SEOAnalysis> {
    return this.retryOperation(async () => {
      const prompt = `
        Analyze this content for SEO optimization. Provide detailed analysis.
        Keywords to focus on: ${keywords.join(', ')}

        Content:
        ${content.substring(0, 1000)}... (truncated)

        Analyze and return a JSON object with:
        1. Scores (0-1):
           - Title effectiveness (keyword presence, length, click appeal)
           - Content quality (depth, originality, relevance)
           - Keyword optimization (density, placement, LSI terms)
           - Readability (sentence length, word choice, structure)
           - Content structure (headings, paragraphs, flow)
        
        2. Detailed analysis:
           - Keyword density per term
           - Readability metrics (Flesch score, avg sentence length)
           - Structure analysis (heading hierarchy, section balance)
           - Missing key elements
           - Competitive advantages
        
        3. Actionable improvements:
           - Specific suggestions for each low-scoring area
           - Priority order for implementations
           - Expected impact of changes
      `;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "You are an SEO expert." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content || '{}') as SEOAnalysis;
    });
  }

  private async improveContent(
    content: string,
    keywords: string[],
    analysis: SEOAnalysis
  ): Promise<string> {
    return this.retryOperation(async () => {
      // Determine which aspects need improvement
      const improvements: string[] = [];
      if (analysis.titleScore < 0.8) improvements.push('title optimization');
      if (analysis.keywordScore < 0.8) improvements.push('keyword integration');
      if (analysis.readabilityScore < 0.8) improvements.push('readability');
      if (analysis.structureScore < 0.8) improvements.push('content structure');

      const prompt = `
        Improve this content based on detailed SEO analysis.
        Focus areas: ${improvements.join(', ')}

        Current Analysis:
        ${JSON.stringify(analysis, null, 2)}

        Keywords to optimize for: ${keywords.join(', ')}

        Requirements:
        1. Maintain core message and expertise level
        2. Improve keyword placement and density
        3. Enhance readability and flow
        4. Optimize structure and formatting
        5. Add engaging transitions
        6. Include LSI keywords naturally
        7. Optimize headings hierarchy
        8. Improve sentence variety
        9. Add internal linking suggestions [LINK]
        10. Suggest image placements [IMAGE]

        Original Content:
        ${content}

        Return only the improved content in markdown format.
        Include clear section breaks and formatting.
      `;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { 
            role: "system", 
            content: "You are an SEO expert specializing in content optimization while maintaining authenticity and value." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });

      return response.choices[0].message.content || content;
    });
  }
}

export const seoOptimizer = new SEOOptimizer();
