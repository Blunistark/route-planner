/**
 * MapCanvas - Handles canvas operations, map rendering, and user interactions
 */
class MapCanvas {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.mapImage = null;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.currentTool = 'select';
        this.isDrawing = false;
        this.currentRoute = null;
        this.routes = [];
        this.hoveredWaypoint = null;
        this.selectedWaypoint = null;
        this.branchMode = false; // Flag for branch route creation mode
    }

    init() {
        this.setupCanvas();
        this.bindEvents();
        this.bindUIEvents();
        this.render();
        console.log('✅ MapCanvas initialized');
    }

    setupCanvas() {
        this.canvas = document.getElementById('mapCanvas');
        if (!this.canvas) {
            console.error('Map canvas element not found');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error('Unable to get 2D context from canvas');
            return;
        }
        
        // Set canvas size
        this.resizeCanvas();
        
        // Setup canvas properties
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    resizeCanvas() {
        const wrapper = document.getElementById('canvasWrapper');
        const rect = wrapper.getBoundingClientRect();
        
        // Set canvas size to match container
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Update canvas style size
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.render();
    }

    handleResize() {
        // Handle window resize events
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        this.resizeTimeout = setTimeout(() => {
            this.resizeCanvas();
        }, 100);
    }

    bindEvents() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));

        // Window resize
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => this.resizeCanvas(), 100);
        });

        // Zoom controls
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
        document.getElementById('resetZoom').addEventListener('click', () => this.resetZoom());
    }

    bindUIEvents() {
        // Listen for UI events
        document.addEventListener('toolChanged', (e) => {
            this.currentTool = e.detail.tool;
            this.updateCanvasInfo(`Tool: ${this.currentTool}`);
        });

        document.addEventListener('mapUploaded', (e) => {
            this.loadMapImage(e.detail.mapData);
        });

        document.addEventListener('mapRemoved', () => {
            this.removeMapImage();
        });

        document.addEventListener('routeColorChanged', (e) => {
            this.updateCurrentRouteStyle('color', e.detail.color);
        });

        document.addEventListener('routeWidthChanged', (e) => {
            this.updateCurrentRouteStyle('width', e.detail.width);
        });

        document.addEventListener('routeStyleChanged', (e) => {
            this.updateCurrentRouteStyle('dashPattern', this.getDashPattern(e.detail.style));
        });

        document.addEventListener('addRoute', () => {
            this.startNewRoute();
        });

        document.addEventListener('addBranchRoute', () => {
            this.startBranchRouteMode();
        });

        document.addEventListener('clearAllRoutes', () => {
            this.clearAllRoutes();
        });

        document.addEventListener('exportImage', (e) => {
            e.detail.result = this.exportImage();
        });

        document.addEventListener('getProjectData', (e) => {
            e.detail.result = this.getProjectData();
        });

        document.addEventListener('loadProjectData', async (e) => {
            e.detail.result = await this.loadProjectData(e.detail.projectData);
        });

        document.addEventListener('getStatistics', (e) => {
            e.detail.result = this.getStatistics();
        });
    }

    async loadMapImage(mapData) {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = mapData.url;
            });

            this.mapImage = img;
            this.centerAndFitMap();
            this.render();
            this.updateCanvasInfo(`Map loaded: ${mapData.originalName}`);
            
            // Hide drop zone
            document.getElementById('canvasDropZone').style.display = 'none';
            
        } catch (error) {
            console.error('Failed to load map image:', error);
            throw error;
        }
    }

    removeMapImage() {
        this.mapImage = null;
        this.routes = [];
        this.currentRoute = null;
        this.resetZoom();
        this.render();
        
        // Show drop zone
        document.getElementById('canvasDropZone').style.display = 'flex';
    }

    centerAndFitMap() {
        if (!this.mapImage) return;

        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const imageWidth = this.mapImage.width;
        const imageHeight = this.mapImage.height;

        // Calculate scale to fit image in canvas
        const scaleX = canvasWidth / imageWidth;
        const scaleY = canvasHeight / imageHeight;
        this.scale = Math.min(scaleX, scaleY) * 0.9; // 90% to leave some padding

        // Center the image
        this.offsetX = (canvasWidth - imageWidth * this.scale) / 2;
        this.offsetY = (canvasHeight - imageHeight * this.scale) / 2;

        this.updateZoomDisplay();
    }

    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        this.lastMousePos = pos;

        switch (this.currentTool) {
            case 'select':
                this.handleSelectMouseDown(pos);
                break;
            case 'draw':
                this.handleDrawMouseDown(pos);
                break;
            case 'erase':
                this.handleEraseMouseDown(pos);
                break;
            case 'branch':
                this.handleBranchMouseDown(pos);
                break;
        }
    }

    handleMouseMove(e) {
        const pos = this.getMousePos(e);
        
        if (this.isDragging && this.currentTool === 'select') {
            this.handlePan(pos);
        } else {
            this.updateHoverState(pos);
        }
        
        this.updateCanvasInfo(this.getCanvasInfo(pos));
    }

    handleMouseUp(e) {
        const pos = this.getMousePos(e);
        
        this.isDragging = false;
        document.querySelector('.canvas-area').classList.remove('dragging');
        
        if (this.currentTool === 'draw' && this.isDrawing) {
            // Continue drawing mode until user switches tools or presses escape
        }
    }

    handleWheel(e) {
        e.preventDefault();
        
        const pos = this.getMousePos(e);
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        
        this.zoomAt(pos.x, pos.y, delta);
    }

    handleSelectMouseDown(pos) {
        const waypoint = this.getWaypointAt(pos);
        
        if (waypoint) {
            this.selectedWaypoint = waypoint;
            this.render();
        } else if (this.mapImage) {
            // Start panning
            this.isDragging = true;
            document.querySelector('.canvas-area').classList.add('dragging');
        }
    }

    handleDrawMouseDown(pos) {
        if (!this.mapImage) {
            window.app.ui.showNotification('Please upload a map first.', 'warning');
            return;
        }

        const mapPos = this.canvasToMap(pos);
        
        if (!this.currentRoute) {
            this.startNewRoute();
        }

        this.addWaypointToRoute(mapPos);
        this.isDrawing = true;
        this.render();
    }

    handleEraseMouseDown(pos) {
        const waypoint = this.getWaypointAt(pos);
        
        if (waypoint) {
            this.removeWaypoint(waypoint);
            this.render();
        }
    }

    handleBranchMouseDown(pos) {
        const waypoint = this.getWaypointAt(pos);
        
        if (waypoint) {
            // Find which route this waypoint belongs to
            const sourceRoute = this.routes.find(route => 
                route.waypoints.some(wp => wp.x === waypoint.x && wp.y === waypoint.y)
            );
            
            if (sourceRoute) {
                this.createBranchFromWaypoint(waypoint, sourceRoute);
            } else {
                console.error('Could not find source route for waypoint');
            }
        } else {
            // If no waypoint clicked, show message
            if (window.app?.ui?.showNotification) {
                window.app.ui.showNotification('Click on a waypoint to create a branch route from that point', 'warning');
            } else {
                alert('Click on a waypoint to create a branch route from that point');
            }
        }
    }

    handlePan(pos) {
        const dx = pos.x - this.lastMousePos.x;
        const dy = pos.y - this.lastMousePos.y;
        
        this.offsetX += dx;
        this.offsetY += dy;
        
        this.lastMousePos = pos;
        this.render();
    }

    startNewRoute() {
        const routeColor = document.getElementById('routeColor').value;
        const routeWidth = parseInt(document.getElementById('routeWidth').value);
        const routeStyle = document.getElementById('routeStyle').value;
        
        this.currentRoute = {
            id: this.generateRouteId(),
            name: `Route ${this.routes.length + 1}`,
            waypoints: [],
            style: {
                color: routeColor,
                width: routeWidth,
                dashPattern: this.getDashPattern(routeStyle)
            },
            visible: true,
            created: new Date().toISOString(),
            animation: {
                duration: 3000,
                easing: 'ease-in-out',
                delay: 0
            }
        };
        
        this.routes.push(this.currentRoute);
        this.updateRoutesList();
        this.updateStatistics();
    }

    startBranchRouteMode() {
        this.branchMode = true;
        this.currentTool = 'branch';
        
        // Update UI to show branch mode
        this.updateToolUI();
        
        // Show instruction message
        if (window.app?.ui?.showNotification) {
            window.app.ui.showNotification('Branch Route Mode: Click on any waypoint to create a new route branch from that point', 'info');
        } else {
            alert('Branch Route Mode: Click on any waypoint to create a new route branch from that point');
        }
        
        console.log('🌿 Branch route mode activated');
    }

    createBranchFromWaypoint(sourceWaypoint, sourceRoute) {
        if (!sourceWaypoint || !sourceRoute) {
            console.error('Invalid waypoint or route for branching');
            return;
        }

        const routeColor = document.getElementById('routeColor').value;
        const routeWidth = parseInt(document.getElementById('routeWidth').value);
        const routeStyle = document.getElementById('routeStyle').value;
        
        // Create new branch route
        const branchRoute = {
            id: this.generateRouteId(),
            name: `Branch from ${sourceRoute.name}`,
            waypoints: [
                // Start with the source waypoint as the first waypoint of the branch
                { ...sourceWaypoint }
            ],
            style: {
                color: routeColor,
                width: routeWidth,
                dashPattern: this.getDashPattern(routeStyle)
            },
            visible: true,
            created: new Date().toISOString(),
            animation: {
                duration: 3000,
                easing: 'ease-in-out',
                delay: sourceRoute.animation?.delay || 0 + 500 // Slight delay after parent route
            },
            parentRoute: sourceRoute.id,
            branchFromWaypoint: sourceWaypoint
        };
        
        this.routes.push(branchRoute);
        this.currentRoute = branchRoute;
        
        // Exit branch mode and enter drawing mode
        this.branchMode = false;
        this.currentTool = 'draw';
        this.updateToolUI();
        
        this.updateRoutesList();
        this.updateStatistics();
        this.render();
        
        if (window.app?.ui?.showNotification) {
            window.app.ui.showNotification(`Branch route created from ${sourceRoute.name}. Continue adding waypoints.`, 'success');
        }
        
        console.log('🌿 Branch route created:', branchRoute);
    }

    addWaypointToRoute(mapPos) {
        if (!this.currentRoute) return;

        const waypoint = {
            x: mapPos.x,
            y: mapPos.y,
            timestamp: Date.now()
        };

        this.currentRoute.waypoints.push(waypoint);
        this.updateStatistics();
    }

    removeWaypoint(waypoint) {
        for (const route of this.routes) {
            const index = route.waypoints.findIndex(wp => 
                Math.abs(wp.x - waypoint.x) < 5 && Math.abs(wp.y - waypoint.y) < 5
            );
            
            if (index !== -1) {
                route.waypoints.splice(index, 1);
                
                // Remove route if no waypoints left
                if (route.waypoints.length === 0) {
                    this.removeRoute(route.id);
                }
                
                this.updateStatistics();
                break;
            }
        }
    }

    removeRoute(routeId) {
        const index = this.routes.findIndex(route => route.id === routeId);
        if (index !== -1) {
            this.routes.splice(index, 1);
            
            if (this.currentRoute && this.currentRoute.id === routeId) {
                this.currentRoute = null;
            }
            
            this.updateRoutesList();
            this.updateStatistics();
            this.render();
        }
    }

    clearAllRoutes() {
        this.routes = [];
        this.currentRoute = null;
        this.updateRoutesList();
        this.updateStatistics();
        this.render();
    }

    updateCurrentRouteStyle(property, value) {
        if (this.currentRoute) {
            this.currentRoute.style[property] = value;
            this.render();
        }
    }

    getDashPattern(style) {
        switch (style) {
            case 'dashed':
                return [10, 5];
            case 'dotted':
                return [2, 3];
            default:
                return [];
        }
    }

    zoomIn() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.zoomAt(centerX, centerY, 1.2);
    }

    zoomOut() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.zoomAt(centerX, centerY, 0.8);
    }

    resetZoom() {
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        
        if (this.mapImage) {
            this.centerAndFitMap();
        }
        
        this.render();
    }

    zoomAt(x, y, delta) {
        const newScale = Math.max(0.1, Math.min(5, this.scale * delta));
        
        if (newScale !== this.scale) {
            const scaleDiff = newScale / this.scale;
            
            this.offsetX = x - (x - this.offsetX) * scaleDiff;
            this.offsetY = y - (y - this.offsetY) * scaleDiff;
            this.scale = newScale;
            
            this.updateZoomDisplay();
            this.render();
        }
    }

    updateZoomDisplay() {
        document.getElementById('zoomLevel').textContent = `${Math.round(this.scale * 100)}%`;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw map image
        if (this.mapImage) {
            this.drawMapImage();
        }
        
        // Draw routes
        this.drawRoutes();
        
        // Draw waypoints
        this.drawWaypoints();
    }

    drawMapImage() {
        if (!this.mapImage) return;

        this.ctx.save();
        this.ctx.globalAlpha = 1;
        
        const width = this.mapImage.width * this.scale;
        const height = this.mapImage.height * this.scale;
        
        this.ctx.drawImage(
            this.mapImage,
            this.offsetX,
            this.offsetY,
            width,
            height
        );
        
        this.ctx.restore();
    }

    drawRoutes() {
        for (const route of this.routes) {
            if (!route.visible || route.waypoints.length < 2) continue;
            
            this.ctx.save();
            
            // Set style
            this.ctx.strokeStyle = route.style.color;
            this.ctx.lineWidth = route.style.width;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            if (route.style.dashPattern && route.style.dashPattern.length > 0) {
                this.ctx.setLineDash(route.style.dashPattern);
            }
            
            // Draw path
            this.ctx.beginPath();
            
            for (let i = 0; i < route.waypoints.length; i++) {
                const waypoint = route.waypoints[i];
                const canvasPos = this.mapToCanvas(waypoint);
                
                if (i === 0) {
                    this.ctx.moveTo(canvasPos.x, canvasPos.y);
                } else {
                    this.ctx.lineTo(canvasPos.x, canvasPos.y);
                }
            }
            
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    drawWaypoints() {
        for (const route of this.routes) {
            if (!route.visible) continue;
            
            for (let i = 0; i < route.waypoints.length; i++) {
                const waypoint = route.waypoints[i];
                const canvasPos = this.mapToCanvas(waypoint);
                
                this.ctx.save();
                
                // Waypoint circle
                this.ctx.fillStyle = route.style.color;
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                
                const radius = 4;
                
                this.ctx.beginPath();
                this.ctx.arc(canvasPos.x, canvasPos.y, radius, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.stroke();
                
                // Waypoint number
                if (radius > 3) {
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = '10px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(String(i + 1), canvasPos.x, canvasPos.y);
                }
                
                this.ctx.restore();
            }
        }
    }

    updateHoverState(pos) {
        const waypoint = this.getWaypointAt(pos);
        
        if (waypoint !== this.hoveredWaypoint) {
            this.hoveredWaypoint = waypoint;
            
            if (waypoint) {
                this.canvas.style.cursor = 'pointer';
            } else if (this.mapImage) {
                this.canvas.style.cursor = this.currentTool === 'select' ? 'grab' : 'crosshair';
            } else {
                this.canvas.style.cursor = 'default';
            }
        }
    }

    getWaypointAt(pos) {
        const threshold = 10; // pixels
        
        for (const route of this.routes) {
            if (!route.visible) continue;
            
            for (const waypoint of route.waypoints) {
                const canvasPos = this.mapToCanvas(waypoint);
                const distance = Math.sqrt(
                    Math.pow(pos.x - canvasPos.x, 2) + 
                    Math.pow(pos.y - canvasPos.y, 2)
                );
                
                if (distance <= threshold) {
                    return waypoint;
                }
            }
        }
        
        return null;
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    canvasToMap(canvasPos) {
        return {
            x: (canvasPos.x - this.offsetX) / this.scale,
            y: (canvasPos.y - this.offsetY) / this.scale
        };
    }

    mapToCanvas(mapPos) {
        return {
            x: mapPos.x * this.scale + this.offsetX,
            y: mapPos.y * this.scale + this.offsetY
        };
    }

    updateCanvasInfo(text) {
        document.getElementById('canvasInfo').textContent = text;
    }

    getCanvasInfo(pos) {
        if (!this.mapImage) {
            return 'Upload a map to get started';
        }
        
        const mapPos = this.canvasToMap(pos);
        return `Position: ${Math.round(mapPos.x)}, ${Math.round(mapPos.y)} | Scale: ${Math.round(this.scale * 100)}%`;
    }

    updateRoutesList() {
        const routesList = document.getElementById('routesList');
        
        if (this.routes.length === 0) {
            routesList.innerHTML = `
                <div class="no-routes">
                    <p>No routes created yet.</p>
                    <small>Click "New Route" or start drawing on the map.</small>
                </div>
            `;
            return;
        }
        
        routesList.innerHTML = this.routes.map(route => `
            <div class="route-item ${route === this.currentRoute ? 'active' : ''} ${route.parentRoute ? 'branch-route' : ''}" data-route-id="${route.id}">
                <div class="route-header">
                    <div class="route-name">
                        <div class="route-color" style="background-color: ${route.style.color}"></div>
                        ${route.parentRoute ? '🌿 ' : ''}${route.name}
                    </div>
                    <div class="route-actions">
                        <button class="route-visibility ${route.visible ? 'visible' : ''}" onclick="app.canvas.toggleRouteVisibility('${route.id}')">
                            ${route.visible ? '👁️' : '🙈'}
                        </button>
                        <button class="route-action" onclick="app.canvas.removeRoute('${route.id}')" title="Delete route">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="route-info">
                    <div class="route-stats">
                        <span>${route.waypoints.length} points</span>
                        <span>${this.calculateRouteDistance(route)}m</span>
                        ${route.parentRoute ? '<span class="branch-indicator">Branch</span>' : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    toggleRouteVisibility(routeId) {
        const route = this.routes.find(r => r.id === routeId);
        if (route) {
            route.visible = !route.visible;
            this.updateRoutesList();
            this.render();
        }
    }

    calculateRouteDistance(route) {
        if (route.waypoints.length < 2) return 0;
        
        let distance = 0;
        for (let i = 1; i < route.waypoints.length; i++) {
            const prev = route.waypoints[i - 1];
            const curr = route.waypoints[i];
            distance += Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
        }
        
        return Math.round(distance);
    }

    updateStatistics() {
        const stats = this.getStatistics();
        window.app.ui.updateStatistics();
    }

    getStatistics() {
        const totalRoutes = this.routes.length;
        const totalWaypoints = this.routes.reduce((sum, route) => sum + route.waypoints.length, 0);
        const totalDistance = this.routes.reduce((sum, route) => sum + this.calculateRouteDistance(route), 0);
        
        return {
            totalRoutes,
            totalWaypoints,
            estimatedDistance: totalDistance > 0 ? `${Math.round(totalDistance)}px` : '-'
        };
    }

    exportImage() {
        return new Promise((resolve) => {
            try {
                const dataUrl = this.canvas.toDataURL('image/png');
                resolve({ 
                    success: true, 
                    dataUrl,
                    filename: `route-map-${Date.now()}.png`
                });
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    }

    getProjectData() {
        return {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            mapInfo: this.mapImage ? {
                width: this.mapImage.width,
                height: this.mapImage.height,
                src: this.mapImage.src
            } : null,
            routes: this.routes,
            viewport: {
                scale: this.scale,
                offsetX: this.offsetX,
                offsetY: this.offsetY
            }
        };
    }

    async loadProjectData(projectData) {
        try {
            // Clear existing data
            this.routes = [];
            this.currentRoute = null;
            
            // Load routes
            if (projectData.routes) {
                this.routes = projectData.routes.map(route => ({
                    ...route,
                    id: route.id || this.generateRouteId()
                }));
            }
            
            // Load viewport
            if (projectData.viewport) {
                this.scale = projectData.viewport.scale || 1;
                this.offsetX = projectData.viewport.offsetX || 0;
                this.offsetY = projectData.viewport.offsetY || 0;
            }
            
            // Load map if available
            if (projectData.mapInfo && projectData.mapInfo.src) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = projectData.mapInfo.src;
                });
                
                this.mapImage = img;
                document.getElementById('canvasDropZone').style.display = 'none';
            }
            
            this.updateRoutesList();
            this.updateStatistics();
            this.render();
            
            return { success: true };
        } catch (error) {
            console.error('Failed to load project data:', error);
            return { success: false, error: error.message };
        }
    }

    generateRouteId() {
        return 'route_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Touch event handlers
    handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.handleMouseDown(mouseEvent);
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.handleMouseMove(mouseEvent);
        }
    }

    handleTouchEnd(e) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        this.handleMouseUp(mouseEvent);
    }

    getMapImageData() {
        // Return the map image as base64 data URL if available
        if (this.mapImage) {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            tempCanvas.width = this.mapImage.width;
            tempCanvas.height = this.mapImage.height;
            
            tempCtx.drawImage(this.mapImage, 0, 0);
            
            return {
                dataUrl: tempCanvas.toDataURL('image/png'),
                width: this.mapImage.width,
                height: this.mapImage.height,
                hasMap: true
            };
        } else {
            // Return a placeholder if no map is loaded
            return {
                dataUrl: null,
                width: 1920,
                height: 1080,
                hasMap: false
            };
        }
    }

    updateToolUI() {
        // This method communicates with UIController to update tool selection
        if (window.app?.ui) {
            window.app.ui.selectTool(this.currentTool);
        }
    }
}