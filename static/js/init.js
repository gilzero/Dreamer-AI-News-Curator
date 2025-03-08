// Initialization code for the Dreamer AI News Curator
import { initializeAOS, showToast } from './utils.js';
import { initializeThemeToggle } from './theme.js';
import { 
    initializeLogoIcon, 
    initializeArticleCardEffects, 
    initializeViewToggle, 
    initializeBackToTop, 
    initializeRefreshButton, 
    initializeRetryButton 
} from './ui.js';
import { initializeBookmarks } from './bookmarks.js';
import { initializeArticlePreview } from './content.js';

/**
 * Initializes the application when the DOM is loaded
 */
export const initializeApp = () => {
    console.log('Dreamer AI News Curator loaded');
    
    // Initialize AOS animations
    initializeAOS();
    
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
    
    // Content Modal Elements
    const contentModalElement = document.getElementById('contentModal');
    const contentModal = contentModalElement ? new bootstrap.Modal(contentModalElement) : null;
    const contentLoading = document.getElementById('contentLoading');
    const contentError = document.getElementById('contentError');
    const errorMessage = document.getElementById('errorMessage');
    const extractedContent = document.getElementById('extractedContent');
    const originalLink = document.getElementById('originalLink');
    const modalTitle = document.getElementById('contentModalLabel');
    const loadingMessage = document.getElementById('loadingMessage');
    const loadingProgressBar = document.getElementById('loadingProgressBar');
    
    // Modal elements object for content fetching
    const modalElements = {
        contentLoading,
        contentError,
        extractedContent,
        modalTitle,
        loadingMessage,
        loadingProgressBar,
        originalLink,
        errorMessage
    };
    
    // Initialize UI components
    initializeLogoIcon(logoIcon);
    initializeArticleCardEffects(articlesContainer);
    initializeThemeToggle(themeToggle, themeIcon);
    initializeViewToggle(viewButtons, articleGrid);
    initializeBackToTop(backToTopBtn);
    initializeRefreshButton(refreshBtn);
    initializeRetryButton(retryBtn);
    initializeBookmarks(articlesContainer);
    initializeArticlePreview(articlesContainer, contentModal, modalElements);
    
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
}; 