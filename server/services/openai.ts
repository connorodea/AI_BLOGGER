import OpenAI from "openai";

const openai = new OpenAI();

export async function generateContent(topic: any) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a professional blog writer with expertise in SEO."
      },
      {
        role: "user",
        content: `Write a comprehensive blog post about ${topic.title}. 
          Include these keywords: ${topic.keywords.join(", ")}.
          The content should be well-structured with proper headings and engaging writing style.
          Format the content in Markdown.`
      }
    ],
    temperature: 0.7
  });

  return completion.choices[0].message.content;
}

export async function analyzeTopics(niche: string) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are an expert in content research and SEO."
      },
      {
        role: "user",
        content: `Analyze and suggest trending topics in the ${niche} niche.
          For each topic, provide:
          - A compelling title
          - Relevant keywords
          - Popularity score
          Return the results as a JSON array.`
      }
    ]
  });

  return JSON.parse(completion.choices[0].message.content || "[]");
}
