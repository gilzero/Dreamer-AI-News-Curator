import os
import logging
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("technews")

# Configure Google Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash')
GEMINI_TEMPERATURE = float(os.getenv('GEMINI_TEMPERATURE', '0.3'))
GEMINI_MAX_TOKENS = int(os.getenv('GEMINI_MAX_TOKENS', '2048'))
GEMINI_TOP_P = float(os.getenv('GEMINI_TOP_P', '0.8'))

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    logger.info("Google Gemini API configured successfully")
else:
    logger.warning("GEMINI_API_KEY not found, summarization will be disabled")

# Dreamer AI News Curator Configuration
class Config:
    QUERY_TERMS = ['人工智能', 'artificial intelligence', 'ai']
    DOMAINS = ["techcrunch.com", "36kr.com", "news.qq.com"]
    ARTICLES_PER_DOMAIN = 9
    LOOKBACK_DAYS = 3
    API_URL = "https://api.exa.ai/search"
    TAVILY_API_URL = "https://api.tavily.com/extract" 
