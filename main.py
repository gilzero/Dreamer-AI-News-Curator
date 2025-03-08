from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import aiohttp
from datetime import datetime, timedelta
import os
from typing import List, Dict, Optional
from pydantic import BaseModel, field_validator, model_validator
import ssl
import certifi
import logging
import asyncio
from dotenv import load_dotenv
from urllib.parse import urlparse
from collections import defaultdict
import uvicorn
import pytz
from dateutil import parser


# Dreamer AI News Curator Configuration
class Config:
    QUERY_TERMS = ['人工智能', 'artificial intelligence', 'ai']
    DOMAINS = ["techcrunch.com", "36kr.com", "news.qq.com"]
    ARTICLES_PER_DOMAIN = 15
    LOOKBACK_DAYS = 7
    API_URL = "https://api.exa.ai/search"


# Setup
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="🕊️ Dreamer AI News Curator",
    description="AI-powered tech news curated just for you, with a beautiful bird-themed design",
    version="1.0.0"
)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# Add custom datetime filter
def datetimeformat(value, format="%Y"):
    return datetime.now().strftime(format)


templates.env.filters['datetimeformat'] = datetimeformat


# Models
class Article(BaseModel):
    title: str = "未命名"
    url: str
    publishedDate: str = "未知"
    source: Optional[str] = None
    formatted_date: Optional[str] = None

    @model_validator(mode='after')
    def set_derived_fields(self):
        # Set source if not already set
        if not self.source:
            self.source = self.get_source_from_url(self.url)
            
        # Set formatted_date if not already set
        if not self.formatted_date:
            try:
                date_str = self.publishedDate
                if not date_str or date_str == "未知":
                    self.formatted_date = "未知日期"
                else:
                    # Parse the ISO format date
                    dt = parser.parse(date_str)
                    
                    # Convert to China timezone (UTC+8)
                    china_tz = pytz.timezone('Asia/Shanghai')
                    if dt.tzinfo is None:
                        # If the datetime has no timezone info, assume it's UTC
                        dt = dt.replace(tzinfo=pytz.UTC)
                    
                    # Convert to China timezone
                    dt = dt.astimezone(china_tz)
                    
                    # Format the date in YYYY-MM-DD format
                    self.formatted_date = dt.strftime('%Y-%m-%d')
            except Exception as e:
                logger.warning(f"Date formatting error: {str(e)}")
                self.formatted_date = "未知日期"
                
        return self

    @staticmethod
    def get_source_from_url(url: str) -> str:
        try:
            domain = urlparse(url).netloc.replace("www.", "")
            source_map = {
                "techcrunch.com": "TechCrunch",
                "36kr.com": "36Kr",
                "m.36kr.com": "36Kr",
                "news.qq.com": "腾讯新闻",
                "163.com": "网易新闻",
                "theinformation.com": "The Information",
                "yahoo.com": "Yahoo",
                "bloomberg.com": "Bloomberg",
                "reuters.com": "Reuters",
                "cnbc.com": "CNBC",
                "wsj.com": "Wall Street Journal",
                "nytimes.com": "New York Times",
                "ft.com": "Financial Times",
                "ftchinese.com": "Financial Times (Chinese)",
            }
            return source_map.get(domain, domain)
        except Exception:
            return "未知来源"


# Services
class ArticleFetcher:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.ssl_context = ssl.create_default_context(cafile=certifi.where())

    async def fetch_for_domain(self, session: aiohttp.ClientSession, domain: str, config: dict) -> List[Dict]:
        try:
            now = datetime.now()
            start_date = now - timedelta(days=config['lookback_days'])

            payload = {
                'query': " ".join(Config.QUERY_TERMS),
                'numResults': config['articles_per_domain'],
                'startPublishedDate': start_date.isoformat(),
                'endPublishedDate': now.isoformat(),
                'includeDomains': [domain]
            }

            async with session.post(
                    Config.API_URL,
                    headers={'x-api-key': self.api_key, 'Content-Type': 'application/json'},
                    json=payload
            ) as response:
                logger.info(f"API response status for {domain}: {response.status}")
                data = await response.json()
                results = data.get('results', [])
                logger.info(f"Fetched {len(results)} articles from {domain}")
                return results
        except Exception as e:
            logger.error(f"Error fetching articles from {domain}: {str(e)}")
            return []

    async def fetch_all(self, config: dict) -> List[Article]:
        if not self.api_key:
            logger.warning("EXA_API_KEY not found")
            return []

        try:
            async with aiohttp.ClientSession(
                    connector=aiohttp.TCPConnector(ssl=self.ssl_context)
            ) as session:
                tasks = [self.fetch_for_domain(session, domain, config) for domain in config['domains']]
                results = await asyncio.gather(*tasks, return_exceptions=True)

                articles = []
                for domain_results in results:
                    if isinstance(domain_results, Exception):
                        logger.error(f"Task failed with exception: {domain_results}")
                        continue
                    for article in domain_results:
                        try:
                            articles.append(Article(**article))
                        except Exception as e:
                            logger.warning(f"Article validation failed: {str(e)}")
                            articles.append(Article(url=article.get('url', '#')))
                return articles
        except Exception as e:
            logger.error(f"Critical error in fetch_all: {str(e)}")
            return []


# Routes
@app.get("/", response_class=HTMLResponse)
async def home(
    request: Request, 
    domains: str = None,
    articles_per_domain: int = None,
    lookback_days: int = None
):
    # Get configuration from query parameters or use defaults
    user_domains = domains.split(',') if domains else Config.DOMAINS
    user_articles_per_domain = articles_per_domain if articles_per_domain is not None else Config.ARTICLES_PER_DOMAIN
    user_lookback_days = lookback_days if lookback_days is not None else Config.LOOKBACK_DAYS
    
    # Create a custom config for this request
    custom_config = {
        'domains': user_domains,
        'articles_per_domain': user_articles_per_domain,
        'lookback_days': user_lookback_days
    }
    
    fetcher = ArticleFetcher(os.getenv('EXA_API_KEY', ''))
    articles = await fetcher.fetch_all(custom_config)

    grouped_articles = defaultdict(list)
    for article in articles:
        grouped_articles[article.source].append(article)

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "grouped_articles": dict(grouped_articles),
            "config": custom_config,
            "domains_str": ','.join(user_domains)
        }
    )


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return StaticFiles(directory="static").get_response("favicon.ico")


@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


if __name__ == "__main__":
    # Basic startup validation
    if not os.path.exists('templates'):
        logger.error("Templates directory not found")
        exit(1)
    uvicorn.run(app, host="0.0.0.0", port=8081)