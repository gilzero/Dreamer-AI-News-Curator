# file: services.py
import aiohttp
import ssl
import certifi
import logging
import asyncio
import os
import re
from typing import List, Dict
from datetime import datetime, timedelta
from urllib.parse import urlparse

from models import Article
from config import Config, logger
from utils import extract_title_from_content
from ai_services import generate_summary_with_gemini
from cache import get_cached_articles_for_domain, cache_articles_for_domain, get_cached_article_content, cache_article_content

class ArticleFetcher:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.ssl_context = ssl.create_default_context(cafile=certifi.where())

    async def fetch_for_domain(self, session: aiohttp.ClientSession, domain: str, config: dict) -> List[Dict]:
        try:
            # Check cache first
            cached_articles = await get_cached_articles_for_domain(domain, config)
            if cached_articles:
                logger.info(f"Using cached articles for {domain}")
                return cached_articles
                
            # If not in cache, fetch from API
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
                
                # Cache the results
                if results:
                    await cache_articles_for_domain(domain, config, results)
                    
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


async def try_tavily_extraction(url, domain):
    """
    Try to extract content using Tavily API
    """
    # Check cache first
    cached_content = await get_cached_article_content(url)
    if cached_content and cached_content.get("source") == "tavily":
        logger.info(f"Using cached Tavily content for {url}")
        return cached_content
        
    tavily_api_key = os.getenv('TAVILY_API_KEY', '')
        
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
                    
                    tavily_result = {
                        "title": title,
                        "content": content,
                        "url": result.get("url", url),
                        "source": "tavily"
                    }
                    
                    # Cache the result
                    await cache_article_content(url, tavily_result)
                    
                    return tavily_result
                
                logger.warning(f"No results found for {url} using Tavily")
                return None
                
    except Exception as e:
        logger.error(f"Error extracting content with Tavily: {str(e)}")
        return None


async def try_exa_extraction(url, domain):
    """
    Try to extract content using Exa API
    """
    # Check cache first
    cached_content = await get_cached_article_content(url)
    if cached_content and cached_content.get("source") == "exa":
        logger.info(f"Using cached Exa content for {url}")
        return cached_content
        
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
                    
                    exa_result = {
                        "title": title,
                        "content": formatted_content,
                        "url": url,
                        "source": "exa"
                    }
                    
                    # Cache the result
                    await cache_article_content(url, exa_result)
                    
                    return exa_result
                
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