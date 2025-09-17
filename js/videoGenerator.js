/**
 * VideoGenerator - Handles video generation, preview, and export functionality
 */
class VideoGenerator {
    constructor() {
        this.previewCanvas = null;
        this.previewContext = null;
        this.animationFrameId = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.totalDuration = 5000; // Default 5 seconds
        this.playbackSpeed = 1.0;
        this.easingFunction = 'easeInOutCubic'; // Default easing
        
        // Easing functions for smooth animation
        this.easingFunctions = {
            linear: t => t,
            easeInQuad: t => t * t,
            easeOutQuad: t => t * (2 - t),
            easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            easeInCubic: t => t * t * t,
            easeOutCubic: t => (--t) * t * t + 1,
            easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
            easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        };
        
        this.videoSettings = {
            width: 1920,
            height: 1080,
            fps: 30,
            format: 'mp4',
            quality: 'high',
            backgroundColor: '#1e1e1e'
        };
        this.exportProgress = 0;
        this.exportStatus = 'idle';
        this.isExporting = false; // Flag to control video export behavior
    }

    init() {
        this.setupPreviewCanvas();
        this.bindEvents();
        this.loadSettings();
        console.log('✅ VideoGenerator initialized');
    }

    bindEvents() {
        // Bind DOM elements with error checking
        const playBtn = document.getElementById('playPreview');
        const stopBtn = document.getElementById('stopPreview');
        const timelineSlider = document.getElementById('timelineSlider');
        const generateVideoBtn = document.getElementById('generateVideo');
        
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                if (this.isPlaying) {
                    this.pausePreview();
                } else {
                    this.playPreview();
                }
            });
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stopPreview();
            });
        }
        
        if (timelineSlider) {
            timelineSlider.addEventListener('input', (e) => {
                const sliderValue = parseFloat(e.target.value);
                const progress = sliderValue / 100;
                const timeValue = progress * this.totalDuration;
                console.log(`🎛️ Timeline slider moved to: ${sliderValue}% (progress: ${progress}, time: ${timeValue})`);
                this.seekTo(timeValue);
            });
        }
        
        if (generateVideoBtn) {
            generateVideoBtn.addEventListener('click', () => {
                this.exportVideo();
            });
        }

        // Timeline controls
        document.addEventListener('playPreview', () => {
            this.playPreview();
        });

        document.addEventListener('pausePreview', () => {
            this.pausePreview();
        });

        document.addEventListener('stopPreview', () => {
            this.stopPreview();
        });

        document.addEventListener('seekPreview', (e) => {
            this.seekTo(e.detail.time);
        });

        document.addEventListener('setVideoSettings', (e) => {
            this.updateSettings(e.detail.settings);
        });

        // Export events
        document.addEventListener('exportVideo', async (e) => {
            e.detail.result = await this.exportVideo();
        });

        document.addEventListener('cancelExport', () => {
            this.cancelExport();
        });

        // Route updates
        document.addEventListener('routeAdded', () => {
            this.updatePreview();
        });

        document.addEventListener('routeUpdated', () => {
            this.updatePreview();
        });

        document.addEventListener('routeDeleted', () => {
            this.updatePreview();
        });

        document.addEventListener('routesCleared', () => {
            this.updatePreview();
        });

        document.addEventListener('routesRestored', () => {
            this.updatePreview();
        });

        // Settings panel
        this.setupSettingsPanel();
    }

    setupPreviewCanvas() {
        const previewContainer = document.getElementById('animationPreview');
        if (!previewContainer) {
            console.warn('Animation preview container not found');
            return;
        }
        
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.id = 'previewCanvas';
        this.previewCanvas.width = 640;
        this.previewCanvas.height = 360;
        this.previewCanvas.style.width = '100%';
        this.previewCanvas.style.height = 'auto';
        this.previewCanvas.style.border = '1px solid var(--border-color)';
        this.previewCanvas.style.borderRadius = '4px';
        
        this.previewContext = this.previewCanvas.getContext('2d');
        
        // Clear existing content
        previewContainer.innerHTML = '';
        previewContainer.appendChild(this.previewCanvas);

        // Add overlay for play button when not playing
        this.createPreviewOverlay();
    }

    createPreviewOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'preview-overlay';
        overlay.innerHTML = `
            <div class="preview-controls">
                <button id="previewPlayBtn" class="btn-icon btn-primary">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </button>
            </div>
        `;

        this.previewCanvas.parentElement.appendChild(overlay);
        
        // Bind play button
        document.getElementById('previewPlayBtn').addEventListener('click', () => {
            if (this.isPlaying) {
                this.pausePreview();
            } else {
                this.playPreview();
            }
        });
    }

    setupSettingsPanel() {
        // Populate video settings
        document.getElementById('videoWidth').value = this.videoSettings.width;
        document.getElementById('videoHeight').value = this.videoSettings.height;
        document.getElementById('videoFps').value = this.videoSettings.fps;
        document.getElementById('videoFormat').value = this.videoSettings.format;
        document.getElementById('videoQuality').value = this.videoSettings.quality;
        document.getElementById('videoBgColor').value = this.videoSettings.backgroundColor;

        // Bind settings changes
        ['videoWidth', 'videoHeight', 'videoFps', 'videoFormat', 'videoQuality', 'videoBgColor'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.updateSettingsFromUI();
                });
            }
        });

        // Duration controls
        document.getElementById('animationDuration').addEventListener('input', (e) => {
            this.totalDuration = parseInt(e.target.value) * 1000;
            this.updateTimelineDisplay();
        });
        
        // Easing control
        const easingSelect = document.getElementById('easingType');
        if (easingSelect) {
            easingSelect.addEventListener('change', (e) => {
                this.easingFunction = e.target.value;
                this.updatePreview();
            });
        }
        
        // Animation speed control
        const animationSpeed = document.getElementById('animationSpeed');
        if (animationSpeed) {
            animationSpeed.addEventListener('input', (e) => {
                this.playbackSpeed = parseFloat(e.target.value);
                const speedValue = document.getElementById('animationSpeedValue');
                if (speedValue) {
                    speedValue.textContent = `${this.playbackSpeed.toFixed(1)}x`;
                }
            });
        }
        
        // Total duration control
        const totalDurationSlider = document.getElementById('totalDuration');
        if (totalDurationSlider) {
            totalDurationSlider.addEventListener('input', (e) => {
                this.totalDuration = parseInt(e.target.value) * 1000;
                const durationValue = document.getElementById('totalDurationValue');
                if (durationValue) {
                    durationValue.textContent = `${e.target.value}s`;
                }
                this.updateTimelineDisplay();
                this.updatePreview();
            });
        }
    }

    updateSettingsFromUI() {
        this.videoSettings = {
            width: parseInt(document.getElementById('videoWidth').value),
            height: parseInt(document.getElementById('videoHeight').value),
            fps: parseInt(document.getElementById('videoFps').value),
            format: document.getElementById('videoFormat').value,
            quality: document.getElementById('videoQuality').value,
            backgroundColor: document.getElementById('videoBgColor').value
        };

        this.saveSettings();
        this.updatePreview();
    }

    updateSettings(settings) {
        this.videoSettings = { ...this.videoSettings, ...settings };
        this.saveSettings();
        this.updatePreview();
    }

    playPreview() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.updatePlayButton();
        this.startAnimation();
    }

    pausePreview() {
        this.isPlaying = false;
        this.updatePlayButton();
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    stopPreview() {
        this.isPlaying = false;
        this.currentTime = 0;
        this.updatePlayButton();
        this.updateTimelineDisplay();
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        this.renderFrame(0);
    }

    seekTo(time) {
        console.log(`⏯️ seekTo called with time: ${time}`);
        this.currentTime = Math.max(0, Math.min(time, this.totalDuration));
        console.log(`📍 Set currentTime to: ${this.currentTime}/${this.totalDuration}`);
        this.updateTimelineDisplay();
        const progress = this.currentTime / this.totalDuration;
        console.log(`📊 Calculated progress: ${progress}`);
        this.renderFrame(progress);
    }

    startAnimation() {
        const startTime = Date.now() - (this.currentTime / this.playbackSpeed);
        
        const animate = () => {
            if (!this.isPlaying) return;
            
            this.currentTime = (Date.now() - startTime) * this.playbackSpeed;
            
            if (this.currentTime >= this.totalDuration) {
                this.currentTime = this.totalDuration;
                this.isPlaying = false;
                this.updatePlayButton();
            }
            
            const progress = this.currentTime / this.totalDuration;
            this.renderFrame(progress);
            this.updateTimelineDisplay();
            
            if (this.isPlaying) {
                this.animationFrameId = requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    renderFrame(progress) {
        const ctx = this.previewContext;
        const canvas = this.previewCanvas;
        
        console.log(`🎬 renderFrame called with progress: ${progress}`);
        console.log('🔍 window.app:', window.app);
        console.log('🔍 window.app.routes:', window.app?.routes);
        console.log('🔍 window.app.canvas:', window.app?.canvas);
        console.log('🔍 window.app.canvas.routes:', window.app?.canvas?.routes);
        
        // Clear canvas
        ctx.fillStyle = this.videoSettings.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Get current map image
        const mapImage = window.app?.canvas?.mapImage;
        if (!mapImage) {
            console.log('❌ No map image found');
            this.drawNoMapMessage();
            return;
        }
        
        // Draw map background
        this.drawMapBackground(mapImage);
        
        // Get routes - prioritize MapCanvas since it has the actual waypoint data
        let routes = window.app?.canvas?.routes || [];
        
        // If no routes in MapCanvas, fallback to RouteManager
        if (routes.length === 0 && window.app?.routes?.routes) {
            routes = window.app.routes.routes;
        }
        
        console.log(`📍 Found ${routes.length} routes to animate`);
        console.log('🔍 Routes details:', routes.map(r => ({
            id: r.id,
            name: r.name,
            visible: r.visible,
            waypointCount: r.waypoints?.length || 0,
            waypoints: r.waypoints
        })));
        
        if (routes.length === 0) {
            // Draw "no routes" message for debugging
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No routes to animate', canvas.width / 2, canvas.height - 20);
            return;
        }
        
        // Calculate which routes should be visible at this progress
        this.drawRoutesAtProgress(routes, progress);
    }

    drawNoMapMessage() {
        const ctx = this.previewContext;
        const canvas = this.previewCanvas;
        
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No map loaded', canvas.width / 2, canvas.height / 2);
    }

    drawMapBackground(mapImage) {
        const ctx = this.previewContext;
        const canvas = this.previewCanvas;
        
        // Calculate scale to fit map in preview
        const scale = Math.min(
            canvas.width / mapImage.width,
            canvas.height / mapImage.height
        );
        
        const scaledWidth = mapImage.width * scale;
        const scaledHeight = mapImage.height * scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;
        
        ctx.drawImage(mapImage, x, y, scaledWidth, scaledHeight);
        
        // Store transform for route drawing
        this.mapTransform = {
            scale,
            offsetX: x,
            offsetY: y,
            mapWidth: mapImage.width,
            mapHeight: mapImage.height
        };
    }

    drawRoutesAtProgress(routes, progress) {
        const ctx = this.previewContext;
        
        console.log(`🗺️ drawRoutesAtProgress called with ${routes.length} routes at progress ${progress}`);
        
        // Apply easing to overall progress
        const easingFunc = this.easingFunctions[this.easingFunction] || this.easingFunctions.linear;
        const easedProgress = easingFunc(progress);
        
        console.log(`📈 Eased progress: ${easedProgress} (from ${progress})`);
        
        // Sort routes by animation delay
        const sortedRoutes = routes.slice().sort((a, b) => 
            (a.animation?.delay || 0) - (b.animation?.delay || 0)
        );
        
        sortedRoutes.forEach((route, index) => {
            if (!route.visible || route.waypoints.length < 2) {
                console.log(`⚠️ Skipping route ${index}: visible=${route.visible}, waypoints=${route.waypoints?.length || 0}`);
                return;
            }
            
            // Calculate timing for this route
            const routeDelay = (route.animation?.delay || 0) / this.totalDuration;
            const routeDuration = (route.animation?.duration || 3000) / this.totalDuration;
            const routeStart = routeDelay;
            const routeEnd = routeStart + routeDuration;
            
            console.log(`📍 Route ${index} timing: start=${routeStart}, end=${routeEnd}, easedProgress=${easedProgress}`);
            
            if (easedProgress >= routeStart) {
                // Calculate route progress with easing
                const rawRouteProgress = Math.min(1, (easedProgress - routeStart) / routeDuration);
                const easedRouteProgress = easingFunc(rawRouteProgress);
                
                console.log(`✏️ Drawing route ${index} at progress ${easedRouteProgress} (raw: ${rawRouteProgress})`);
                this.drawRouteProgress(route, easedRouteProgress);
            } else {
                console.log(`⏳ Route ${index} not started yet (progress ${easedProgress} < start ${routeStart})`);
            }
        });
    }

    drawRouteProgress(route, progress) {
        const ctx = this.previewContext;
        const waypoints = route.waypoints;
        
        if (waypoints.length < 2) return;
        
        // Transform waypoints to preview coordinates
        // MapCanvas stores waypoints in map image pixel coordinates, so scale them to the preview canvas
        const transformedWaypoints = waypoints.map(wp => ({
            x: wp.x * this.mapTransform.scale + this.mapTransform.offsetX,
            y: wp.y * this.mapTransform.scale + this.mapTransform.offsetY
        }));
        
        // Calculate total path length
        let totalLength = 0;
        const segments = [];
        
        for (let i = 1; i < transformedWaypoints.length; i++) {
            const prev = transformedWaypoints[i - 1];
            const curr = transformedWaypoints[i];
            const segmentLength = Math.sqrt(
                Math.pow(curr.x - prev.x, 2) + 
                Math.pow(curr.y - prev.y, 2)
            );
            segments.push({ start: totalLength, length: segmentLength, from: prev, to: curr });
            totalLength += segmentLength;
        }
        
        // Calculate how much of the route to draw
        const drawLength = totalLength * progress;
        
        // Set up drawing style
        const routeColor = route.style?.color || '#007bff';
        const routeWidth = Math.max(1, (route.style?.width || 3) * this.mapTransform.scale);
        
        // Handle dash patterns
        if (route.style.dashPattern && route.style.dashPattern.length > 0) {
            ctx.setLineDash(route.style.dashPattern.map(d => d * this.mapTransform.scale));
        } else {
            ctx.setLineDash([]);
        }
        
        // Draw completed route with subtle shadow
        if (progress > 0) {
            ctx.shadowColor = routeColor;
            ctx.shadowBlur = 6;
            ctx.strokeStyle = routeColor;
            ctx.lineWidth = routeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 0.7;
            
            this.drawPathToLength(ctx, segments, drawLength);
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }
        
        // Draw glowing animated tip if route is actively drawing
        if (progress > 0 && progress < 1) {
            const tipPosition = this.getPositionAtLength(segments, drawLength);
            if (tipPosition) {
                this.drawAnimatedTip(ctx, tipPosition, routeColor, routeWidth);
            }
        }
        
        // Draw route completion indicator
        if (progress >= 1) {
            ctx.globalAlpha = 1;
            ctx.strokeStyle = routeColor;
            ctx.lineWidth = routeWidth + 2;
            this.drawPathToLength(ctx, segments, totalLength);
            
            // Add completion pulse effect
            this.drawCompletionEffect(ctx, transformedWaypoints, routeColor);
        }
        
        ctx.globalAlpha = 1;
        
        // Draw waypoints based on route progress
        this.drawProgressiveWaypoints(transformedWaypoints, progress, routeColor);
    }
    
    drawPathToLength(ctx, segments, targetLength) {
        ctx.beginPath();
        let currentLength = 0;
        let pathStarted = false;
        
        for (const segment of segments) {
            if (currentLength + segment.length <= targetLength) {
                // Draw complete segment
                if (!pathStarted) {
                    ctx.moveTo(segment.from.x, segment.from.y);
                    pathStarted = true;
                }
                ctx.lineTo(segment.to.x, segment.to.y);
                currentLength += segment.length;
            } else {
                // Draw partial segment
                const remainingLength = targetLength - currentLength;
                const segmentProgress = remainingLength / segment.length;
                
                const partialX = segment.from.x + (segment.to.x - segment.from.x) * segmentProgress;
                const partialY = segment.from.y + (segment.to.y - segment.from.y) * segmentProgress;
                
                if (!pathStarted) {
                    ctx.moveTo(segment.from.x, segment.from.y);
                }
                ctx.lineTo(partialX, partialY);
                break;
            }
        }
        
        ctx.stroke();
    }
    
    getPositionAtLength(segments, targetLength) {
        let currentLength = 0;
        
        for (const segment of segments) {
            if (currentLength + segment.length > targetLength) {
                const remainingLength = targetLength - currentLength;
                const segmentProgress = remainingLength / segment.length;
                
                return {
                    x: segment.from.x + (segment.to.x - segment.from.x) * segmentProgress,
                    y: segment.from.y + (segment.to.y - segment.from.y) * segmentProgress
                };
            }
            currentLength += segment.length;
        }
        
        return null;
    }
    
    drawAnimatedTip(ctx, position, color, width) {
        const time = Date.now();
        const pulse = Math.sin(time * 0.01) * 0.3 + 0.7;
        
        // Draw glowing tip
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(position.x, position.y, width * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    drawCompletionEffect(ctx, waypoints, color) {
        const time = Date.now();
        const pulse = Math.sin(time * 0.005) * 0.2 + 0.8;
        
        // Draw completion glow at end waypoint
        const endPoint = waypoints[waypoints.length - 1];
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(endPoint.x, endPoint.y, 8 * this.mapTransform.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    drawProgressiveWaypoints(waypoints, progress, routeColor) {
        // Skip waypoint drawing during video export
        if (this.isExporting) {
            return;
        }
        
        const ctx = this.previewContext;
        
        // Calculate how many waypoints to show based on route progress
        const totalWaypoints = waypoints.length;
        const visibleWaypoints = Math.min(totalWaypoints, Math.floor(totalWaypoints * progress) + 1);
        
        waypoints.slice(0, visibleWaypoints).forEach((wp, index) => {
            const radius = 4 * this.mapTransform.scale;
            const isStart = index === 0;
            const isEnd = index === totalWaypoints - 1;
            const isCurrent = index === visibleWaypoints - 1;
            
            // Waypoint circle with dynamic styling
            ctx.beginPath();
            ctx.arc(wp.x, wp.y, radius, 0, Math.PI * 2);
            
            if (isStart) {
                // Start waypoint - green
                ctx.fillStyle = '#28a745';
                ctx.strokeStyle = '#fff';
            } else if (isEnd && progress >= 1) {
                // End waypoint when route is complete - red with glow
                ctx.fillStyle = '#dc3545';
                ctx.strokeStyle = '#fff';
                ctx.shadowColor = '#dc3545';
                ctx.shadowBlur = 10;
            } else if (isCurrent && progress < 1) {
                // Current waypoint being approached - animated
                const time = Date.now();
                const pulse = Math.sin(time * 0.01) * 0.3 + 0.7;
                ctx.globalAlpha = pulse;
                ctx.fillStyle = routeColor;
                ctx.strokeStyle = '#fff';
            } else {
                // Regular waypoints
                ctx.fillStyle = '#fff';
                ctx.strokeStyle = routeColor;
            }
            
            ctx.fill();
            ctx.lineWidth = 2 * this.mapTransform.scale;
            ctx.stroke();
            
            // Reset effects
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            
            // Waypoint number (skip during export)
            if (!this.isExporting) {
                ctx.fillStyle = isStart || (isEnd && progress >= 1) ? '#fff' : '#333';
                ctx.font = `${Math.max(8, 10 * this.mapTransform.scale)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(index + 1, wp.x, wp.y);
            }
        });
        
        // Draw direction arrow if route is in progress
        if (progress > 0 && progress < 1 && visibleWaypoints > 1) {
            this.drawDirectionIndicator(waypoints, visibleWaypoints - 1, routeColor);
        }
    }
    
    drawDirectionIndicator(waypoints, currentIndex, color) {
        if (currentIndex >= waypoints.length - 1) return;
        
        const ctx = this.previewContext;
        const current = waypoints[currentIndex];
        const next = waypoints[currentIndex + 1];
        
        // Calculate arrow direction
        const dx = next.x - current.x;
        const dy = next.y - current.y;
        const angle = Math.atan2(dy, dx);
        
        // Draw animated direction arrow
        const time = Date.now();
        const pulse = Math.sin(time * 0.008) * 0.4 + 0.6;
        const arrowSize = 15 * this.mapTransform.scale * pulse;
        
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = color;
        ctx.translate(current.x, current.y);
        ctx.rotate(angle);
        
        // Arrow shape
        ctx.beginPath();
        ctx.moveTo(arrowSize, 0);
        ctx.lineTo(-arrowSize * 0.5, -arrowSize * 0.5);
        ctx.lineTo(-arrowSize * 0.5, arrowSize * 0.5);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    updatePlayButton() {
        const playBtn = document.getElementById('previewPlayBtn');
        if (playBtn) {
            playBtn.innerHTML = this.isPlaying ? `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
            ` : `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            `;
        }
        
        // Update overlay visibility
        const overlay = document.querySelector('.preview-overlay');
        if (overlay) {
            overlay.style.opacity = this.isPlaying ? '0' : '1';
            overlay.style.pointerEvents = this.isPlaying ? 'none' : 'auto';
        }
    }

    updateTimelineDisplay() {
        const timelineSlider = document.getElementById('timelineSlider');
        const currentTimeSpan = document.getElementById('currentTime');
        const totalTimeSpan = document.getElementById('totalTime');
        
        if (timelineSlider) {
            timelineSlider.value = (this.currentTime / this.totalDuration) * 100;
        }
        
        if (currentTimeSpan) {
            currentTimeSpan.textContent = this.formatTime(this.currentTime);
        }
        
        if (totalTimeSpan) {
            totalTimeSpan.textContent = this.formatTime(this.totalDuration);
        }
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    updatePreview() {
        console.log('🔄 updatePreview called');
        if (!this.isPlaying) {
            this.renderFrame(this.currentTime / this.totalDuration);
        }
    }

    async exportVideo() {
        try {
            this.exportStatus = 'preparing';
            this.exportProgress = 0;
            this.updateExportUI();

            // Check for necessary data
            const mapImageData = window.app?.canvas?.getMapImageData();
            if (!mapImageData || !mapImageData.hasMap) {
                throw new Error('No map image available for export. Please upload a map first.');
            }

            // Get routes from MapCanvas (prioritized) or RouteManager
            let routes = window.app?.canvas?.routes || [];
            if (routes.length === 0 && window.app?.routes?.routes) {
                routes = window.app.routes.routes;
            }

            // Filter visible routes with waypoints
            routes = routes.filter(route => route.visible && route.waypoints && route.waypoints.length >= 2);
            if (routes.length === 0) {
                throw new Error('No visible routes with waypoints found for export.');
            }

            console.log('🎬 Starting client-side video capture:', {
                routes: routes.length,
                duration: this.totalDuration
            });

            this.exportStatus = 'generating';
            this.updateExportUI();

            // Capture frames from the working animation timeline
            const frames = await this.captureAnimationFrames();
            
            if (frames.length === 0) {
                throw new Error('No frames captured from animation timeline');
            }

            console.log(`✅ Captured ${frames.length} frames from timeline`);
            
            this.exportStatus = 'processing';
            this.exportProgress = 80;
            this.updateExportUI();

            // Create video from captured frames
            const videoBlob = await this.createVideoFromFrames(frames);
            
            this.exportStatus = 'completed';
            this.exportProgress = 100;
            this.updateExportUI();

            // Trigger download
            this.downloadVideo(videoBlob);
            
            if (window.app?.ui?.showNotification) {
                window.app.ui.showNotification('Video exported successfully!', 'success');
            } else {
                alert('Video exported successfully!');
            }

            return { success: true, message: 'Video exported from timeline animation' };
            
        } catch (error) {
            console.error('❌ Client-side video export failed:', error);
            this.exportStatus = 'error';
            this.exportProgress = 0;
            this.updateExportUI();
            
            if (window.app?.ui?.showNotification) {
                window.app.ui.showNotification(`Export failed: ${error.message}`, 'error');
            } else {
                alert(`Export failed: ${error.message}`);
            }
            return { success: false, error: error.message };
        }
    }

    async captureAnimationFrames() {
        const frames = [];
        const fps = 30; // 30 frames per second
        const frameInterval = 1000 / fps; // milliseconds per frame
        const totalFrames = Math.ceil((this.totalDuration / 1000) * fps);

        console.log(`🎬 Capturing ${totalFrames} frames at ${fps} FPS for ${this.totalDuration}ms duration`);

        // Get routes to verify they exist
        let routes = window.app?.canvas?.routes || [];
        if (routes.length === 0 && window.app?.routes?.routes) {
            routes = window.app.routes.routes;
        }
        routes = routes.filter(route => route.visible && route.waypoints && route.waypoints.length >= 2);
        console.log(`📍 Found ${routes.length} visible routes for capture`);

        // Ensure preview canvas is set up
        if (!this.previewCanvas) {
            throw new Error('Preview canvas not available for capture');
        }

        // Store original timeline state
        const originalTime = this.currentTime;
        const originalPlaying = this.isPlaying;
        
        try {
            // Set export mode to hide waypoints
            this.isExporting = true;
            
            // Stop any current animation
            this.pausePreview();
            
            for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
                const timeMs = (frameIndex / fps) * 1000;
                const progress = Math.min(timeMs / this.totalDuration, 1.0); // Convert to 0-1 progress
                
                console.log(`📸 Frame ${frameIndex}: timeMs=${timeMs}, progress=${progress}, totalDuration=${this.totalDuration}`);
                
                // Update timeline position (both time and progress)
                this.currentTime = timeMs;
                
                // Render the frame using correct progress value (0-1)
                this.renderFrame(progress);
                
                // Wait a bit longer to ensure rendering is complete
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // Capture the frame
                const frameDataUrl = this.previewCanvas.toDataURL('image/png');
                frames.push(frameDataUrl);
                
                // Update progress
                const exportProgress = Math.floor((frameIndex / totalFrames) * 70); // 70% for frame capture
                this.exportProgress = exportProgress;
                this.updateExportUI();
                
                if (frameIndex % 30 === 0) {
                    console.log(`📸 Captured frame ${frameIndex}/${totalFrames} at ${timeMs}ms (progress: ${progress})`);
                }
            }
            
            console.log(`✅ Successfully captured ${frames.length} frames`);
            return frames;
            
        } finally {
            // Reset export mode
            this.isExporting = false;
            
            // Restore original timeline state
            this.currentTime = originalTime;
            if (originalPlaying) {
                this.playPreview();
            } else {
                const restoreProgress = originalTime / this.totalDuration;
                this.renderFrame(restoreProgress);
            }
        }
    }

    async createVideoFromFrames(frames) {
        console.log('🎞️ Creating animated video from captured frames...');
        
        // For now, let's create a simple approach that works
        // We'll create a ZIP file with all frames and also try to create a basic video
        
        try {
            // Method 1: Try to create WebM video using MediaRecorder with better timing
            const videoBlob = await this.createWebMFromFrames(frames);
            if (videoBlob && videoBlob.size > 1000) { // Check if we got a reasonable video
                return videoBlob;
            }
        } catch (error) {
            console.warn('⚠️ WebM creation failed, trying alternative:', error);
        }
        
        try {
            // Method 2: Create an animated WebM using a different approach
            const videoBlob = await this.createVideoFromFramesAlternative(frames);
            return videoBlob;
        } catch (error) {
            console.error('❌ All video creation methods failed:', error);
            // Method 3: Fallback - create a ZIP with all frames
            return this.createFramesZip(frames);
        }
    }

    async createWebMFromFrames(frames) {
        return new Promise((resolve, reject) => {
            // Create a canvas for recording
            const recordCanvas = document.createElement('canvas');
            recordCanvas.width = this.previewCanvas.width;
            recordCanvas.height = this.previewCanvas.height;
            const recordCtx = recordCanvas.getContext('2d');
            
            const stream = recordCanvas.captureStream(30);
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp8', // Try VP8 instead of VP9
                videoBitsPerSecond: 2500000 // 2.5 Mbps
            });
            
            const chunks = [];
            let frameIndex = 0;
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                console.log(`✅ WebM created: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
                resolve(blob);
            };
            
            mediaRecorder.onerror = (error) => {
                console.error('❌ MediaRecorder error:', error);
                reject(error);
            };
            
            // Start recording and play frames
            mediaRecorder.start();
            
            const fps = 30;
            const frameInterval = 1000 / fps; // ~33ms per frame
            
            const renderNextFrame = async () => {
                if (frameIndex >= frames.length) {
                    // Wait a bit then stop recording
                    setTimeout(() => {
                        mediaRecorder.stop();
                    }, 200);
                    return;
                }
                
                // Load and draw the current frame
                const img = new Image();
                img.onload = () => {
                    recordCtx.clearRect(0, 0, recordCanvas.width, recordCanvas.height);
                    recordCtx.drawImage(img, 0, 0);
                    
                    frameIndex++;
                    
                    // Update progress
                    const progress = 70 + Math.floor((frameIndex / frames.length) * 20);
                    this.exportProgress = progress;
                    this.updateExportUI();
                    
                    // Schedule next frame
                    setTimeout(renderNextFrame, frameInterval);
                };
                img.onerror = () => {
                    console.error(`❌ Failed to load frame ${frameIndex}`);
                    frameIndex++;
                    setTimeout(renderNextFrame, frameInterval);
                };
                img.src = frames[frameIndex];
            };
            
            // Start rendering frames after a short delay
            setTimeout(renderNextFrame, 100);
        });
    }

    async createVideoFromFramesAlternative(frames) {
        console.log('🔄 Trying alternative video creation method...');
        
        // Create an off-screen video element approach
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            canvas.width = this.previewCanvas.width;
            canvas.height = this.previewCanvas.height;
            const ctx = canvas.getContext('2d');
            
            // Try creating a data URL video (this is a hack but might work)
            const frameDataUrls = [];
            let processedFrames = 0;
            
            // Convert all frames to proper format
            frames.forEach((frameDataUrl, index) => {
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    frameDataUrls[index] = canvas.toDataURL('image/png');
                    processedFrames++;
                    
                    if (processedFrames === frames.length) {
                        // All frames processed, create simple animated sequence
                        this.createSimpleAnimation(frameDataUrls).then(resolve).catch(reject);
                    }
                };
                img.src = frameDataUrl;
            });
        });
    }

    async createSimpleAnimation(frames) {
        // Create a simple looping animation by creating a WebM with manual frame timing
        const canvas = document.createElement('canvas');
        canvas.width = this.previewCanvas.width;
        canvas.height = this.previewCanvas.height;
        const ctx = canvas.getContext('2d');
        
        const stream = canvas.captureStream(10); // Lower FPS for better compatibility
        const recorder = new MediaRecorder(stream, { 
            mimeType: 'video/webm',
            videoBitsPerSecond: 1000000
        });
        
        const chunks = [];
        
        return new Promise((resolve) => {
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                resolve(blob);
            };
            
            recorder.start();
            
            let frameIndex = 0;
            const playFrames = () => {
                if (frameIndex < frames.length) {
                    const img = new Image();
                    img.onload = () => {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0);
                        frameIndex++;
                        
                        this.exportProgress = 70 + Math.floor((frameIndex / frames.length) * 25);
                        this.updateExportUI();
                        
                        setTimeout(playFrames, 100); // 10 FPS
                    };
                    img.src = frames[frameIndex];
                } else {
                    // Animation complete
                    setTimeout(() => recorder.stop(), 500);
                }
            };
            
            setTimeout(playFrames, 100);
        });
    }

    async createFramesZip(frames) {
        console.log('📦 Creating ZIP file with all frames as fallback...');
        
        // This is a fallback - create a blob with frame data that user can inspect
        const frameData = frames.map((frame, index) => ({
            name: `frame_${String(index).padStart(4, '0')}.png`,
            data: frame
        }));
        
        // Create a simple blob with JSON data about frames
        const exportData = {
            type: 'animation_frames',
            totalFrames: frames.length,
            fps: 30,
            duration: this.totalDuration,
            frames: frameData,
            message: 'Video creation failed. These are the captured animation frames.'
        };
        
        const jsonString = JSON.stringify(exportData, null, 2);
        return new Blob([jsonString], { type: 'application/json' });
    }

    downloadVideo(videoBlob) {
        const url = URL.createObjectURL(videoBlob);
        const link = document.createElement('a');
        link.href = url;
        
        // Determine file extension based on blob type
        let extension = 'webm';
        let filename = `route-animation-${Date.now()}`;
        
        if (videoBlob.type.includes('json')) {
            extension = 'json';
            filename = `route-animation-frames-${Date.now()}`;
        } else if (videoBlob.type.includes('webm')) {
            extension = 'webm';
        } else if (videoBlob.type.includes('mp4')) {
            extension = 'mp4';
        }
        
        link.download = `${filename}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        console.log('📥 Download initiated:', link.download, `(${(videoBlob.size / 1024 / 1024).toFixed(2)}MB)`);
    }

    async pollExportProgress(jobId) {
        const poll = async () => {
            try {
                const response = await fetch(`/api/export/video/${jobId}/status`);
                const status = await response.json();
                
                this.exportProgress = status.progress || 0;
                this.exportStatus = status.status;
                this.updateExportUI();
                
                if (status.status === 'completed') {
                    this.handleExportComplete(status);
                } else if (status.status === 'error') {
                    this.handleExportError(status.error);
                } else if (status.status === 'processing') {
                    setTimeout(poll, 1000); // Poll every second
                }
                
            } catch (error) {
                this.handleExportError(error.message);
            }
        };
        
        poll();
    }

    handleExportComplete(status) {
        this.exportStatus = 'completed';
        this.exportProgress = 100;
        this.updateExportUI();
        
        // Show download link
        if (status.downloadUrl) {
            this.showDownloadLink(status.downloadUrl, status.filename);
        }
        
        window.app.ui.showNotification('Video export completed!', 'success');
    }

    handleExportError(error) {
        this.exportStatus = 'error';
        this.exportProgress = 0;
        this.updateExportUI();
        
        window.app.ui.showNotification(`Export failed: ${error}`, 'error');
    }

    showDownloadLink(url, filename) {
        const downloadContainer = document.getElementById('downloadContainer');
        if (downloadContainer) {
            downloadContainer.innerHTML = `
                <div class="download-ready">
                    <h4>Video Ready for Download</h4>
                    <a href="${url}" download="${filename}" class="btn btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                        </svg>
                        Download Video
                    </a>
                    <p class="text-sm text-muted">File: ${filename}</p>
                </div>
            `;
        }
    }

    updateExportUI() {
        const exportBtn = document.getElementById('exportVideo');
        const progressBar = document.getElementById('exportProgress');
        const statusText = document.getElementById('exportStatus');
        
        if (exportBtn) {
            exportBtn.disabled = this.exportStatus === 'preparing' || 
                               this.exportStatus === 'uploading' || 
                               this.exportStatus === 'processing';
            
            exportBtn.textContent = this.getExportButtonText();
        }
        
        if (progressBar) {
            progressBar.style.width = `${this.exportProgress}%`;
            progressBar.style.display = this.exportProgress > 0 ? 'block' : 'none';
        }
        
        if (statusText) {
            statusText.textContent = this.getStatusText();
        }
    }

    getExportButtonText() {
        switch (this.exportStatus) {
            case 'preparing':
                return 'Preparing...';
            case 'uploading':
                return 'Uploading...';
            case 'processing':
                return 'Processing...';
            case 'completed':
                return 'Export Video';
            case 'error':
                return 'Retry Export';
            default:
                return 'Export Video';
        }
    }

    getStatusText() {
        switch (this.exportStatus) {
            case 'preparing':
                return 'Preparing export data...';
            case 'uploading':
                return 'Uploading to server...';
            case 'processing':
                return `Processing video... ${this.exportProgress}%`;
            case 'completed':
                return 'Export completed successfully!';
            case 'error':
                return 'Export failed. Please try again.';
            default:
                return '';
        }
    }

    cancelExport() {
        this.exportStatus = 'idle';
        this.exportProgress = 0;
        this.updateExportUI();
        
        // Could add API call to cancel server-side processing
        window.app.ui.showNotification('Export cancelled', 'info');
    }

    // Settings persistence
    saveSettings() {
        localStorage.setItem('videoSettings', JSON.stringify(this.videoSettings));
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('videoSettings');
            if (saved) {
                this.videoSettings = { ...this.videoSettings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('Failed to load video settings:', error);
        }
    }

    // Utility methods
    getPreviewCanvas() {
        return this.previewCanvas;
    }

    getCurrentFrame() {
        return this.previewCanvas.toDataURL('image/png');
    }

    getDuration() {
        return this.totalDuration;
    }

    setDuration(duration) {
        this.totalDuration = duration;
        this.updateTimelineDisplay();
    }
}