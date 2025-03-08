// UI-related functionality for the Dreamer AI News Curator
import { showToast } from './utils.js';

/**
 * Initializes the logo icon hover effect
 * @param {HTMLElement} logoIcon - The logo icon element
 */
export const initializeLogoIcon = (logoIcon) => {
    if (logoIcon) {
        logoIcon.addEventListener('mouseover', () => {
            logoIcon.classList.add('fa-beat');
        });
        
        logoIcon.addEventListener('mouseout', () => {
            logoIcon.classList.remove('fa-beat');
        });
    }
};

/**
 * Initializes the article card hover effects
 * @param {HTMLElement} articlesContainer - The container for all articles
 */
export const initializeArticleCardEffects = (articlesContainer) => {
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
};

/**
 * Initializes the back-to-top button functionality
 * @param {HTMLElement} backToTopBtn - The back-to-top button element
 */
export const initializeBackToTop = (backToTopBtn) => {
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
};

/**
 * Initializes the refresh button functionality
 * @param {HTMLElement} refreshBtn - The refresh button element
 */
export const initializeRefreshButton = (refreshBtn) => {
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
};

/**
 * Initializes the retry button functionality
 * @param {HTMLElement} retryBtn - The retry button element
 */
export const initializeRetryButton = (retryBtn) => {
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }
}; 