// Bookmark functionality for the Dreamer AI News Curator
import { showToast } from './utils.js';

/**
 * Gets saved articles from localStorage
 * @returns {Array} - Array of saved article URLs
 */
export const getSavedArticles = () => {
    const saved = localStorage.getItem('saved-articles');
    return saved ? JSON.parse(saved) : [];
};

/**
 * Saves an article to localStorage
 * @param {string} url - The URL of the article to save
 * @returns {boolean} - Whether the article was successfully saved
 */
export const saveArticle = (url) => {
    const savedArticles = getSavedArticles();
    if (!savedArticles.includes(url)) {
        savedArticles.push(url);
        localStorage.setItem('saved-articles', JSON.stringify(savedArticles));
        showToast('Article saved to bookmarks! 🔖');
        return true;
    }
    return false;
};

/**
 * Removes an article from localStorage
 * @param {string} url - The URL of the article to remove
 * @returns {boolean} - Whether the article was successfully removed
 */
export const removeArticle = (url) => {
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

/**
 * Updates bookmark icons based on saved state
 */
export const updateBookmarkIcons = () => {
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

/**
 * Initializes bookmark functionality
 * @param {HTMLElement} articlesContainer - The container for all articles
 */
export const initializeBookmarks = (articlesContainer) => {
    // Initialize bookmark icons
    updateBookmarkIcons();
    
    // Handle save article button clicks
    if (articlesContainer) {
        articlesContainer.addEventListener('click', (e) => {
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
    }
}; 