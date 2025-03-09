"""
Cache Module

This module provides caching functionality using Upstash Redis.
It handles caching for fetched articles and AI summaries to reduce API calls.
"""

import os
import json
import hashlib
import logging
from typing import Any, Dict, List, Optional, Union
from upstash_redis import Redis
from upstash_redis.asyncio import Redis as AsyncRedis

from config import logger

# Cache expiration times (in seconds)
ARTICLE_CACHE_TTL = 60 * 60 * 24  # 24 hours
SUMMARY_CACHE_TTL = 60 * 60 * 24 * 7  # 7 days

# Initialize Redis clients
redis_url = os.getenv('UPSTASH_REDIS_REST_URL')
redis_token = os.getenv('UPSTASH_REDIS_REST_TOKEN')

if not redis_url or not redis_token:
    logger.warning("Upstash Redis credentials not found, caching will be disabled")
    redis_client = None
    async_redis_client = None
else:
    try:
        redis_client = Redis(url=redis_url, token=redis_token)
        async_redis_client = AsyncRedis(url=redis_url, token=redis_token)
        logger.info("Upstash Redis client initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing Upstash Redis client: {str(e)}")
        redis_client = None
        async_redis_client = None

def generate_cache_key(prefix: str, *args) -> str:
    """
    Generate a cache key based on the prefix and arguments.
    
    Args:
        prefix (str): The prefix for the cache key
        *args: Arguments to include in the cache key
        
    Returns:
        str: The generated cache key
    """
    key_parts = [prefix]
    for arg in args:
        if isinstance(arg, dict):
            # Sort dictionary items to ensure consistent keys
            key_parts.append(json.dumps(arg, sort_keys=True))
        elif isinstance(arg, str) and len(arg) > 1000:
            # For large strings, use a hash of the content instead of the full content
            # This prevents Redis key size limitations and improves performance
            content_hash = hashlib.sha256(arg.encode()).hexdigest()
            key_parts.append(content_hash)
        else:
            key_parts.append(str(arg))
    
    key_string = ":".join(key_parts)
    # Use MD5 to create a fixed-length key that's safe for Redis
    hashed_key = hashlib.md5(key_string.encode()).hexdigest()
    return f"{prefix}:{hashed_key}"

async def cache_get(key: str) -> Optional[Any]:
    """
    Get a value from the cache.
    
    Args:
        key (str): The cache key
        
    Returns:
        Optional[Any]: The cached value, or None if not found
    """
    if not async_redis_client:
        return None
    
    try:
        value = await async_redis_client.get(key)
        if value:
            logger.info(f"Cache hit for key: {key}")
            if isinstance(value, str) and (value.startswith('{') or value.startswith('[')):
                try:
                    return json.loads(value)
                except json.JSONDecodeError:
                    return value
            return value
        logger.info(f"Cache miss for key: {key}")
        return None
    except Exception as e:
        logger.error(f"Error getting value from cache: {str(e)}")
        return None

async def cache_set(key: str, value: Any, ttl: int = ARTICLE_CACHE_TTL) -> bool:
    """
    Set a value in the cache.
    
    Args:
        key (str): The cache key
        value (Any): The value to cache
        ttl (int, optional): Time to live in seconds. Defaults to ARTICLE_CACHE_TTL.
        
    Returns:
        bool: True if successful, False otherwise
    """
    if not async_redis_client:
        return False
    
    try:
        # Convert complex objects to JSON strings
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        
        await async_redis_client.set(key, value, ex=ttl)
        logger.info(f"Cached value for key: {key} with TTL: {ttl}s")
        return True
    except Exception as e:
        logger.error(f"Error setting value in cache: {str(e)}")
        return False

async def cache_articles_for_domain(domain: str, config: dict, articles: List[Dict]) -> None:
    """
    Cache articles for a specific domain.
    
    Args:
        domain (str): The domain name
        config (dict): The configuration used to fetch articles
        articles (List[Dict]): The articles to cache
    """
    key = generate_cache_key("articles", domain, config)
    await cache_set(key, articles, ARTICLE_CACHE_TTL)

async def get_cached_articles_for_domain(domain: str, config: dict) -> Optional[List[Dict]]:
    """
    Get cached articles for a specific domain.
    
    Args:
        domain (str): The domain name
        config (dict): The configuration used to fetch articles
        
    Returns:
        Optional[List[Dict]]: The cached articles, or None if not found
    """
    key = generate_cache_key("articles", domain, config)
    return await cache_get(key)

async def cache_article_content(url: str, content: Dict) -> None:
    """
    Cache article content for a specific URL.
    
    Args:
        url (str): The article URL
        content (Dict): The article content to cache
    """
    key = generate_cache_key("content", url)
    await cache_set(key, content, ARTICLE_CACHE_TTL)

async def get_cached_article_content(url: str) -> Optional[Dict]:
    """
    Get cached article content for a specific URL.
    
    Args:
        url (str): The article URL
        
    Returns:
        Optional[Dict]: The cached article content, or None if not found
    """
    key = generate_cache_key("content", url)
    return await cache_get(key)

async def cache_summary(content: str, title: str, summary: str) -> None:
    """
    Cache an AI-generated summary.
    
    Args:
        content (str): The content that was summarized
        title (str): The title of the content
        summary (str): The generated summary
    """
    key = generate_cache_key("summary", content, title)  # Use full content for key
    await cache_set(key, summary, SUMMARY_CACHE_TTL)

async def get_cached_summary(content: str, title: str) -> Optional[str]:
    """
    Get a cached AI-generated summary.
    
    Args:
        content (str): The content to summarize
        title (str): The title of the content
        
    Returns:
        Optional[str]: The cached summary, or None if not found
    """
    key = generate_cache_key("summary", content, title)  # Use full content for key
    return await cache_get(key) 