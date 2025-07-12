const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');

// Create HTTP server
const httpServer = createServer();

// Create Socket.IO server
const io = new Server(httpServer, {
    cors: {
        origin: process.env.APP_URL || "http://localhost",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

// Redis configuration
const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
});

// Redis adapter for Socket.IO
const { createAdapter } = require('@socket.io/redis-adapter');
const pubClient = redis.duplicate();
const subClient = redis.duplicate();

io.adapter(createAdapter(pubClient, subClient));

// Connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join room for property updates
    socket.on('join-property', (propertyId) => {
        socket.join(`property-${propertyId}`);
        console.log(`Client ${socket.id} joined property room: ${propertyId}`);
    });

    // Leave property room
    socket.on('leave-property', (propertyId) => {
        socket.leave(`property-${propertyId}`);
        console.log(`Client ${socket.id} left property room: ${propertyId}`);
    });

    // Join room for user notifications
    socket.on('join-user', (userId) => {
        socket.join(`user-${userId}`);
        console.log(`Client ${socket.id} joined user room: ${userId}`);
    });

    // Leave user room
    socket.on('leave-user', (userId) => {
        socket.leave(`user-${userId}`);
        console.log(`Client ${socket.id} left user room: ${userId}`);
    });

    // Handle booking updates
    socket.on('booking-update', (data) => {
        io.to(`property-${data.propertyId}`).emit('booking-updated', data);
        console.log(`Booking update sent to property ${data.propertyId}`);
    });

    // Handle property availability updates
    socket.on('availability-update', (data) => {
        io.to(`property-${data.propertyId}`).emit('availability-updated', data);
        console.log(`Availability update sent to property ${data.propertyId}`);
    });

    // Handle user notifications
    socket.on('user-notification', (data) => {
        io.to(`user-${data.userId}`).emit('notification-received', data);
        console.log(`Notification sent to user ${data.userId}`);
    });

    // Handle real-time chat
    socket.on('chat-message', (data) => {
        io.to(`chat-${data.chatId}`).emit('message-received', data);
        console.log(`Chat message sent to chat ${data.chatId}`);
    });

    // Join chat room
    socket.on('join-chat', (chatId) => {
        socket.join(`chat-${chatId}`);
        console.log(`Client ${socket.id} joined chat room: ${chatId}`);
    });

    // Leave chat room
    socket.on('leave-chat', (chatId) => {
        socket.leave(`chat-${chatId}`);
        console.log(`Client ${socket.id} left chat room: ${chatId}`);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
    });
});

// Redis connection handling
redis.on('connect', () => {
    console.log('Redis connected successfully');
});

redis.on('error', (error) => {
    console.error('Redis connection error:', error);
});

pubClient.on('connect', () => {
    console.log('Redis pub client connected');
});

subClient.on('connect', () => {
    console.log('Redis sub client connected');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    httpServer.close(() => {
        console.log('HTTP server closed');
        redis.quit();
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    httpServer.close(() => {
        console.log('HTTP server closed');
        redis.quit();
        process.exit(0);
    });
});

// Start server
const PORT = process.env.SOCKET_PORT || 6001;
httpServer.listen(PORT, () => {
    console.log(`Socket.IO server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Redis host: ${process.env.REDIS_HOST || '127.0.0.1'}`);
    console.log(`Redis port: ${process.env.REDIS_PORT || 6379}`);
}); 