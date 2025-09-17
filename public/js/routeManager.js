/**
 * RouteManager - Handles route data management, persistence, and operations
 */
class RouteManager {
    constructor() {
        this.routes = [];
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        this.routeCounter = 1;
    }

    init() {
        this.bindEvents();
        this.loadFromStorage();
        console.log('✅ RouteManager initialized');
    }

    bindEvents() {
        // Listen for canvas events
        document.addEventListener('routeCreated', (e) => {
            this.addRoute(e.detail.route);
        });

        document.addEventListener('routeUpdated', (e) => {
            this.updateRoute(e.detail.route);
        });

        document.addEventListener('routeDeleted', (e) => {
            this.deleteRoute(e.detail.routeId);
        });

        document.addEventListener('waypointAdded', (e) => {
            this.addWaypoint(e.detail.routeId, e.detail.waypoint);
        });

        document.addEventListener('waypointRemoved', (e) => {
            this.removeWaypoint(e.detail.routeId, e.detail.waypointIndex);
        });

        document.addEventListener('waypointMoved', (e) => {
            this.moveWaypoint(e.detail.routeId, e.detail.waypointIndex, e.detail.newPosition);
        });

        // UI events
        document.addEventListener('addRoute', () => {
            this.createNewRoute();
        });

        document.addEventListener('clearAllRoutes', () => {
            this.clearAllRoutes();
        });

        document.addEventListener('editRoute', (e) => {
            this.editRoute(e.detail.routeId);
        });

        document.addEventListener('duplicateRoute', (e) => {
            this.duplicateRoute(e.detail.routeId);
        });

        document.addEventListener('deleteRoute', (e) => {
            this.deleteRoute(e.detail.routeId);
        });

        // Undo/Redo
        document.addEventListener('undo', () => {
            this.undo();
        });

        document.addEventListener('redo', () => {
            this.redo();
        });

        // Export/Import
        document.addEventListener('exportRoutes', async (e) => {
            e.detail.result = await this.exportRoutes();
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

        // Auto-save
        this.setupAutoSave();
    }

    createNewRoute() {
        const routeColor = document.getElementById('routeColor').value;
        const routeWidth = parseInt(document.getElementById('routeWidth').value);
        const routeStyle = document.getElementById('routeStyle').value;

        const route = {
            id: this.generateRouteId(),
            name: `Route ${this.routeCounter++}`,
            waypoints: [],
            style: {
                color: routeColor,
                width: routeWidth,
                dashPattern: this.getDashPattern(routeStyle)
            },
            properties: {
                description: '',
                category: 'default',
                estimatedTime: 0,
                difficulty: 'easy'
            },
            metadata: {
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                version: 1
            },
            visible: true,
            locked: false,
            animation: {
                duration: 3000,
                easing: 'ease-in-out',
                delay: 0
            }
        };

        this.addRoute(route);
        this.saveState('Create new route');
        return route;
    }

    addRoute(route) {
        this.routes.push(route);
        this.saveToStorage();
        this.dispatchEvent('routeAdded', { route });
        this.updateStatistics();
    }

    updateRoute(route) {
        const index = this.routes.findIndex(r => r.id === route.id);
        if (index !== -1) {
            route.metadata.modified = new Date().toISOString();
            route.metadata.version += 1;
            this.routes[index] = route;
            this.saveToStorage();
            this.dispatchEvent('routeUpdated', { route });
            this.updateStatistics();
        }
    }

    deleteRoute(routeId) {
        const index = this.routes.findIndex(r => r.id === routeId);
        if (index !== -1) {
            const deletedRoute = this.routes.splice(index, 1)[0];
            this.saveToStorage();
            this.dispatchEvent('routeDeleted', { route: deletedRoute });
            this.saveState('Delete route');
            this.updateStatistics();
            return deletedRoute;
        }
        return null;
    }

    duplicateRoute(routeId) {
        const originalRoute = this.routes.find(r => r.id === routeId);
        if (!originalRoute) return null;

        const duplicatedRoute = {
            ...JSON.parse(JSON.stringify(originalRoute)), // Deep copy
            id: this.generateRouteId(),
            name: `${originalRoute.name} (Copy)`,
            metadata: {
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                version: 1
            }
        };

        // Offset waypoints slightly
        duplicatedRoute.waypoints = duplicatedRoute.waypoints.map(wp => ({
            ...wp,
            x: wp.x + 10,
            y: wp.y + 10
        }));

        this.addRoute(duplicatedRoute);
        this.saveState('Duplicate route');
        return duplicatedRoute;
    }

    addWaypoint(routeId, waypoint) {
        const route = this.routes.find(r => r.id === routeId);
        if (route) {
            route.waypoints.push({
                ...waypoint,
                id: this.generateWaypointId(),
                timestamp: Date.now()
            });
            this.updateRoute(route);
            this.saveState('Add waypoint');
        }
    }

    removeWaypoint(routeId, waypointIndex) {
        const route = this.routes.find(r => r.id === routeId);
        if (route && waypointIndex >= 0 && waypointIndex < route.waypoints.length) {
            const removedWaypoint = route.waypoints.splice(waypointIndex, 1)[0];
            
            // Remove route if no waypoints left
            if (route.waypoints.length === 0) {
                this.deleteRoute(routeId);
            } else {
                this.updateRoute(route);
            }
            
            this.saveState('Remove waypoint');
            return removedWaypoint;
        }
        return null;
    }

    moveWaypoint(routeId, waypointIndex, newPosition) {
        const route = this.routes.find(r => r.id === routeId);
        if (route && waypointIndex >= 0 && waypointIndex < route.waypoints.length) {
            route.waypoints[waypointIndex] = {
                ...route.waypoints[waypointIndex],
                ...newPosition
            };
            this.updateRoute(route);
            this.saveState('Move waypoint');
        }
    }

    clearAllRoutes() {
        this.routes = [];
        this.routeCounter = 1;
        this.saveToStorage();
        this.dispatchEvent('routesCleared');
        this.saveState('Clear all routes');
        this.updateStatistics();
    }

    editRoute(routeId) {
        const route = this.routes.find(r => r.id === routeId);
        if (route) {
            this.showRouteEditor(route);
        }
    }

    showRouteEditor(route) {
        // Create modal for route editing
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Route: ${route.name}</h3>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Route Name</label>
                        <input type="text" id="edit-route-name" value="${route.name}" class="input">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="edit-route-description" class="input" rows="3">${route.properties.description}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Category</label>
                        <select id="edit-route-category" class="select">
                            <option value="default" ${route.properties.category === 'default' ? 'selected' : ''}>Default</option>
                            <option value="scenic" ${route.properties.category === 'scenic' ? 'selected' : ''}>Scenic</option>
                            <option value="fastest" ${route.properties.category === 'fastest' ? 'selected' : ''}>Fastest</option>
                            <option value="alternative" ${route.properties.category === 'alternative' ? 'selected' : ''}>Alternative</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Color</label>
                        <input type="color" id="edit-route-color" value="${route.style.color}" class="color-picker">
                    </div>
                    <div class="form-group">
                        <label>Line Width</label>
                        <input type="range" id="edit-route-width" min="1" max="20" value="${route.style.width}" class="slider">
                        <span id="edit-width-value">${route.style.width}px</span>
                    </div>
                    <div class="form-group">
                        <label>Animation Duration (ms)</label>
                        <input type="number" id="edit-route-duration" value="${route.animation.duration}" class="input">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">Cancel</button>
                    <button class="btn btn-primary modal-save">Save Changes</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Bind events
        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.querySelector('.modal-cancel').onclick = () => modal.remove();
        modal.querySelector('.modal-overlay').onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        // Update width display
        const widthSlider = modal.querySelector('#edit-route-width');
        const widthValue = modal.querySelector('#edit-width-value');
        widthSlider.oninput = () => {
            widthValue.textContent = `${widthSlider.value}px`;
        };

        // Save changes
        modal.querySelector('.modal-save').onclick = () => {
            const updatedRoute = {
                ...route,
                name: modal.querySelector('#edit-route-name').value,
                properties: {
                    ...route.properties,
                    description: modal.querySelector('#edit-route-description').value,
                    category: modal.querySelector('#edit-route-category').value
                },
                style: {
                    ...route.style,
                    color: modal.querySelector('#edit-route-color').value,
                    width: parseInt(modal.querySelector('#edit-route-width').value)
                },
                animation: {
                    ...route.animation,
                    duration: parseInt(modal.querySelector('#edit-route-duration').value)
                }
            };

            this.updateRoute(updatedRoute);
            this.saveState('Edit route properties');
            modal.remove();
            
            window.app.ui.showNotification('Route updated successfully!', 'success');
        };
    }

    // History management for undo/redo
    saveState(description) {
        const state = {
            description,
            timestamp: Date.now(),
            routes: JSON.parse(JSON.stringify(this.routes)) // Deep copy
        };

        // Remove future states if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history.splice(this.historyIndex + 1);
        }

        this.history.push(state);
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }

        this.updateUndoRedoButtons();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const state = this.history[this.historyIndex];
            this.routes = JSON.parse(JSON.stringify(state.routes));
            this.saveToStorage();
            this.dispatchEvent('routesRestored', { routes: this.routes });
            this.updateUndoRedoButtons();
            this.updateStatistics();
            
            window.app.ui.showNotification(`Undid: ${state.description}`, 'info');
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const state = this.history[this.historyIndex];
            this.routes = JSON.parse(JSON.stringify(state.routes));
            this.saveToStorage();
            this.dispatchEvent('routesRestored', { routes: this.routes });
            this.updateUndoRedoButtons();
            this.updateStatistics();
            
            window.app.ui.showNotification(`Redid: ${state.description}`, 'info');
        }
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoAction');
        const redoBtn = document.getElementById('redoAction');
        
        undoBtn.disabled = this.historyIndex <= 0;
        redoBtn.disabled = this.historyIndex >= this.history.length - 1;
    }

    // Export/Import functions
    async exportRoutes() {
        try {
            const exportData = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                routes: this.routes,
                statistics: this.getStatistics(),
                metadata: {
                    totalRoutes: this.routes.length,
                    exportedBy: 'Map Route Video Generator',
                    format: 'json'
                }
            };

            const response = await fetch('/api/export/routes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(exportData)
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Export failed:', error);
            return { success: false, error: error.message };
        }
    }

    getProjectData() {
        return {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            routes: this.routes,
            routeCounter: this.routeCounter,
            history: this.history.slice(-10), // Only keep recent history
            historyIndex: this.historyIndex
        };
    }

    async loadProjectData(projectData) {
        try {
            if (projectData.routes) {
                this.routes = projectData.routes.map(route => ({
                    ...route,
                    id: route.id || this.generateRouteId()
                }));
            }

            if (projectData.routeCounter) {
                this.routeCounter = projectData.routeCounter;
            }

            if (projectData.history) {
                this.history = projectData.history;
                this.historyIndex = projectData.historyIndex || -1;
            }

            this.saveToStorage();
            this.dispatchEvent('routesLoaded', { routes: this.routes });
            this.updateStatistics();
            this.updateUndoRedoButtons();

            return { success: true };
        } catch (error) {
            console.error('Failed to load project data:', error);
            return { success: false, error: error.message };
        }
    }

    // Statistics
    getStatistics() {
        const totalRoutes = this.routes.length;
        const totalWaypoints = this.routes.reduce((sum, route) => sum + route.waypoints.length, 0);
        const totalDistance = this.routes.reduce((sum, route) => sum + this.calculateRouteDistance(route), 0);
        const averageWaypoints = totalRoutes > 0 ? Math.round(totalWaypoints / totalRoutes) : 0;

        return {
            totalRoutes,
            totalWaypoints,
            averageWaypoints,
            estimatedDistance: totalDistance > 0 ? `${Math.round(totalDistance)}px` : '-',
            categories: this.getRouteCategories(),
            longestRoute: this.getLongestRoute(),
            shortestRoute: this.getShortestRoute()
        };
    }

    calculateRouteDistance(route) {
        if (route.waypoints.length < 2) return 0;
        
        let distance = 0;
        for (let i = 1; i < route.waypoints.length; i++) {
            const prev = route.waypoints[i - 1];
            const curr = route.waypoints[i];
            distance += Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
        }
        
        return distance;
    }

    getRouteCategories() {
        const categories = {};
        this.routes.forEach(route => {
            if (route && route.properties) {
                const category = route.properties.category || 'default';
                categories[category] = (categories[category] || 0) + 1;
            }
        });
        return categories;
    }

    getLongestRoute() {
        if (this.routes.length === 0) return null;
        return this.routes.reduce((longest, route) => 
            this.calculateRouteDistance(route) > this.calculateRouteDistance(longest) ? route : longest
        );
    }

    getShortestRoute() {
        if (this.routes.length === 0) return null;
        return this.routes.reduce((shortest, route) => 
            this.calculateRouteDistance(route) < this.calculateRouteDistance(shortest) ? route : shortest
        );
    }

    updateStatistics() {
        this.dispatchEvent('statisticsUpdated', { statistics: this.getStatistics() });
    }

    // Storage
    saveToStorage() {
        try {
            const data = {
                routes: this.routes,
                routeCounter: this.routeCounter,
                timestamp: Date.now()
            };
            localStorage.setItem('mapRouteData', JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem('mapRouteData');
            if (data) {
                const parsed = JSON.parse(data);
                this.routes = parsed.routes || [];
                this.routeCounter = parsed.routeCounter || 1;
                console.log(`Loaded ${this.routes.length} routes from storage`);
            }
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
        }
    }

    setupAutoSave() {
        // Auto-save every 30 seconds
        setInterval(() => {
            if (this.routes.length > 0) {
                this.saveToStorage();
            }
        }, 30000);

        // Save before page unload
        window.addEventListener('beforeunload', () => {
            this.saveToStorage();
        });
    }

    // Utility functions
    generateRouteId() {
        return 'route_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateWaypointId() {
        return 'waypoint_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

    dispatchEvent(eventName, data = {}) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
        return event;
    }

    // Route validation
    validateRoute(route) {
        const errors = [];

        if (!route.name || route.name.trim() === '') {
            errors.push('Route name is required');
        }

        if (!route.waypoints || route.waypoints.length < 2) {
            errors.push('Route must have at least 2 waypoints');
        }

        if (!route.style || !route.style.color) {
            errors.push('Route color is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Route optimization
    optimizeRoute(routeId) {
        const route = this.routes.find(r => r.id === routeId);
        if (!route || route.waypoints.length < 3) return;

        // Simple optimization: remove waypoints that are too close together
        const optimizedWaypoints = [route.waypoints[0]]; // Keep first waypoint
        const minDistance = 5; // Minimum distance between waypoints

        for (let i = 1; i < route.waypoints.length - 1; i++) {
            const prev = optimizedWaypoints[optimizedWaypoints.length - 1];
            const current = route.waypoints[i];
            
            const distance = Math.sqrt(
                Math.pow(current.x - prev.x, 2) + 
                Math.pow(current.y - prev.y, 2)
            );

            if (distance >= minDistance) {
                optimizedWaypoints.push(current);
            }
        }

        // Always keep the last waypoint
        if (route.waypoints.length > 1) {
            optimizedWaypoints.push(route.waypoints[route.waypoints.length - 1]);
        }

        const originalCount = route.waypoints.length;
        route.waypoints = optimizedWaypoints;
        
        this.updateRoute(route);
        this.saveState('Optimize route');

        const removedCount = originalCount - optimizedWaypoints.length;
        if (removedCount > 0) {
            window.app.ui.showNotification(`Removed ${removedCount} redundant waypoints`, 'success');
        } else {
            window.app.ui.showNotification('Route is already optimized', 'info');
        }
    }
}