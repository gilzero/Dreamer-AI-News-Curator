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
    const saveButtons = document.querySelectorAll('.save-article');
    const logoIcon = document.querySelector('.logo-icon');
    const toastElement = document.getElementById('toast');
    const toast = toastElement ? new bootstrap.Toast(toastElement, { delay: 3000 }) : null;
    
    // Function to show toast notifications
    const showToast = (message) => {
        if (toast) {
            const toastBody = toastElement.querySelector('.toast-body');
            toastBody.textContent = message;
            toast.show();
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
    
    // Add interactive effects to article cards
    const articleCards = document.querySelectorAll('.article-card');
    articleCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            const icon = card.querySelector('.fa-bookmark');
            if (icon) {
                icon.classList.add('fa-bounce');
                setTimeout(() => {
                    icon.classList.remove('fa-bounce');
                }, 1000);
            }
        });
    });
    
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
    if (saveButtons.length > 0) {
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
            saveButtons.forEach(button => {
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
        
        // Add click event to save buttons
        saveButtons.forEach(button => {
            button.addEventListener('click', () => {
                const url = button.getAttribute('data-url');
                const icon = button.querySelector('i');
                
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
            });
        });
    }
});