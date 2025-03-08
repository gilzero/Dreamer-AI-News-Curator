// Theme management for the Dreamer AI News Curator
import { showToast } from './utils.js';

/**
 * Gets the current theme from localStorage
 * @returns {string} - The current theme ('light' or 'dark')
 */
export const getCurrentTheme = () => localStorage.getItem('theme') || 'light';

/**
 * Saves the theme to localStorage
 * @param {string} theme - The theme to save ('light' or 'dark')
 */
export const saveTheme = (theme) => localStorage.setItem('theme', theme);

/**
 * Applies the theme to the document and toggle button
 * @param {string} theme - The theme to apply ('light' or 'dark')
 * @param {HTMLElement} themeIcon - The theme toggle icon element
 */
export const applyTheme = (theme, themeIcon) => {
    document.documentElement.setAttribute('data-theme', theme);
    
    if (theme === 'dark') {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
};

/**
 * Initializes the theme toggle functionality
 * @param {HTMLElement} themeToggle - The theme toggle button element
 * @param {HTMLElement} themeIcon - The theme toggle icon element
 */
export const initializeThemeToggle = (themeToggle, themeIcon) => {
    // Initialize theme
    applyTheme(getCurrentTheme(), themeIcon);
    
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
        applyTheme(newTheme, themeIcon);
        
        // Show a toast notification
        showToast(`Switched to ${newTheme} mode 🌓`);
    });
}; 