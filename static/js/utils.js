// Utility functions for the Dreamer AI News Curator

/**
 * Shows a toast notification with the given message
 * @param {string} message - The message to display in the toast
 */
export const showToast = (message) => {
    const toastElement = document.getElementById('toast');
    const toast = toastElement ? new bootstrap.Toast(toastElement, { delay: 3000 }) : null;
    
    if (toast) {
        const toastBody = toastElement.querySelector('.toast-body');
        toastBody.textContent = message;
        toast.show();
    }
};

/**
 * Copies text to clipboard and provides visual feedback
 * @param {string} text - The text to copy to clipboard
 * @param {HTMLElement} button - The button element that triggered the copy
 */
export const copyToClipboard = async (text, button) => {
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

/**
 * Formats a Chinese summary for better display
 * @param {string} summary - The raw Chinese summary text
 * @returns {string} - The formatted HTML for the summary
 */
export function formatChineseSummary(summary) {
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

/**
 * Initialize AOS animations
 */
export const initializeAOS = () => {
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
}; 