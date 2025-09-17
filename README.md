# Map Route Video Generator

A modern web application that allows users to upload a map image, draw multiple routes on it, and generate an animated video showing each route sequentially.

## Features

- **Interactive Map Upload**: Drag-and-drop interface for map images
- **Route Drawing**: Click-to-add waypoint system with multiple route support
- **Route Management**: Edit, reorder, and customize route properties
- **Video Generation**: Create animated videos showing routes sequentially
- **Modern UI**: Responsive design with dark theme

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Canvas API
- **Backend**: Node.js with Express.js
- **Video Processing**: Canvas-based frame generation
- **File Handling**: Multer for uploads

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Upload a map image using the drag-and-drop interface
2. Click on the map to create waypoints and draw routes
3. Customize route properties (color, width, animation speed)
4. Preview the animation timeline
5. Generate and download your animated video

## Project Structure

```
├── public/
│   ├── css/
│   ├── js/
│   └── index.html
├── routes/
├── middleware/
├── utils/
├── views/
├── uploads/
└── server.js
```

## License

MIT License