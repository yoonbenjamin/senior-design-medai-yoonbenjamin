// project_dashboard.js

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize by showing the first tab
    showTab('unreviewed');
    filterStudies('unreviewed');
    filterStudies('reviewed');
    // Add click listeners to all tab buttons
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            showTab(tabId);
        });
    });

    StudyLoadingManager.init();
    
    // Update existing click handlers to use loading manager
    document.querySelectorAll('.study-card').forEach(card => {
        // Only add click handler if it's an unreviewed study card (has href attribute)
        if (card.hasAttribute('href')) {
            card.onclick = (event) => {
                // Don't handle click if it's on a button or link inside the card
                if (event.target.closest('.button-group')) {
                    return true;
                }
                return StudyLoadingManager.handleStudyClick(event, card);
            };
        }
    });
});

// Tab switching functionality
function showTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.style.display = 'block';
        selectedTab.classList.add('active');
    }

    if (tabId === 'summary') {
        const projectId = document.querySelector('[data-project-id]')?.getAttribute('data-project-id');
        if (projectId) {
            loadProjectSummary(projectId);
        }
    }
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });
}

// View mode toggle
function toggleViewMode() {
    const grid = document.querySelector('.study-grid');
    grid.classList.toggle('list-view');
    
    // Update view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active');
    });
}

// Study filtering functionality
function filterStudies(section) {
    const container = document.getElementById(section);
    const studies = container.getElementsByClassName('study-card');
    const searchText = document.getElementById(`${section}Search`).value.toLowerCase();
    const dateSort = document.getElementById(`${section}DateSort`).value;
    
    // Get quality filter value for reviewed section
    const qualityFilter = section === 'reviewed' ? 
        document.getElementById('qualityFilter').value : '';

    // Convert studies to array for sorting
    const studiesArray = Array.from(studies);

    // Sort by date
    studiesArray.sort((a, b) => {
        const dateA = new Date(a.querySelector('.info-item .value').textContent);
        const dateB = new Date(b.querySelector('.info-item .value').textContent);
        return dateSort === 'newest' ? dateB - dateA : dateA - dateB;
    });

    // Filter and show/hide studies
    studiesArray.forEach(study => {
        const text = study.textContent.toLowerCase();
        const quality = study.dataset.quality;
        
        const matchesSearch = text.includes(searchText);
        const matchesQuality = !qualityFilter || quality === qualityFilter;
        
        // Determine visibility
        const visible = matchesSearch && matchesQuality;
        
        // Update study position and visibility
        if (visible) {
            study.style.display = '';
            container.querySelector('.study-grid').appendChild(study);
        } else {
            study.style.display = 'none';
        }
    });

    // Show empty state if no visible studies
    const visibleStudies = studiesArray.filter(study => study.style.display !== 'none');
    const emptyState = container.querySelector('.empty-state');
    
    if (visibleStudies.length === 0 && emptyState) {
        emptyState.style.display = 'block';
    } else if (emptyState) {
        emptyState.style.display = 'none';
    }
}

// View mode toggle
function toggleViewMode() {
    const activeTab = document.querySelector('.tab-content.active');
    const grid = activeTab.querySelector('.study-grid');
    grid.classList.toggle('list-view');
    
    // Update view buttons
    const buttons = activeTab.querySelectorAll('.view-btn');
    buttons.forEach(btn => btn.classList.toggle('active'));
}

// Review details modal
function showReviewDetails(studyId) {
    fetch(`/api/review/${studyId}`)
        .then(response => response.json())
        .then(data => {
            const modal = document.getElementById('reviewModal');
            const details = document.getElementById('reviewDetails');
            const review_data = data.review;

            // Format issues as array if it's a string
            const issues = review_data.issues ? 
                (typeof review_data.issues === 'string' ? 
                    review_data.issues.split(',').map(i => i.trim()) : 
                    review_data.issues) : 
                [];

            details.innerHTML = `
                <div class="modal-header">
                    <h2>Review Details</h2>
                    <div class="close" onclick="closeModal()"></div>
                </div>
                <div class="modal-body">
                    <div class="review-details">
                        <div class="review-section quality-section">
                            <div class="review-section-header">
                                <div class="section-icon">⭐</div>
                                <h3 class="section-title">Quality Rating</h3>
                            </div>
                            <div class="quality-rating">
                                <div class="quality-score">${review_data.quality_rating}/5</div>
                                <div class="quality-badge q${review_data.quality_rating}">
                                    ${getQualityLabel(review_data.quality_rating)}
                                </div>
                            </div>
                        </div>

                        <div class="review-section reviewer-section">
                            <div class="review-section-header">
                                <div class="section-icon">👤</div>
                                <h3 class="section-title">Review Information</h3>
                            </div>
                            <div class="review-meta">
                                <span class="meta-label">Reviewer:</span>
                                <span class="meta-value">${review_data.reviewer || 'Unknown'}</span>
                                <span class="meta-label">Review Date:</span>
                                <span class="meta-value">${formatDate(review_data.review_date)}</span>
                            </div>
                        </div>

                        <div class="review-section comments-section">
                            <div class="review-section-header">
                                <div class="section-icon">💭</div>
                                <h3 class="section-title">Comments</h3>
                            </div>
                            <p class="review-content">${review_data.comments || 'No comments provided'}</p>
                        </div>

                        ${issues.length ? `
                            <div class="review-section issues-section">
                                <div class="review-section-header">
                                    <div class="section-icon">⚠️</div>
                                    <h3 class="section-title">Identified Issues</h3>
                                </div>
                                <ul class="issues-list">
                                    ${issues.map(issue => `
                                        <li class="issue-item">${issue}</li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            modal.style.display = 'block';
            // Force reflow
            modal.offsetHeight;
            modal.classList.add('show');
        })
        .catch(error => {
            console.error('Error loading review details:', error);
            showErrorToast('Failed to load review details');
        });
}

function closeModal() {
    const modal = document.getElementById('reviewModal');
    modal.classList.remove('show');
    // Wait for transition to complete before hiding
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('reviewModal');
    if (event.target === modal) {
        closeModal();
    }
};

// Helper functions
function getQualityLabel(rating) {
    const labels = {
        5: 'Excellent',
        4: 'Good',
        3: 'Acceptable',
        2: 'Poor',
        1: 'Unusable'
    };
    return labels[rating] || 'Unknown';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Study loading manager
const StudyLoadingManager = {
    // Track loading states and promises
    loadingStates: new Map(),
    pendingLoads: new Map(),

    // Initialize the loading manager
    init() {
        // Add cleanup listener
        window.addEventListener('beforeunload', () => this.cleanup());
    },

    // Handle study click and loading
    async handleStudyClick(event, element) {
        event.preventDefault();
        
        const studyId = element.getAttribute('data-study-id');
        const projectId = document.querySelector('.container').getAttribute('data-project-id');
        const href = element.getAttribute('href');
        
        // Check if study is already loading
        if (this.pendingLoads.has(studyId)) {
            console.log('Study already loading');
            return false;
        }
        
        // Check if study is already loaded but navigation was interrupted
        if (element.getAttribute('data-loading') === 'true') {
            console.log('Study in loading state');
            return false;
        }
        
        try {
            // Set loading state immediately
            this.loadingStates.set(studyId, true);
            element.setAttribute('data-loading', 'true');
            
            // Show loading indicator
            const loadingOverlay = element.querySelector('.loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.classList.remove('hidden');
            }
            
            // Create and store loading promise with updated URL
            const loadPromise = fetch(`/api/project/${projectId}/study/${studyId}/prepare`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            this.pendingLoads.set(studyId, loadPromise);
            
            // Wait for load to complete
            const response = await loadPromise;
            const data = await response.json();
            
            if (data.status === 'success') {
                // Clean up loading state
                this.pendingLoads.delete(studyId);
                this.loadingStates.set(studyId, false);
                element.setAttribute('data-loading', 'false');
                
                // Hide loading overlay
                if (loadingOverlay) {
                    loadingOverlay.classList.add('hidden');
                }
                
                // Complete other pending loads in background
                this.pendingLoads.forEach((promise, id) => {
                    promise.catch(() => {
                        this.pendingLoads.delete(id);
                        this.loadingStates.set(id, false);
                    });
                });
                
                // Navigate to study
                window.location.href = href;
            } else {
                throw new Error(data.message || 'Failed to prepare study');
            }
            
        } catch (error) {
            console.error('Error loading study:', error);
            
            // Reset loading state
            this.pendingLoads.delete(studyId);
            this.loadingStates.set(studyId, false);
            element.setAttribute('data-loading', 'false');
            
            // Hide loading overlay
            const loadingOverlay = element.querySelector('.loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.classList.add('hidden');
            }
            
            // Show error message
            this.showErrorToast('Failed to load study. Please try again.');
        }
        
        return false;
    },

    // Show error toast message
    showErrorToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast error';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Remove after delay
        setTimeout(() => toast.remove(), 3000);
    },

    // Clean up function
    cleanup() {
        // Complete all pending loads
        this.pendingLoads.forEach((promise, id) => {
            promise.catch(() => {
                this.pendingLoads.delete(id);
                this.loadingStates.set(id, false);
            });
        });
        
        // Reset all loading states
        document.querySelectorAll('.study-card[data-loading="true"]').forEach(card => {
            card.setAttribute('data-loading', 'false');
            const overlay = card.querySelector('.loading-overlay');
            if (overlay) {
                overlay.classList.add('hidden');
            }
        });
    }
};

// Function to load and display project summary
async function loadProjectSummary(projectId) {
    try {
        const response = await fetch(`/api/project/${projectId}/summary`);
        const data = await response.json();
        
        if (data.status === 'success') {
            const summary = data.summary;
            
            // Update quality distribution
            updateQualityChart(summary.quality_distribution, summary.total_reviews, summary.quality_labels);
            
            // Update common issues
            updateIssuesList(summary.common_issues);
        }
    } catch (error) {
        console.error('Error loading project summary:', error);
    }
}

// Function to update quality distribution chart
function updateQualityChart(distribution, totalReviews, labels) {
    const qualityBars = document.querySelector('.quality-bars');
    if (!qualityBars) return;
    
    qualityBars.innerHTML = '';
    
    // Colors for each rating
    const colors = {
        '5': '#4CAF50',  // Excellent - Green
        '4': '#8BC34A',  // Good - Light Green
        '3': '#FFC107',  // Acceptable - Yellow
        '2': '#FF9800',  // Poor - Orange
        '1': '#F44336'   // Unusable - Red
    };
    
    Object.entries(distribution).reverse().forEach(([rating, count]) => {
        const percentage = totalReviews > 0 ? (count / totalReviews * 100).toFixed(1) : 0;
        
        const barHtml = `
            <div class="quality-bar">
                <span class="quality-label">${labels[rating]}</span>
                <div class="bar-container">
                    <div class="bar" style="width: ${percentage}%; background: ${colors[rating]}"></div>
                </div>
                <span class="bar-value">${count} (${percentage}%)</span>
            </div>
        `;
        
        qualityBars.insertAdjacentHTML('beforeend', barHtml);
    });
}

// Function to update common issues list
function updateIssuesList(issues) {
    const issuesList = document.querySelector('.issues-list');
    if (!issuesList) return;
    
    if (Object.keys(issues).length === 0) {
        issuesList.innerHTML = '<div class="empty-state">No issues reported yet</div>';
        return;
    }
    
    issuesList.innerHTML = Object.entries(issues)
        .map(([issue, count]) => `
            <div class="issue-item">
                <span class="issue-text">${issue}</span>
                <span class="issue-count">${count}</span>
            </div>
        `).join('');
}

// Close modal
document.querySelector('.close').onclick = function() {
    document.getElementById('reviewModal').style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('reviewModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}