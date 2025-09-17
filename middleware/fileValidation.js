const multer = require('multer');
const path = require('path');

// File validation middleware
const validateFile = (allowedTypes, maxSize) => {
    return (req, res, next) => {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file provided'
            });
        }

        // Check file type
        if (allowedTypes && !allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
            });
        }

        // Check file size
        if (maxSize && req.file.size > maxSize) {
            return res.status(400).json({
                success: false,
                error: `File too large. Maximum size: ${Math.round(maxSize / (1024 * 1024))}MB`
            });
        }

        next();
    };
};

// Image file validation specifically
const validateImage = validateFile(
    ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    10 * 1024 * 1024 // 10MB
);

// Request body validation middleware
const validateRouteData = (req, res, next) => {
    const { routes } = req.body;

    if (!routes) {
        return res.status(400).json({
            success: false,
            error: 'Routes data is required'
        });
    }

    if (!Array.isArray(routes)) {
        return res.status(400).json({
            success: false,
            error: 'Routes must be an array'
        });
    }

    // Validate each route structure
    for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        
        if (!route.id) {
            return res.status(400).json({
                success: false,
                error: `Route ${i + 1} is missing an ID`
            });
        }

        if (!route.waypoints || !Array.isArray(route.waypoints)) {
            return res.status(400).json({
                success: false,
                error: `Route ${i + 1} must have waypoints array`
            });
        }

        // Validate waypoints
        for (let j = 0; j < route.waypoints.length; j++) {
            const waypoint = route.waypoints[j];
            
            if (typeof waypoint.x !== 'number' || typeof waypoint.y !== 'number') {
                return res.status(400).json({
                    success: false,
                    error: `Route ${i + 1}, waypoint ${j + 1} must have numeric x and y coordinates`
                });
            }
        }
    }

    next();
};

// Video settings validation
const validateVideoSettings = (req, res, next) => {
    const { videoSettings } = req.body;

    if (videoSettings) {
        // Validate width and height
        if (videoSettings.width && (videoSettings.width < 100 || videoSettings.width > 4096)) {
            return res.status(400).json({
                success: false,
                error: 'Video width must be between 100 and 4096 pixels'
            });
        }

        if (videoSettings.height && (videoSettings.height < 100 || videoSettings.height > 4096)) {
            return res.status(400).json({
                success: false,
                error: 'Video height must be between 100 and 4096 pixels'
            });
        }

        // Validate FPS
        if (videoSettings.fps && (videoSettings.fps < 1 || videoSettings.fps > 60)) {
            return res.status(400).json({
                success: false,
                error: 'Video FPS must be between 1 and 60'
            });
        }

        // Validate duration
        if (videoSettings.duration && (videoSettings.duration < 1 || videoSettings.duration > 300)) {
            return res.status(400).json({
                success: false,
                error: 'Video duration must be between 1 and 300 seconds'
            });
        }
    }

    next();
};

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    error: 'File too large'
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    error: 'Too many files'
                });
            case 'LIMIT_FIELD_KEY':
                return res.status(400).json({
                    success: false,
                    error: 'Field name too long'
                });
            case 'LIMIT_FIELD_VALUE':
                return res.status(400).json({
                    success: false,
                    error: 'Field value too long'
                });
            case 'LIMIT_FIELD_COUNT':
                return res.status(400).json({
                    success: false,
                    error: 'Too many fields'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    error: 'Unexpected field'
                });
            default:
                return res.status(400).json({
                    success: false,
                    error: 'File upload error',
                    message: error.message
                });
        }
    }

    next(error);
};

module.exports = {
    validateFile,
    validateImage,
    validateRouteData,
    validateVideoSettings,
    handleMulterError
};