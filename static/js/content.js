// Article content functionality for the Dreamer AI News Curator
import { formatChineseSummary, copyToClipboard } from './utils.js';

/**
 * Updates the loading UI elements
 * @param {Object} elements - DOM elements for loading UI
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} message - Loading message to display
 * @param {string} iconClass - Font Awesome icon class
 * @param {string} animationClass - Font Awesome animation class
 */
const updateLoadingState = (elements, progress, message, iconClass = 'fa-file-import', animationClass = 'fa-bounce') => {
    const { loadingProgressBar, loadingMessage } = elements;
    
    if (loadingProgressBar) {
        loadingProgressBar.style.width = `${progress}%`;
        loadingProgressBar.setAttribute('aria-valuenow', progress.toString());
        
        // Add a gradient color based on progress
        if (progress < 30) {
            loadingProgressBar.style.background = 'linear-gradient(to right, var(--primary-color), var(--accent-color))';
        } else if (progress < 70) {
            loadingProgressBar.style.background = 'linear-gradient(to right, var(--accent-color), var(--success-color))';
        } else {
            loadingProgressBar.style.background = 'linear-gradient(to right, var(--success-color), var(--primary-color))';
        }
    }
    
    if (loadingMessage && message) {
        loadingMessage.innerHTML = `<i class="fa-solid ${iconClass} me-2 ${animationClass}"></i> <span class="loading-stage">${message}</span>`;
        
        // Add a subtle glow effect as progress increases
        const glowIntensity = Math.min(progress / 100 * 10, 10);
        loadingMessage.style.textShadow = `0 0 ${glowIntensity}px rgba(var(--primary-rgb), 0.5)`;
    }
};

/**
 * Initializes the UI for content loading
 * @param {Object} elements - DOM elements
 * @param {string} url - The article URL
 */
const initializeContentUI = (elements, url) => {
    const {
        contentLoading,
        contentError,
        extractedContent,
        modalTitle,
        originalLink
    } = elements;
    
    // Show loading state
    contentLoading.classList.remove('d-none');
    contentError.classList.add('d-none');
    extractedContent.classList.add('d-none');
    extractedContent.innerHTML = '';
    
    // Reset modal title to prevent showing the previous article's title
    modalTitle.textContent = 'Loading...';
    
    // Set the original link
    originalLink.href = url;
    
    // Initialize progress bar at 5%
    updateLoadingState(elements, 5, 'Preparing to extract content...');
};

/**
 * Fetches the article content from the backend
 * @param {string} url - The article URL
 * @returns {Promise<Object>} - The article data
 */
const fetchContent = async (url, elements) => {
    updateLoadingState(elements, 10, 'Sending request to server...');
    
    const response = await fetch(`/extract?url=${encodeURIComponent(url)}`);
    
    if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status}`);
    }
    
    updateLoadingState(elements, 30, 'Processing content...', 'fa-cogs', 'fa-spin');
    
    const data = await response.json();
    
    if (data.error) {
        throw new Error(data.error);
    }
    
    // Calculate content size to help with progress updates
    const contentSize = data.content ? data.content.length : 0;
    
    // Update progress based on content size
    const progressValue = 40 + Math.min(20, Math.floor(contentSize / 1000));
    updateLoadingState(elements, progressValue, 'Content extracted successfully!', 'fa-check', '');
    
    return data;
};

/**
 * Processes Chinese summary if available
 * @param {Object} data - The article data
 * @param {Object} elements - DOM elements
 */
const processChineseSummary = async (data, elements) => {
    if (data.chinese_summary) {
        updateLoadingState(elements, 70, 'Processing Chinese summary...', 'fa-language', 'fa-beat');
        
        // Simulate processing time based on summary length
        const summaryLength = data.chinese_summary.length;
        const processingTime = Math.min(500, summaryLength / 10);
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        updateLoadingState(elements, 85, 'Chinese summary ready!', 'fa-check-circle', '');
    }
};

/**
 * Applies the appropriate CSS class based on content source
 * @param {Object} data - The article data
 * @param {HTMLElement} extractedContent - The content container element
 * @returns {string} - Source label HTML if needed
 */
const applySourceStyling = (data, extractedContent) => {
    let sourceLabel = '';
    
    // Add a glass-content class to all content types for consistent glassmorphism styling
    if (data.source) {
        switch(data.source) {
            case 'tavily':
                extractedContent.className = 'tavily-content glass-content';
                break;
            case 'exa':
                extractedContent.className = 'exa-content glass-content';
                break;
            case 'fallback':
                extractedContent.className = 'fallback-content glass-content';
                break;
            default:
                extractedContent.className = 'glass-content';
        }
    } else {
        extractedContent.className = 'glass-content';
    }
    
    return sourceLabel;
};

/**
 * Formats and displays the content in the modal
 * @param {Object} data - The article data
 * @param {Object} elements - DOM elements
 */
const displayContent = (data, elements) => {
    const { extractedContent, modalTitle } = elements;
    let formattedContent = '';
    
    // Add title if available
    modalTitle.innerHTML = '<span class="ai-icon">🤖</span> AI Summary';
    
    // Apply source styling
    const sourceLabel = applySourceStyling(data, extractedContent);
    
    // Add content
    if (data.content) {
        // Check if we have a Chinese summary available
        if (data.chinese_summary) {
            // Format the Chinese summary for better display
            let formattedSummary = formatChineseSummary(data.chinese_summary);
            
            // Store the raw summary for clipboard copying (strip HTML tags)
            const rawSummary = data.chinese_summary.replace(/```text\s?/g, '').replace(/```/g, '');
            
            // Get article title for display
            const articleTitle = data.title || 'Untitled Article';
            
            formattedContent += `
                ${sourceLabel}
                
                <div class="chinese-summary-container mb-4">
                    <div class="summary-header">
                        <h3><i class="fa-solid fa-language me-2"></i>中文摘要</h3>
                        <div class="summary-divider"></div>
                    </div>
                    <div class="chinese-summary">${formattedSummary}</div>
                    <div class="summary-actions">
                        <button class="copy-summary-btn" data-summary="${encodeURIComponent(rawSummary)}">
                            <i class="fa-solid fa-copy"></i> 复制摘要
                        </button>
                    </div>
                </div>
                <div class="content-divider mb-4"></div>
                ${getOriginalContentSection(data.content)}
            `;
        } else {
            formattedContent += `
                ${sourceLabel}
                ${getOriginalContentSection(data.content)}
            `;
        }
    } else {
        formattedContent += `
            ${sourceLabel}
            <div class="no-content-container glass-card">
                <div class="no-content-icon"><i class="fa-solid fa-file-circle-xmark"></i></div>
                <p class="no-content-message">No content available for this article</p>
            </div>
        `;
    }
    
    extractedContent.innerHTML = formattedContent;
};

/**
 * Sets up event listeners for the content
 * @param {HTMLElement} extractedContent - The content container
 */
const setupEventListeners = (extractedContent) => {
    // Add event listeners for copy buttons (using event delegation)
    extractedContent.querySelectorAll('.copy-summary-btn').forEach(button => {
        button.addEventListener('click', function() {
            const summaryText = decodeURIComponent(this.getAttribute('data-summary'));
            copyToClipboard(summaryText, this);
        });
    });
};

/**
 * Fetches article content using the backend API
 * @param {string} url - The URL of the article to fetch
 * @param {Object} elements - DOM elements needed for content display
 */
export const fetchArticleContent = async (url, elements) => {
    const {
        contentLoading,
        contentError,
        extractedContent,
        errorMessage
    } = elements;
    
    try {
        // Initialize UI
        initializeContentUI(elements, url);
        
        // Fetch content
        const data = await fetchContent(url, elements);
        
        // Process Chinese summary if available
        await processChineseSummary(data, elements);
        
        // Final loading state
        updateLoadingState(elements, 95, 'Preparing display...', 'fa-check-circle', '');
        
        // Add a small delay to show the completion state before displaying content
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update to 100% complete
        updateLoadingState(elements, 100, 'Ready to display!', 'fa-check-circle', '');
        
        // Add a small delay to show the completion state
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Hide loading and show content
        contentLoading.classList.add('d-none');
        extractedContent.classList.remove('d-none');
        
        // Format and display the content
        displayContent(data, elements);
        
        // Set up event listeners
        setupEventListeners(extractedContent);
        
    } catch (error) {
        console.error('Error fetching article content:', error);
        contentLoading.classList.add('d-none');
        contentError.classList.remove('d-none');
        errorMessage.textContent = error.message || 'Failed to load content';
    }
};

/**
 * Helper function to generate the original content section HTML
 * @param {string} content - The original content to display
 * @returns {string} HTML for the original content section
 */
const getOriginalContentSection = (content) => {
    return `
        <div class="original-content-container mb-4">
        <div class="original-content-header">
            <button class="btn btn-link collapsed p-0 text-decoration-none d-flex align-items-center" 
                    type="button" 
                    data-bs-toggle="collapse" 
                    data-bs-target="#originalContentCollapse" 
                    aria-expanded="false" 
                    aria-controls="originalContentCollapse">
                <h3 class="mb-0"><i class="fa-solid fa-file-lines me-2"></i>Original Content</h3>
                <i class="fa-solid fa-chevron-down ms-2 toggle-icon"></i>
            </button>

        </div>
        <div class="collapse" id="originalContentCollapse">
            <div class="extracted-text">${content}</div>
        </div>
        </div>
    `;
};

/**
 * Initializes article preview functionality
 * @param {HTMLElement} articlesContainer - The container for all articles
 * @param {bootstrap.Modal} contentModal - The Bootstrap modal for content display
 * @param {Object} modalElements - DOM elements needed for content display
 */
export const initializeArticlePreview = (articlesContainer, contentModal, modalElements) => {
    if (articlesContainer) {
        articlesContainer.addEventListener('click', (e) => {
            const previewButton = e.target.closest('.preview-article');
            if (previewButton) {
                e.preventDefault();
                const url = previewButton.getAttribute('data-url');
                const title = previewButton.getAttribute('data-title') || '';
                console.log('Preview button clicked for URL:', url);
                
                // Show the modal first with loading state
                if (contentModal) {
                    contentModal.show();
                    // Set a temporary title based on the article if available
                    if (title) {
                        modalElements.modalTitle.textContent = title;
                    }
                } else {
                    console.error('Content modal not initialized');
                }
                
                // Then fetch the content
                fetchArticleContent(url, modalElements);
            }
        });
    }
}; 