function filterProjects() {
    const searchText = document.getElementById('projectSearch').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;
    
    document.querySelectorAll('.project-card').forEach(card => {
        const projectName = card.getAttribute('data-name');
        const projectType = card.getAttribute('data-type');
        
        const matchesSearch = projectName.includes(searchText);
        const matchesType = !typeFilter || projectType === typeFilter;
        
        card.style.display = matchesSearch && matchesType ? 'block' : 'none';
    });
}

// Optional: Add animation when cards are filtered
document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-5px)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
    });
});

function syncData() {
    const syncBtn = document.getElementById('syncButton');
    
    // Add syncing class to show spinner
    syncBtn.classList.add('syncing');
    
    // Make the API call
    fetch('/api/sync-data')
        .then(response => response.json())
        .then(data => {
            // Remove syncing class
            syncBtn.classList.remove('syncing');
            
            // Show success toast
            showToast('Data synced successfully!', 'success');
            
            // Reload the page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        })
        .catch(error => {
            // Remove syncing class
            syncBtn.classList.remove('syncing');
            
            // Show error toast
            showToast('Error syncing data. Please try again.', 'error');
            console.error('Sync error:', error);
        });
}

function showToast(message, type = 'success') {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}