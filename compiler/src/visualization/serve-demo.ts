#!/usr/bin/env node
/**
 * Simple server to serve the visualization demo
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const PORT = 3000;
const DEMO_FILE = path.join(__dirname, 'demo.html');

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/demo') {
    // Serve the demo HTML file
    try {
      const content = fs.readFileSync(DEMO_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Demo file not found');
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log('🎯 BUSY Visualization Demo Server Started!');
  console.log(`📱 Open your browser and visit: http://localhost:${PORT}`);
  console.log('🚀 Demo features:');
  console.log('   • Interactive organizational visualization');
  console.log('   • Zoom, pan, and selection controls');
  console.log('   • Different view modes (Organizational, Dependencies, Team Details)');
  console.log('   • Mock data representing a photography business');
  console.log('\n💡 Press Ctrl+C to stop the server');
});

server.on('error', (err) => {
  if ((err as any).code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Try a different port.`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down BUSY Visualization Demo Server...');
  server.close(() => {
    console.log('✅ Server stopped successfully');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down BUSY Visualization Demo Server...');
  server.close(() => {
    console.log('✅ Server stopped successfully');
    process.exit(0);
  });
});