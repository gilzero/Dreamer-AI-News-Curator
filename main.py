from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
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
import google.generativeai as genai


# Dreamer AI News Curator Configuration
class Config:
    QUERY_TERMS = ['人工智能', 'artificial intelligence', 'ai']
    DOMAINS = ["techcrunch.com", "36kr.com", "news.qq.com"]
    ARTICLES_PER_DOMAIN = 9
    LOOKBACK_DAYS = 3
    API_URL = "https://api.exa.ai/search"
    TAVILY_API_URL = "https://api.tavily.com/extract"


# Setup
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Google Gemini API
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    logger.info("Google Gemini API configured successfully")
else:
    logger.warning("GOOGLE_API_KEY not found, summarization will be disabled")

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
async def favicon(request: Request):
    return FileResponse("static/favicon.ico")


@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


@app.get("/extract")
async def extract_content(url: str):
    """
    Extract content from a URL using the Tavily Extract API with Exa API as fallback
    If both APIs fail or are not configured, returns a mock response
    Includes a Chinese summary generated by Google Gemini if available
    """
    # Extract domain from URL for domain-specific handling
    domain = urlparse(url).netloc
    
    # Try Tavily API first (better for article extraction)
    tavily_result = await try_tavily_extraction(url, domain)
    if tavily_result and not tavily_result.get("is_fallback"):
        # Add Chinese summary if Google API key is available
        if GOOGLE_API_KEY:
            summary = await generate_summary_with_gemini(tavily_result["content"], tavily_result.get("title", ""))
            if summary:
                tavily_result["chinese_summary"] = summary
        return tavily_result
    
    # If Tavily failed or returned fallback, try Exa API
    exa_result = await try_exa_extraction(url, domain)
    if exa_result and not exa_result.get("is_fallback"):
        # Add Chinese summary if Google API key is available
        if GOOGLE_API_KEY:
            summary = await generate_summary_with_gemini(exa_result["content"], exa_result.get("title", ""))
            if summary:
                exa_result["chinese_summary"] = summary
        return exa_result
    
    # If both APIs failed, use our fallback content
    logger.warning(f"Both Tavily and Exa APIs failed for {url}, using fallback content")
    fallback_content = generate_fallback_content(url, domain)
    return fallback_content


async def try_tavily_extraction(url, domain):
    """
    Try to extract content using Tavily API
    """
    tavily_api_key = os.getenv('TAVILY_API_KEY', '')
    
    # Special handling for sites that Tavily has trouble with
    if "36kr.com" in domain or "news.qq.com" in domain:
        logger.info(f"Using custom handling for {domain}")
        # Still try Tavily, but if it fails we'll fall back to Exa or our fallback content
        # This gives Tavily a chance to work if they've improved their extraction for these sites
    
    # If no API key, skip Tavily
    if not tavily_api_key:
        logger.warning("TAVILY_API_KEY not found, skipping Tavily extraction")
        return None
    
    try:
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        async with aiohttp.ClientSession(
                connector=aiohttp.TCPConnector(ssl=ssl_context)
        ) as session:
            async with session.post(
                Config.TAVILY_API_URL,
                json={"urls": url, "include_images": False, "extract_depth": "advanced"},
                headers={"Authorization": f"Bearer {tavily_api_key}", "Content-Type": "application/json"}
            ) as response:
                logger.info(f"Tavily API response status: {response.status}")
                
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Tavily API error: {error_text}")
                    return None
                
                data = await response.json()
                
                # Handle the response format according to the API documentation
                if "results" in data and len(data["results"]) > 0:
                    result = data["results"][0]
                    content = result.get("raw_content", "")
                    
                    # If no content was extracted or it's too short, return None
                    if not content or len(content) < 100:
                        logger.warning(f"Insufficient content extracted from {url} using Tavily")
                        return None
                    
                    # Try to extract a title from the content
                    title = extract_title_from_content(content) or f"Article from {domain}"
                    
                    return {
                        "title": title,
                        "content": content,
                        "url": result.get("url", url),
                        "source": "tavily"
                    }
                
                logger.warning(f"No results found for {url} using Tavily")
                return None
                
    except Exception as e:
        logger.error(f"Error extracting content with Tavily: {str(e)}")
        return None


async def try_exa_extraction(url, domain):
    """
    Try to extract content using Exa API
    """
    exa_api_key = os.getenv('EXA_API_KEY', '')
    
    # If no API key, skip Exa
    if not exa_api_key:
        logger.warning("EXA_API_KEY not found, skipping Exa extraction")
        return None
    
    try:
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        async with aiohttp.ClientSession(
                connector=aiohttp.TCPConnector(ssl=ssl_context)
        ) as session:
            async with session.post(
                "https://api.exa.ai/contents",
                json={
                    "urls": [url],
                    "text": True,
                    "summary": {"enabled": True},
                    "livecrawl": "always",
                    "livecrawlTimeout": 10000  # Maximum allowed by Exa API
                },
                headers={"Authorization": f"Bearer {exa_api_key}", "Content-Type": "application/json"}
            ) as response:
                logger.info(f"Exa API response status: {response.status}")
                
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Exa API error: {error_text}")
                    return None
                
                data = await response.json()
                
                if "results" in data and len(data["results"]) > 0:
                    result = data["results"][0]
                    content = result.get("text", "")
                    summary = result.get("summary", "")
                    title = result.get("title", f"Article from {domain}")
                    
                    # If no content was extracted or it's too short, return None
                    if not content or len(content) < 100:
                        logger.warning(f"Insufficient content extracted from {url} using Exa")
                        return None
                    
                    # Format the content nicely
                    # Process the content to replace newlines with <br> tags before using in f-string
                    processed_content = content.replace('\n', '<br>')
                    summary_html = f"<div class='summary-box'><h3>Summary</h3><p>{summary}</p></div>" if summary else ""
                    
                    formatted_content = f"""
                    <div class="exa-content">
                        <h1>{title}</h1>
                        
                        {summary_html}
                        
                        <div class="article-content">
                            {processed_content}
                        </div>
                    </div>
                    """
                    
                    return {
                        "title": title,
                        "content": formatted_content,
                        "url": url,
                        "source": "exa"
                    }
                
                logger.warning(f"No results found for {url} using Exa")
                return None
                
    except Exception as e:
        logger.error(f"Error extracting content with Exa: {str(e)}")
        return None


def generate_fallback_content(url, domain):
    """
    Generate fallback content for URLs that can't be extracted
    """
    title = f"Article from {domain}"
    
    # Generate some mock content based on the URL
    mock_content = f"""
    <div class="fallback-content">
        <h2>Content Preview Unavailable</h2>
        <p>We're unable to extract the full content from this article at <strong>{domain}</strong>.</p>
        <p>This could be due to:</p>
        <ul>
            <li>The website has content protection measures</li>
            <li>The content requires a login or subscription</li>
            <li>The page uses complex dynamic content loading</li>
            <li>Regional access restrictions</li>
        </ul>
        <p>To read the full article, please visit the original source:</p>
        <p><a href="{url}" target="_blank" class="btn btn-primary">Visit Original Article</a></p>
    </div>
    """
    
    return {
        "title": title,
        "content": mock_content,
        "url": url,
        "is_fallback": True,
        "source": "fallback"
    }


async def generate_summary_with_gemini(content, title=""):
    """
    Generate a summary of the content using Google Gemini API
    Returns the summary in Simplified Chinese
    """
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not found, skipping summarization")
        return None
    
    try:
        # Strip HTML tags from content for better summarization
        import re
        clean_content = re.sub(r'<[^>]+>', ' ', content)
        clean_content = re.sub(r'\s+', ' ', clean_content).strip()
        
        # Create the system prompt with the content
        system_prompt = """
        <system_prompt>
          <role>expert_assistant</role>
          <task>Create concise, accurate summaries from a provided text.</task>
          <input_context>{context}</input_context>
          <guidelines>
            <core_requirements>
              <requirement id="1">Summarize the main ideas in ~50–70% fewer words, keeping key details.</requirement>
              <requirement id="2">Remain factually accurate; avoid adding or altering information.</requirement>
              <requirement id="3">Preserve the text's original tone and intent.</requirement>
              <requirement id="4">Use clear, accessible language for a college-educated audience.</requirement>
              <requirement id="5">Output must be in Simplified Chinese.</requirement>
            </core_requirements>
            <summary_structure>
              <element id="1">Begin with a 1–2 sentence overview capturing the central message.</element>
              <element id="2">Follow with 2–3 paragraphs elaborating on the key points.</element>
              <element id="3">Include critical data, statistics, or quotes that are essential to the message.</element>
            </summary_structure>
            <special_handling>
              <content_type type="technical">
                <instruction>Retain important terms; simplify complex concepts.</instruction>
              </content_type>
              <content_type type="narrative">
                <instruction>Keep primary plot points and character relationships.</instruction>
              </content_type>
              <content_type type="analytical">
                <instruction>Emphasize main arguments and supporting evidence.</instruction>
              </content_type>
              <content_type type="instructional">
                <instruction>Retain crucial steps, warnings, and brief rationale.</instruction>
              </content_type>
            </special_handling>
            <formatting>
              <instruction id="1">Use clean paragraphs without markup syntax.</instruction>
              <instruction id="2">Ignore syntax markers such as ** and *.</instruction>
              <instruction id="3">Write concise paragraphs with proper breaks.</instruction>
              <instruction id="4">Use numbered lists where relevant.</instruction>
              <instruction id="5">Prepend one relevant emoji to each numbered item to enhance understanding of the point.</instruction>
            </formatting>
            <exclusions>
              <exclusion id="1">No personal opinions or new interpretations.</exclusion>
              <exclusion id="2">Omit meta-information (e.g., author bios, dates) unless crucial.</exclusion>
              <exclusion id="3">Exclude redundant or off-topic details.</exclusion>
            </exclusions>
            <error_handling>
              <instruction id="1">If unclear or ambiguous, highlight the most certain information.</instruction>
              <instruction id="2">For unclear technical terms, include them with brief explanations.</instruction>
            </error_handling>
            <key_points_generation>
              <instruction id="1">Provide them as a numbered list (e.g., "1) ...", "2) ..."), extracting crucial concepts or data.</instruction>
              <instruction id="2">Include the most important facts, arguments, or insights.</instruction>
              <instruction id="3">If the original text has a "Key Points" section, build on it and/or enrich it.</instruction>
            </key_points_generation>
            <output_format>
              <element name="title">标题: (If in original or inferred)</element>
              <element name="summary">摘要: (Comprehensive, adhering to the above rules)</element>
              <element name="key_points">关键点: A numbered list of 5–20 critical takeaways.</element>
            </output_format>
          </guidelines>
          <goal>Deliver a self-contained summary that faithfully reflects the original content's message and intent, with clear formatting and minimal extraneous markings, in Simplified Chinese.</goal>
        </system_prompt>
        """.replace("{context}", clean_content)
        
        # Configure the model
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Generate the summary
        response = await asyncio.to_thread(
            model.generate_content,
            system_prompt,
            generation_config={
                "temperature": 0.2,
                "top_p": 0.8,
                "top_k": 40,
                "max_output_tokens": 2048,
            }
        )
        
        if response and response.text:
            logger.info(f"Successfully generated summary with Gemini")
            return response.text
        else:
            logger.warning(f"Empty response from Gemini API")
            return None
            
    except Exception as e:
        logger.error(f"Error generating summary with Gemini: {str(e)}")
        return None


def extract_title_from_content(content):
    """
    Try to extract a title from the content
    """
    # Simple heuristic: look for the first h1 tag or first sentence
    import re
    
    # Try to find an h1 tag
    h1_match = re.search(r'<h1[^>]*>(.*?)</h1>', content, re.IGNORECASE | re.DOTALL)
    if h1_match:
        # Clean up any HTML tags inside the h1
        title = re.sub(r'<[^>]+>', '', h1_match.group(1)).strip()
        if title:
            return title
    
    # Try to find the first sentence
    sentences = re.split(r'[.!?]\s', content[:500])
    if sentences and len(sentences[0]) > 10:
        # Clean up any HTML tags
        title = re.sub(r'<[^>]+>', '', sentences[0]).strip()
        if len(title) > 50:
            title = title[:50] + '...'
        return title
    
    return None


if __name__ == "__main__":
    # Basic startup validation
    if not os.path.exists('templates'):
        logger.error("Templates directory not found")
        exit(1)
    uvicorn.run(app, host="0.0.0.0", port=8081)