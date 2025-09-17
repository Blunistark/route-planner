---
applyTo: '**'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.

Copilot Prompt for Map Route Video Generator
text
Create a modern web application that allows users to upload a map image, draw multiple routes on it, and generate an animated video showing each route sequentially. Here are the detailed requirements:

## Tech Stack
- Frontend: HTML5, CSS3, JavaScript (ES6+), Canvas API
- Backend: Node.js with Express.js
- Video Generation: FFmpeg or Canvas-based frame generation
- File Handling: Multer for uploads
- Additional: Fabric.js or Konva.js for interactive drawing

## Core Features

### 1. Map Upload & Display
- Drag-and-drop image upload interface
- Support for common image formats (PNG, JPG, JPEG)
- Responsive image display with zoom/pan capabilities
- Image preprocessing for optimal canvas rendering

### 2. Interactive Route Drawing
- Click-to-add waypoint system for creating routes
- Multiple route support with different colors/styles
- Route editing capabilities (add/remove/move waypoints)
- Route labeling and naming functionality
- Undo/redo functionality for route modifications
- Save routes as JSON data structure

### 3. Route Management
- Route list panel showing all created routes
- Individual route visibility toggle
- Route reordering for video sequence
- Route properties panel (color, width, animation speed)
- Import/export route data functionality

### 4. Video Generation
- Sequential route animation (one route appears at a time)
- Configurable animation speed and timing
- Smooth path drawing animation using bezier curves
- Route highlight effects and transitions
- Export as MP4 video format
- Progress indicator during video generation

### 5. User Interface
- Clean, modern dashboard layout
- Responsive design for desktop and tablet
- Tool palette for drawing options
- Timeline scrubber for preview
- Export options panel

## Technical Implementation

### Frontend Structure
/public
/css
- main.css (responsive layout, dark theme)
- drawing.css (canvas and drawing tools)
/js
- mapCanvas.js (canvas management and drawing)
- routeManager.js (route data handling)
- videoGenerator.js (frame generation and export)
- uiController.js (interface interactions)

index.html

/views

dashboard.html (main application interface)

text

### Backend Structure
/routes

upload.js (handle map image uploads)

export.js (video generation and download)
/middleware

fileValidation.js
/utils

videoProcessor.js (FFmpeg integration)

text

### Key Functions to Implement

1. **Canvas Drawing System**
   - Interactive path creation with mouse/touch
   - Real-time route preview
   - Multi-layer canvas (background map, routes, UI elements)

2. **Route Data Structure**
const route = {
id: uuid(),
name: "Route 1",
waypoints: [{x, y, timestamp}],
style: {color, width, dashPattern},
animationDuration: 3000
}

text

3. **Video Frame Generation**
- Canvas-to-frame conversion
- Sequential route drawing animation
- Frame timing and interpolation
- Video encoding pipeline

4. **Export Functionality**
- Route data as JSON
- Static image with all routes
- Animated video generation
- Progress tracking and user feedback

## User Workflow
1. Upload map image
2. Draw multiple routes by clicking waypoints
3. Customize route appearance and sequence
4. Preview animation timeline
5. Generate and download video

## Performance Considerations
- Optimize canvas rendering for large images
- Implement efficient redraw strategies
- Use Web Workers for video processing
- Progress indicators for long operations
- Memory management for large route datasets

## Additional Features
- Route statistics (distance, duration estimates)
- Grid overlay and measurement tools
- Route templates and presets
- Collaborative editing capabilities
- Integration with map APIs for real coordinates

Create a professional, user-friendly application with clean code structure and comprehensive error handling. Include detailed comments and modular architecture for easy maintenance and future enhancements.
This prompt provides Copilot with a complete roadmap for building your map route visualization application, covering both the technical implementation and user experience aspects. The modular approach aligns with your development style and includes containerization-friendly architecture.

