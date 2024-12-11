from typing import Dict, List, Optional
import logging
import json
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential
import asyncio
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class ResearchTopic:
    title: str
    keywords: List[str]
    search_volume: Optional[int] = None
    competition: Optional[float] = None
    difficulty: Optional[str] = None
    estimated_traffic: Optional[int] = None
    content_brief: Optional[str] = None

@dataclass
class ContentPlan:
    topic: ResearchTopic
    outline: List[str]
    target_word_count: int
    key_points: List[str]
    references: List[str]
    target_audience: str
    estimated_completion_time: int  # minutes

class ContentResearchManager:
    def __init__(self, config: Dict):
        self.config = config
        self.client = OpenAI(api_key=config['services']['openai']['api_key'])
        self.model = config['services']['openai'].get('research_model', 'gpt-4')
    
    async def research_topic(self, niche: str, count: int = 5) -> List[ResearchTopic]:
        """Research potential blog topics in a niche"""
        prompt = f"""
        Suggest {count} blog post topics in the {niche} niche.
        For each topic:
        1. Create an SEO-optimized title
        2. Suggest 3-5 target keywords
        3. Estimate search volume (low/medium/high)
        4. Estimate competition level (0-1)
        5. Suggest target audience
        6. Brief content outline

        Format response as JSON with this structure:
        {{
            "topics": [
                {{
                    "title": "str",
                    "keywords": ["str"],
                    "search_volume": "str",
                    "competition": float,
                    "audience": "str",
                    "outline": ["str"]
                }}
            ]
        }}
        """

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a content research expert."},
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" }
        )

        try:
            result = json.loads(response.choices[0].message.content)
            topics = []
            for topic_data in result['topics']:
                topics.append(ResearchTopic(
                    title=topic_data['title'],
                    keywords=topic_data['keywords'],
                    search_volume=topic_data['search_volume'],
                    competition=topic_data['competition'],
                    content_brief=topic_data.get('outline', [])
                ))
            return topics
        except Exception as e:
            logger.error(f"Failed to parse research results: {e}")
            raise

    async def create_content_plan(self, topic: ResearchTopic) -> ContentPlan:
        """Create detailed content plan for a topic"""
        prompt = f"""
        Create a detailed content plan for: {topic.title}
        Keywords: {', '.join(topic.keywords)}

        Include:
        1. Detailed outline with sections and subsections
        2. Key points to cover
        3. Target word count
        4. Potential reference sources
        5. Target audience analysis
        6. Estimated writing time

        Format as JSON:
        {{
            "outline": ["str"],
            "key_points": ["str"],
            "word_count": int,
            "references": ["str"],
            "audience": "str",
            "writing_time": int
        }}
        """

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a content planning expert."},
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" }
        )

        try:
            result = json.loads(response.choices[0].message.content)
            return ContentPlan(
                topic=topic,
                outline=result['outline'],
                target_word_count=result['word_count'],
                key_points=result['key_points'],
                references=result['references'],
                target_audience=result['audience'],
                estimated_completion_time=result['writing_time']
            )
        except Exception as e:
            logger.error(f"Failed to create content plan: {e}")
            raise

    async def analyze_competition(self, topic: ResearchTopic) -> Dict:
        """Analyze competition for a topic"""
        prompt = f"""
        Analyze competition for blog post:
        Title: {topic.title}
        Keywords: {', '.join(topic.keywords)}

        Provide:
        1. Content gap analysis
        2. Unique angle suggestions
        3. Recommended content depth
        4. Key differentiators

        Format as JSON:
        {{
            "gaps": ["str"],
            "angles": ["str"],
            "depth": "str",
            "differentiators": ["str"]
        }}
        """

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a content strategy expert."},
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" }
        )

        return json.loads(response.choices[0].message.content)

class ContentCalendar:
    def __init__(self):
        self.planned_content: List[Dict] = []
    
    def add_content(self, plan: ContentPlan, scheduled_date: datetime) -> None:
        """Add content to calendar"""
        self.planned_content.append({
            "plan": plan,
            "scheduled_date": scheduled_date,
            "status": "planned"
        })
    
    def get_upcoming_content(self, days: int = 30) -> List[Dict]:
        """Get upcoming planned content"""
        upcoming = []
        cutoff = datetime.now().timestamp() + (days * 86400)
        
        for content in self.planned_content:
            if content["scheduled_date"].timestamp() <= cutoff:
                upcoming.append(content)
        
        return sorted(upcoming, key=lambda x: x["scheduled_date"])
    
    def update_status(self, title: str, status: str) -> bool:
        """Update content status"""
        for content in self.planned_content:
            if content["plan"].topic.title == title:
                content["status"] = status
                return True
        return False

class ContentStrategy:
    def __init__(self, config: Dict):
        self.researcher = ContentResearchManager(config)
        self.calendar = ContentCalendar()
    
    async def plan_content_calendar(self, niche: str, posts_per_week: int = 2) -> List[Dict]:
        """Plan a content calendar for the next month"""
        # Research topics
        topics = await self.researcher.research_topic(niche, count=posts_per_week * 4)
        
        planned_content = []
        current_date = datetime.now()
        
        for i, topic in enumerate(topics):
            # Create detailed plan
            plan = await self.researcher.create_content_plan(topic)
            
            # Analyze competition
            competition = await self.researcher.analyze_competition(topic)
            
            # Schedule post
            post_date = current_date + timedelta(days=(i * 7 // posts_per_week))
            self.calendar.add_content(plan, post_date)
            
            planned_content.append({
                "plan": plan,
                "competition_analysis": competition,
                "scheduled_date": post_date
            })
        
        return planned_content