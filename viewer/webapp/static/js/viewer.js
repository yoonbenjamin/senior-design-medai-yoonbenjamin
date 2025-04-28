class CTViewer {
    constructor(studyId, totalSlices, roiLabels, initialSlice=0) {
        // Core properties
        this.studyId = studyId;
        this.totalSlices = totalSlices;
        this.roiLabels = roiLabels;
        this.currentSlice = initialSlice;
        this.structureOpacity = 0.8;
        this.cachedOpacity = 0.8;
        
        // Performance optimizations
        this.imageCache = new Map();          // Cache for loaded images
        this.loadingPromises = new Map();     // Track loading promises
        this.preloadRange = 3;                // Number of slices to preload in each direction
        this.maxCacheSize = 20;               // Maximum number of slices to keep in cache
        this.pendingUpdate = null;            // For debouncing updates
        
        // Initialize viewer components
        this.initializeViewer();
        this.setupControls();
        
        this.preloadAllSlices();

        // Initial load
        this.updateSlice(this.currentSlice);
    }

    initializeViewer() {
        this.canvas = document.getElementById('sliceCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 1024;
        this.canvas.height = 1024;
        
        this.initializeStructureList();
    }

    async preloadSliceRange(startIndex, endIndex) {
        try {
            for (let i = startIndex; i <= endIndex; i++) {
                await this._loadAndDisplaySlice(i);  // Load each slice and cache it
            }
            console.log("Preloaded slices", startIndex, "to", endIndex);
        } catch (error) {
            console.error("Error preloading slices:", error);
        }
    }

    async preloadAllSlices() {
        try {
            for (let i = 0; i < this.totalSlices; i++) {
                await this._loadAndDisplaySlice(i);  // Load each slice and cache it
            }
            console.log("All slices have been preloaded into the cache.");
        } catch (error) {
            console.error("Error preloading slices:", error);
        }
    }

    async updateSlice(index) {
        // Validate index
        if (index < 0 || index >= this.totalSlices) return;
        
        try {
            // Cancel any pending updates
            if (this.pendingUpdate) {
                clearTimeout(this.pendingUpdate);
            }
            
            // Update slice counter immediately
            this.currentSlice = index;
            this.updateSliceCounter();
            
            // Load and display the requested slice
            await this._loadAndDisplaySlice(index);
            
        } catch (error) {
            console.error('Error updating slice:', error);
        }
    }

    async _loadAndDisplaySlice(index) {
        try {
            // Check cache first
            if (this.imageCache.has(index) && this.structureOpacity === this.cachedOpacity) {
                this._renderImage(this.imageCache.get(index));
                return;
            }
            // Check if already loading
            if (this.loadingPromises.has(index)) {
                await this.loadingPromises.get(index);
                return;
            }
            
            // Load new slice
            const loadPromise = this._fetchSlice(index);
            this.loadingPromises.set(index, loadPromise);
            
            const imageData = await loadPromise;
            this.loadingPromises.delete(index);
            
            if (imageData) {
                this.imageCache.set(index, imageData);
                // Only render if this is still the current slice
                if (this.currentSlice === index) {
                    this._renderImage(imageData);
                }
            }
            
        } catch (error) {
            console.error('Error loading slice:', error);
            this.loadingPromises.delete(index);
        }
    }

    async _fetchSlice(index) {
        const url = `/api/study/${this.studyId}/slice/${index}?` + 
                   `window=400&level=40&opacity=${this.structureOpacity}`;
                   
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 'success' && data.image) {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.src = 'data:image/png;base64,' + data.image;
                });
            }
            return null;
        } catch (error) {
            console.error('Error fetching slice:', error);
            return null;
        }
    }

    _renderImage(image) {
        if (!image || !this.ctx) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw new image
        this.ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
    }

    _preloadNearbySlices(currentIndex) {
        for (let offset = 1; offset <= this.preloadRange; offset++) {
            const nextIndex = currentIndex + offset;
            const prevIndex = currentIndex - offset;
            
            if (nextIndex < this.totalSlices) {
                this._loadAndDisplaySlice(nextIndex);
            }
            if (prevIndex >= 0) {
                this._loadAndDisplaySlice(prevIndex);
            }
        }
    }

    _cleanCache(currentIndex) {
        if (this.imageCache.size > this.maxCacheSize) {
            // Sort slices by distance from current
            const distances = Array.from(this.imageCache.keys())
                .map(index => ({
                    index,
                    distance: Math.abs(currentIndex - index)
                }))
                .sort((a, b) => b.distance - a.distance);
            
            // Remove furthest slices until we're back to max size
            while (this.imageCache.size > this.maxCacheSize) {
                const furthest = distances.pop();
                if (furthest) {
                    this.imageCache.delete(furthest.index);
                }
            }
        }
    }

    setupControls() {
        // Navigation buttons
        document.getElementById('prevSlice')?.addEventListener('click', () => {
            if (this.currentSlice > 0) {
                this.updateSlice(this.currentSlice - 1);
            }
        });

        document.getElementById('nextSlice')?.addEventListener('click', () => {
            if (this.currentSlice < this.totalSlices - 1) {
                this.updateSlice(this.currentSlice + 1);
            }
        });

        // Mouse wheel scrolling with throttling
        let wheelTimeout = null;
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            if (wheelTimeout) return;
            
            wheelTimeout = setTimeout(() => {
                const newIndex = this.currentSlice + (e.deltaY > 0 ? -1 : 1);
                if (newIndex >= 0 && newIndex < this.totalSlices) {
                    this.updateSlice(newIndex);
                }
                wheelTimeout = null;
            }, 10); // edit for ms throttle (delay for performance)
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowUp':
                case 'ArrowRight':
                    if (this.currentSlice < this.totalSlices - 1) {
                        e.preventDefault();
                        this.updateSlice(this.currentSlice + 1);
                    }
                    break;
                case 'ArrowDown':
                case 'ArrowLeft':
                    if (this.currentSlice > 0) {
                        e.preventDefault();
                        this.updateSlice(this.currentSlice - 1);
                    }
                    break;
                    
            }
        });

        // Opacity control
        const opacitySlider = document.querySelector('.opacity-slider');
        if (opacitySlider) {
            opacitySlider.addEventListener('input', (e) => {
                this.structureOpacity = e.target.value / 100;
                this.updateSlice(this.currentSlice);
            });
        }
    }

    updateSliceCounter() {
        const counter = document.getElementById('sliceCounter');
        if (counter) {
            counter.textContent = `${this.currentSlice + 1}/${this.totalSlices}`;
        }
    }

    initializeStructureList() {
        const structureList = document.querySelector('.structure-list');
        if (!structureList || !this.roiLabels) return;
        
        structureList.innerHTML = this.roiLabels
            .map(label => `<div class="structure-item">${label}</div>`)
            .join('');
    }
}