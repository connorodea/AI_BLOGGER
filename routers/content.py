from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from services.content_generation import content_generator, ContentRequest, ContentResponse

router = APIRouter()

class GenerateContentRequest(BaseModel):
    topic: str
    keywords: List[str]
    tone: Optional[str] = "professional"
    length: Optional[str] = "medium"
    content_type: Optional[str] = "blog_post"

@router.post("/generate", response_model=ContentResponse)
async def generate_content(request: GenerateContentRequest):
    """Generate blog content based on the provided topic and keywords"""
    try:
        content_req = ContentRequest(
            topic=request.topic,
            keywords=request.keywords,
            tone=request.tone,
            length=request.length,
            content_type=request.content_type
        )
        
        response = await content_generator.generate_content(content_req)
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Content generation failed: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """Health check endpoint for the content generation service"""
    return {"status": "healthy"}
