import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface TopicSuggestion {
  title: string;
  keywords: string[];
  score: number;
  description?: string;
}

export async function generateContent(topic: { title: string; keywords: string[] }) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a professional blog writer with expertise in SEO and content marketing. Create engaging, well-researched content that provides value to readers while incorporating SEO best practices."
      },
      {
        role: "user",
        content: `Write a comprehensive blog post about ${topic.title}. 
          Include these keywords naturally: ${topic.keywords.join(", ")}.
          Requirements:
          - Create an engaging headline
          - Include subheadings for better structure (H2 and H3)
          - Write in a conversational yet professional tone
          - Add relevant examples and statistics where applicable
          - Include a strong introduction and conclusion
          - Optimize for readability with short paragraphs
          - Aim for approximately 1500 words
          - Format the content in Markdown
          - Include meta description for SEO`
      }
    ],
    temperature: 0.7,
    max_tokens: 2500
  });

  return completion.choices[0].message.content;
}

export async function analyzeTopics(niche: string): Promise<TopicSuggestion[]> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are an expert in content research, SEO, and market trends analysis. Provide data-driven content suggestions that align with current market interests and search trends."
      },
      {
        role: "user",
        content: `Analyze and suggest 5 trending topics in the ${niche} niche.
          For each topic, provide:
          - A compelling, SEO-optimized title
          - 5-7 relevant keywords including long-tail keywords
          - Popularity score (1-100) based on current trends
          - A brief description of why this topic is relevant
          Format the response as a JSON array with objects containing: title, keywords, score, and description fields.`
      }
    ],
    temperature: 0.7,
    response_format: { type: "json_object" }
  });

  const response = JSON.parse(completion.choices[0].message.content || "{}");
  return response.topics || [];
}

export async function optimizeForSEO(content: string, keywords: string[]) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are an SEO expert. Analyze and optimize content while maintaining readability and natural flow."
      },
      {
        role: "user",
        content: `Analyze and optimize this content for SEO. Target keywords: ${keywords.join(", ")}
          Content: ${content}
          
          Provide:
          1. SEO score (0-100)
          2. List of optimization suggestions
          3. Optimized content
          Format as JSON with score, suggestions, and optimizedContent fields.`
      }
    ],
    temperature: 0.3,
    response_format: { type: "json_object" }
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}
