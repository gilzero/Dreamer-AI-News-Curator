from pydantic import BaseModel, model_validator
from typing import Optional
from urllib.parse import urlparse
import pytz
from dateutil import parser
from datetime import datetime
from config import logger

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