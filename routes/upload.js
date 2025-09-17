const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Configure multer for this route
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        fs.ensureDirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueId = uuidv4();
        const extension = path.extname(file.originalname);
        cb(null, `map-${uniqueId}${extension}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

// Upload map image
router.post('/map', upload.single('mapImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const fileInfo = {
            id: uuidv4(),
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
            mimeType: req.file.mimetype,
            uploadedAt: new Date().toISOString(),
            url: `/uploads/${req.file.filename}`
        };

        // Save file metadata
        const metadataPath = path.join(__dirname, '..', 'uploads', `${req.file.filename}.json`);
        await fs.writeJson(metadataPath, fileInfo, { spaces: 2 });

        res.json({
            success: true,
            message: 'Map uploaded successfully',
            data: fileInfo
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload map',
            message: error.message
        });
    }
});

// Get uploaded map info
router.get('/map/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const metadataPath = path.join(__dirname, '..', 'uploads', `${filename}.json`);
        
        if (!await fs.pathExists(metadataPath)) {
            return res.status(404).json({
                success: false,
                error: 'Map not found'
            });
        }

        const fileInfo = await fs.readJson(metadataPath);
        res.json({
            success: true,
            data: fileInfo
        });

    } catch (error) {
        console.error('Get map error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get map info',
            message: error.message
        });
    }
});

// Delete uploaded map
router.delete('/map/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '..', 'uploads', filename);
        const metadataPath = path.join(__dirname, '..', 'uploads', `${filename}.json`);

        // Check if files exist
        const fileExists = await fs.pathExists(filePath);
        const metadataExists = await fs.pathExists(metadataPath);

        if (!fileExists && !metadataExists) {
            return res.status(404).json({
                success: false,
                error: 'Map not found'
            });
        }

        // Delete files
        if (fileExists) {
            await fs.remove(filePath);
        }
        if (metadataExists) {
            await fs.remove(metadataPath);
        }

        res.json({
            success: true,
            message: 'Map deleted successfully'
        });

    } catch (error) {
        console.error('Delete map error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete map',
            message: error.message
        });
    }
});

module.exports = router;