const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Export route data as JSON
router.post('/routes', async (req, res) => {
    try {
        const { routes, mapInfo } = req.body;

        if (!routes || !Array.isArray(routes)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid routes data'
            });
        }

        const exportData = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            mapInfo: mapInfo || {},
            routes: routes,
            metadata: {
                totalRoutes: routes.length,
                exportVersion: '1.0.0'
            }
        };

        // Save to exports directory
        const exportsDir = path.join(__dirname, '..', 'exports');
        await fs.ensureDir(exportsDir);

        const filename = `routes-${Date.now()}.json`;
        const filepath = path.join(exportsDir, filename);

        await fs.writeJson(filepath, exportData, { spaces: 2 });

        res.json({
            success: true,
            message: 'Routes exported successfully',
            data: {
                filename: filename,
                downloadUrl: `/api/export/download/${filename}`,
                exportId: exportData.id
            }
        });

    } catch (error) {
        console.error('Export routes error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export routes',
            message: error.message
        });
    }
});

// Generate video from routes
router.post('/video', async (req, res) => {
    try {
        const { routes, settings, totalDuration, mapImage } = req.body;

        if (!routes || !Array.isArray(routes)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid routes data'
            });
        }

        if (!mapImage) {
            return res.status(400).json({
                success: false,
                error: 'Map image is required'
            });
        }

        // Video generation will be implemented in the utils/videoProcessor.js
        const { getVideoProcessor } = require('../utils/videoProcessor');
        const videoProcessor = getVideoProcessor();
        
        const videoData = {
            id: uuidv4(),
            routes: routes,
            mapImage: mapImage,
            totalDuration: totalDuration || 10000,
            settings: {
                width: settings?.width || 1920,
                height: settings?.height || 1080,
                fps: settings?.fps || 30,
                format: settings?.format || 'mp4',
                quality: settings?.quality || 'high',
                backgroundColor: settings?.backgroundColor || '#1e1e1e',
                ...settings
            }
        };

        // Start video processing (this will be async)
        const result = await videoProcessor.generateVideo(videoData);

        res.json({
            success: true,
            message: 'Video generation started',
            data: {
                jobId: result.jobId,
                status: 'processing',
                estimatedTime: result.estimatedTime
            }
        });

    } catch (error) {
        console.error('Video generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate video',
            message: error.message
        });
    }
});

// Check video generation status
router.get('/video/:jobId/status', async (req, res) => {
    try {
        const jobId = req.params.jobId;
        const { getVideoProcessor } = require('../utils/videoProcessor');
        const videoProcessor = getVideoProcessor();
        
        const status = videoProcessor.getJobStatus(jobId);

        res.json({
            success: true,
            data: status
        });

    } catch (error) {
        console.error('Video status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get video status',
            message: error.message
        });
    }
});

// Download exported files
router.get('/download/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(__dirname, '..', 'exports', filename);

        if (!await fs.pathExists(filepath)) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        // Set appropriate headers
        const extension = path.extname(filename).toLowerCase();
        let contentType = 'application/octet-stream';
        
        if (extension === '.json') {
            contentType = 'application/json';
        } else if (extension === '.mp4') {
            contentType = 'video/mp4';
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const fileStream = fs.createReadStream(filepath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to download file',
            message: error.message
        });
    }
});

// Download video files
router.get('/download/video/:jobId', async (req, res) => {
    try {
        const jobId = req.params.jobId;
        const { getVideoProcessor } = require('../utils/videoProcessor');
        const videoProcessor = getVideoProcessor();
        
        const job = videoProcessor.getJobStatus(jobId);
        
        if (!job || job.status !== 'completed') {
            return res.status(404).json({
                success: false,
                error: 'Video not found or not ready',
                status: job?.status || 'not_found'
            });
        }

        if (!job.outputFile) {
            return res.status(404).json({
                success: false,
                error: 'Video file not available'
            });
        }

        // Set appropriate headers
        res.setHeader('Content-Disposition', `attachment; filename="${job.filename || `video_${jobId}.json`}"`);
        res.setHeader('Content-Type', 'application/json');

        // Stream the file
        const fs = require('fs');
        const fileStream = fs.createReadStream(job.outputFile);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Video download error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to download video',
            message: error.message
        });
    }
});

// Import route data from JSON
router.post('/import', async (req, res) => {
    try {
        const importData = req.body;

        // Validate import data structure
        if (!importData.routes || !Array.isArray(importData.routes)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid import data format'
            });
        }

        // Validate each route
        const validRoutes = importData.routes.filter(route => {
            return route.id && route.waypoints && Array.isArray(route.waypoints);
        });

        res.json({
            success: true,
            message: 'Routes imported successfully',
            data: {
                importedRoutes: validRoutes.length,
                totalRoutes: importData.routes.length,
                routes: validRoutes,
                mapInfo: importData.mapInfo || {}
            }
        });

    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import routes',
            message: error.message
        });
    }
});

module.exports = router;