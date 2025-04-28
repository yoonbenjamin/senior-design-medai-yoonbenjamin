document.addEventListener('DOMContentLoaded', function() {
    // Project Summary Loading
    const projectId = document.getElementById('projectId')?.value;

    // Review Form Handling
    // Make submitReview available globally
    window.submitReview = async function(action) {
        // Get required elements
        const qualitySelect = document.querySelector('#quality');
        const comments = document.querySelector('#comments');
        const issues = document.querySelector('#issues');
        const buttons = document.querySelectorAll('.submit-btn');
        
        // Validate quality rating
        if (!qualitySelect.value) {
            alert('Please select a quality rating');
            return;
        }
        
        // Disable buttons to prevent double submission
        buttons.forEach(btn => btn.disabled = true);
        
        try {
            // Get study and project IDs
            const studyId = window.location.pathname.split('/').pop();
            const projectId = document.querySelector('[data-project-id]').getAttribute('data-project-id');
            
            // Create review data object
            const reviewData = {
                study_id: studyId,
                project_id: projectId,
                quality: qualitySelect.value,
                comments: comments.value,
                issues: issues.value
            };
    
            // Submit review
            const response = await fetch('/api/submit-review', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reviewData)
            });
    
            const data = await response.json();
            
            if (data.status === 'success') {
                // Show success message
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                successMessage.textContent = 'Review submitted successfully!';
                document.body.appendChild(successMessage);
    
                // Handle navigation after short delay
                if (action === 'next') {
                    // Show loading indicator
                    const loadingMessage = document.createElement('div');
                    loadingMessage.className = 'loading-message';
                    loadingMessage.textContent = 'Preparing next study...';
                    document.body.appendChild(loadingMessage);
    
                    try {
                        // Use preloaded study if available
                        // if (nextStudyPreloader) {
                        //     // Wait for complete loading
                        //     const isComplete = await nextStudyPreloader.waitForComplete();
                        //     if (isComplete) {
                        //         const nextStudyId = nextStudyPreloader.getNextStudyId();
                        //         if (nextStudyId) {
                        //             window.location.href = `/project/${projectId}/review/${nextStudyId}`;
                        //             return;
                        //         }
                        //     }
                        // }
                        
                        // Fallback to regular next study fetch if preload wasn't successful
                        const nextResponse = await fetch(`/api/project/${projectId}/next-study/${studyId}`);
                        const nextData = await nextResponse.json();
                        
                        if (nextData.status === 'success' && nextData.next_study_id) {
                            window.location.href = `/project/${projectId}/review/${nextData.next_study_id}`;
                        } else {
                            window.location.href = `/project/${projectId}`;
                        }
                    } finally {
                        // Remove loading message
                        loadingMessage.remove();
                    }
                } else {
                    // Return to project dashboard
                    setTimeout(() => {
                        window.location.href = `/project/${projectId}`;
                    }, 1000);
                }
            } else {
                alert('Error submitting review: ' + (data.message || 'Unknown error'));
                buttons.forEach(btn => btn.disabled = false);
            }
        } catch (error) {
            console.error('Error details:', error);
            alert('Error submitting review: ' + error.message);
            buttons.forEach(btn => btn.disabled = false);
        }
    };

    // Quality selection functionality
    function setQuality(rating) {
        const qualityTexts = {
            5: 'Excellent Quality',
            4: 'Good Quality',
            3: 'Acceptable',
            2: 'Poor Quality',
            1: 'Unusable'
        };
        
        const selectedQualityText = document.getElementById('selectedQualityText');
        if (selectedQualityText) {
            selectedQualityText.textContent = qualityTexts[rating];
        }
        
        // Update button states
        document.querySelectorAll('.quality-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const clickedButton = event.target;
        if (clickedButton) {
            clickedButton.classList.add('active');
        }
        
        // Store the rating
        const form = document.querySelector('form');
        if (form) {
            form.dataset.qualityRating = rating;
        }
    }

    // Make setQuality available globally
    window.setQuality = setQuality;

});