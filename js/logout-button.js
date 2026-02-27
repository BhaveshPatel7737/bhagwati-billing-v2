// Add logout button to the page
function addLogoutButton() {
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Logout';
    logoutBtn.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: 600;
        z-index: 1000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    `;
    
    logoutBtn.addEventListener('click', logout);
    document.body.appendChild(logoutBtn);
}

// Add logout button when page loads
if (window.location.pathname !== '/login.html') {
    window.addEventListener('DOMContentLoaded', addLogoutButton);
}