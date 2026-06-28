import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import cors from 'cors';
import { connectToSocket } from './controllers/socketManager.js';
import userRoutes from './routes/users.routes.js';

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 8000;
const CLIENT_URL = process.env.CLIENT_URL || '*';
const REQUIRE_DB = process.env.REQUIRE_DB === 'true';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/apna_zoom_clone';

connectToSocket(server, CLIENT_URL);

app.set('port', PORT);
const allowedOrigins = CLIENT_URL === '*' ? '*' : CLIENT_URL.split(',').map((origin) => origin.trim());
app.use(cors({ origin: allowedOrigins, credentials: CLIENT_URL !== '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

app.get('/', (req, res) => {
  res.status(200).json({
    app: 'Apna Video Call API',
    status: 'running',
    health: '/health'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    port: PORT
  });
});

app.use('/api/v1/users', userRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const start = async () => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
    console.log('Video meetings and chat signaling are ready.');
  });

  try {
    const connectionDb = await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB connected: ${connectionDb.connection.host}`);
  } catch (error) {
    console.warn(`MongoDB not connected: ${error.message}`);
    console.warn('Video meetings still work. Login/history need MongoDB.');
    if (REQUIRE_DB) process.exit(1);
  }
};

start();
