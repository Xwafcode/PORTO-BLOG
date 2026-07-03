// public/js/darkmode.js

document.addEventListener('DOMContentLoaded', () => {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;
    
    // Check local storage for preference
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    // Check initial state from body class (set by backend)
    const hasInitialDarkClass = body.classList.contains('dark-mode');
    
    if (isDarkMode && !hasInitialDarkClass) {
        body.classList.add('dark-mode');
    } else if (localStorage.getItem('darkMode') === 'false' && hasInitialDarkClass) {
        body.classList.remove('dark-mode');
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', body.classList.contains('dark-mode'));
        });
    }
});
