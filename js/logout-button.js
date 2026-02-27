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
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    `;
    
    logoutBtn.addEventListener('click', logout);
    
    // Insert into header instead of body to respect header layout
    const header = document.querySelector('.app-header');
    if (header) {
        const headerContent = header.querySelector('.header-content');
        if (headerContent) {
            // Add to header-info section or create a new container
            const headerInfo = headerContent.querySelector('.header-info');
            if (headerInfo) {
                logoutBtn.style.position = 'relative';
                logoutBtn.style.top = 'auto';
                logoutBtn.style.right = 'auto';
                logoutBtn.style.marginLeft = '20px';
                headerInfo.appendChild(logoutBtn);
            } else {
                document.body.appendChild(logoutBtn);
            }
        } else {
            document.body.appendChild(logoutBtn);
        }
    } else {
        document.body.appendChild(logoutBtn);
    }
}

// Add logout button when page loads
if (window.location.pathname !== '/login.html') {
    window.addEventListener('DOMContentLoaded', addLogoutButton);
}