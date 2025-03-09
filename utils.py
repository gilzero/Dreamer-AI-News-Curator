import re
from config import logger

def datetimeformat(value, format="%Y"):
    """
    Custom datetime filter for Jinja2 templates
    """
    from datetime import datetime
    return datetime.now().strftime(format)


def extract_title_from_content(content):
    """
    Try to extract a title from the content
    """
    # Simple heuristic: look for the first h1 tag or first sentence
    
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