
# 🕊️ Dreamer AI News Curator

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://example.com)  <!-- Replace with your actual build status badge -->
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT) <!-- Replace with your actual license -->

AI-powered tech news curated just for you, with a beautiful bird-themed design.  Dreamer AI News Curator fetches the latest articles from your favorite tech news sources, extracts the content, and even provides concise Chinese summaries.

## Features

*   **AI-Powered Curation:** Fetches articles based on keywords and preferred domains.
*   **Content Extraction:**  Uses Tavily and Exa APIs for reliable content extraction, with a fallback mechanism for robust performance.
*   **Chinese Summarization:** Generates concise summaries in Simplified Chinese using Google Gemini.
*   **Beautiful UI:**  A clean, modern, and responsive user interface with a bird-themed design.
*   **Dark/Light Mode:**  Supports both dark and light themes for comfortable reading.
*   **Customizable:**  Configure domains, articles per domain, and lookback days via URL parameters.
*   **Health Check Endpoint:**  Includes a `/health` endpoint for monitoring.
*   **Fast and Efficient:** Built with FastAPI and `aiohttp` for asynchronous operation and high performance.
*   **Easy Setup:**  Uses environment variables for API keys and configuration.

## File Structure

```
├── static
│   ├── css
│   │   ├── animations.css
│   │   ├── base.css
│   │   ├── cards.css
│   │   ├── components.css
│   │   ├── footer.css
│   │   ├── header.css
│   │   ├── modal.css
│   │   ├── navbar.css
│   │   ├── responsive.css
│   │   ├── styles.css
│   │   ├── summary.css
│   │   └── variables.css
│   └── js
│       ├── content.js
│       ├── init.js
│       ├── main.js
│       ├── theme.js
│       ├── ui.js
│       └── utils.js
├── templates
│   ├── articles
│   │   ├── article_content.html
│   │   └── loading.html
│   ├── partials
│   │   ├── footer.html
│   │   ├── header.html
│   │   ├── modals.html
│   │   └── toasts.html
│   ├── base.html
│   └── index.html
├── .env.example
├── .gitignore
├── main.py
└── requirements.txt
```

## Getting Started

### Prerequisites

*   Python 3.8+
*   pip
*   API Keys for:
    *   Exa (formerly Metaphor)
    *   Tavily
    *   Google Gemini (optional, for Chinese summarization)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```

2.  **Create a virtual environment (recommended):**

    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  **Install dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

4.  **Create a `.env` file:**

    Copy the `.env.example` file to `.env` and fill in your API keys:

    ```bash
    cp .env.example .env
    ```

    Edit the `.env` file and replace the placeholders with your actual API keys:

    ```
    EXA_API_KEY="your-exa-api-key"
    TAVILY_API_KEY="your-tavily-api-key"
    GOOGLE_API_KEY="your-google-gemini-api-key"  # Optional
    ```
    **Important:**  Do *not* commit your `.env` file to version control.  It's already included in `.gitignore`.

### Running the Application

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8081
```

*   `--reload`:  Automatically reloads the server on code changes (for development).
*   `--host 0.0.0.0`:  Makes the server accessible from other devices on your network.
*   `--port 8081`:  Specifies the port to run the server on (you can change this).

Open your web browser and go to `http://localhost:8081` (or the appropriate address if you changed the host/port).

### Configuration (via URL Parameters)

You can customize the news feed by adding query parameters to the URL:

*   `domains`:  A comma-separated list of domains to fetch articles from (e.g., `?domains=techcrunch.com,36kr.com`).  Defaults to `techcrunch.com,36kr.com,news.qq.com`.
*   `articles_per_domain`: The number of articles to fetch from each domain (e.g., `?articles_per_domain=5`). Defaults to 9.
*   `lookback_days`:  The number of days to look back for articles (e.g., `?lookback_days=3`). Defaults to 3.

**Example:**

```
http://localhost:8081/?domains=techcrunch.com,wired.com&articles_per_domain=10&lookback_days=7
```

This will fetch 10 articles from TechCrunch and Wired, looking back 7 days.

## API Endpoints

*   `/`:  The main page, displaying the curated news articles.
*   `/extract?url=<article_url>`:  Extracts the content of an article.  Returns a JSON response with the extracted content, title, source, and optionally a Chinese summary.
*   `/health`:  A health check endpoint.  Returns a JSON response with the status and timestamp.
*   `/favicon.ico`: Serves the favicon.

## Technologies Used

*   **FastAPI:**  Web framework.
*   **Uvicorn:**  ASGI server.
*   **aiohttp:**  Asynchronous HTTP client.
*   **Pydantic:**  Data validation and parsing.
*   **Jinja2:**  Templating engine.
*   **Bootstrap:**  Frontend framework.
*   **Font Awesome:**  Icons.
*   **AOS:**  Animate On Scroll library.
*   **Exa API:**  For searching and content extraction.
*   **Tavily API:** For content extraction.
*   **Google Gemini API:**  For generating Chinese summaries.
*   **python-dotenv:** For managing environment variables.

## Contributing

Contributions are welcome!  Please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and commit them with clear commit messages.
4.  Write unit tests for your changes.
5.  Submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.  (You'll need to create a LICENSE file and choose a license if you haven't already.)

## Acknowledgements

*   Thanks to the creators of all the libraries and APIs used in this project.

## TODO

*   Implement comprehensive unit tests.
*   Add caching for improved performance.
*   Consider adding user authentication and personalization features.
*   Explore alternative content extraction methods.
*   Improve error handling and user feedback.

update_20250309_032415_UTC+0800_deer

update_20250309_092151_UTC+0800_deer_blackhole chk pt

update_20250309_092235_UTC+0800_dragon
