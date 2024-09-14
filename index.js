const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './display.html';
  } else if (filePath === './control') {
    filePath = './control.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm',
    '.glb': 'model/gltf-binary',
    '.hdr': 'application/octet-stream'
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const wss = new WebSocket.Server({ server });

let sensorClient = null;
const consumerClients = new Set();

wss.on('connection', (ws, req) => {
  const clientType = req.url.slice(1); // Remove leading '/'

  if (clientType === 'sensor') {
    if (sensorClient) {
      sensorClient.close();
    }
    sensorClient = ws;
    console.log('Sensor client connected');
  } else if (clientType === 'consumer') {
    consumerClients.add(ws);
    console.log('Consumer client connected');
  }

  ws.on('message', (message) => {
    if (ws === sensorClient) {
      const stringMessage = message.toString();
      console.log('Received message from sensor:', stringMessage);
      consumerClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          // Send the string message to consumers
          client.send(stringMessage);
        }
      });
    }
  });

  ws.on('close', () => {
    if (ws === sensorClient) {
      sensorClient = null;
      console.log('Sensor client disconnected');
    } else {
      consumerClients.delete(ws);
      console.log('Consumer client disconnected');
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});