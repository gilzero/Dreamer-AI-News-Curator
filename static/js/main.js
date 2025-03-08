document.addEventListener('DOMContentLoaded', () => {
    console.log('Dreamer AI News Curator loaded');
    
    // Initialize AOS animations with improved settings
    AOS.init({
        duration: 800,
        easing: 'ease-out',
        once: false,
        offset: 100,
        delay: 100,
        mirror: true,
        anchorPlacement: 'top-bottom'
    });
    
    // Refresh AOS on window resize for better responsiveness
    window.addEventListener('resize', () => {
        AOS.refresh();
    });
    
    // DOM Elements
    const loading = document.getElementById('loading');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('i');
    const backToTopBtn = document.getElementById('back-to-top');
    const viewButtons = document.querySelectorAll('.view-btn');
    const articleGrid = document.querySelector('.article-grid');
    const refreshBtn = document.getElementById('refresh-btn');
    const retryBtn = document.getElementById('retry-btn');
    const articlesContainer = document.getElementById('articles-container');
    const logoIcon = document.querySelector('.logo-icon');
    const toastElement = document.getElementById('toast');
    const toast = toastElement ? new bootstrap.Toast(toastElement, { delay: 3000 }) : null;
    
    // Content Modal Elements
    const contentModalElement = document.getElementById('contentModal');
    const contentModal = contentModalElement ? new bootstrap.Modal(contentModalElement) : null;
    const contentLoading = document.getElementById('contentLoading');
    const contentError = document.getElementById('contentError');
    const errorMessage = document.getElementById('errorMessage');
    const extractedContent = document.getElementById('extractedContent');
    const originalLink = document.getElementById('originalLink');
    const modalTitle = document.getElementById('contentModalLabel');
    
    // Function to show toast notifications
    const showToast = (message) => {
        if (toast) {
            const toastBody = toastElement.querySelector('.toast-body');
            toastBody.textContent = message;
            toast.show();
        }
    };
    
    // Function to copy text to clipboard
    const copyToClipboard = async (text, button) => {
        try {
            await navigator.clipboard.writeText(text);
            
            // Visual feedback for successful copy
            button.classList.add('copy-success');
            button.innerHTML = '<i class="fa-solid fa-check"></i> 已复制';
            
            // Show toast notification
            showToast('摘要已复制到剪贴板 ✅');
            
            // Reset button after 2 seconds
            setTimeout(() => {
                button.classList.remove('copy-success');
                button.innerHTML = '<i class="fa-solid fa-copy"></i> 复制摘要';
            }, 2000);
            
        } catch (err) {
            console.error('Failed to copy text: ', err);
            showToast('复制失败，请重试');
        }
    };
    
    // Add hover effect to the logo icon
    if (logoIcon) {
        logoIcon.addEventListener('mouseover', () => {
            logoIcon.classList.add('fa-beat');
        });
        
        logoIcon.addEventListener('mouseout', () => {
            logoIcon.classList.remove('fa-beat');
        });
    }
    
    // Add interactive effects to article cards - using event delegation
    if (articlesContainer) {
        articlesContainer.addEventListener('mouseenter', (e) => {
            const card = e.target.closest('.article-card');
            if (card) {
                const icon = card.querySelector('.fa-bookmark');
                if (icon) {
                    icon.classList.add('fa-bounce');
                    setTimeout(() => {
                        icon.classList.remove('fa-bounce');
                    }, 1000);
                }
            }
        }, true);
    }
    
    // Function to format Chinese summary for better display
    function formatChineseSummary(summary) {
        // Remove any code block markers
        summary = summary.replace(/```text\s?/g, '').replace(/```/g, '');
        
        // Format the title section
        summary = summary.replace(/\u6807\u9898:\s*([^\n]+)/, '<div class="summary-section"><strong class="summary-label">标题:</strong> <span class="summary-title">$1</span></div>');
        
        // Format the summary section
        summary = summary.replace(/\u6458\u8981:\s*([\s\S]*?)(?=\u5173\u952e\u70b9:|$)/, '<div class="summary-section"><strong class="summary-label">摘要:</strong><div class="summary-content">$1</div></div>');
        
        // Format the key points section
        if (summary.includes('关键点:')) {
            let keyPointsSection = summary.match(/\u5173\u952e\u70b9:[\s\S]*$/);
            if (keyPointsSection) {
                let keyPointsText = keyPointsSection[0];
                // Replace the numbered list items with formatted list items
                let formattedKeyPoints = keyPointsText.replace(/\u5173\u952e\u70b9:/, '<div class="summary-section"><strong class="summary-label">关键点:</strong><ul class="key-points-list">');
                formattedKeyPoints = formattedKeyPoints.replace(/(\d+\.\s*)(.*?)(?=\d+\.|$)/g, function(match, number, content) {
                    // Extract emoji if present
                    const emojiMatch = content.match(/^\s*(\p{Emoji})\s*(.*)/u);
                    if (emojiMatch) {
                        const emoji = emojiMatch[1];
                        const text = emojiMatch[2];
                        return `<li><span class="key-point-emoji">${emoji}</span> ${text}</li>`;
                    } else {
                        return `<li>${content}</li>`;
                    }
                });
                formattedKeyPoints += '</ul></div>';
                
                // Replace the original key points section with the formatted one
                summary = summary.replace(/\u5173\u952e\u70b9:[\s\S]*$/, formattedKeyPoints);
            }
        }
        
        // Clean up any remaining newlines and convert them to proper HTML
        summary = summary.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
        
        return summary;
    }
    
    // Function to fetch article content using Tavily Extract API
    const fetchArticleContent = async (url) => {
        try {
            // Show loading state
            contentLoading.classList.remove('d-none');
            contentError.classList.add('d-none');
            extractedContent.classList.add('d-none');
            extractedContent.innerHTML = '';
            
            // Reset modal title to prevent showing the previous article's title
            modalTitle.textContent = 'Loading...';
            
            // Update loading message to show extraction stage
            const loadingMessage = document.getElementById('loadingMessage');
            const loadingProgressBar = document.getElementById('loadingProgressBar');
            
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
    
    // Add click event to preview buttons using event delegation
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
                        modalTitle.textContent = title;
                    }
                } else {
                    console.error('Content modal not initialized');
                }
                
                // Then fetch the content
                fetchArticleContent(url);
            }
            
            // Handle save article button clicks
            const saveButton = e.target.closest('.save-article');
            if (saveButton) {
                e.preventDefault();
                const url = saveButton.getAttribute('data-url');
                const icon = saveButton.querySelector('i');
                
                if (icon.classList.contains('fa-regular')) {
                    if (saveArticle(url)) {
                        icon.classList.remove('fa-regular');
                        icon.classList.add('fa-solid');
                        icon.classList.add('fa-bounce');
                        setTimeout(() => {
                            icon.classList.remove('fa-bounce');
                        }, 1000);
                    }
                } else {
                    if (removeArticle(url)) {
                        icon.classList.remove('fa-solid');
                        icon.classList.add('fa-regular');
                    }
                }
            }
        });
    };
    
    // Hide loading spinner after content loads
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (loading) {
                loading.style.display = 'none';
            }
            
            // Show welcome toast on first load
            const isFirstVisit = !localStorage.getItem('visited');
            if (isFirstVisit) {
                localStorage.setItem('visited', 'true');
                showToast('Welcome to Dreamer AI News Curator! 🕊️');
            }
        }, 800);
    });
    
    // Theme toggle functionality
    const getCurrentTheme = () => localStorage.getItem('theme') || 'light';
    
    const saveTheme = (theme) => localStorage.setItem('theme', theme);
    
    // Apply theme to document and toggle button
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        
        if (theme === 'dark') {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
    };
    
    // Initialize theme
    applyTheme(getCurrentTheme());
    
    // Toggle theme on button click
    themeToggle.addEventListener('click', () => {
        const currentTheme = getCurrentTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        // Add animation to theme toggle
        themeIcon.classList.add('fa-flip');
        setTimeout(() => {
            themeIcon.classList.remove('fa-flip');
        }, 1000);
        
        saveTheme(newTheme);
        applyTheme(newTheme);
        
        // Show a toast notification
        showToast(`Switched to ${newTheme} mode 🌓`);
    });
    
    // View Toggle Functionality (Card/List view)
    viewButtons.forEach(button => {
        button.addEventListener('click', () => {
            const view = button.getAttribute('data-view');
            
            // Remove active class from all buttons
            viewButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Toggle the view class on the article grid
            if (articleGrid) {
                if (view === 'list') {
                    articleGrid.classList.add('article-list');
                    showToast('Switched to list view 📋');
                } else {
                    articleGrid.classList.remove('article-list');
                    showToast('Switched to card view 🃏');
                }
            }
            
            // Save the view preference
            localStorage.setItem('preferred-view', view);
        });
    });
    
    // Apply saved view preference
    const savedView = localStorage.getItem('preferred-view');
    if (savedView) {
        const targetButton = document.querySelector(`.view-btn[data-view="${savedView}"]`);
        if (targetButton) {
            targetButton.click();
        }
    }
    
    // Back to top button functionality
    window.addEventListener('scroll', () => {
        if (backToTopBtn) {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        }
    });
    
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // Refresh button functionality
    if (refreshBtn) {
        refreshBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Add animation to refresh button
            const icon = refreshBtn.querySelector('i');
            if (icon) {
                icon.classList.add('fa-spin');
            }
            
            showToast('Refreshing news feed... 🔄');
            
            // Reload the page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        });
    }
    
    // Retry button functionality
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }
    
    // Bookmark functionality
    // Get saved articles from localStorage
    const getSavedArticles = () => {
        const saved = localStorage.getItem('saved-articles');
        return saved ? JSON.parse(saved) : [];
    };
    
    // Save article to localStorage
    const saveArticle = (url) => {
        const savedArticles = getSavedArticles();
        if (!savedArticles.includes(url)) {
            savedArticles.push(url);
            localStorage.setItem('saved-articles', JSON.stringify(savedArticles));
            showToast('Article saved to bookmarks! 🔖');
            return true;
        }
        return false;
    };
    
    // Remove article from localStorage
    const removeArticle = (url) => {
        const savedArticles = getSavedArticles();
        const index = savedArticles.indexOf(url);
        if (index !== -1) {
            savedArticles.splice(index, 1);
            localStorage.setItem('saved-articles', JSON.stringify(savedArticles));
            showToast('Article removed from bookmarks');
            return true;
        }
        return false;
    };
    
    // Update bookmark icons based on saved state
    const updateBookmarkIcons = () => {
        const savedArticles = getSavedArticles();
        document.querySelectorAll('.save-article').forEach(button => {
            const url = button.getAttribute('data-url');
            const icon = button.querySelector('i');
            if (savedArticles.includes(url)) {
                icon.classList.remove('fa-regular');
                icon.classList.add('fa-solid');
            } else {
                icon.classList.remove('fa-solid');
                icon.classList.add('fa-regular');
            }
        });
    };
    
    // Initialize bookmark icons
    updateBookmarkIcons();
});