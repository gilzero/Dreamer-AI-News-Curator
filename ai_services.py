"""
AI Services Module

This module contains functions for interacting with AI services like Google Gemini.
It handles text summarization and other AI-powered content processing tasks.
"""

import re
import asyncio
import logging
from typing import Optional

import google.generativeai as genai
from config import GOOGLE_API_KEY, logger

async def generate_summary_with_gemini(content: str, title: str = "") -> Optional[str]:
    """
    Generate a summary of the content using Google Gemini API.
    
    Args:
        content (str): The HTML content to summarize
        title (str, optional): The title of the content. Defaults to "".
        
    Returns:
        Optional[str]: The generated summary in Simplified Chinese, or None if generation failed
    """
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not found, skipping summarization")
        return None
    
    try:
        # Strip HTML tags from content for better summarization
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