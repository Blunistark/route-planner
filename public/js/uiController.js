/**
 * UI Controller - Manages all user interface interactions and notifications
 */
class UIController {
    constructor() {
        this.notifications = [];
        this.currentTool = 'select';
        this.isLoading = false;
    }

    init() {
        this.bindEvents();
        this.initializeUI();
        console.log('✅ UIController initialized');
    }

    bindEvents() {
        // Helper function to safely add event listeners
        const addEventListenerSafe = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`Element with ID '${id}' not found`);
            }
        };

        // Header actions
        addEventListenerSafe('saveProject', 'click', () => this.saveProject());
        addEventListenerSafe('loadProject', 'click', () => this.loadProject());
        addEventListenerSafe('loadProjectFile', 'change', (e) => this.handleProjectFileLoad(e));

        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Find the button element (in case user clicked on icon/text inside)
                const button = e.target.closest('.tool-btn');
                if (button && button.dataset.tool) {
                    this.selectTool(button.dataset.tool);
                }
            });
        });

        // Color presets
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.addEventListener('click', (e) => this.selectColor(e.target.dataset.color));
        });

        // Route color picker
        addEventListenerSafe('routeColor', 'change', (e) => this.updateRouteColor(e.target.value));

        // Route width slider
        addEventListenerSafe('routeWidth', 'input', (e) => this.updateRouteWidth(e.target.value));

        // Route style
        addEventListenerSafe('routeStyle', 'change', (e) => this.updateRouteStyle(e.target.value));

        // Undo/Redo
        addEventListenerSafe('undoAction', 'click', () => this.undo());
        addEventListenerSafe('redoAction', 'click', () => this.redo());

        // Animation controls
        addEventListenerSafe('playPreview', 'click', () => this.playPreview());
        addEventListenerSafe('stopPreview', 'click', () => this.stopPreview());
        addEventListenerSafe('timelineSlider', 'input', (e) => this.updateTimeline(e.target.value));

        // Animation settings
        addEventListenerSafe('animationSpeed', 'input', (e) => this.updateAnimationSpeed(e.target.value));
        addEventListenerSafe('totalDuration', 'input', (e) => this.updateTotalDuration(e.target.value));

        // Export actions
        addEventListenerSafe('generateVideo', 'click', () => this.generateVideo());
        addEventListenerSafe('exportRoutes', 'click', () => this.exportRoutes());
        addEventListenerSafe('exportImage', 'click', () => this.exportImage());

        // Route management
        addEventListenerSafe('addRoute', 'click', () => this.addRoute());
        addEventListenerSafe('clearAllRoutes', 'click', () => this.clearAllRoutes());

        // Map upload
        addEventListenerSafe('mapUploadArea', 'click', () => this.triggerMapUpload());
        addEventListenerSafe('mapFileInput', 'change', (e) => this.handleMapUpload(e));
        addEventListenerSafe('removeMap', 'click', () => this.removeMap());

        // Drag and drop
        this.setupDragAndDrop();

        // Context menu
        this.setupContextMenu();

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    initializeUI() {
        // Set initial values
        this.updateRouteWidthDisplay();
        this.updateAnimationSpeedDisplay();
        this.updateTotalDurationDisplay();
        
        // Set active tool
        this.selectTool('select');
        
        // Update statistics
        this.updateStatistics();
    }

    selectTool(tool) {
        // Update active tool
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        
        const toolButton = document.querySelector(`[data-tool="${tool}"]`);
        if (!toolButton) {
            console.warn(`Tool button not found for tool: ${tool}`);
            return;
        }
        toolButton.classList.add('active');
        
        // Update canvas cursor
        const canvasArea = document.querySelector('.canvas-area');
        if (canvasArea) {
            canvasArea.className = canvasArea.className.replace(/tool-\w+/g, '');
            canvasArea.classList.add(`tool-${tool}`);
        }
        
        this.currentTool = tool;
        
        // Notify other components
        this.dispatchEvent('toolChanged', { tool });
        
        console.log(`🔧 Tool changed to: ${tool}`);
    }

    selectColor(color) {
        const colorPicker = document.getElementById('routeColor');
        colorPicker.value = color;
        
        // Update active preset
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.classList.remove('active');
        });
        document.querySelector(`[data-color="${color}"]`).classList.add('active');
        
        this.updateRouteColor(color);
    }

    updateRouteColor(color) {
        this.dispatchEvent('routeColorChanged', { color });
    }

    updateRouteWidth(width) {
        this.updateRouteWidthDisplay();
        this.dispatchEvent('routeWidthChanged', { width: parseInt(width) });
    }

    updateRouteWidthDisplay() {
        const width = document.getElementById('routeWidth').value;
        document.getElementById('routeWidthValue').textContent = `${width}px`;
    }

    updateRouteStyle(style) {
        this.dispatchEvent('routeStyleChanged', { style });
    }

    updateAnimationSpeed(speed) {
        this.updateAnimationSpeedDisplay();
        this.dispatchEvent('animationSpeedChanged', { speed: parseFloat(speed) });
    }

    updateAnimationSpeedDisplay() {
        const speed = document.getElementById('animationSpeed').value;
        document.getElementById('animationSpeedValue').textContent = `${speed}x`;
    }

    updateTotalDuration(duration) {
        this.updateTotalDurationDisplay();
        this.dispatchEvent('totalDurationChanged', { duration: parseInt(duration) });
    }

    updateTotalDurationDisplay() {
        const duration = document.getElementById('totalDuration').value;
        document.getElementById('totalDurationValue').textContent = `${duration}s`;
        document.getElementById('timelineDuration').textContent = `${duration}s`;
        document.getElementById('animationTime').textContent = `${duration}s`;
    }

    undo() {
        this.dispatchEvent('undo');
    }

    redo() {
        this.dispatchEvent('redo');
    }

    playPreview() {
        const playBtn = document.getElementById('playPreview');
        const playIcon = document.getElementById('playIcon');
        const playText = document.getElementById('playText');
        
        if (playText.textContent === 'Play') {
            playIcon.textContent = '⏸️';
            playText.textContent = 'Pause';
            this.dispatchEvent('playPreview');
        } else {
            playIcon.textContent = '▶️';
            playText.textContent = 'Play';
            this.dispatchEvent('pausePreview');
        }
    }

    stopPreview() {
        const playIcon = document.getElementById('playIcon');
        const playText = document.getElementById('playText');
        
        playIcon.textContent = '▶️';
        playText.textContent = 'Play';
        
        document.getElementById('timelineSlider').value = 0;
        this.dispatchEvent('stopPreview');
    }

    updateTimeline(value) {
        this.dispatchEvent('timelineChanged', { progress: parseFloat(value) / 100 });
    }

    async generateVideo() {
        this.showLoading('Generating video...', 'This may take several minutes depending on the complexity of your routes.');
        
        try {
            const result = await this.dispatchEventAsync('generateVideo');
            if (result.success) {
                this.showNotification('Video generation started! You will be notified when it\'s ready.', 'success');
                this.showExportProgress(result.jobId);
            } else {
                throw new Error(result.error || 'Failed to generate video');
            }
        } catch (error) {
            this.showNotification(`Failed to generate video: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async exportRoutes() {
        try {
            const result = await this.dispatchEventAsync('exportRoutes');
            if (result.success) {
                this.showNotification('Routes exported successfully!', 'success');
                this.downloadFile(result.downloadUrl, result.filename);
            } else {
                throw new Error(result.error || 'Failed to export routes');
            }
        } catch (error) {
            this.showNotification(`Failed to export routes: ${error.message}`, 'error');
        }
    }

    async exportImage() {
        try {
            const result = await this.dispatchEventAsync('exportImage');
            if (result.success) {
                this.showNotification('Image exported successfully!', 'success');
                this.downloadFile(result.dataUrl, 'route-map.png');
            } else {
                throw new Error(result.error || 'Failed to export image');
            }
        } catch (error) {
            this.showNotification(`Failed to export image: ${error.message}`, 'error');
        }
    }

    addRoute() {
        this.dispatchEvent('addRoute');
        this.selectTool('draw');
    }

    clearAllRoutes() {
        if (confirm('Are you sure you want to delete all routes? This action cannot be undone.')) {
            this.dispatchEvent('clearAllRoutes');
            this.updateStatistics();
        }
    }

    triggerMapUpload() {
        document.getElementById('mapFileInput').click();
    }

    async handleMapUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select a valid image file.', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            this.showNotification('File size must be less than 10MB.', 'error');
            return;
        }

        this.showUploadProgress(0);

        try {
            const result = await this.uploadMapFile(file);
            if (result.success) {
                this.showMapInfo(result.data);
                this.hideUploadProgress();
                this.dispatchEvent('mapUploaded', { mapData: result.data });
                this.showNotification('Map uploaded successfully!', 'success');
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            this.hideUploadProgress();
            this.showNotification(`Upload failed: ${error.message}`, 'error');
        }

        // Clear the input
        event.target.value = '';
    }

    async uploadMapFile(file) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('mapImage', file);

            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentage = (e.loaded / e.total) * 100;
                    this.showUploadProgress(percentage);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error('Upload failed'));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Network error'));
            });

            xhr.open('POST', '/api/upload/map');
            xhr.send(formData);
        });
    }

    showUploadProgress(percentage) {
        const progressContainer = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('uploadProgressFill');
        const progressText = document.getElementById('uploadProgressText');

        progressContainer.style.display = 'block';
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `Uploading... ${Math.round(percentage)}%`;
    }

    hideUploadProgress() {
        document.getElementById('uploadProgress').style.display = 'none';
    }

    showMapInfo(mapData) {
        const mapInfo = document.getElementById('mapInfo');
        const uploadArea = document.getElementById('mapUploadArea');

        // Hide upload area
        uploadArea.style.display = 'none';

        // Show map info
        document.getElementById('mapFileName').textContent = mapData.originalName;
        document.getElementById('mapFileSize').textContent = this.formatFileSize(mapData.size);
        mapInfo.style.display = 'block';

        // Load image to get dimensions
        const img = new Image();
        img.onload = () => {
            document.getElementById('mapDimensions').textContent = `${img.width} × ${img.height}`;
        };
        img.src = mapData.url;
    }

    removeMap() {
        if (confirm('Remove the current map? This will also clear all routes.')) {
            document.getElementById('mapInfo').style.display = 'none';
            document.getElementById('mapUploadArea').style.display = 'block';
            this.dispatchEvent('mapRemoved');
            this.showNotification('Map removed successfully.', 'info');
        }
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('mapUploadArea');
        const canvasDropZone = document.getElementById('canvasDropZone');

        [uploadArea, canvasDropZone].forEach(element => {
            element.addEventListener('dragover', (e) => {
                e.preventDefault();
                element.classList.add('dragover');
            });

            element.addEventListener('dragleave', (e) => {
                e.preventDefault();
                element.classList.remove('dragover');
            });

            element.addEventListener('drop', (e) => {
                e.preventDefault();
                element.classList.remove('dragover');

                const files = Array.from(e.dataTransfer.files);
                const imageFile = files.find(file => file.type.startsWith('image/'));

                if (imageFile) {
                    this.handleMapUpload({ target: { files: [imageFile] } });
                } else {
                    this.showNotification('Please drop an image file.', 'warning');
                }
            });
        });
    }

    setupContextMenu() {
        const contextMenu = document.getElementById('contextMenu');
        let targetElement = null;

        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.route-item')) {
                e.preventDefault();
                targetElement = e.target.closest('.route-item');
                contextMenu.style.display = 'block';
                contextMenu.style.left = `${e.pageX}px`;
                contextMenu.style.top = `${e.pageY}px`;
            }
        });

        document.addEventListener('click', () => {
            contextMenu.style.display = 'none';
        });

        contextMenu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            if (action && targetElement) {
                this.handleContextMenuAction(action, targetElement);
            }
            contextMenu.style.display = 'none';
        });
    }

    handleContextMenuAction(action, element) {
        const routeId = element.dataset.routeId;
        
        switch (action) {
            case 'edit':
                this.dispatchEvent('editRoute', { routeId });
                break;
            case 'duplicate':
                this.dispatchEvent('duplicateRoute', { routeId });
                break;
            case 'delete':
                this.dispatchEvent('deleteRoute', { routeId });
                break;
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'z':
                        e.preventDefault();
                        if (e.shiftKey) {
                            this.redo();
                        } else {
                            this.undo();
                        }
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveProject();
                        break;
                    case 'o':
                        e.preventDefault();
                        this.loadProject();
                        break;
                }
            }

            // Tool shortcuts
            if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                switch (e.key) {
                    case '1':
                        this.selectTool('select');
                        break;
                    case '2':
                        this.selectTool('draw');
                        break;
                    case '3':
                        this.selectTool('erase');
                        break;
                    case 'Space':
                        e.preventDefault();
                        this.playPreview();
                        break;
                    case 'Escape':
                        this.stopPreview();
                        break;
                }
            }
        });
    }

    saveProject() {
        try {
            const projectData = this.dispatchEventSync('getProjectData');
            const dataStr = JSON.stringify(projectData, null, 2);
            this.downloadFile(`data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`, 'route-project.json');
            this.showNotification('Project saved successfully!', 'success');
        } catch (error) {
            this.showNotification(`Failed to save project: ${error.message}`, 'error');
        }
    }

    loadProject() {
        document.getElementById('loadProjectFile').click();
    }

    async handleProjectFileLoad(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const projectData = JSON.parse(text);
            
            await this.dispatchEventAsync('loadProjectData', { projectData });
            this.showNotification('Project loaded successfully!', 'success');
        } catch (error) {
            this.showNotification(`Failed to load project: ${error.message}`, 'error');
        }

        event.target.value = '';
    }

    showExportProgress(jobId) {
        const progressContainer = document.getElementById('exportProgress');
        const progressFill = document.getElementById('exportProgressFill');
        const progressLabel = document.getElementById('exportProgressLabel');
        const progressPercentage = document.getElementById('exportProgressPercentage');
        const progressDetails = document.getElementById('exportProgressDetails');

        progressContainer.style.display = 'block';
        
        // Poll for progress
        const pollProgress = async () => {
            try {
                const response = await fetch(`/api/export/video/${jobId}/status`);
                const result = await response.json();

                if (result.success) {
                    const status = result.data;
                    const percentage = Math.round(status.progress || 0);

                    progressFill.style.width = `${percentage}%`;
                    progressPercentage.textContent = `${percentage}%`;
                    progressDetails.textContent = this.getProgressMessage(status.status, percentage);

                    if (status.status === 'completed') {
                        progressLabel.textContent = 'Video ready!';
                        progressDetails.innerHTML = '<a href="#" onclick="app.video.downloadVideo()">Click to download</a>';
                        this.showNotification('Video generated successfully! 🎬', 'success');
                        return;
                    } else if (status.status === 'failed') {
                        throw new Error(status.error || 'Video generation failed');
                    }

                    // Continue polling
                    setTimeout(pollProgress, 2000);
                } else {
                    throw new Error(result.error || 'Failed to get status');
                }
            } catch (error) {
                progressContainer.style.display = 'none';
                this.showNotification(`Video generation failed: ${error.message}`, 'error');
            }
        };

        setTimeout(pollProgress, 1000);
    }

    getProgressMessage(status, percentage) {
        switch (status) {
            case 'processing':
                if (percentage < 30) return 'Loading map and routes...';
                if (percentage < 80) return 'Generating animation frames...';
                return 'Finalizing video...';
            case 'completed':
                return 'Video ready for download!';
            case 'failed':
                return 'Generation failed. Please try again.';
            default:
                return 'Processing...';
        }
    }

    updateStatistics() {
        const stats = this.dispatchEventSync('getStatistics') || {};
        
        document.getElementById('totalRoutes').textContent = stats.totalRoutes || '0';
        document.getElementById('totalWaypoints').textContent = stats.totalWaypoints || '0';
        document.getElementById('estimatedDistance').textContent = stats.estimatedDistance || '-';
    }

    showLoading(title = 'Loading...', message = 'Please wait...') {
        const overlay = document.getElementById('loadingOverlay');
        const titleElement = overlay.querySelector('.loading-title');
        const textElement = overlay.querySelector('.loading-text');

        titleElement.textContent = title;
        textElement.textContent = message;
        overlay.style.display = 'flex';
        this.isLoading = true;
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
        this.isLoading = false;
    }

    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type} fade-in`;

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icons[type] || icons.info}</span>
                <span class="notification-message">${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(notification);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }

        this.notifications.push(notification);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    downloadFile(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Event system for communication between components
    dispatchEvent(eventName, data = {}) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
        return event;
    }

    dispatchEventSync(eventName, data = {}) {
        const event = this.dispatchEvent(eventName, data);
        return event.detail.result;
    }

    async dispatchEventAsync(eventName, data = {}) {
        const event = this.dispatchEvent(eventName, data);
        return event.detail.result;
    }

    addEventListener(eventName, callback) {
        document.addEventListener(eventName, callback);
    }
}