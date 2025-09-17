/**
 * Main Application - Initializes and coordinates all components
 */
class App {
    constructor() {
        this.ui = null;
        this.canvas = null;
        this.routes = null;
        this.video = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) {
            console.warn('App already initialized');
            return;
        }

        try {
            console.log('🚀 Initializing Map Route Video Generator...');

            // Show loading state
            this.showLoadingState();

            // Initialize components in order
            await this.initializeComponents();

            // Set up global event listeners
            this.setupGlobalEvents();

            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();

            // Initialize timeline controls
            this.initializeTimeline();

            // Load any saved project data
            await this.loadSavedProject();

            this.initialized = true;
            this.hideLoadingState();

            console.log('✅ Application initialized successfully');
            this.showWelcomeMessage();

        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.showErrorState(error);
        }
    }

    async initializeComponents() {
        // Initialize UI Controller first (handles notifications and basic UI)
        this.ui = new UIController();
        this.ui.init();

        // Initialize Route Manager (handles data management)
        this.routes = new RouteManager();
        this.routes.init();

        // Initialize Map Canvas (handles drawing and interactions)
        this.canvas = new MapCanvas();
        this.canvas.init();

        // Initialize Video Generator (handles animation and export)
        this.video = new VideoGenerator();
        this.video.init();

        // Verify all components are properly initialized
        if (!this.ui || !this.routes || !this.canvas || !this.video) {
            throw new Error('One or more components failed to initialize');
        }
    }

    setupGlobalEvents() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.canvas?.handleResize();
            this.video?.updatePreview();
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.video?.pausePreview();
            }
        });

        // Handle beforeunload for saving
        window.addEventListener('beforeunload', (e) => {
            if (this.routes?.routes?.length > 0) {
                this.saveCurrentProject();
                // Optional: Show confirmation dialog for unsaved changes
                // e.preventDefault();
                // e.returnValue = '';
            }
        });

        // Global error handling
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.ui?.showNotification(`Error: ${e.error.message}`, 'error');
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.ui?.showNotification(`Promise error: ${e.reason}`, 'error');
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Skip if typing in input fields
            if (e.target.matches('input, textarea, select')) {
                return;
            }

            const ctrl = e.ctrlKey || e.metaKey;
            const shift = e.shiftKey;

            switch (e.key) {
                // File operations
                case 'n':
                    if (ctrl) {
                        e.preventDefault();
                        this.newProject();
                    }
                    break;

                case 's':
                    if (ctrl && shift) {
                        e.preventDefault();
                        this.exportProject();
                    } else if (ctrl) {
                        e.preventDefault();
                        this.saveCurrentProject();
                    }
                    break;

                case 'o':
                    if (ctrl) {
                        e.preventDefault();
                        this.openProject();
                    }
                    break;

                // Edit operations
                case 'z':
                    if (ctrl && shift) {
                        e.preventDefault();
                        this.routes?.redo();
                    } else if (ctrl) {
                        e.preventDefault();
                        this.routes?.undo();
                    }
                    break;

                case 'a':
                    if (ctrl) {
                        e.preventDefault();
                        this.selectAllRoutes();
                    }
                    break;

                case 'Delete':
                    this.deleteSelectedRoutes();
                    break;

                // Tool selection
                case '1':
                    this.ui?.selectTool('draw');
                    break;

                case '2':
                    this.ui?.selectTool('select');
                    break;

                case '3':
                    this.ui?.selectTool('pan');
                    break;

                // Preview controls
                case ' ':
                    e.preventDefault();
                    this.togglePreview();
                    break;

                case 'Escape':
                    this.video?.stopPreview();
                    break;
            }
        });
    }

    initializeTimeline() {
        const timelineSlider = document.getElementById('timelineSlider');
        if (timelineSlider) {
            timelineSlider.addEventListener('input', (e) => {
                const progress = e.target.value / 100;
                const time = progress * this.video.getDuration();
                this.video.seekTo(time);
            });
        }

        // Initialize timeline with default duration
        const durationInput = document.getElementById('animationDuration');
        if (durationInput) {
            this.video.setDuration(parseInt(durationInput.value) * 1000);
        }
    }

    async loadSavedProject() {
        try {
            // Check if there's a saved project in localStorage
            const savedProject = localStorage.getItem('currentProject');
            if (savedProject) {
                const projectData = JSON.parse(savedProject);
                console.log('Loading saved project...');
                await this.loadProject(projectData);
            }
        } catch (error) {
            console.warn('Failed to load saved project:', error);
        }
    }

    showLoadingState() {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'appLoading';
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <h3>Loading Map Route Video Generator</h3>
                <p>Initializing components...</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }

    hideLoadingState() {
        const loadingOverlay = document.getElementById('appLoading');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }

    showErrorState(error) {
        this.hideLoadingState();
        
        const errorOverlay = document.createElement('div');
        errorOverlay.className = 'error-overlay';
        errorOverlay.innerHTML = `
            <div class="error-content">
                <h3>Failed to Load Application</h3>
                <p>${error.message}</p>
                <button onclick="location.reload()" class="btn btn-primary">Reload Page</button>
            </div>
        `;
        document.body.appendChild(errorOverlay);
    }

    showWelcomeMessage() {
        // Show welcome message for new users
        if (!localStorage.getItem('hasVisited')) {
            this.ui.showNotification('Welcome to Map Route Video Generator! Upload a map image to get started.', 'info', 5000);
            localStorage.setItem('hasVisited', 'true');
        }
    }

    // Project management methods
    newProject() {
        if (this.routes?.routes?.length > 0) {
            if (!confirm('Create new project? All unsaved changes will be lost.')) {
                return;
            }
        }

        this.routes?.clearAllRoutes();
        this.canvas?.clearMap();
        this.video?.stopPreview();
        
        localStorage.removeItem('currentProject');
        this.ui?.showNotification('New project created', 'success');
    }

    saveCurrentProject() {
        try {
            const projectData = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                routes: this.routes?.getProjectData(),
                canvas: this.canvas?.getProjectData(),
                video: {
                    settings: this.video?.videoSettings,
                    duration: this.video?.getDuration()
                }
            };

            localStorage.setItem('currentProject', JSON.stringify(projectData));
            this.ui?.showNotification('Project saved', 'success');
            
        } catch (error) {
            console.error('Failed to save project:', error);
            this.ui?.showNotification('Failed to save project', 'error');
        }
    }

    async loadProject(projectData) {
        try {
            // Load routes
            if (projectData.routes) {
                await this.routes?.loadProjectData(projectData.routes);
            }

            // Load canvas data
            if (projectData.canvas) {
                await this.canvas?.loadProjectData(projectData.canvas);
            }

            // Load video settings
            if (projectData.video) {
                if (projectData.video.settings) {
                    this.video?.updateSettings(projectData.video.settings);
                }
                if (projectData.video.duration) {
                    this.video?.setDuration(projectData.video.duration);
                }
            }

            this.ui?.showNotification('Project loaded successfully', 'success');
            
        } catch (error) {
            console.error('Failed to load project:', error);
            this.ui?.showNotification('Failed to load project', 'error');
        }
    }

    openProject() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const text = await file.text();
                    const projectData = JSON.parse(text);
                    await this.loadProject(projectData);
                } catch (error) {
                    this.ui?.showNotification('Invalid project file', 'error');
                }
            }
        };
        input.click();
    }

    async exportProject() {
        try {
            const projectData = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                routes: this.routes?.getProjectData(),
                canvas: this.canvas?.getProjectData(),
                video: {
                    settings: this.video?.videoSettings,
                    duration: this.video?.getDuration()
                }
            };

            const blob = new Blob([JSON.stringify(projectData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `route-project-${Date.now()}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.ui?.showNotification('Project exported successfully', 'success');
            
        } catch (error) {
            console.error('Failed to export project:', error);
            this.ui?.showNotification('Failed to export project', 'error');
        }
    }

    // Utility methods
    togglePreview() {
        if (this.video?.isPlaying) {
            this.video.pausePreview();
        } else {
            this.video?.playPreview();
        }
    }

    selectAllRoutes() {
        // This would be implemented if we had multi-selection
        console.log('Select all routes - not implemented yet');
    }

    deleteSelectedRoutes() {
        // This would be implemented if we had selection
        console.log('Delete selected routes - not implemented yet');
    }

    // Public API for external access
    getAPI() {
        return {
            ui: this.ui,
            canvas: this.canvas,
            routes: this.routes,
            video: this.video,
            
            // Project methods
            newProject: () => this.newProject(),
            saveProject: () => this.saveCurrentProject(),
            loadProject: (data) => this.loadProject(data),
            exportProject: () => this.exportProject(),
            
            // Utility methods
            getStatistics: () => this.routes?.getStatistics(),
            exportVideo: () => this.video?.exportVideo(),
            togglePreview: () => this.togglePreview()
        };
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Make app globally accessible
    window.app = new App();
    
    // Initialize the application
    await window.app.init();
    
    // Make API available globally for debugging
    window.mapRouteAPI = window.app.getAPI();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}