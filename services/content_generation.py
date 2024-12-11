from typing import Dict, List, Optional
import logging
from openai import OpenAI
import os
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ContentRequest(BaseModel):
    topic: str
    keywords: List[str]
    tone: str = "professional"
    length: str = "medium"
    content_type: str = "blog_post"

class ContentResponse(BaseModel):
    content: str
    usage: Dict[str, int]
    model: str

class ContentGenerator:
    def __init__(self):
        self.client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        self.model = "gpt-4"
        
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def generate_content(self, request: ContentRequest) -> ContentResponse:
        """Generate content using OpenAI's GPT-4"""
        try:
            prompt = self._create_prompt(request)
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional content writer specializing in creating engaging, well-researched blog posts."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=self._get_max_tokens(request.length),
                n=1
            )
            
            content = response.choices[0].message.content
            
            return ContentResponse(
                content=content,
                usage=response.usage.model_dump(),
                model=self.model
            )
            
        except Exception as e:
            logger.error(f"Content generation failed: {str(e)}")
            raise
            
    def _create_prompt(self, request: ContentRequest) -> str:
        """Create a detailed prompt based on the request"""
        length_guide = {
            "short": "800-1200 words",
            "medium": "1500-2000 words",
            "long": "2500-3000 words"
        }
        
        return f"""
Write a {request.content_type} about {request.topic}.

Key requirements:
- Target length: {length_guide[request.length]}
- Writing tone: {request.tone}
- Include these keywords naturally: {', '.join(request.keywords)}
- Use markdown formatting
- Include:
  * An engaging title
  * Clear headings and subheadings
  * A compelling introduction
  * Well-structured main content
  * A strong conclusion
  * Call to action

Focus on creating valuable, informative content that engages the reader while naturally incorporating the keywords.
        """.strip()
        
    def _get_max_tokens(self, length: str) -> int:
        """Determine max tokens based on desired content length"""
        return {
            "short": 1500,
            "medium": 2500,
            "long": 4000
        }.get(length, 2500)

# Create singleton instance
content_generator = ContentGenerator()
