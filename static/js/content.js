// Article content functionality for the Dreamer AI News Curator
import { formatChineseSummary, copyToClipboard } from './utils.js';

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
        modalTitle,
        loadingMessage,
        loadingProgressBar,
        originalLink,
        errorMessage
    } = elements;
    
    try {
        // Show loading state
        contentLoading.classList.remove('d-none');
        contentError.classList.add('d-none');
        extractedContent.classList.add('d-none');
        extractedContent.innerHTML = '';
        
        // Reset modal title to prevent showing the previous article's title
        modalTitle.textContent = 'Loading...';
        
        // Reset progress bar
        if (loadingProgressBar) {
            loadingProgressBar.style.width = '10%';
            loadingProgressBar.setAttribute('aria-valuenow', '10');
        }
        
        if (loadingMessage) {
            loadingMessage.innerHTML = '<i class="fa-solid fa-file-import me-2 fa-bounce"></i> <span class="loading-stage">Extracting content...</span>';
        }
        
        // Set the original link
        originalLink.href = url;
        
        // Fetch content from our backend endpoint
        const response = await fetch(`/extract?url=${encodeURIComponent(url)}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch content: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Update progress bar to show extraction complete
        if (loadingProgressBar) {
            loadingProgressBar.style.width = '50%';
            loadingProgressBar.setAttribute('aria-valuenow', '50');
        }
        
        // Update loading message to show summarization stage
        if (loadingMessage) {
            loadingMessage.innerHTML = '<i class="fa-solid fa-language me-2 fa-beat"></i> <span class="loading-stage">Generating Chinese summary...</span>';
        }
        
        // Update progress bar to show completion
        if (loadingProgressBar) {
            loadingProgressBar.style.width = '100%';
            loadingProgressBar.setAttribute('aria-valuenow', '100');
        }
        
        // Update loading message to show completion
        if (loadingMessage) {
            loadingMessage.innerHTML = '<i class="fa-solid fa-check-circle me-2"></i> <span class="loading-stage">Ready to display!</span>';
        }
        
        // Add a small delay to show the completion state before displaying content
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Hide loading and show content
        contentLoading.classList.add('d-none');
        extractedContent.classList.remove('d-none');
        
        // Format and display the content
        let formattedContent = '';
        
        // Add title if available
        if (data.title) {
            modalTitle.textContent = data.title;
        } else {
            modalTitle.textContent = 'Article Content';
        }
        
        // Add source indicator if available
        let sourceLabel = '';
        if (data.source) {
            switch(data.source) {
                case 'tavily':
                    sourceLabel = '<div class="source-indicator mb-3"><span class="badge bg-primary">Tavily</span></div>';
                    extractedContent.className = 'tavily-content';
                    break;
                case 'exa':
                    sourceLabel = '<div class="source-indicator mb-3"><span class="badge bg-success">Exa</span></div>';
                    extractedContent.className = 'exa-content';
                    break;
                case 'fallback':
                    sourceLabel = '<div class="source-indicator mb-3"><span class="badge bg-warning">Preview</span></div>';
                    extractedContent.className = 'fallback-content';
                    break;
                default:
                    extractedContent.className = '';
            }
        } else {
            extractedContent.className = '';
        }
        
        // Add content
        if (data.content) {
            // Check if we have a Chinese summary available
            if (data.chinese_summary) {
                // Format the Chinese summary for better display
                let formattedSummary = formatChineseSummary(data.chinese_summary);
                
                // Store the raw summary for clipboard copying (strip HTML tags)
                const rawSummary = data.chinese_summary.replace(/```text\s?/g, '').replace(/```/g, '');
                
                formattedContent += `
                    ${sourceLabel}
                    <div class="chinese-summary-container mb-4">
                        <div class="summary-header">
                            <h3><i class="fa-solid fa-language me-2"></i>中文摘要</h3>
                            <div class="summary-divider"></div>
                        </div>
                        <div class="chinese-summary">${formattedSummary}</div>
                        <div class="summary-actions">
                            <button class="btn btn-sm btn-outline-primary copy-summary-btn" data-summary="${encodeURIComponent(rawSummary)}">
                                <i class="fa-solid fa-copy"></i> 复制摘要
                            </button>
                        </div>
                    </div>
                    <div class="content-divider mb-4"></div>
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
                        <div class="summary-divider"></div>
                    </div>
                    <div class="collapse" id="originalContentCollapse">
                        <div class="extracted-text">${data.content}</div>
                    </div>
                `;
            } else {
                formattedContent += `
                    ${sourceLabel}
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
                        <div class="summary-divider"></div>
                    </div>
                    <div class="collapse" id="originalContentCollapse">
                        <div class="extracted-text">${data.content}</div>
                    </div>
                `;
            }
        } else {
            formattedContent += `${sourceLabel}<p class="text-muted">No content available</p>`;
        }
        
        extractedContent.innerHTML = formattedContent;
        
        // Add event listeners for copy buttons (using event delegation)
        extractedContent.querySelectorAll('.copy-summary-btn').forEach(button => {
            button.addEventListener('click', function() {
                const summaryText = decodeURIComponent(this.getAttribute('data-summary'));
                copyToClipboard(summaryText, this);
            });
        });
        
    } catch (error) {
        console.error('Error fetching article content:', error);
        contentLoading.classList.add('d-none');
        contentError.classList.remove('d-none');
        errorMessage.textContent = error.message || 'Failed to load content';
    }
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