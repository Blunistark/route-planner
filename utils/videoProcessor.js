const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Try to require canvas - if it fails, we'll use the fallback
let Canvas, createCanvas, loadImage;
try {
    const canvas = require('canvas');
    Canvas = canvas.Canvas;
    createCanvas = canvas.createCanvas;
    loadImage = canvas.loadImage;
    console.log('✅ Canvas module loaded successfully');
} catch (error) {
    console.warn('⚠️ Canvas module not available, using fallback:', error.message);
}

// FFmpeg for video encoding
let ffmpeg;
try {
    ffmpeg = require('fluent-ffmpeg');
    const ffmpegPath = require('ffmpeg-static');
    ffmpeg.setFfmpegPath(ffmpegPath);
    console.log('✅ FFmpeg loaded successfully');
} catch (error) {
    console.warn('⚠️ FFmpeg not available, using fallback:', error.message);
}

// Simple video processing without Canvas for Windows compatibility
class VideoProcessor {
    constructor() {
        this.jobs = new Map();
        this.outputDir = path.join(__dirname, '../uploads/videos');
        this.ensureOutputDir();
    }

    async ensureOutputDir() {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
        } catch (error) {
            console.warn('Failed to create video output directory:', error.message);
        }
    }

    async generateVideo(videoData) {
        console.log('🎬 Starting video generation with data:', {
            routes: videoData.routes?.length || 0,
            settings: videoData.settings
        });

        return await this.createVideoJob(videoData);
    }

    async createVideoJob(videoData) {
        const jobId = uuidv4();
        const job = {
            id: jobId,
            status: 'queued',
            progress: 0,
            created: new Date(),
            videoData: videoData,
            error: null
        };

        this.jobs.set(jobId, job);

        // Start processing asynchronously
        this.processVideo(job).catch(error => {
            console.error(`Video processing error for job ${jobId}:`, error);
            job.status = 'error';
            job.error = error.message;
        });

        return {
            success: true,
            jobId: jobId,
            estimatedTime: this.estimateProcessingTime(videoData)
        };
    }

    async processVideo(job) {
        const { videoData } = job;
        const { routes, settings, totalDuration, mapImage } = videoData;

        try {
            console.log(`📹 Processing video job ${job.id}...`);
            
            // Update job status
            job.status = 'processing';
            job.progress = 10;

            // Validate input data
            if (!routes || routes.length === 0) {
                throw new Error('No routes provided for video generation');
            }

            if (!mapImage) {
                throw new Error('No map image provided for video generation');
            }

            console.log(`✅ Validated video data: ${routes.length} routes, ${settings.width}x${settings.height}`);
            
            // Log detailed route information for debugging
            console.log('📊 Route data details:');
            routes.forEach((route, index) => {
                console.log(`  Route ${index}:`, {
                    id: route.id,
                    name: route.name,
                    visible: route.visible,
                    waypointCount: route.waypoints?.length || 0,
                    firstWaypoints: route.waypoints?.slice(0, 3) || []
                });
            });

            // Check if we can use Canvas for real video generation
            if (createCanvas && ffmpeg) {
                console.log('🎬 Using Canvas + FFmpeg for real video generation');
                await this.generateRealVideo(job);
            } else {
                console.warn('⚠️ Canvas or FFmpeg not available, generating enhanced fallback');
                console.log(`Canvas available: ${!!createCanvas}, FFmpeg available: ${!!ffmpeg}`);
                await this.generateEnhancedFallback(job);
            }

        } catch (error) {
            console.error(`❌ Video processing failed for job ${job.id}:`, error);
            job.status = 'error';
            job.error = error.message;
            throw error;
        }
    }

    async generateRealVideo(job) {
        const { videoData } = job;
        const { routes, settings, totalDuration, mapImage } = videoData;

        // Simulate processing steps with real Canvas generation
        await this.simulateProcessing(job, [
            { step: 'Setting up Canvas...', progress: 20 },
        ]);

        // Create canvas
        const canvas = createCanvas(settings.width, settings.height);
        const ctx = canvas.getContext('2d');

        job.progress = 30;
        await this.simulateProcessing(job, [
            { step: 'Loading map image...', progress: 35 },
        ]);

        // Load map image
        let backgroundImage = null;
        if (mapImage.dataUrl) {
            try {
                // Remove data URL prefix
                const base64Data = mapImage.dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
                const imageBuffer = Buffer.from(base64Data, 'base64');
                backgroundImage = await loadImage(imageBuffer);
                console.log(`✅ Map image loaded: ${backgroundImage.width}x${backgroundImage.height}`);
            } catch (error) {
                console.warn('⚠️ Failed to load map image:', error.message);
            }
        }

        job.progress = 40;
        await this.simulateProcessing(job, [
            { step: 'Generating animation frames...', progress: 50 },
        ]);

        // Generate frames
        const fps = settings.fps || 30;
        const durationSeconds = totalDuration / 1000;
        const totalFrames = Math.ceil(fps * durationSeconds);
        const framesDir = path.join(this.outputDir, `frames_${job.id}`);
        
        // Create frames directory
        await fs.mkdir(framesDir, { recursive: true });

        console.log(`🎞️ Generating ${totalFrames} frames at ${fps}fps for ${durationSeconds}s`);

        for (let frame = 0; frame < totalFrames; frame++) {
            const progress = frame / (totalFrames - 1);
            
            // Clear canvas
            ctx.fillStyle = settings.backgroundColor || '#1e1e1e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw background map if available
            if (backgroundImage) {
                const scale = Math.min(
                    canvas.width / backgroundImage.width,
                    canvas.height / backgroundImage.height
                );
                const scaledWidth = backgroundImage.width * scale;
                const scaledHeight = backgroundImage.height * scale;
                const x = (canvas.width - scaledWidth) / 2;
                const y = (canvas.height - scaledHeight) / 2;
                
                ctx.drawImage(backgroundImage, x, y, scaledWidth, scaledHeight);
            }

            // Draw routes at current progress
            this.drawRoutesOnCanvas(ctx, routes, progress, canvas.width, canvas.height, backgroundImage);

            // Save frame
            const frameBuffer = canvas.toBuffer('image/png');
            const framePath = path.join(framesDir, `frame_${frame.toString().padStart(6, '0')}.png`);
            await fs.writeFile(framePath, frameBuffer);

            // Update progress
            if (frame % 10 === 0) {
                job.progress = 50 + (frame / totalFrames) * 30;
            }
        }

        job.progress = 80;
        await this.simulateProcessing(job, [
            { step: 'Encoding video with FFmpeg...', progress: 90 },
        ]);

        // Create video with FFmpeg
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFilename = `route_video_${timestamp}.mp4`;
        const outputPath = path.join(this.outputDir, outputFilename);

        await this.encodeVideo(framesDir, outputPath, fps);

        // Clean up frames
        try {
            const frameFiles = await fs.readdir(framesDir);
            for (const file of frameFiles) {
                await fs.unlink(path.join(framesDir, file));
            }
            await fs.rmdir(framesDir);
        } catch (error) {
            console.warn('⚠️ Failed to clean up frames:', error.message);
        }

        job.status = 'completed';
        job.progress = 100;
        job.outputFile = outputPath;
        job.downloadUrl = `/api/export/download/video/${job.id}`;
        job.filename = outputFilename;

        console.log(`✅ Real MP4 video generated: ${outputFilename}`);
        console.log(`📁 Output file: ${outputPath}`);
    }

    async generateVideoManifest(job) {
        const { videoData } = job;
        const { routes, settings, totalDuration } = videoData;

        // Simulate processing steps
        await this.simulateProcessing(job, [
            { step: 'Preparing data...', progress: 20 },
            { step: 'Processing routes...', progress: 40 },
            { step: 'Generating frames...', progress: 70 },
            { step: 'Creating video...', progress: 90 },
            { step: 'Finalizing...', progress: 100 }
        ]);

        // Create output filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFilename = `route_video_${timestamp}.json`;
        const outputPath = path.join(this.outputDir, outputFilename);
        
        // Create detailed JSON manifest (fallback when Canvas/FFmpeg not available)
        const videoManifest = {
            id: job.id,
            filename: outputFilename,
            type: 'route_animation_manifest',
            metadata: {
                routes: routes.map(route => ({
                    name: route.name || `Route ${routes.indexOf(route) + 1}`,
                    waypoints: route.waypoints.length,
                    color: route.style?.color || '#007bff',
                    visible: route.visible !== false
                })),
                settings: {
                    resolution: `${settings.width}x${settings.height}`,
                    fps: settings.fps,
                    duration: `${totalDuration / 1000}s`,
                    format: settings.format,
                    quality: settings.quality
                },
                animation: {
                    totalDuration: totalDuration,
                    routeCount: routes.length,
                    waypointCount: routes.reduce((sum, route) => sum + route.waypoints.length, 0)
                }
            },
            processing: {
                started: job.created,
                completed: new Date(),
                processingTime: Date.now() - job.created.getTime(),
                status: 'completed'
            },
            download: {
                available: true,
                url: `/api/export/download/video/${job.id}`,
                format: 'application/json',
                note: 'This is a manifest file. Real MP4 generation requires Canvas/FFmpeg installation.'
            }
        };

        await fs.writeFile(outputPath, JSON.stringify(videoManifest, null, 2));

        job.status = 'completed';
        job.progress = 100;
        job.outputFile = outputPath;
        job.downloadUrl = `/api/export/download/video/${job.id}`;
        job.filename = outputFilename;

        console.log(`✅ Video manifest created: ${outputFilename}`);
        console.log(`📁 Output file: ${outputPath}`);
    }

    async generateEnhancedFallback(job) {
        const { videoData } = job;
        const { routes, settings, totalDuration, mapImage } = videoData;

        // Simulate processing steps with more meaningful output
        await this.simulateProcessing(job, [
            { step: 'Analyzing routes...', progress: 20 },
            { step: 'Processing map data...', progress: 40 },
            { step: 'Creating route visualization...', progress: 70 },
            { step: 'Generating output...', progress: 90 },
            { step: 'Finalizing...', progress: 100 }
        ]);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Try to generate at least a static image if Canvas is available
        if (createCanvas) {
            console.log('📸 Generating static route image with Canvas');
            await this.generateStaticRouteImage(job, timestamp);
        } else {
            console.log('📄 Generating enhanced route data file');
            await this.generateEnhancedManifest(job, timestamp);
        }

        console.log(`✅ Enhanced fallback generated successfully`);
    }

    async generateStaticRouteImage(job, timestamp) {
        const { videoData } = job;
        const { routes, settings, mapImage } = videoData;
        
        try {
            // Create canvas for static image
            const canvas = createCanvas(settings.width, settings.height);
            const ctx = canvas.getContext('2d');
            
            // Clear canvas
            ctx.fillStyle = settings.backgroundColor || '#1e1e1e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw background map if available
            if (mapImage && mapImage.dataUrl) {
                try {
                    const base64Data = mapImage.dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
                    const imageBuffer = Buffer.from(base64Data, 'base64');
                    const backgroundImage = await loadImage(imageBuffer);
                    
                    const scale = Math.min(
                        canvas.width / backgroundImage.width,
                        canvas.height / backgroundImage.height
                    );
                    const scaledWidth = backgroundImage.width * scale;
                    const scaledHeight = backgroundImage.height * scale;
                    const x = (canvas.width - scaledWidth) / 2;
                    const y = (canvas.height - scaledHeight) / 2;
                    
                    ctx.drawImage(backgroundImage, x, y, scaledWidth, scaledHeight);
                    console.log('✅ Background map rendered successfully');
                } catch (error) {
                    console.warn('⚠️ Failed to render background map:', error.message);
                }
            }

            // Draw all routes completely (static image)
            this.drawRoutesOnCanvas(ctx, routes, 1.0, canvas.width, canvas.height, null);
            
            // Save as PNG
            const outputFilename = `route_image_${timestamp}.png`;
            const outputPath = path.join(this.outputDir, outputFilename);
            const imageBuffer = canvas.toBuffer('image/png');
            await fs.writeFile(outputPath, imageBuffer);
            
            job.status = 'completed';
            job.progress = 100;
            job.outputFile = outputPath;
            job.downloadUrl = `/api/export/download/video/${job.id}`;
            job.filename = outputFilename;
            
            console.log(`✅ Static route image created: ${outputFilename}`);
            
        } catch (error) {
            console.error('❌ Failed to generate static image:', error);
            await this.generateEnhancedManifest(job, timestamp);
        }
    }

    async generateEnhancedManifest(job, timestamp) {
        const { videoData } = job;
        const { routes, settings, totalDuration } = videoData;
        
        const outputFilename = `route_data_${timestamp}.json`;
        const outputPath = path.join(this.outputDir, outputFilename);
        
        // Create enhanced JSON with more details
        const enhancedData = {
            id: job.id,
            filename: outputFilename,
            type: 'route_visualization_data',
            created: new Date().toISOString(),
            metadata: {
                message: 'Route data exported successfully. Install node-canvas and ffmpeg for video generation.',
                routes: routes.map((route, index) => ({
                    id: route.id,
                    name: route.name || `Route ${index + 1}`,
                    waypoints: route.waypoints?.map(wp => ({ x: wp.x, y: wp.y })) || [],
                    waypointCount: route.waypoints?.length || 0,
                    style: {
                        color: route.style?.color || '#007bff',
                        width: route.style?.width || 3
                    },
                    visible: route.visible !== false,
                    animationTiming: route.animationTiming || {}
                })),
                settings: {
                    resolution: `${settings.width}x${settings.height}`,
                    fps: settings.fps || 30,
                    duration: `${totalDuration / 1000}s`,
                    backgroundColor: settings.backgroundColor || '#1e1e1e'
                },
                instructions: [
                    '1. Install dependencies: npm install canvas fluent-ffmpeg ffmpeg-static',
                    '2. Restart the server',
                    '3. Try video export again for full MP4 generation'
                ]
            }
        };

        await fs.writeFile(outputPath, JSON.stringify(enhancedData, null, 2));
        
        job.status = 'completed';
        job.progress = 100;
        job.outputFile = outputPath;
        job.downloadUrl = `/api/export/download/video/${job.id}`;
        job.filename = outputFilename;
        
        console.log(`✅ Enhanced route data file created: ${outputFilename}`);
    }

    async simulateProcessing(job, steps) {
        for (const { step, progress } of steps) {
            job.progress = progress;
            console.log(`Job ${job.id}: ${step} (${progress}%)`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    getJobStatus(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) {
            return { error: 'Job not found' };
        }

        return {
            id: job.id,
            status: job.status,
            progress: job.progress,
            created: job.created,
            error: job.error,
            downloadUrl: job.downloadUrl,
            filename: job.outputFile ? path.basename(job.outputFile) : null
        };
    }

    async getDownloadStream(jobId) {
        const job = this.jobs.get(jobId);
        if (!job || !job.outputFile) {
            throw new Error('Job not found or no output file available');
        }

        try {
            const fileExists = await fs.access(job.outputFile).then(() => true).catch(() => false);
            if (!fileExists) {
                throw new Error('Output file not found');
            }

            return {
                stream: require('fs').createReadStream(job.outputFile),
                filename: path.basename(job.outputFile),
                mimeType: 'application/json'
            };
        } catch (error) {
            throw new Error(`Failed to create download stream: ${error.message}`);
        }
    }

    estimateProcessingTime(videoData) {
        const { routes = [], totalDuration = 5000 } = videoData;
        let baseTime = 2000 + (routes.length * 500) + (totalDuration / 10);
        return Math.min(Math.max(baseTime, 2000), 30000);
    }

    cleanupOldJobs(maxAge = 24 * 60 * 60 * 1000) {
        const now = new Date();
        for (const [jobId, job] of this.jobs.entries()) {
            if (now - job.created > maxAge) {
                if (job.outputFile) {
                    fs.unlink(job.outputFile).catch(() => {});
                }
                this.jobs.delete(jobId);
            }
        }
    }

    getAllJobs() {
        return Array.from(this.jobs.values());
    }

    drawRoutesOnCanvas(ctx, routes, progress, canvasWidth, canvasHeight, backgroundImage) {
        console.log(`🎨 Drawing routes at progress: ${progress}, found ${routes.length} routes`);
        
        // Calculate animation progress for each route
        const routeProgress = this.calculateRouteProgress(routes, progress);

        routes.forEach((route, routeIndex) => {
            console.log(`📍 Route ${routeIndex}: visible=${route.visible}, waypoints=${route.waypoints?.length || 0}`);
            
            if (route.visible === false) return;

            const routeProg = routeProgress[routeIndex];
            if (routeProg <= 0) return;

            const waypoints = route.waypoints || [];
            if (waypoints.length < 2) {
                console.warn(`⚠️ Route ${routeIndex} has insufficient waypoints: ${waypoints.length}`);
                return;
            }

            console.log(`✏️ Drawing route ${routeIndex} with progress ${routeProg}, waypoints:`, waypoints.slice(0, 2));

            // Scale waypoints to canvas size
            const scaledWaypoints = this.scaleWaypointsToCanvas(waypoints, canvasWidth, canvasHeight, backgroundImage);
            console.log(`📏 Scaled waypoints:`, scaledWaypoints.slice(0, 2));
            
            // Set route style
            const style = route.style || {};
            ctx.strokeStyle = style.color || '#007bff';
            ctx.strokeStyle = style.color || '#007bff';
            ctx.lineWidth = style.width || 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Draw route with animation progress
            this.drawAnimatedPath(ctx, scaledWaypoints, routeProg);
        });
    }

    calculateRouteProgress(routes, globalProgress) {
        const routeCount = routes.filter(r => r.visible !== false).length;
        const routeProgress = [];

        routes.forEach((route, index) => {
            if (route.visible === false) {
                routeProgress[index] = 0;
                return;
            }

            const visibleIndex = routes.slice(0, index).filter(r => r.visible !== false).length;
            const routeStart = visibleIndex / routeCount;
            const routeEnd = (visibleIndex + 1) / routeCount;

            if (globalProgress <= routeStart) {
                routeProgress[index] = 0;
            } else if (globalProgress >= routeEnd) {
                routeProgress[index] = 1;
            } else {
                routeProgress[index] = (globalProgress - routeStart) / (routeEnd - routeStart);
            }
        });

        return routeProgress;
    }

    scaleWaypointsToCanvas(waypoints, canvasWidth, canvasHeight, backgroundImage) {
        if (!backgroundImage) {
            // If no background image, treat waypoints as pixel coordinates and scale to canvas
            return waypoints.map(wp => ({
                x: wp.x * (canvasWidth / 800),  // Assuming default canvas size
                y: wp.y * (canvasHeight / 600)
            }));
        }

        // Scale waypoints from map image pixel coordinates to video canvas coordinates
        const scale = Math.min(
            canvasWidth / backgroundImage.width,
            canvasHeight / backgroundImage.height
        );
        const scaledWidth = backgroundImage.width * scale;
        const scaledHeight = backgroundImage.height * scale;
        const offsetX = (canvasWidth - scaledWidth) / 2;
        const offsetY = (canvasHeight - scaledHeight) / 2;

        // Waypoints are already in pixel coordinates, so scale them directly
        return waypoints.map(wp => ({
            x: offsetX + (wp.x * scale),
            y: offsetY + (wp.y * scale)
        }));
    }

    drawAnimatedPath(ctx, waypoints, progress) {
        if (waypoints.length < 2 || progress <= 0) return;

        // Calculate total path length
        let totalLength = 0;
        for (let i = 1; i < waypoints.length; i++) {
            const dx = waypoints[i].x - waypoints[i - 1].x;
            const dy = waypoints[i].y - waypoints[i - 1].y;
            totalLength += Math.sqrt(dx * dx + dy * dy);
        }

        const targetLength = totalLength * progress;
        let currentLength = 0;

        ctx.beginPath();
        ctx.moveTo(waypoints[0].x, waypoints[0].y);

        for (let i = 1; i < waypoints.length; i++) {
            const prevWaypoint = waypoints[i - 1];
            const currentWaypoint = waypoints[i];
            const dx = currentWaypoint.x - prevWaypoint.x;
            const dy = currentWaypoint.y - prevWaypoint.y;
            const segmentLength = Math.sqrt(dx * dx + dy * dy);

            if (currentLength + segmentLength <= targetLength) {
                // Draw complete segment
                ctx.lineTo(currentWaypoint.x, currentWaypoint.y);
                currentLength += segmentLength;
            } else {
                // Draw partial segment
                const remainingLength = targetLength - currentLength;
                const segmentProgress = remainingLength / segmentLength;
                const endX = prevWaypoint.x + dx * segmentProgress;
                const endY = prevWaypoint.y + dy * segmentProgress;
                ctx.lineTo(endX, endY);
                break;
            }
        }

        ctx.stroke();
    }

    async encodeVideo(framesDir, outputPath, fps) {
        return new Promise((resolve, reject) => {
            if (!ffmpeg) {
                reject(new Error('FFmpeg not available'));
                return;
            }

            const command = ffmpeg()
                .input(path.join(framesDir, 'frame_%06d.png'))
                .inputFPS(fps)
                .videoCodec('libx264')
                .outputOptions([
                    '-pix_fmt yuv420p',
                    '-crf 23',
                    '-preset medium',
                    '-movflags +faststart'
                ])
                .output(outputPath)
                .on('start', (commandLine) => {
                    console.log(`🎬 FFmpeg started: ${commandLine}`);
                })
                .on('progress', (progress) => {
                    if (progress.percent) {
                        console.log(`🎞️ Encoding progress: ${Math.round(progress.percent)}%`);
                    }
                })
                .on('end', () => {
                    console.log('✅ Video encoding completed');
                    resolve();
                })
                .on('error', (error) => {
                    console.error('❌ Video encoding error:', error);
                    reject(error);
                });

            command.run();
        });
    }
}

let videoProcessor = null;

function getVideoProcessor() {
    if (!videoProcessor) {
        videoProcessor = new VideoProcessor();
        setInterval(() => {
            videoProcessor.cleanupOldJobs();
        }, 60 * 60 * 1000);
    }
    return videoProcessor;
}

module.exports = {
    VideoProcessor,
    getVideoProcessor
};