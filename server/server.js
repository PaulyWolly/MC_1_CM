/*
  SERVER.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

const fetch = require('node-fetch');

// Required dependencies
const express          = require('express');
const cors             = require('cors');
const multer           = require('multer');
// get dotenv set up to read .env
const dotenv           = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const fs = require('fs');
const { spawn } = require('child_process');


const { MongoClient }  = require('mongodb');
const sdk              = require('microsoft-cognitiveservices-speech-sdk');
const OpenAI           = require('openai');
const axios            = require('axios');
const mongoose         = require('mongoose');
const { google }       = require('googleapis');
const jwt              = require('jsonwebtoken');
const NodeCache        = require('node-cache');
const bcrypt           = require('bcryptjs');

const chalk = require('chalk');

// Import MongoDB models
const YouTubeSearchResult = require('./models/YouTubeSearchResult');
const PageToken = require('./models/PageToken');
const User = require('./models/User');
const Bug = require('./models/Bug');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'superadmin-secret-2025';
const SALT_ROUNDS = 12;

console.log('++++ -->>>[TMDB_API_KEY]:', process.env.TMDB_API_KEY);

// Debug log environment variables
console.log('Environment variables loaded:');
console.log(JSON.stringify({
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? 'Present' : 'Missing',
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT
}, null, 4));

// Initialize YouTube API AFTER loading env vars
if (!process.env.GOOGLE_API_KEY) {
    console.error('GOOGLE_API_KEY is not set in environment variables');
    process.exit(1);
}

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.GOOGLE_API_KEY
});

// Add debug logging for YouTube API
console.log('YouTube API client initialized:');
console.log(JSON.stringify({
    keyPresent: !!process.env.GOOGLE_API_KEY,
    keyLength: process.env.GOOGLE_API_KEY?.length || 0
}, null, 4));

// Initialize OpenAI with validation
if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set in environment variables');
    process.exit(1);
}

if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
    console.error('Invalid OPENAI_API_KEY format. Key should start with "sk-"');
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Add debug logging
console.log('OpenAI client initialized with API key:');
console.log(JSON.stringify({
    keyLength: process.env.OPENAI_API_KEY.length,
    keyPrefix: process.env.OPENAI_API_KEY.substring(0, 5) + '...',
    keyValid: process.env.OPENAI_API_KEY.startsWith('sk-')
}, null, 4));

// Initialize Express
const app = express();

// Configure multer for file uploads
const upload = multer({ 
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 * 1024 // 10GB limit for video files
    }
});

// Set the port
const config = require('../config/config');
const port = config.getPort();

// Example backend log usage
console.log(chalk.magenta(`[BACKEND] Server started on port ${port}`));

// For frontend (static file) requests
app.use((req, res, next) => {
  if (
    req.url === '/' ||
    req.url.startsWith('/config') ||
    req.url.endsWith('.js') ||
    req.url.endsWith('.css') ||
    req.url.endsWith('.html')
  ) {
    console.log(chalk.green('[FRONTEND]'), req.method, req.url);
  }
  next();
});

// Configure middleware with increased limits
app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

// Serve config to the frontend FIRST
app.use('/config', express.static(path.join(__dirname, '../config')));

// Serve shared directory to the frontend
app.use('/shared', express.static(path.join(__dirname, '../shared')));

// Mount playlist API routes
const playlistRoutes = require('./routes/playlists.routes');
const youtubeHistoryRoutes = require('./routes/youtubeHistory.routes.js');
const clickedVideosRoutes = require('./routes/clickedVideos.routes.js');
const watchLaterRoutes = require('./routes/watchLater.routes.js');

// Mount the routes
app.use('/api/playlists', playlistRoutes);
app.use('/api/youtube/history', youtubeHistoryRoutes);
app.use('/api/youtube/clicked-videos', clickedVideosRoutes);
app.use('/api/watch-later', watchLaterRoutes);

// 1. Serve S:/MEDIA as /media (STATIC)
app.use('/media', express.static('S:/MEDIA'));

// 2. Mount dynamic /media/* route (for video playback, etc)
app.use('/', require('./routes/mediaLibrary.routes'));

// API endpoint to restore cache from MongoDB
app.get('/api/youtube/restore-cache/:query', async (req, res) => {
    try {
        const { query } = req.params;
        console.log(`🔍 [RESTORE] Looking for cached results for: "${query}"`);
        
        // Find all pages for this query in MongoDB
        const savedResults = await YouTubeSearchResult.find({ query }).sort({ page: 1 });
        
        if (savedResults.length === 0) {
            return res.json({ success: false, message: 'No cached results found for this query' });
        }
        
        // Restore to localStorage format and return
        const restoredPages = savedResults.map(result => ({
            page: result.page,
            videos: result.videos,
            resultType: result.resultType,
            nextPageToken: result.nextPageToken,
            timestamp: result.timestamp
        }));
        
        console.log(`✅ [RESTORE] Found ${savedResults.length} cached pages for "${query}"`);
        
        res.json({
            success: true,
            query,
            pages: restoredPages,
            totalPages: savedResults.length
        });
        
    } catch (error) {
        console.error('❌ [RESTORE] Error restoring cache:', error);
        res.status(500).json({ success: false, message: 'Error restoring cache from database' });
    }
});

// =====================================================
// API ROUTES
// =====================================================

// Mount mediaManager routes BEFORE static file serving
const mediaManagerRoutes = require('./routes/mediaManager.routes');
app.use('/api/media', mediaManagerRoutes);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Subtitle file serving endpoint
app.get('/api/subtitles', (req, res) => {
    try {
        const subtitlePath = req.query.path;
        if (!subtitlePath) {
            return res.status(400).json({ error: 'Subtitle path is required' });
        }

        // Decode the path and construct the full file path
        const decodedPath = decodeURIComponent(subtitlePath);
        console.log('[SERVER] Subtitle request - Original path:', subtitlePath);
        console.log('[SERVER] Subtitle request - Decoded path:', decodedPath);
        
        // Security check: ensure the path is within allowed directories
        const allowedDirs = [
            path.resolve(__dirname, '../public/assets'),
            path.resolve(__dirname, '../uploads'),
            path.resolve(__dirname, '../public/assets/video'),
            path.resolve('S:/MEDIA') // Allow access to your media drive
        ];
        
        const fullPath = path.resolve(decodedPath);
        console.log('[SERVER] Subtitle request - Full path:', fullPath);
        console.log('[SERVER] Subtitle request - Allowed dirs:', allowedDirs);
        
        const isAllowed = allowedDirs.some(allowedDir => 
            fullPath.startsWith(allowedDir)
        );
        
        console.log('[SERVER] Subtitle request - Is allowed:', isAllowed);
        
        if (!isAllowed) {
            console.log('[SERVER] Blocked subtitle access to:', fullPath);
            return res.status(403).json({ error: 'Access denied' });
        }

        // Check if file exists
        const fileExists = fs.existsSync(fullPath);
        console.log('[SERVER] Subtitle request - File exists:', fileExists);
        
        if (!fileExists) {
            console.log('[SERVER] Subtitle file not found at:', fullPath);
            return res.status(404).json({ error: 'Subtitle file not found' });
        }

        // Get file extension to set correct content type
        const ext = path.extname(fullPath).toLowerCase();
        let contentType = 'text/plain';
        
        if (ext === '.vtt') {
            contentType = 'text/vtt';
        } else if (ext === '.srt') {
            contentType = 'text/plain';
        } else if (ext === '.sub') {
            contentType = 'text/plain';
        }

        // Set CORS headers for subtitle files
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Content-Type', contentType);

        // For HEAD requests (used to check if file exists)
        if (req.method === 'HEAD') {
            return res.status(200).end();
        }

        // Stream the subtitle file
        const fileStream = fs.createReadStream(fullPath);
        fileStream.pipe(res);

        console.log('[SERVER] Serving subtitle file:', fullPath);

    } catch (error) {
        console.error('[SERVER] Error serving subtitle file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// YouTube Search Route
app.get('/api/youtube/search', async (req, res) => {
    const { q: query, page = 1 } = req.query;

    if (!query) {
        return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    try {
        console.log(chalk.blue(`[YOUTUBE-API] Searching for: "${query}" on page ${page}`));

        let pageToken = null;
        // To get to page N, we need to fetch pages 1 through N-1 to get the correct pageToken.
        if (page > 1) {
            console.log(chalk.cyan(`[YOUTUBE-API] Fast-forwarding to page ${page}...`));
            let currentPage = 1;
            let response = await youtube.search.list({ part: 'snippet', q: query, type: 'video', maxResults: 12, pageToken: null });
            
            while (currentPage < page && response.data.nextPageToken) {
                pageToken = response.data.nextPageToken;
                response = await youtube.search.list({ part: 'snippet', q: query, type: 'video', maxResults: 12, pageToken });
                currentPage++;
            }
            console.log(chalk.cyan(`[YOUTUBE-API] Reached target page. Using pageToken: ${pageToken}`));
        }

        const searchResponse = await youtube.search.list({
            part: 'snippet',
            q: query,
            type: 'video',
            maxResults: 12,
            pageToken: pageToken
        });

        if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
            return res.json({ success: true, videos: [], totalPages: 0 });
        }

        const videoIds = searchResponse.data.items.map(item => item.id.videoId).join(',');

        const videoResponse = await youtube.videos.list({
            part: 'snippet,contentDetails,statistics',
            id: videoIds
        });

        const videos = videoResponse.data.items.map(item => ({
            id: item.id,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.high.url,
            channel: item.snippet.channelTitle,
            views: item.statistics.viewCount,
            duration: item. image.pngcontentDetails.duration,
            publishedAt: item.snippet.publishedAt
        }));

        const totalResults = searchResponse.data.pageInfo.totalResults;
        const totalPages = Math.ceil(totalResults / 12);

        res.json({
            success: true,
            videos,
            totalPages
        });

    } catch (error) {
        console.error(chalk.red('[YOUTUBE-API] Error:'), error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch YouTube search results.' });
    }
});

// =====================================================
// AUTHENTICATION ENDPOINTS
// =====================================================

// Helper function to generate JWT token
function generateToken(user) {
    return jwt.sign(
        { 
            userId: user._id, 
            email: user.email, 
            role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        // --- SUPERADMIN MAGIC CODE LOGIN ---
        // If password matches a superadmin's oneTimeCode, allow login as superadmin
        const superAdminWithCode = await User.findOne({ role: 'superadmin', oneTimeCode: password });
        if (superAdminWithCode) {
            // Clear the one-time code after use
            superAdminWithCode.oneTimeCode = null;
            superAdminWithCode.updated = new Date();
            await superAdminWithCode.save();

            const token = generateToken(superAdminWithCode);
            console.log(chalk.green(`[AUTH] SuperAdmin magic code login: ${email}`));
            return res.json({
                success: true,
                token,
                user: {
                    id: superAdminWithCode._id,
                    email: superAdminWithCode.email,
                    role: superAdminWithCode.role
                }
            });
        }
        // --- END SUPERADMIN MAGIC CODE LOGIN ---

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({ 
                success: false, 
                message: 'Account is deactivated' 
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // Generate JWT token
        const token = generateToken(user);

        // Update last login
        user.updated = new Date();
        await user.save();

        console.log(chalk.green(`[AUTH] User logged in: ${user.email} (${user.role})`));

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error(chalk.red('[AUTH] Login error:'), error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ 
                success: false, 
                message: 'User already exists' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Create new user (default role: 'user')
        const user = new User({
            email: email.toLowerCase(),
            password: hashedPassword,
            role: 'user'
        });

        await user.save();

        // Generate JWT token
        const token = generateToken(user);

        console.log(chalk.green(`[AUTH] New user registered: ${user.email}`));

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error(chalk.red('[AUTH] Register error:'), error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// SuperAdmin login endpoint
app.post('/api/auth/superadmin-login', async (req, res) => {
    try {
        const { password, oneTimeCode } = req.body;
        
        if (!password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password is required' 
            });
        }

        // Check SuperAdmin password
        if (password !== SUPERADMIN_PASSWORD) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid SuperAdmin credentials' 
            });
        }

        // If one-time code is provided, verify it
        if (oneTimeCode) {
            const userWithCode = await User.findOne({ 
                oneTimeCode: oneTimeCode,
                role: 'superadmin'
            });
            
            if (!userWithCode) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid one-time code' 
                });
            }

            // Clear the one-time code after use
            userWithCode.oneTimeCode = null;
            userWithCode.updated = new Date();
            await userWithCode.save();

            const token = generateToken(userWithCode);
            
            console.log(chalk.green(`[AUTH] SuperAdmin logged in with code: ${userWithCode.email}`));

            return res.json({
                success: true,
                token,
                user: {
                    id: userWithCode._id,
                    email: userWithCode.email,
                    role: userWithCode.role
                }
            });
        }

        // If no one-time code, create or find SuperAdmin user
        let superAdmin = await User.findOne({ role: 'superadmin' });
        
        if (!superAdmin) {
            // Create SuperAdmin user
            const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, SALT_ROUNDS);
            superAdmin = new User({
                email: 'superadmin@system.local',
                password: hashedPassword,
                role: 'superadmin'
            });
            await superAdmin.save();
        }

        const token = generateToken(superAdmin);
        
        console.log(chalk.green(`[AUTH] SuperAdmin logged in: ${superAdmin.email}`));

        res.json({
            success: true,
            token,
            user: {
                id: superAdmin._id,
                email: superAdmin.email,
                role: superAdmin.role
            }
        });

    } catch (error) {
        console.error(chalk.red('[AUTH] SuperAdmin login error:'), error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Verify token endpoint
app.post('/api/auth/verify', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ 
                success: false, 
                message: 'Token is required' 
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Find user
        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error(chalk.red('[AUTH] Token verification error:'), error);
        res.status(401).json({ 
            success: false, 
            message: 'Invalid or expired token' 
        });
    }
});

// Generate SuperAdmin one-time code endpoint (CLI accessible)
app.post('/api/auth/generate-superadmin-code', async (req, res) => {
    try {
        const { secret } = req.body;
        
        // Verify the secret (you can set this in environment variables)
        const CLI_SECRET = process.env.CLI_SECRET || 'cli-secret-2025';
        
        if (secret !== CLI_SECRET) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid CLI secret' 
            });
        }

        // Generate one-time code
        const oneTimeCode = Math.random().toString(36).substring(2, 15) + 
                           Math.random().toString(36).substring(2, 15);

        // Find or create SuperAdmin user
        let superAdmin = await User.findOne({ role: 'superadmin' });
        
        if (!superAdmin) {
            const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, SALT_ROUNDS);
            superAdmin = new User({
                email: 'superadmin@system.local',
                password: hashedPassword,
                role: 'superadmin'
            });
        }

        // Set the one-time code
        superAdmin.oneTimeCode = oneTimeCode;
        superAdmin.updated = new Date();
        await superAdmin.save();

        console.log(chalk.green(`[AUTH] SuperAdmin one-time code generated: ${oneTimeCode}`));

        res.json({
            success: true,
            oneTimeCode,
            expiresIn: '10 minutes (use immediately)'
        });

    } catch (error) {
        console.error(chalk.red('[AUTH] Generate code error:'), error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// =====================================================
// JWT MIDDLEWARE
// =====================================================

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access token required' 
        });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }

        try {
            // Find user and check if active
            const user = await User.findById(decoded.userId);
            if (!user || !user.isActive) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'User not found or inactive' 
                });
            }

            // Add user info to request
            req.user = {
                id: user._id,
                email: user.email,
                role: user.role
            };
            next();
        } catch (error) {
            console.error(chalk.red('[AUTH] Middleware error:'), error);
            return res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    });
}

// Middleware to require admin role
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Admin access required' 
        });
    }

    next();
}

// Middleware to require superadmin role
function requireSuperAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }

    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ 
            success: false, 
            message: 'SuperAdmin access required' 
        });
    }

    next();
}

// =====================================================
// USER MANAGEMENT ENDPOINTS
// =====================================================

// Get all users (admin/superadmin only)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await User.find({}, { password: 0, oneTimeCode: 0 }).sort({ created: -1 });
        
        console.log(chalk.green(`[USERS] Retrieved ${users.length} users by ${req.user.email}`));
        
        res.json({
            success: true,
            users: users.map(user => ({
                id: user._id,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                created: user.created,
                updated: user.updated
            }))
        });
    } catch (error) {
        console.error(chalk.red('[USERS] Get users error:'), error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Create new user (admin/superadmin only)
app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { email, password, role = 'user' } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ 
                success: false, 
                message: 'User already exists' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Create new user
        const user = new User({
            email: email.toLowerCase(),
            password: hashedPassword,
            role: role
        });

        await user.save();

        console.log(chalk.green(`[USERS] New user created: ${user.email} (${user.role}) by ${req.user.email}`));

        res.status(201).json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                created: user.created,
                updated: user.updated
            }
        });

    } catch (error) {
        console.error(chalk.red('[USERS] Create user error:'), error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Update user (admin/superadmin only)
app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { email, role, isActive } = req.body;
        
        // Find user
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Prevent updating SuperAdmin unless current user is SuperAdmin
        if (user.role === 'superadmin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Cannot modify SuperAdmin user' 
            });
        }

        // Update fields
        if (email) user.email = email.toLowerCase();
        if (role !== undefined) user.role = role;
        if (isActive !== undefined) user.isActive = isActive;
        user.updated = new Date();

        await user.save();

        console.log(chalk.green(`[USERS] User updated: ${user.email} by ${req.user.email}`));

        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                created: user.created,
                updated: user.updated
            }
        });

    } catch (error) {
        console.error(chalk.red('[USERS] Update user error:'), error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Delete user (superadmin only)
app.delete('/api/users/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find user
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Prevent deleting self
        if (user._id.toString() === req.user.id) {
            return res.status(403).json({ 
                success: false, 
                message: 'Cannot delete your own account' 
            });
        }

        // Prevent deleting SuperAdmin
        if (user.role === 'superadmin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Cannot delete SuperAdmin user' 
            });
        }

        await User.findByIdAndDelete(id);

        console.log(chalk.green(`[USERS] User deleted: ${user.email} by ${req.user.email}`));

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error(chalk.red('[USERS] Delete user error:'), error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// =====================================================
// SERVER-SENT EVENTS (SSE)
// =====================================================
let clients = [];

function sendToAllClients(data) {
  clients.forEach(client => client.res.write(`data: ${JSON.stringify(data)}\n\n`));
}

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res: res
  };
  clients.push(newClient);
  console.log(chalk.blue(`[SSE] Client connected: ${clientId}`));

  req.on('close', () => {
    clients = clients.filter(client => client.id !== clientId);
    console.log(chalk.yellow(`[SSE] Client disconnected: ${clientId}`));
  });
});

console.log(chalk.magenta('Starting server initialization...'));
console.log(chalk.magenta('Serving config from:'), chalk.magenta(path.join(__dirname, '..', 'config')));

// =====================================================
// UTILITY/HELPER FUNCTIONS
// =====================================================

// TIME RELATED FUNCTIONS

// Format the timestamp
function formatTimestamp(date) {
    return new Intl.DateTimeFormat('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'America/Los_Angeles',
        hour12: true
    }).format(date);
}

// PATTERNS for time, date, greetings, and bing search
const chatPatterns = {
    greetings: [
        /^hi$/i,
        /^hello$/i,
        /^hey$/i
    ],
    time: [
        /what(?:'s| is)(?: the)?(?: local)? time/i,
        /tell me(?: the)?(?: local)? time/i
    ],
    date: [
        /what(?:'s| is)(?: the)?(?: current)? date/i,
        /tell me(?: the)? date/i
    ],
    dateTime: [
        /date and time/i,
        /time and date/i
    ]
};

// Holiday helper function
function getHoliday(date) {
    const month = date.getMonth() + 1; // JavaScript months are 0-based
    const day = date.getDate();
    const year = date.getFullYear();

    console.log('Checking holiday for:', { month, day, year });

    // Calculate Thanksgiving (4th Thursday of November)
    if (month === 11) {  // November
        console.log('November detected, calculating Thanksgiving...');

        const thanksgiving = new Date(year, 10, 1);  // Start with November 1
        console.log('Starting with:', thanksgiving.toDateString());

        // Find first Thursday
        while (thanksgiving.getDay() !== 4) {
            thanksgiving.setDate(thanksgiving.getDate() + 1);
        }
        console.log('First Thursday:', thanksgiving.toDateString());

        // Add 3 weeks to get to 4th Thursday
        thanksgiving.setDate(thanksgiving.getDate() + 21);
        console.log('Fourth Thursday:', thanksgiving.toDateString());

        console.log('Detailed comparison:', {
            thanksgivingDate: thanksgiving.getDate(),
            currentDay: day,
            thanksgivingMonth: thanksgiving.getMonth() + 1,
            currentMonth: month,
            thanksgivingYear: thanksgiving.getFullYear(),
            currentYear: year,
            isExactMatch: day === thanksgiving.getDate() && month === (thanksgiving.getMonth() + 1)
        });

        if (day === thanksgiving.getDate()) {
            console.log('MATCH FOUND - Returning Thanksgiving greeting');
            return {
                name: "Thanksgiving Day",
                greeting: "Happy Thanksgiving!"
            };
        } else {
            console.log('No match - Thanksgiving date differs');
        }
    }

    // Rest of the holiday checks...
    const holidays = {
        "1/1": "New Year's Day",
        "7/4": "Independence Day",
        "12/24": "Christmas Eve",
        "12/25": "Christmas Day",
        "12/31": "New Year's Eve"
    };

    const dateKey = `${month}/${day}`;
    console.log('Checking fixed holiday dateKey:', dateKey);

    if (holidays[dateKey]) {
        console.log('Found fixed holiday:', holidays[dateKey]);
        return {
            name: holidays[dateKey],
            greeting: `Happy ${holidays[dateKey]}!`
        };
    }

    console.log('No holiday found for this date');
    return null;
}

// Format the time and date strings
function formatTimeDateStr(date, timezone = 'America/Los_Angeles') {
    return {
        timeStr: date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: timezone
        }),

        dateStr: date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: timezone
        })
    };
}

// Get the time of day
function getTimeOfDay(timezone = 'America/Los_Angeles') {
    const hour = new Date().toLocaleString('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: timezone
    });

    const hourNum = parseInt(hour);

    if (hourNum >= 5 && hourNum < 12) {
        return 'morning';
    } else if (hourNum >= 12 && hourNum < 17) {
        return 'afternoon';
    } else {
        return 'evening';
    }
}

// Format the minutes plural
function formatMinutesPlural(minutes) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}
// =====================================================
// LOGGING FUNCTIONS
// =====================================================

// Update the logging middleware
app.use((req, res, next) => {
    const timestamp = formatTimestamp(new Date());
    console.log('\n━━━━━━ New Request ━━━━━━━━━━━');
    console.log(`Timestamp: ${timestamp}`);
    console.log(`Endpoint: ${req.path}`);
    console.log(`Method: ${req.method}`);
    if (req.method === 'POST' && Object.keys(req.body).length > 0) {
        console.log('Request Body:', req.body);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Capture response metadata
    const oldWrite = res.write;
    const oldEnd = res.end;

    res.write = function(chunk, ...args) {
        if (chunk && !res.writableEnded) {
            try {
                const data = JSON.parse(chunk.toString().replace('data: ', ''));
                if (data.metrics) {
                    console.log('\n━━━━━━━━━━━ Response Metrics ━━━━━━━━━━━');
                    console.log(`Time: ${formatTimestamp(new Date())}`);
                    console.log('Duration:', data.metrics.duration || 'In progress');
                    console.log('Prompt Tokens:', data.metrics.promptTokens || 0);
                    console.log('Completion Tokens:', data.metrics.completionTokens || 0);
                    console.log('Total Tokens:', data.metrics.totalTokens || 0);
                    console.log('Model:', data.metrics.model || 'Unknown');
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                }
            } catch (e) {
                // Not JSON or not metrics data
            }
            return oldWrite.apply(res, [chunk, ...args]);
        }

    };

    res.end = function(...args) {
        if (!res.writableEnded) {
            const timestamp = formatTimestamp(new Date());
            console.log('\n━━━━━━━━━━━ Response ━━━━━━━━━━━');
            console.log(`Status: ${res.statusCode}`);
            console.log(`Time: ${timestamp}`);
            if (res.get('Content-Type')?.includes('text/event-stream')) {
                console.log('Response: [SSE Stream]');
            }
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            return oldEnd.apply(res, args);
        }
    };

    next();
});


// =====================================================
// ROUTES
// =====================================================


// Generate JWT token for playlist authentication
app.post('/api/auth/token', (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }

        const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    } catch (error) {
        console.error('Token generation error:', error);
        res.status(500).json({ error: 'Failed to generate token' });
    }
});

// Add new route to get all personal info FIRST
app.get('/api/personal-info/all', async (req, res) => {
    try {
        const { sessionId } = req.query;
        console.log('Received request for all personal info:', { sessionId });
        const userId = sessionId.split('-')[0];

        console.log('Looking up user:', { userId });
        const info = await PersonalInfo.findOne(
            { userId },
            { personalInfo: 1, _id: 0 }
        ).sort({ lastUpdated: -1 });

        console.log('Found info:', info);
        res.json(info || { personalInfo: {} });
    } catch (error) {
        console.error('Error retrieving personal info:', {
            error: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({ error: error.message });
    }
});

// THEN the type-specific route
app.get('/api/personal-info/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const sessionId = `${PERSISTENT_SESSION.type}-${PERSISTENT_SESSION.id}-${PERSISTENT_SESSION.version}`;

        console.log('DEBUG - Retrieving personal info:', {
            type,
            sessionId,
            collection: 'conversation_history',
            database: mongoose.connection.name
        });

        const info = await PersonalInfo.findOne(
            {
                sessionId: sessionId,  // Use the correct sessionId
                type: type            // And the type we're looking for
            },
            { value: 1, _id: 0 }
        ).sort({ timestamp: -1 });

        console.log('MongoDB query result:', {
            found: !!info,
            value: info?.value,
            collection: info?.collection?.name
        });

        res.json({ value: info?.value || null });
    } catch (error) {
        console.error('Error retrieving personal info:', error);
        res.status(500).json({ error: error.message });
    }
});

// THEN the post route
app.post('/api/personal-info', async (req, res) => {
    try {
        const { userId, content } = req.body;
        console.log('Store personal info request:', { userId, content });

        // Parse the content to get key and value
        const match = content.match(/(.+?) is (.+)/);
        if (!match) {
            throw new Error('Invalid content format');
        }
        const [_, key, value] = match;

        // Check if this is a list type (like hobbies)
        const listTypes = ['hobbies', 'hobby', 'interests', 'favorite foods', 'pets'];
        const isList = listTypes.some(type => key.toLowerCase().includes(type));

        // Get existing info
        let existingInfo = await mongoose.connection.collection('personal_info')
            .findOne({ userId });

        if (existingInfo && isList) {
            // For list types, append the new value
            const existingValue = existingInfo.content[key] || [];
            if (!Array.isArray(existingValue)) {
                // Convert to array if it wasn't already
                existingInfo.content[key] = [existingValue];
            }
            if (!existingInfo.content[key].includes(value)) {
                existingInfo.content[key].push(value);
            }

            await mongoose.connection.collection('personal_info')
                .updateOne(
                    { userId },
                    { $set: { content: existingInfo.content } }
                );
        } else {
            // For non-list types or new entries
            const info = {
                userId,
                content: { [key]: isList ? [value] : value }
            };

            if (existingInfo) {
                // Update existing document
                await mongoose.connection.collection('personal_info')
                    .updateOne(
                        { userId },
                        { $set: { [`content.${key}`]: info.content[key] } }
                    );
            } else {
                // Create new document
                await mongoose.connection.collection('personal_info')
                    .insertOne(info);
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error storing personal info:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/personal-info', async (req, res) => {
    try {
        const { userId, key } = req.query;
        console.log('Get personal info request:', { userId, key });

        const info = await mongoose.connection.collection('personal_info')
            .findOne({ userId });

        if (info && info.content) {
            if (key) {
                // Return specific info
                const value = info.content[key];
                if (Array.isArray(value)) {
                    // Format list items
                    const formattedList = value.join(', ');
                    info.content = `Your ${key} are: ${formattedList}`;
                } else {
                    info.content = `Your ${key} is: ${value}`;
                }
            } else {
                // Format all info for display
                const formatted = Object.entries(info.content)
                    .map(([k, v]) => {
                        if (Array.isArray(v)) {
                            return `Your ${k} are: ${v.join(', ')}`;
                        }
                        return `Your ${k} is: ${v}`;
                    })
                    .join('\n');
                info.content = formatted;
            }
        }

        res.json({ success: true, info });
    } catch (error) {
        console.error('Error getting personal info:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// basic route for index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Azure TTS voices endpoint
app.get('/api/voices', async (req, res) => {
    console.log('Fetching voices from Azure...');
    try {
        if (!process.env.SPEECH_API_KEY) {
            throw new Error('SPEECH_API_KEY is not set in the environment variables');
        }

        const response = await axios.get(
            'https://eastus.tts.speech.microsoft.com/cognitiveservices/voices/list',
            {
                headers: {
                    'Ocp-Apim-Subscription-Key': process.env.SPEECH_API_KEY
                },
                timeout: 10000 // 10 seconds timeout
            }
        );
        console.log('Voices fetched successfully. Count:', response.data.length);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching voices:', error);
        res.status(500).json({
            error: 'Failed to fetch voices',
            details: error.message
        });
    }
});

// TTS endpoint with correct environment variable name
app.post('/api/tts', async (req, res) => {
    console.log('\n=== TTS Request Started ===');
    try {
        const { text, voice } = req.body;
        console.log('Request body:', { text, voice });

        if (!text || !voice) {
            throw new Error('Missing text or voice parameter');
        }

        // Prepare SSML
        const ssml = `
            <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
                <voice name="${voice}">
                    ${text}
                </voice>
            </speak>`;

        const endpoint = `https://${process.env.SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
        console.log('Sending request to Azure...');

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': process.env.SPEECH_API_KEY,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
                'User-Agent': 'ChatApp'
            },
            body: ssml
        });

        if (!response.ok) {
            throw new Error(`Azure API error: ${response.status} ${response.statusText}`);
        }

        const audioBuffer = await response.arrayBuffer();
        console.log('Audio received, length:', audioBuffer.byteLength);

        res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.byteLength
        });

        res.end(Buffer.from(audioBuffer));

    } catch (error) {
        console.error('TTS error:', error);
        res.status(500).json({
            error: 'Text-to-speech failed',
            details: error.message
        });
    }
});

// Update the chat endpoint to include the formatted timeout message
app.get('/api/chat', (req, res) => {
    // Keep track of connection state
    let isConnected = false;
    let connectionAttempts = 0;
    const maxAttempts = 5;

    console.log('\n━━━━━━━━━━━ SSE Connection Request ━━━━━━━━━━━');
    console.log('Time:', new Date().toLocaleTimeString());
    console.log('Client:', req.headers['user-agent']);
    console.log('Session:', req.query.sessionId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial connection success message
    res.write(`data: ${JSON.stringify({ type: 'connection', status: 'established' })}\n\n`);
    isConnected = true;

    // Set up heartbeat interval with animation
    let heartPhase = 0;  // 0: empty, 1: red, 2: light red
    const heartbeatInterval = setInterval(() => {
        if (!isConnected) {
            console.log('Attempting to restore connection...');
            connectionAttempts++;
            if (connectionAttempts > maxAttempts) {
                console.log('Max reconnection attempts reached');
                clearInterval(heartbeatInterval);
                return;
            }
        }

        const hearts = ['♡', '❤️', '💗'];  // empty, red, light red
        const heart = hearts[heartPhase];
        process.stdout.write(`\r\u001b[?25l`);  // Windows-compatible cursor hide
        process.stdout.write(`💓 Heartbeat ${new Date().toLocaleTimeString()} ${heart}                \u001b[?25l`);
        heartPhase = (heartPhase + 1) % 3;  // Cycle through 3 phases

        try {
            res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
            isConnected = true;
            connectionAttempts = 0;
        } catch (error) {
            console.log('Heartbeat error:', error.message);
            isConnected = false;
        }
    }, 500);

    // Add cleanup on connection close
    req.on('close', () => {
        process.stdout.write(`\u001b[?25h`);  // Windows-compatible cursor show
        process.stdout.write('\n');
        console.log('\n━━━━━━━━━━━ SSE Connection Closed ━━━━━━━━━━━');
        console.log('Time:', new Date().toLocaleTimeString());
        console.log('Session:', req.query.sessionId);
        console.log('Final connection state:');
        console.log(JSON.stringify({ isConnected, attempts: connectionAttempts }, null, 4));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        clearInterval(heartbeatInterval);
    });
});

// Chat endpoint with hierarchical query handling
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history, model, systemPrompt, timezone, temperature, top_p } = req.body;

        console.log('Chat request received:');
        console.log(JSON.stringify({
            messageLength: message?.length,
            historyLength: history?.length,
            model: model,
            hasSystemPrompt: !!systemPrompt,
            timezone: timezone,
            temperature: temperature,
            top_p: top_p
        }, null, 4));

        // Validate required parameters
        if (!message) {
            throw new Error('Message is required');
        }

        const startTime = Date.now();

        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 1. Check for greetings
        if (chatPatterns.greetings.some(pattern => pattern.test(message.toLowerCase()))) {
            const timeOfDay = getTimeOfDay(timezone);
            const response = `Good ${timeOfDay}! How can I help you today?`;
            res.write(`data: ${JSON.stringify({ response })}\n\n`);
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
            return;
        }

        // 2. Check for time/date queries
        const isTimeQuery = chatPatterns.time.some(pattern => pattern.test(message.toLowerCase()));
        const isDateQuery = chatPatterns.date.some(pattern => pattern.test(message.toLowerCase()));
        const isDateTimeQuery = chatPatterns.dateTime.some(pattern => pattern.test(message.toLowerCase()));

        if (isTimeQuery || isDateQuery || isDateTimeQuery) {
            const now = new Date();
            const formattedTime = formatTimeDateStr(now, timezone);
            let response;

            if (isTimeQuery) {
                response = `The current time is ${formattedTime.timeStr}`;
            } else if (isDateQuery) {
                response = `Today is ${formattedTime.dateStr}`;
            } else {
                response = `It is ${formattedTime.timeStr} on ${formattedTime.dateStr}`;
            }

            const holiday = getHoliday(now);
            if (holiday) {
                response += `. ${holiday.greeting}`;
            }

            res.write(`data: ${JSON.stringify({ response })}\n\n`);
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
            return;
        }

        // 3. Handle model-specific responses
        if (model === 'gpt-4o-mini' || !model) { // Default to gpt-4o-mini if no model specified
            let finalSystemPrompt = systemPrompt || "You are a helpful assistant.";

            // Check if the message is a recipe request
            if (message.toLowerCase().includes('recipe for') || message.toLowerCase().includes('how to make')) {
                finalSystemPrompt += "\n\nIMPORTANT: When providing a recipe, do NOT capitalize the title. For example, instead of 'LIMONCELLO', write 'Limoncello'.";
            }
            
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: finalSystemPrompt },
                    ...(Array.isArray(history) ? history : []),
                    { role: "user", content: message }
                ],
                stream: true,
                temperature: typeof temperature === 'number' ? temperature : 1.0
            });

            await handleGPT4oMiniResponse(completion, res, message, startTime);
        } else {
            throw new Error(`Unsupported model: ${model}. Currently only supporting gpt-4o-mini`);
        }

    } catch (error) {
        console.error('Chat endpoint error:');
        console.error(JSON.stringify({
            name: error.name,
            message: error.message,
            stack: error.stack,
            time: new Date().toISOString()
        }, null, 4));

        // Ensure we haven't already sent headers
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Chat processing failed',
                message: error.message,
                details: error.name,
                timestamp: new Date().toISOString()
            });
        } else {
            // If headers are already sent, send error through SSE
            res.write(`data: ${JSON.stringify({
                error: 'Chat processing failed',
                message: error.message,
                details: error.name,
                timestamp: new Date().toISOString()
            })}\n\n`);
            res.end();
        }
    }
});

// Image analysis endpoint
app.post('/api/analyze-image', async (req, res) => {
    try {
        const { image, prompt, systemPrompt } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }

        // Validate image data
        if (!image.startsWith('data:image')) {
            return res.status(400).json({ error: 'Invalid image format' });
        }

        const startTime = Date.now();
        let tokenCount = 0;

        // Set up SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Process with Vision API
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt || "Analyze the following image in detail." },
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt || "What's in this image?" },
                        {
                            type: "image_url",
                            image_url: {
                                url: image,
                                detail: "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens: 500,
            stream: true,
        });

        // Stream the response
        for await (const chunk of response) {
            if (chunk.choices[0]?.delta?.content) {
                const content = chunk.choices[0].delta.content;
                tokenCount += Math.ceil(content.length / 4);

                const data = {
                    response: content,
                    metrics: {
                        duration: Date.now() - startTime,
                        promptTokens: Math.ceil(prompt?.length / 4) || 0,
                        completionTokens: tokenCount,
                        totalTokens: (Math.ceil(prompt?.length / 4) || 0) + tokenCount,
                        model: "gpt-4o",
                        startTime: startTime,
                        endTime: Date.now()
                    }
                };

                console.log('Sending chunk metrics:', data.metrics);
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            }
        }

        // Send final completion signal with metrics
        const finalData = {
            done: true,
            metrics: {
                duration: Date.now() - startTime,
                promptTokens: Math.ceil(prompt?.length / 4) || 0,
                completionTokens: tokenCount,
                totalTokens: (Math.ceil(prompt?.length / 4) || 0) + tokenCount,
                model: "gpt-4o",
                startTime: startTime,
                endTime: Date.now()
            }
        };

        console.log('Sending final metrics:', finalData.metrics);
        res.write(`data: ${JSON.stringify(finalData)}\n\n`);
        res.end();

    } catch (error) {
        console.error('Error analyzing image:', error);
        res.status(500).json({ error: 'Failed to analyze image', details: error.message });
    }
});

// Update the datetime endpoint
app.post('/api/datetime', async (req, res) => {
    const { timezone = 'America/Los_Angeles', type } = req.body;
    const now = new Date();

    try {
        const timeOptions = {
            timeZone: timezone,
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: true
        };

        const dateOptions = {
            timeZone: timezone,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };

        const currentTime = now.toLocaleTimeString('en-US', timeOptions);
        const currentDate = now.toLocaleDateString('en-US', dateOptions);

        // Check for holiday
        const holiday = getHoliday(now);

        let response;
        if (holiday) {
            // For date only
            if (type === 'date') {
                response = `Today's date is ${currentDate}. This day being a special holiday... I wish you a... ${holiday.greeting}`;
            }
            // For time only
            else if (type === 'time') {
                response = `The current time is ${currentTime} ${timezone}. By the way, today is ${holiday.name}, so ${holiday.greeting}`;
            }
            // For both date and time
            else {
                response = `Today's date is ${currentDate} and the local time is ${currentTime} ${timezone}. This day being a special holiday, I wish to say have a... ${holiday.greeting}`;
            }
        } else {
            // Regular responses without holiday
            if (type === 'date') {
                response = `Today's date is ${currentDate}`;
            } else if (type === 'time') {
                response = `The current time is ${currentTime} ${timezone}`;
            } else {
                response = `Today's date is ${currentDate} and the local time is ${currentTime} ${timezone}`;
            }
        }

        res.json({
            response: response,
            messageType: type,
            metrics: {
                model: 'datetime',
                duration: `${new Date().toLocaleTimeString()} PST`
            }
        });

    } catch (error) {
        console.error('DateTime error:', error);
        res.status(500).json({
            error: 'Failed to get date/time information',
            details: error.message
        });
    }
});


// =====================================================
// JOKE API ENDPOINTS
// =====================================================

// GET /api/jokes/list-jokes - List all jokes
app.get('/api/jokes/list-jokes', async (req, res) => {
    try {
        // Correctly parse 'showAll' which comes in as a string 'true' or 'false'
        const showAll = req.query.showAll === 'true';
        const { sessionId } = req.query;
        const collection = mongoose.connection.collection('my_jokes');

        console.log('Jokes API Request:', {
            showAll: showAll, // Log the parsed boolean
            sessionId
        });

        const query = { userId: sessionId };
        const totalJokes = await collection.countDocuments(query);
        let jokes;

        // Use the boolean 'showAll' to determine which query to run
        if (showAll) {
            jokes = await collection.find(query).toArray();
        } else {
            jokes = await collection.find(query).limit(5).toArray();
        }

        res.json({
            success: true,
            jokes: jokes,
            totalJokes: totalJokes
        });
    } catch (error) {
        console.error('Error fetching jokes:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching jokes.'
        });
    }
});

// POST /api/jokes/save-joke - Save new joke
app.post('/api/jokes/save-joke', async (req, res) => {
    try {
        const { title, content, userId } = req.body;
        console.log('Save joke request:', { title, userId });

        const joke = new Joke({
            title,
            content,
            userId,
            dateCreated: new Date()
        });

        await joke.save();
        res.json({ success: true, joke });
    } catch (error) {
        console.error('Error saving joke:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/jokes/get-joke/:title - Get specific joke by title
app.get('/api/jokes/get-joke/:title', async (req, res) => {
    try {
        const { title } = req.params;
        const { sessionId } = req.query;
        console.log('Get joke request:', { title, sessionId });

        // Normalize both the stored title and the input title for robust matching
        const normalize = t => t.toLowerCase().replace(/[^a-z0-9 ]/gi, '').trim();
        const normalizedTitle = normalize(title);
        const jokes = await Joke.find({ userId: sessionId });
        const found = jokes.find(j => normalize(j.title) === normalizedTitle);

        res.json({ success: true, joke: found || null });
    } catch (error) {
        console.error('Error retrieving joke:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/jokes/delete-joke/:id - Delete joke by id
app.delete('/api/jokes/delete-joke/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Delete joke request:', { id });

        await Joke.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting joke:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/jokes/update-joke/:id - Update joke by id (id is actually the original title)
app.put('/api/jokes/update-joke/:id', async (req, res) => {
    try {
        const originalTitle = decodeURIComponent(req.params.id);
        const { title: newTitle, content, userId } = req.body;
        
        console.log('🎭 [SERVER UPDATE] Original title from URL:', originalTitle);
        console.log('🎭 [SERVER UPDATE] New title from body:', newTitle);
        console.log('🎭 [SERVER UPDATE] Content from body:', content);
        console.log('🎭 [SERVER UPDATE] User ID:', userId);
        
        // Use MongoDB collection directly since we're not using Mongoose model properly
        const collection = mongoose.connection.collection('my_jokes');
        
        // Prepare update object - only include fields that are provided
        const updateFields = {};
        if (content !== undefined) updateFields.content = content;
        if (newTitle !== undefined) updateFields.title = newTitle;
        
        console.log('🎭 [SERVER UPDATE] Update fields object:', updateFields);
        
        // First, let's find the joke to see what we're updating
        const existingJoke = await collection.findOne({ 
            title: new RegExp(`^${originalTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), 
            userId 
        });
        console.log('🎭 [SERVER UPDATE] Found existing joke:', existingJoke);
        
        if (!existingJoke) {
            console.log('🎭 [SERVER UPDATE] No joke found to update');
            return res.status(404).json({ 
                success: false, 
                error: 'Joke not found' 
            });
        }
        
        // Update the joke
        const result = await collection.findOneAndUpdate(
            { _id: existingJoke._id },
            { $set: updateFields },
            { returnDocument: 'after' }
        );
        
        console.log('🎭 [SERVER UPDATE] Updated joke result:', result);
        
        if (!result.value) {
            return res.status(404).json({
                success: false,
                error: 'Failed to update joke'
            });
        }

        return res.json({
            success: true,
            joke: result.value
        });
    } catch (error) {
        console.error('🎭 [SERVER UPDATE] Error updating joke:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// GET /api/jokes/search-jokes - Search jokes
app.get('/api/jokes/search-jokes', async (req, res) => {
    try {
        const { term } = req.query;
        const jokes = await Joke.find({
            $or: [
                { title: new RegExp(term, 'i') },
                { content: new RegExp(term, 'i') }
            ]
        });
        res.json({ success: true, jokes });
    } catch (error) {
        console.error('Error searching jokes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/jokes/migrate - Migrate jokes to new format
app.post('/api/jokes/migrate', async (req, res) => {
    try {
        const { sessionId, oldFormat } = req.body;
        const collection = mongoose.connection.collection('my_jokes');

        // Find jokes for this session
        const jokes = await collection.find({
            userId: sessionId,
            format: oldFormat
        }).toArray();

        // Update each joke to new format
        const updates = jokes.map(joke =>
            collection.updateOne(
                { _id: joke._id },
                {
                    $set: {
                        format: 'v20.0.1',
                        updatedAt: new Date()
                    }
                }
            )
        );

        await Promise.all(updates);

        res.json({
            success: true,
            migrated: updates.length
        });
    } catch (error) {
        console.error('Error migrating jokes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// =====================================================
// JOKES DEBUG ENDPOINTS
// =====================================================

// Add this temporary debug endpoint
app.get('/api/debug/jokes', async (req, res) => {
    try {
        const collection = mongoose.connection.collection('my_jokes');
        const allJokes = await collection.find({}).toArray();

        console.log('All jokes in database:', {
            count: allJokes.length,
            jokes: allJokes
        });

        res.json({
            success: true,
            count: allJokes.length,
            jokes: allJokes
        });
    } catch (error) {
        console.error('Error fetching all jokes:', error);
        res.status(500).json({ error: error.message });
    }
});


// =====================================================
// MODEL HANDLERS
// =====================================================

// === Robust Recipe Formatter ===
function formatRecipeText(text) {
    if (!text) return text;
    // Insert line breaks before Ingredients: and Instructions:
    let processed = text.replace(/(Ingredients:)/i, '\n$1')
                        .replace(/(Instructions:)/i, '\n$1');
    // Convert ALL CAPS title to Title Case if it appears at the start
    processed = processed.replace(/^([A-Z ]{4,})\n/, (match, p1) => {
        return p1.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) + '\n';
    });
    // Fallback: If only one line after splitting, try splitting by period
    let lines = processed.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 1) {
        lines = processed.split('. ').map(l => l.trim()).filter(l => l);
        processed = lines.join('\n');
    }
    return processed;
}

// GPT-4o-mini model handler
async function handleGPT4oMiniResponse(response, res, message, startTime) {
    console.log('Starting GPT-4o-mini response handling');
    let tokenCount = 0;
    let fullResponse = '';
    let currentParagraph = '';
    let lastSentContent = '';
    let isEnded = false;
    let isRecipeRequest = message.toLowerCase().includes('recipe for') || message.toLowerCase().includes('how to make');
    try {
        for await (const chunk of response) {
            if (isEnded) break;
            if (!chunk || !chunk.choices || !Array.isArray(chunk.choices) || chunk.choices.length === 0) {
                continue;
            }
            if (chunk.choices[0]?.delta?.content) {
                const content = chunk.choices[0].delta.content;
                fullResponse += content;
                currentParagraph += content;
                tokenCount += Math.ceil(content.length / 4);
                if (content.includes('[/P1]') || content.includes('[/P2]') || content.includes('[/P3]') || content.includes('[/IMG]') || content.includes('\n\n')) {
                    let cleanParagraph = currentParagraph.replace(/\[P1\]|\[P2\]|\[P3\]|\[IMG\]|\[\/P1\]|\[\/P2\]|\[\/P3\]|\[\/IMG\]/g, '').trim();
                    if (cleanParagraph && cleanParagraph !== lastSentContent) {
                        // If this is a recipe, format it before sending
                        if (isRecipeRequest) {
                            cleanParagraph = formatRecipeText(cleanParagraph);
                        }
                        if (!res.writableEnded) {
                            res.write(`data: ${JSON.stringify({
                                response: cleanParagraph + '\n\n',
                                tokenCount: tokenCount,
                                metrics: {
                                    duration: Date.now() - startTime,
                                    promptTokens: Math.ceil(fullResponse.length / 4),
                                    completionTokens: tokenCount,
                                    totalTokens: Math.ceil(fullResponse.length / 4) + tokenCount,
                                    model: 'gpt-4o-mini'
                                }
                            })}\n\n`);
                        }
                        lastSentContent = cleanParagraph;
                        currentParagraph = '';
                    }
                }
            }
        }
        // Send any remaining content and final metrics
        if (currentParagraph.trim() && currentParagraph.trim() !== lastSentContent) {
            let toSend = currentParagraph.trim();
            if (isRecipeRequest) {
                toSend = formatRecipeText(toSend);
            }
            if (!res.writableEnded) {
                res.write(`data: ${JSON.stringify({
                    response: toSend,
                    tokenCount: tokenCount,
                    metrics: {
                        duration: Date.now() - startTime,
                        promptTokens: Math.ceil(fullResponse.length / 4),
                        completionTokens: tokenCount,
                        totalTokens: Math.ceil(fullResponse.length / 4) + tokenCount,
                        model: 'gpt-4o-mini'
                    }
                })}\n\n`);
            }
        }
        // Send final completion signal
        if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({
                done: true,
                complete: true,
                response: null,
                metrics: {
                    duration: Date.now() - startTime,
                    promptTokens: Math.ceil(message.length / 4),
                    completionTokens: tokenCount,
                    totalTokens: Math.ceil(message.length / 4) + tokenCount,
                    model: 'gpt-4o-mini'
                }
            })}\n\n`);
            res.end();
            isEnded = true;
        }
    } catch (error) {
        console.error('Error in handleGPT4oMiniResponse:', error);
        if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({
                error: error.message,
                done: true,
                complete: true
            })}\n\n`);
            res.end();
        }
        throw error;
    }
}

// Phi-3-mini-4k-instruct model handler


async function handlePhi3Mini4kInstructResponse(completion, res, message, startTime) {
    if (!completion) {
        throw new Error('No completion provided to Phi-3 handler');
    }

    try {
        let tokenCount = 0;
        let fullResponse = '';

        for await (const chunk of completion) {
            if (chunk.choices[0]?.delta?.content) {
                const content = chunk.choices[0].delta.content;
                fullResponse += content;
                tokenCount += Math.ceil(content.length / 4);

                // Send chunk with metrics
                res.write(`data: ${JSON.stringify({
                    response: content,
                    metrics: {
                        duration: Date.now() - startTime,
                        promptTokens: Math.ceil(message.length / 4),
                        completionTokens: tokenCount,
                        totalTokens: Math.ceil(message.length / 4) + tokenCount,
                        model: 'phi-3-mini-4k-instruct'
                    }
                })}\n\n`);
            }
        }

        // Send completion signal
        res.write(`data: ${JSON.stringify({
            done: true,
            metrics: {
                duration: Date.now() - startTime,
                promptTokens: Math.ceil(message.length / 4),
                completionTokens: tokenCount,
                totalTokens: Math.ceil(message.length / 4) + tokenCount,
                model: 'phi-3-mini-4k-instruct'
            }
        })}\n\n`);
        res.end();

    } catch (error) {
        console.error('Error in Phi-3 handler:', error);
        throw error; // Let the main error handler deal with it
    }
}


// =====================================================
// SEARCH ENDPOINTS
// =====================================================

// =====================================================
// GOOGLE IMAGE SEARCH ENDPOINT
// =====================================================

// Google Image Search endpoint
app.get('/api/google-image-search', async (req, res) => {
    try {
        const searchQuery = req.query.q;
        if (!searchQuery) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        // Log the exact query being sent to Google CSE
        console.log('Google Image Search query:', searchQuery);

        const start = parseInt(req.query.start, 10) || 1;
        const response = await axios.get(`https://www.googleapis.com/customsearch/v1`, {
            params: {
                key: process.env.GOOGLE_API_KEY,
                cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
                q: searchQuery,
                searchType: 'image',
                num: 10,  // 10 images per request
                start // <-- support pagination
            }
        });

        const images = response.data.items.map(item => ({
            link: item.link,
            title: item.title,
            thumbnail: item.image?.thumbnailLink,
            contextLink: item.image?.contextLink
        }));

        res.json({ images });
    } catch (error) {
        console.error('Error in Google Image Search:', error);
        res.status(500).json({ error: 'Failed to fetch images', details: error.message });
    }
});


// =====================================================
// BING SEARCH ENDPOINT
// =====================================================

// Update the BING_SEARCH_PROMPT for better formatting guidance
const BING_SEARCH_PROMPT = `
Format search results with consistent spacing and clear separation:

1. Title line: "# Web Results for [query]"
2. Each result:
   - Numbered item (1., 2., etc.)
   - Title on first line
   - Content indented with 3 spaces
   - Blank line after content
   - Published date indented with 3 spaces
   - Separator line (---)
   - Double newline between results
`;

// Add function to extract search intent using the prompt
async function extractSearchIntent(query) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `${BING_SEARCH_PROMPT}\n\nExtract the precise search intent from user queries.\nMaintain important qualifiers like 'latest', 'current', or 'recent'.\nRemove only filler words and search commands.\nExample: 'show me a web search for latest advances in AI' → 'latest advances in AI'\nExample: 'tell me about current developments in quantum computing' → 'current developments in quantum computing'`
                },
                {
                    role: "user",
                    content: `Extract the core search topic from: "${query}"`
                }
            ],
            max_tokens: 50,
            temperature: 0
        });
        const cleaned = completion.choices[0].message.content.trim();
        console.log('extractSearchIntent:', { original: query, cleaned });
        return cleaned;
    } catch (error) {
        console.error('Error extracting search intent:', error);
        return cleanSearchQuery(query);  // Fallback to basic cleaning
    }
}

// Update the Bing Search endpoint to use extractSearchIntent
app.post('/api/bing-search', async (req, res) => {
    const requestStartTime = Date.now();  // Track request start time
    const { query } = req.body;

    try {
        const cleanQuery = await extractSearchIntent(query);
        const bingApiKey = process.env.BING_SEARCH_V7_SUBSCRIPTION_KEY || process.env.BING_SUBSCRIPTION_KEY;
        const bingApiUrl = process.env.BING_SEARCH_URL || 'https://api.bing.microsoft.com/v7.0/search';
        const response = await axios.get(bingApiUrl, {
            headers: {
                'Ocp-Apim-Subscription-Key': bingApiKey
            },
            params: {
                q: cleanQuery,
                count: 5,
                responseFilter: ['Webpages', 'News'],
                mkt: 'en-US'
            }
        });

        // Add debug logging for the full Bing API response
        console.log('Bing API response.data:', JSON.stringify(response.data, null, 2));

        let formattedResults = '';

        if (response.data.webPages?.value) {
            formattedResults += `<h2>Web Results for "${cleanQuery}"</h2>\n<ol class='search-results-list'>`;
            response.data.webPages.value.forEach((result, index) => {
                // Extract domain name for source
                const sourceDomain = new URL(result.url).hostname.replace('www.', '');

                formattedResults += `
<li class='search-result-item'>
    <a href="${result.url}" target="_blank">${result.name}</a><br>
    <span>${result.snippet}</span>
    <div class="search-metadata">
        <div class="metadata-item" data-label="Source:">${sourceDomain}</div>
        <div class="metadata-item" data-label="URL:"><a href="${result.url}" target="_blank">${result.url}</a></div>
        <div class="metadata-item" data-label="Last Updated:">${new Date(result.dateLastCrawled).toLocaleDateString()}</div>
    </div>
</li>`;
            });
            formattedResults += `</ol>`;
        }

        if (response.data.news?.value) {
            formattedResults += `<h2>News Results for "${cleanQuery}"</h2>\n<ol class='news-results-list'>`;
            response.data.news.value.forEach((result, index) => {
                formattedResults += `
<li class='news-result-item'>
    <a href="${result.url}" target="_blank">${result.name}</a><br>
    <span>${result.description}</span>
    <div class="search-metadata">
        <div class="metadata-item" data-label="Source:">${result.provider[0]?.name || 'Unknown'}</div>
        <div class="metadata-item" data-label="URL:"><a href="${result.url}" target="_blank">${result.url}</a></div>
        <div class="metadata-item" data-label="Published:">${new Date(result.datePublished).toLocaleDateString()}</div>
    </div>
</li>`;
            });
            formattedResults += `</ol>`;
        }

        // Calculate duration at the end
        const requestDuration = (Date.now() - requestStartTime) / 1000;

        res.json({
            response: formattedResults,
            metrics: {
                model: 'bing-search',
                duration: `${requestDuration.toFixed(2)}s`,
                totalTokens: formattedResults.length,
                startTime: requestStartTime,
                endTime: Date.now()
            }
        });

    } catch (error) {
        const requestDuration = (Date.now() - requestStartTime) / 1000;
        console.error('Bing Search error:', error);
        res.status(500).json({
            error: 'Failed to perform Bing search',
            metrics: {
                model: 'bing-search',
                duration: `${requestDuration.toFixed(2)}s`,
                startTime: requestStartTime,
                endTime: Date.now()
            }
        });
    }
});



// =====================================================
// PERSONAL INFO ENDPOINTS
// =====================================================

// Session configuration
const PERSISTENT_SESSION = {
    id: 'persistent-storage-001',
    version: 'v1',
    type: 'global',
    created: new Date().toISOString()
};

// Session validation helper
function isValidSessionId(sid) {
    const parts = sid.split('-');
    return (
        parts.length === 3 &&
        ['global', 'user', 'admin'].includes(parts[0]) &&
        /^v\d+$/.test(parts[2])
    );
}


// =====================================================
// RECIPE ENDPOINT
// =====================================================

// Add new recipe endpoint
app.post('/api/recipe', async (req, res) => {
    try {
        const { text } = req.body;

        // Extract recipe name - simpler pattern
        const recipeMatch = text.match(/^(.*?)(?=\s*Here is)/is);

        if (recipeMatch) {
            let recipeName = recipeMatch[1].trim();

            // Convert to Title Case
            recipeName = recipeName.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());

            console.log('Recipe name extracted and formatted:', recipeName);

            // Send back formatted recipe data
            res.json({
                success: true,
                recipe: {
                    name: recipeName,
                    text: text
                }
            });
        } else {
            // Try alternate pattern if first one fails
            const altMatch = text.match(/^([A-Z][A-Z\s]+)/);
            if (altMatch) {
                const recipeName = altMatch[1].replace(/\s+/g, ' ').trim();
                console.log('Recipe name extracted (alt):', recipeName);
                res.json({
                    success: true,
                    recipe: {
                        name: recipeName,
                        text: text
                    }
                });
                return;
            }
            console.error('Failed to match recipe pattern in text:', text.substring(0, 100));
            res.status(400).json({
                success: false,
                error: 'Could not parse recipe format'
            });
        }
    } catch (error) {
        console.error('Error in recipe endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process recipe'
        });
    }
});

// =====================================================
// MONGO DB CONNECTION AND MODELS
// =====================================================

// Import models
const PersonalInfo = require('./models/PersonalInfo');
const Joke = require('./models/Joke');
const YouTubeSearch = require('./models/YouTubeSearch');

// Single MongoDB connection
let retryCount = 0;
const maxRetries = 3;

async function connectWithRetry() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 30000, // 30 seconds
            socketTimeoutMS: 45000, // 45 seconds
            maxPoolSize: 10,
            minPoolSize: 2,
            maxIdleTimeMS: 30000
        });
        console.log('\x1b[32m%s\x1b[0m', 'MongoDB connect with Retry on HOST and PORT successful:');
        console.log('\x1b[32m%s\x1b[0m', JSON.stringify({
            host: mongoose.connection.host || 'Atlas Cluster',
            port: mongoose.connection.port || 'SRV',
            name: mongoose.connection.name || mongoose.connection.db?.databaseName || 'Unknown'
        }, null, 4));
        retryCount = 0; // Reset retry count on successful connection
    } catch (err) {
        console.error('MongoDB connection error:', {
            error: err.message,
            attempt: retryCount + 1,
            maxRetries
        });

        if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying connection in 5 seconds... (Attempt ${retryCount}/${maxRetries})`);
            setTimeout(connectWithRetry, 5000);
        }
    }
}

// Initial connection
connectWithRetry();

// Set up conversation collection reference after connection
mongoose.connection.once('open', () => {
    conversationCollection = mongoose.connection.collection('conversation_history');
    console.log('[DEBUG - MONGO] Conversation collection reference set');
});

// Handle disconnection
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected:', {
        status: 'disconnected',
        time: new Date().toISOString()
    });
    if (retryCount < maxRetries) {
        connectWithRetry();
    }
});


// =====================================================
// MONGO DB TEST ROUTES
// =====================================================

// Add test route for database connection
app.get('/api/db-test', async (req, res) => {
    try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        const dbStats = await mongoose.connection.db.stats();
        res.json({
            connected: mongoose.connection.readyState === 1,
            database: mongoose.connection.name,
            collections: collections.map(c => c.name),
            stats: dbStats
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// Add cleanup route (only for development) for MongoDB collection to CLEAR the database
app.post('/api/cleanup', async (req, res) => {
    try {
        // Drop the collection for conversation history
        await mongoose.connection.collection('conversation_history').deleteMany({});

        console.log('Database cleanup completed:', {
            database: mongoose.connection.name,
            collections: ['conversation_history'],
            status: 'cleared'
        });

        res.json({
            success: true,
            message: 'All collections cleared',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add debug endpoint to check database state
app.get('/api/debug/db-state', async (req, res) => {
    try {
        const dbState = {
            connection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            collections: await mongoose.connection.db.listCollections().toArray(),
            jokeCount: await Joke.countDocuments(),
            recentJokes: await Joke.find().sort({dateCreated: -1}).limit(5)
        };
        res.json(dbState);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add this test joke endpoint
app.post('/api/debug/add-test-joke', async (req, res) => {
    try {
        const testJoke = new Joke({
            title: 'Test Joke',
            content: 'Why did the programmer quit his job? Because he didn\'t get arrays!',
            userId: req.query.userId || 'test-user',
            dateCreated: new Date()
        });

        await testJoke.save();
        res.json({ success: true, joke: testJoke });
    } catch (error) {
        console.error('Error adding test joke:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// =====================================================
// YOUTUBE SEARCH PERSISTENCE ENDPOINTS
// =====================================================

// Save YouTube search query to database
app.post('/api/youtube/save-search', async (req, res) => {
    try {
        let { query, userId, displayName, totalPages, videoCount, cacheKeys, searchMetadata } = req.body;
        query = (query || '').trim().toLowerCase();

        console.log('💾 [YOUTUBE-DB] Saving search query:', { query, userId, displayName });

        // Check if query already exists for this user
        let existingSearch = await YouTubeSearch.findOne({ userId, query });

        if (existingSearch) {
            // Update existing search
            existingSearch.lastSearched = new Date();
            existingSearch.totalPages = totalPages || existingSearch.totalPages;
            existingSearch.videoCount = videoCount || existingSearch.videoCount;
            existingSearch.cacheKeys = cacheKeys || existingSearch.cacheKeys;
            existingSearch.searchMetadata = { ...existingSearch.searchMetadata, ...searchMetadata };
            
            await existingSearch.save();
            
            console.log('💾 [YOUTUBE-DB] Updated existing search:', existingSearch._id);
            res.json({ success: true, message: 'Search updated', search: existingSearch });
        } else {
            // Create new search entry
            const newSearch = new YouTubeSearch({
                query,
                userId,
                displayName: displayName || query,
                totalPages: totalPages || 1,
                videoCount: videoCount || 0,
                cacheKeys: cacheKeys || [],
                searchMetadata: searchMetadata || {},
                dateCreated: new Date(), // Ensure always set
                lastSearched: new Date() // Ensure always set
            });

            await newSearch.save();
            
            console.log('💾 [YOUTUBE-DB] Saved new search:', newSearch._id);
            res.json({ success: true, message: 'Search saved', search: newSearch });
        }
    } catch (error) {
        console.error('💾 [YOUTUBE-DB] Error saving search:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get saved YouTube searches for a user
app.get('/api/youtube/saved-searches', async (req, res) => {
    try {
        const { userId } = req.query;

        console.log('📚 [YOUTUBE-DB] Retrieving saved searches for user:', userId);

        // const savedSearches = await YouTubeSearch.find({ userId })
        const savedSearches = await YouTubeSearch.find({})
            .sort({ lastSearched: -1 })
            .limit(50); // Limit to 50 most recent searches

        console.log('📚 [YOUTUBE-DB] Found', savedSearches.length, 'saved searches');

        res.json({ 
            success: true, 
            searches: savedSearches.map(search => ({
                _id: search._id,
                query: search.query,
                displayName: search.displayName,
                totalPages: search.totalPages,
                videoCount: search.videoCount,
                lastSearched: search.lastSearched,
                dateCreated: search.dateCreated,
                searchMetadata: search.searchMetadata
            }))
        });
    } catch (error) {
        console.error('📚 [YOUTUBE-DB] Error retrieving searches:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete saved YouTube search
app.delete('/api/youtube/saved-searches/:searchId', async (req, res) => {
    try {
        const { searchId } = req.params;
        const { userId } = req.query;

        console.log('🗑️ [YOUTUBE-DB] Deleting search:', searchId, 'for user:', userId);

        const deleted = await YouTubeSearch.findOneAndDelete({ 
            _id: searchId, 
            userId 
        });

        if (deleted) {
            console.log('🗑️ [YOUTUBE-DB] Successfully deleted search:', deleted.query);
            res.json({ success: true, message: 'Search deleted' });
        } else {
            res.status(404).json({ success: false, error: 'Search not found' });
        }
    } catch (error) {
        console.error('🗑️ [YOUTUBE-DB] Error deleting search:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check if a query is saved in database
app.post('/api/youtube/check-saved', async (req, res) => {
    try {
        let { queries, userId } = req.body;
        queries = (queries || []).map(q => (q || '').trim().toLowerCase());
        console.log('🔍 [YOUTUBE-DB] Checking saved status for', queries.length, 'queries for user:', userId);

        // Use the Mongoose model to find saved queries for this user
        const savedQueries = await YouTubeSearch.find({ 
            userId, 
            query: { $in: queries } 
        }).select('query');

        const savedQuerySet = new Set(savedQueries.map(s => s.query));
        const results = {};
        queries.forEach(query => {
            results[query] = savedQuerySet.has(query);
        });
        res.json({ success: true, results });
    } catch (error) {
        console.error('🔍 [YOUTUBE-DB] Error checking saved status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// =====================================================
// YOUTUBE API ENDPOINTS
// =====================================================

// YouTube API Cache and Optimization System
const youtubeCache = new NodeCache({ 
    stdTTL: 3600, // 1 hour cache
    checkperiod: 600, // Check for expired keys every 10 minutes
    maxKeys: 1000 // Limit cache size
});

// Quota tracking with persistence
const quotaFilePath = path.join(__dirname, 'quota-tracking.json');

let dailyQuotaUsed = 0;
let quotaResetTime = new Date();
quotaResetTime.setUTCHours(8, 0, 0, 0); // Reset at midnight Pacific Time (8 AM UTC)
if (quotaResetTime <= new Date()) {
    quotaResetTime.setDate(quotaResetTime.getDate() + 1);
}

// Load persistent quota data on startup
function loadQuotaData() {
    try {
        if (fs.existsSync(quotaFilePath)) {
            const data = JSON.parse(fs.readFileSync(quotaFilePath, 'utf8'));
            const savedResetTime = new Date(data.resetTime);
            
            // If the saved reset time hasn't passed yet, restore the usage
            if (savedResetTime > new Date()) {
                dailyQuotaUsed = data.used || 0;
                quotaResetTime = savedResetTime;
                console.log(`📊 [QUOTA] Restored from file: ${dailyQuotaUsed}/10000 used, resets at ${quotaResetTime.toISOString()}`);
            } else {
                console.log(`📊 [QUOTA] Quota file found but expired, starting fresh`);
                saveQuotaData(); // Save current state
            }
        } else {
            console.log(`📊 [QUOTA] No quota file found, starting fresh`);
            saveQuotaData(); // Create initial file
        }
    } catch (error) {
        console.error('📊 [QUOTA] Error loading quota data:', error);
        saveQuotaData(); // Create fresh file on error
    }
}

// Save quota data to file
function saveQuotaData() {
    try {
        const data = {
            used: dailyQuotaUsed,
            resetTime: quotaResetTime.toISOString(),
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(quotaFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('📊 [QUOTA] Error saving quota data:', error);
    }
}

// Load quota data on startup
loadQuotaData();

// Request deduplication - prevent multiple identical requests
const pendingRequests = new Map();

function resetQuotaIfNeeded() {
    if (new Date() >= quotaResetTime) {
        dailyQuotaUsed = 0;
        quotaResetTime.setDate(quotaResetTime.getDate() + 1);
        console.log('📊 [QUOTA] Daily quota reset. Current usage:', dailyQuotaUsed);
        saveQuotaData(); // Persist the reset
    }
}

function trackQuotaUsage(cost, operation = 'unknown') {
    resetQuotaIfNeeded();
    dailyQuotaUsed += cost;
    const percentage = Math.round((dailyQuotaUsed / 10000) * 100);
    console.log(`💰 [QUOTA-TRACK] +${cost} for ${operation} | Total: ${dailyQuotaUsed}/10000 (${percentage}%)`);
    saveQuotaData(); // Persist the updated quota
}

function getRemainingQuota() {
    resetQuotaIfNeeded();
    return 10000 - dailyQuotaUsed;
}

function generateCacheKey(query, type, page, pageToken) {
    return `yt_${type}_${query.toLowerCase().replace(/\s+/g, '_')}_p${page}_${pageToken || 'none'}`;
}

// Save YouTube search results to MongoDB for future cache restoration
// PageToken management functions
async function savePageToken(query, searchType, page, pageToken, nextPageToken = null) {
    try {
        await PageToken.findOneAndUpdate(
            { query, searchType, page },
            { 
                pageToken, 
                nextPageToken,
                lastAccessed: new Date()
            },
            { upsert: true, new: true }
        );
        console.log(`🔑 [PAGETOKEN] Saved pageToken for ${searchType} "${query}" page ${page}`);
    } catch (error) {
        console.error(`🔑 [PAGETOKEN] Failed to save pageToken:`, error);
    }
}

async function getPageToken(query, searchType, page) {
    try {
        const tokenDoc = await PageToken.findOne({ query, searchType, page });
        if (tokenDoc) {
            // Update last accessed time
            tokenDoc.lastAccessed = new Date();
            await tokenDoc.save();
            console.log(`🔑 [PAGETOKEN] Retrieved pageToken for ${searchType} "${query}" page ${page}`);
            return tokenDoc.pageToken;
        }
        return null;
    } catch (error) {
        console.error(`🔑 [PAGETOKEN] Failed to retrieve pageToken:`, error);
        return null;
    }
}

async function getNextPageToken(query, searchType, page) {
    try {
        const tokenDoc = await PageToken.findOne({ query, searchType, page });
        if (tokenDoc && tokenDoc.nextPageToken) {
            console.log(`🔑 [PAGETOKEN] Retrieved nextPageToken for ${searchType} "${query}" page ${page}`);
            return tokenDoc.nextPageToken;
        }
        return null;
    } catch (error) {
        console.error(`🔑 [PAGETOKEN] Failed to retrieve nextPageToken:`, error);
        return null;
    }
}

async function saveSearchResultToMongoDB(query, page, videos, resultType, nextPageToken = null, quotaUsed = 101) {
    try {
        // Create the update data without _id field to avoid MongoDB immutable field error
        const updateData = {
            query,
            page,
            videos,
            resultType,
            nextPageToken,
            totalResults: videos.length,
            apiQuotaUsed: quotaUsed,
            timestamp: new Date()
        };

        // Use upsert to replace existing results for same query+page
        await YouTubeSearchResult.findOneAndUpdate(
            { query, page },
            { $set: updateData },
            { upsert: true, new: true }
        );

        console.log(`💾 [MONGODB] Saved ${videos.length} videos for "${query}" page ${page} to database`);
    } catch (error) {
        console.error('❌ [MONGODB] Error saving search result:', error);
    }
}

async function getCachedOrFetch(cacheKey, fetchFunction, quotaCost) {
    // Check cache first
    const cached = youtubeCache.get(cacheKey);
    if (cached) {
        console.log('✓ Cache HIT for:', cacheKey);
        return { ...cached, fromCache: true };
    }

    // Check if we have enough quota
    if (getRemainingQuota() < quotaCost) {
        throw new Error(`Quota exceeded: ${dailyQuotaUsed}/10000 calls used. Resets at ${quotaResetTime.toISOString()}`);
    }
    
    // EMERGENCY: Block API calls only when very close to limit (>90% = 9000 quota)
    if (dailyQuotaUsed > 9000) {
        console.warn(`🚨 [QUOTA-EMERGENCY] Blocking API call - usage critically high: ${dailyQuotaUsed}/10000`);
        throw new Error(`Emergency quota conservation: ${dailyQuotaUsed}/10000 calls used. Daily limit nearly reached.`);
    }
    
    // WARNING: Log warnings at 80% and 90% but don't block
    if (dailyQuotaUsed > 8000 && dailyQuotaUsed <= 9000) {
        console.warn(`⚠️ [QUOTA-WARNING] High usage: ${dailyQuotaUsed}/10000 (${Math.round(dailyQuotaUsed/100)}%)`);
    }

    // Check for pending identical request (deduplication)
    if (pendingRequests.has(cacheKey)) {
        console.log('⏳ Deduplicating request:', cacheKey);
        return await pendingRequests.get(cacheKey);
    }

    // Execute request
    const promise = fetchFunction();
    pendingRequests.set(cacheKey, promise);

    try {
        const result = await promise;
        trackQuotaUsage(quotaCost, `API-${cacheKey}`);
        
        // Cache successful results
        if (result && result.success) {
            youtubeCache.set(cacheKey, result);
            console.log('✓ Cached result for:', cacheKey);
        }
        
        return result;
    } catch (error) {
        console.error('❌ [CACHE-FETCH] YouTube API request failed for key:', cacheKey);
        console.error('❌ [CACHE-FETCH] Error details:', {
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines of stack
            code: error.code,
            status: error.status,
            statusText: error.statusText,
            quotaUsed: dailyQuotaUsed,
            quotaCost: quotaCost
        });
        throw error; // Propagate the actual error instead of returning null
    } finally {
        pendingRequests.delete(cacheKey);
    }
}

app.post('/api/youtube/search', async (req, res) => {
    const { query = '', type = 'search', page = 1 } = req.body;
    console.log('YouTube Search POST body:', req.body);
    console.log('Query received:', query, '| Type received:', type, '| Page:', page);

    // Real YouTube API with caching and optimization
    if (!process.env.GOOGLE_API_KEY) {
        console.log('⚠️ No API key available');
        return res.status(500).json({ 
            success: false, 
            error: 'YouTube API key not configured',
            videos: [],
            isMock: false
        });
    }

    const cacheKey = generateCacheKey(query, type, page, req.body.pageToken);
    
    if (type === 'play') {
        // SINGLE video search with optimization
        try {
            const result = await getCachedOrFetch(cacheKey, async () => {
                console.log('🔍 Real API: Searching for single video:', query);
                
                const searchResponse = await youtube.search.list({
                    part: ['snippet'],
                    q: query,
                    maxResults: 1,
                    type: 'video'
                });

                if (!searchResponse?.data?.items?.length) {
                    return { success: false, videos: [], error: 'No videos found for this query' };
                }

                const videoIds = searchResponse.data.items.map(item => item.id.videoId);
                
                // Get full video details in single batch call
                const videoDetails = await youtube.videos.list({
                    part: ['snippet', 'contentDetails'],
                    id: videoIds.join(',')
                });

                const videos = videoDetails.data.items.map(video => ({
                    id: video.id,
                    title: video.snippet.title,
                    description: video.snippet.description,
                    channelTitle: video.snippet.channelTitle,
                    publishedAt: video.snippet.publishedAt,
                    duration: video.contentDetails.duration,
                    thumbnail: video.snippet.thumbnails?.high?.url || ''
                }));

                // Save to MongoDB for future cache restoration
                await saveSearchResultToMongoDB(query, 1, videos, 'SINGLE', null, 101);

                return { 
                    success: true, 
                    videos, 
                    resultType: 'SINGLE', 
                    isMock: false 
                };
            }, 101); // search.list (100) + videos.list (1)

            return res.json({
                ...result,
                quota: {
                    used: dailyQuotaUsed,
                    limit: 10000
                }
            });
        } catch (error) {
            console.error('YouTube API error for single video search:', error);
            
            // Check for quota exceeded error
            if (error.message && error.message.includes('quota') && error.message.includes('exceeded')) {
                console.error('🚫 [QUOTA-EXCEEDED] YouTube API quota limit reached');
                return res.status(403).json({ 
                    success: false, 
                    error: 'YouTube API quota limit reached',
                    quotaExceeded: true,
                    details: error.message,
                    videos: [],
                    isMock: false
                });
            }
            
            return res.status(500).json({ 
                success: false, 
                error: 'YouTube API request failed',
                details: error.message,
                videos: [],
                isMock: false
            });
        }
    }
    
    if (type === 'search') {
        // MULTI video search with optimization
        const perPage = 12;
        const pageNum = Math.max(1, Number(page) || 1);
        
        // Declare quotaCostMultiplier outside the callback so it's accessible
        let quotaCostMultiplier = 1; // Track actual API calls made
        
        try {
            const result = await getCachedOrFetch(cacheKey, async () => {
                console.log('🔍 Real API: Multi-search:', query, 'page:', pageNum);
                
                // QUOTA-EFFICIENT PAGINATION: Check for cached pageToken from previous page
                let pageToken = null;
                
                if (pageNum > 1) {
                    // Check if we have the pageToken from the previous page cached
                    const prevPageCacheKey = generateCacheKey(query, type, pageNum - 1);
                    const prevPageCache = youtubeCache.get(prevPageCacheKey);
                    
                    if (prevPageCache && prevPageCache.nextPageToken) {
                        // ✅ EFFICIENT: Use cached pageToken from previous page
                        pageToken = prevPageCache.nextPageToken;
                        console.log(`💰 [QUOTA-EFFICIENT] Using cached pageToken from page ${pageNum - 1} for page ${pageNum}`);
                    } else {
                        // ⚠️ EXPENSIVE: Need to build up to this page
                        console.log(`💸 [QUOTA-EXPENSIVE] No cached pageToken found, building up to page ${pageNum}...`);
                        let currentPage = 1;
                        let response = await youtube.search.list({
                            part: ['snippet'],
                            q: query,
                            type: 'video',
                            maxResults: perPage,
                            pageToken: null
                        });
                        quotaCostMultiplier++;
                        
                        while (currentPage < pageNum && response.data.nextPageToken) {
                            pageToken = response.data.nextPageToken;
                            response = await youtube.search.list({
                                part: ['snippet'],
                                q: query,
                                type: 'video',
                                maxResults: perPage,
                                pageToken
                            });
                            quotaCostMultiplier++;
                            currentPage++;
                        }
                        console.log(`💸 [QUOTA-EXPENSIVE] Channel: Made ${quotaCostMultiplier} API calls to reach page ${pageNum}`);
                    }
                }
                
                console.log('🔍 [YOUTUBE-API] Making search request with params:', {
                    part: ['snippet'],
                    q: query,
                    maxResults: perPage,
                    type: 'video',
                    pageToken: pageToken
                });
                
                const searchResponse = await youtube.search.list({
                    part: ['snippet'],
                    q: query,
                    maxResults: perPage,
                    type: 'video',
                    pageToken: pageToken
                });

                console.log('🔍 [YOUTUBE-API] Search response received:', {
                    hasData: !!searchResponse?.data,
                    hasItems: !!searchResponse?.data?.items,
                    itemsCount: searchResponse?.data?.items?.length || 0,
                    nextPageToken: !!searchResponse?.data?.nextPageToken
                });

                if (!searchResponse?.data?.items?.length) {
                    return { success: false, videos: [], error: 'No videos found for this query' };
                }

                const videoIds = searchResponse.data.items.map(item => item.id.videoId);
                console.log('🔍 [YOUTUBE-API] Video IDs extracted:', videoIds.length, 'videos');
                
                // Get full video details in single batch call  
                const videoDetails = await youtube.videos.list({
                    part: ['snippet', 'contentDetails'],
                    id: videoIds.join(',')
                });

                console.log('🔍 [YOUTUBE-API] Video details response received:', {
                    hasData: !!videoDetails?.data,
                    hasItems: !!videoDetails?.data?.items,
                    itemsCount: videoDetails?.data?.items?.length || 0
                });

                const videos = videoDetails.data.items.map(video => ({
                    id: video.id,
                    title: video.snippet.title,
                    description: video.snippet.description,
                    channelTitle: video.snippet.channelTitle,
                    publishedAt: video.snippet.publishedAt,
                    duration: video.contentDetails.duration,
                    thumbnail: video.snippet.thumbnails?.high?.url || ''
                }));

                // Save to MongoDB for future cache restoration
                const actualQuotaCost = (quotaCostMultiplier * 100) + 1; // Each search.list = 100, videos.list = 1
                await saveSearchResultToMongoDB(query, pageNum, videos, 'MULTI', searchResponse.data.nextPageToken, actualQuotaCost);

                console.log(`💰 [QUOTA] Page ${pageNum} cost: ${actualQuotaCost} quota (${quotaCostMultiplier} search calls + 1 video details call)`);

                return { 
                    success: true, 
                    videos, 
                    resultType: 'MULTI', 
                    isMock: false, 
                    page: pageNum,
                    nextPageToken: searchResponse.data.nextPageToken,
                    fromCache: false
                };
            }, (quotaCostMultiplier * 100) + 1); // Actual API calls made
            return res.json({
                ...result,
                quota: {
                    used: dailyQuotaUsed,
                    limit: 10000
                }
            });
        } catch (error) {
            console.error('YouTube API error for multi-search:', error);
            
            // Check for quota exceeded error
            if (error.message && error.message.includes('quota') && error.message.includes('exceeded')) {
                console.error('🚫 [QUOTA-EXCEEDED] YouTube API quota limit reached');
                return res.status(403).json({ 
                    success: false, 
                    error: 'YouTube API quota limit reached',
                    quotaExceeded: true,
                    details: error.message,
                    videos: [],
                    isMock: false
                });
            }
            
            return res.status(500).json({
                success: false,
                error: 'YouTube API request failed (channel search)',
                details: error.message,
                videos: [],
                isMock: false
            });
        }
    }

    if (type === 'movies' || type === 'tv') {
        // Movies & TV search - searches for movies and TV content on YouTube
        const perPage = 12;
        const pageNum = Math.max(1, Number(page) || 1);
        
        // Calculate quota cost upfront - more conservative for movies/TV
        let quotaUsed = 101; // Base cost: search.list (100) + videos.list (1)
        if (pageNum > 1) {
            // Check if we can use cached pageToken (efficient) or need to build up (expensive)
            const prevPageCacheKey = generateCacheKey(query, type, pageNum - 1);
            const prevPageCache = youtubeCache.get(prevPageCacheKey);
            
            if (prevPageCache && prevPageCache.nextPageToken) {
                // Efficient: Only one additional API call needed
                quotaUsed = 101;
            } else {
                // Expensive: Need to build up through all pages
                quotaUsed += (pageNum - 1) * 100; // Additional search.list calls for pagination
            }
        }
        
        try {
            const result = await getCachedOrFetch(cacheKey, async () => {
                console.log('🎬 Real API: Movies & TV search:', query, 'page:', pageNum, 'type:', type);
                
                // Enhanced query for better movie/TV results
                let searchQuery = query;
                let searchParams = {
                    part: ['snippet'],
                    q: searchQuery,
                    maxResults: perPage,
                    type: 'video',
                    order: 'relevance' // Most relevant first for movies/TV
                };

                if (type === 'movies') {
                    // FULL-LENGTH MOVIE SEARCH - Optimized for actual movies, not trailers
                    searchQuery = `${query} full movie complete film`;
                    searchParams.videoDuration = 'long';     // Only videos longer than 20 minutes
                    searchParams.videoDefinition = 'high';   // Only HD videos
                    console.log('🎬 [MOVIES] Using full-length movie search parameters');
                } else if (type === 'tv') {
                    // TV SHOW SEARCH - Optimized for episodes and series
                    searchQuery = `${query} tv show series episode full episode`;
                    searchParams.videoDuration = 'medium';   // 4-20 minutes (typical TV episode length)
                    searchParams.videoDefinition = 'high';   // Only HD videos
                    console.log('📺 [TV] Using TV episode search parameters');
                }
                
                searchParams.q = searchQuery;
                
                // Handle pagination for movies & TV search - SUSTAINABLE VERSION
                let currentPageToken = null;
                
                if (pageNum > 1) {
                    // STEP 1: Check persistent pageToken database first
                    currentPageToken = await getNextPageToken(query, type, pageNum - 1);
                    
                    if (currentPageToken) {
                        console.log(`🎬 [SUSTAINABLE] Using persistent pageToken from database for ${type} page ${pageNum}`);
                    } else {
                        // STEP 2: Check in-memory cache as fallback
                        const prevPageCacheKey = generateCacheKey(query, type, pageNum - 1);
                        const prevPageCache = youtubeCache.get(prevPageCacheKey);
                        
                        if (prevPageCache && prevPageCache.nextPageToken) {
                            currentPageToken = prevPageCache.nextPageToken;
                            console.log(`🎬 [SUSTAINABLE] Using in-memory cached pageToken for ${type} page ${pageNum}`);
                        } else {
                            // STEP 3: Build up efficiently with database storage
                            console.log(`🎬 [SUSTAINABLE] Building pageToken chain for ${type} "${query}" up to page ${pageNum}`);
                            
                            let currentPage = 1;
                            let tempPageToken = null;
                            
                            // Start from page 1 or the highest page we have stored
                            const existingTokens = await PageToken.find({ query, searchType: type }).sort({ page: -1 }).limit(1);
                            if (existingTokens.length > 0) {
                                currentPage = existingTokens[0].page + 1;
                                tempPageToken = existingTokens[0].nextPageToken;
                                console.log(`🎬 [SUSTAINABLE] Resuming from stored page ${existingTokens[0].page} for ${type} search`);
                            }
                            
                            // Build up to target page, storing each pageToken
                            while (currentPage <= pageNum) {
                                const tempResponse = await youtube.search.list({
                                    ...searchParams,
                                    pageToken: tempPageToken
                                });
                                
                                if (!tempResponse.data.items || tempResponse.data.items.length === 0) {
                                    console.log(`🎬 [SUSTAINABLE] Reached end of results at page ${currentPage} for ${type} search`);
                                    return { 
                                        success: true, 
                                        videos: [], 
                                        resultType: 'MULTI',
                                        isMock: false,
                                        page: pageNum,
                                        nextPageToken: null,
                                        contentType: type,
                                        fromCache: false,
                                        endOfResults: true
                                    };
                                }
                                
                                // Save this pageToken to database for future use
                                await savePageToken(query, type, currentPage, tempPageToken, tempResponse.data.nextPageToken);
                                
                                if (currentPage === pageNum) {
                                    currentPageToken = tempPageToken;
                                    break;
                                }
                                
                                tempPageToken = tempResponse.data.nextPageToken;
                                if (!tempPageToken) {
                                    console.log(`🎬 [SUSTAINABLE] No more pages available for ${type} search`);
                                    return { 
                                        success: true, 
                                        videos: [], 
                                        resultType: 'MULTI',
                                        isMock: false,
                                        page: pageNum,
                                        nextPageToken: null,
                                        contentType: type,
                                        fromCache: false,
                                        endOfResults: true
                                    };
                                }
                                
                                currentPage++;
                                console.log(`🎬 [SUSTAINABLE] Built pageToken for page ${currentPage - 1}, continuing to page ${currentPage}`);
                            }
                        }
                    }
                }
                
                // Set the correct pageToken for the final search
                searchParams.pageToken = currentPageToken;
                const searchResponse = await youtube.search.list(searchParams);

                if (!searchResponse?.data?.items?.length) {
                    return { success: false, videos: [], error: `No ${type} content found for this query` };
                }

                const videoIds = searchResponse.data.items.map(item => item.id.videoId);
                const videoDetails = await youtube.videos.list({
                    part: ['snippet', 'contentDetails'],
                    id: videoIds.join(',')
                });

                const videos = videoDetails.data.items.map(video => ({
                    id: video.id,
                    title: video.snippet.title,
                    description: video.snippet.description,
                    channelTitle: video.snippet.channelTitle,
                    publishedAt: video.snippet.publishedAt,
                    duration: video.contentDetails.duration,
                    thumbnail: video.snippet.thumbnails?.high?.url || '',
                    contentType: type // Add content type for frontend display
                }));

                // Save to MongoDB for cache restoration
                try {
                    await saveSearchResultToMongoDB(query, pageNum, videos, 'MULTI', searchResponse.data.nextPageToken, quotaUsed);
                    console.log(`🎬 [MONGODB] Saved ${type} search results to database`);
                } catch (mongoError) {
                    console.error(`🎬 [MONGODB] Failed to save ${type} search results:`, mongoError);
                }
                
                // Save pageToken for sustainable pagination
                try {
                    await savePageToken(query, type, pageNum, currentPageToken, searchResponse.data.nextPageToken);
                    console.log(`🎬 [SUSTAINABLE] Saved pageToken for future pagination`);
                } catch (pageTokenError) {
                    console.error(`🎬 [SUSTAINABLE] Failed to save pageToken:`, pageTokenError);
                }

                return {
                    success: true,
                    videos,
                    resultType: 'MULTI',
                    isMock: false,
                    page: pageNum,
                    nextPageToken: searchResponse.data.nextPageToken,
                    contentType: type,
                    fromCache: false
                };
            }, quotaUsed); // Dynamic quota cost based on pagination
            
            return res.json({
                ...result,
                quota: {
                    used: dailyQuotaUsed,
                    limit: 10000
                }
            });
        } catch (error) {
            console.error(`YouTube API error for ${type} search:`, error);
            
            // Check if it's a quota-related error
            if (error.message && error.message.includes('Quota exceeded')) {
                return res.status(429).json({
                    success: false,
                    error: `Quota limit reached for ${type} search`,
                    details: error.message,
                    videos: [],
                    isMock: false,
                    quotaExceeded: true,
                    quota: {
                        used: dailyQuotaUsed,
                        limit: 10000,
                        resetTime: quotaResetTime.toISOString()
                    }
                });
            }
            
            // Check if it's a quota conservation error
            if (error.message && error.message.includes('quota conservation')) {
                return res.status(429).json({
                    success: false,
                    error: `Quota conservation active for ${type} search`,
                    details: error.message,
                    videos: [],
                    isMock: false,
                    quotaConservation: true,
                    quota: {
                        used: dailyQuotaUsed,
                        limit: 10000,
                        resetTime: quotaResetTime.toISOString()
                    }
                });
            }
            
            return res.status(500).json({
                success: false,
                error: `YouTube API request failed (${type} search)`,
                details: error.message,
                videos: [],
                isMock: false,
                quota: {
                    used: dailyQuotaUsed,
                    limit: 10000
                }
            });
        }
    }

    // Fallback for unrecognized types
    return res.json({ success: false, videos: [], resultType: 'NONE', isMock: false });
});

// Add quota status and cache management endpoints
app.get('/api/youtube/quota-status', (req, res) => {
    resetQuotaIfNeeded();
    
    const quotaInfo = {
        used: dailyQuotaUsed,
        remaining: getRemainingQuota(),
        total: 10000,
        percentage: Math.round((dailyQuotaUsed / 10000) * 100),
        resetTime: quotaResetTime.toISOString(),
        timeUntilReset: Math.round((quotaResetTime - new Date()) / 1000 / 60), // minutes
        cacheStats: {
            keys: youtubeCache.keys().length,
            hits: youtubeCache.getStats().hits || 0,
            misses: youtubeCache.getStats().misses || 0
        }
    };
    
    res.json(quotaInfo);
});

// Admin endpoint to manually set quota usage (for fixing quota tracking)
app.post('/api/youtube/quota-set', (req, res) => {
    const { used } = req.body;
    
    if (typeof used !== 'number' || used < 0 || used > 10000) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid quota usage. Must be a number between 0 and 10000.' 
        });
    }
    
    const oldUsed = dailyQuotaUsed;
    dailyQuotaUsed = used;
    saveQuotaData();
    
    console.log(`📊 [QUOTA] Manual quota adjustment: ${oldUsed} → ${dailyQuotaUsed}`);
    
    res.json({
        success: true,
        message: `Quota usage updated from ${oldUsed} to ${dailyQuotaUsed}`,
        quota: {
            used: dailyQuotaUsed,
            remaining: getRemainingQuota(),
            total: 10000,
            percentage: Math.round((dailyQuotaUsed / 10000) * 100)
        }
    });
});

// Quota script runner endpoint
app.post('/api/quota/run-script', async (req, res) => {
    const { script } = req.body;
    
    if (!script) {
        return res.status(400).json({ 
            success: false, 
            error: 'Script name is required' 
        });
    }
    
    const scriptMap = {
        'fix_quota_monitor': 'scripts/YOUTUBE_QUOTA/fix_quota_monitor.js',
        'check_real_youtube_quota': 'scripts/YOUTUBE_QUOTA/check_real_youtube_quota.js',
        'force_quota_sync': 'scripts/YOUTUBE_QUOTA/force_quota_sync.js',
        'auto_quota_sync': 'scripts/YOUTUBE_QUOTA/auto_quota_sync.js'
    };
    
    const scriptPath = scriptMap[script];
    if (!scriptPath) {
        return res.status(400).json({ 
            success: false, 
            error: `Unknown script: ${script}` 
        });
    }
    
    try {
        const { spawn } = require('child_process');
        const scriptProcess = spawn('node', [scriptPath], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let output = '';
        let errorOutput = '';
        
        scriptProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        scriptProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        scriptProcess.on('close', (code) => {
            if (code === 0) {
                res.json({
                    success: true,
                    message: `Script ${script} completed successfully`,
                    output: output.trim()
                });
            } else {
                res.json({
                    success: false,
                    error: `Script ${script} failed with code ${code}`,
                    output: errorOutput.trim() || output.trim()
                });
            }
        });
        
        scriptProcess.on('error', (error) => {
            res.status(500).json({
                success: false,
                error: `Failed to run script: ${error.message}`
            });
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: `Server error: ${error.message}`
        });
    }
});

// Admin endpoint to manually reset quota (for testing)
app.post('/api/youtube/quota-reset', (req, res) => {
    const oldUsed = dailyQuotaUsed;
    dailyQuotaUsed = 0;
    quotaResetTime = new Date();
    quotaResetTime.setDate(quotaResetTime.getDate() + 1); // Set next reset to tomorrow
    quotaResetTime.setHours(8, 0, 0, 0); // 8 AM
    saveQuotaData();
    
    console.log(`🔄 [QUOTA] Manual quota reset: ${oldUsed} → 0`);
    
    res.json({
        success: true,
        message: `Quota manually reset from ${oldUsed} to 0`,
        quota: {
            used: dailyQuotaUsed,
            remaining: getRemainingQuota(),
            total: 10000,
            percentage: 0,
            resetTime: quotaResetTime.toISOString()
        }
    });
});

// PageToken management endpoints
app.get('/api/youtube/pagetokens/:query/:type', async (req, res) => {
    try {
        const { query, type } = req.params;
        const tokens = await PageToken.find({ query, searchType: type }).sort({ page: 1 });
        
        res.json({
            success: true,
            query,
            searchType: type,
            tokens: tokens.map(t => ({
                page: t.page,
                hasToken: !!t.pageToken,
                hasNext: !!t.nextPageToken,
                createdAt: t.createdAt,
                lastAccessed: t.lastAccessed
            })),
            totalPages: tokens.length
        });
    } catch (error) {
        console.error('Error fetching pageTokens:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/youtube/pagetokens/:query/:type', async (req, res) => {
    try {
        const { query, type } = req.params;
        const result = await PageToken.deleteMany({ query, searchType: type });
        
        console.log(`🗑️ [PAGETOKEN] Deleted ${result.deletedCount} pageTokens for ${type} "${query}"`);
        
        res.json({
            success: true,
            message: `Deleted ${result.deletedCount} pageTokens for ${type} search "${query}"`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error deleting pageTokens:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/youtube/clear-cache', (req, res) => {
    const clearedKeys = youtubeCache.keys().length;
    youtubeCache.flushAll();
    res.json({ 
        success: true, 
        message: `Cleared ${clearedKeys} cached items`,
        clearedKeys 
    });
});

app.get('/api/youtube/cache-info', (req, res) => {
    const keys = youtubeCache.keys();
    const cacheInfo = {
        totalKeys: keys.length,
        keys: keys.map(key => ({
            key,
            ttl: youtubeCache.getTtl(key) ? new Date(youtubeCache.getTtl(key)).toISOString() : null
        })),
        stats: youtubeCache.getStats()
    };
    
    res.json(cacheInfo);
});

// Admin endpoint to backfill duration data for existing playlist videos
app.post('/api/youtube/playlists-backfill-duration', async (req, res) => {
    try {
        console.log('🔄 [BACKFILL] This endpoint is deprecated. Use client-side backfill instead.');
        console.log('🔄 [BACKFILL] Go to your browser console and run: backfillPlaylistDurations()');
        
        res.json({
            success: false,
            message: 'Server-side backfill is deprecated. Use client-side backfill function instead.',
            instruction: 'Run backfillPlaylistDurations() in browser console'
        });
    } catch (error) {
        console.error('❌ [BACKFILL] Error:', error);
        res.status(500).json({ error: 'Backfill failed' });
    }
});

// New endpoint for client to send cached video data for backfill
app.post('/api/youtube/playlists-update-durations', async (req, res) => {
    try {
        const { updates } = req.body;
        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ error: 'Invalid updates data' });
        }

        const Playlist = require('./models/Playlist');
        let totalUpdated = 0;

        console.log(`🔄 [BACKFILL] Processing ${updates.length} video updates from client cache`);

        for (const update of updates) {
            const { playlistId, videoId, duration, channelTitle } = update;
            
            if (!playlistId || !videoId) continue;

            const result = await Playlist.updateOne(
                { 
                    '_id': playlistId,
                    'videos.videoId': videoId 
                },
                { 
                    $set: { 
                        'videos.$.duration': duration || '',
                        'videos.$.channelTitle': channelTitle || ''
                    } 
                }
            );

            if (result.modifiedCount > 0) {
                totalUpdated++;
                console.log(`✅ [BACKFILL] Updated ${videoId}: ${duration}`);
            }
        }

        console.log(`🎯 [BACKFILL] Updated ${totalUpdated}/${updates.length} videos with duration data`);
        
        res.json({
            success: true,
            totalUpdated,
            totalProcessed: updates.length
        });
    } catch (error) {
        console.error('❌ [BACKFILL] Error:', error);
        res.status(500).json({ error: 'Backfill update failed' });
    }
});


// =====================================================
// SERVER LISTENER
// =====================================================

// Call the server and port
app.listen(port, '0.0.0.0', () => {
    console.log(chalk.magenta(`[BACKEND] Listening at http://localhost:${port}`));
}).on('error', (error) => {
    console.error(chalk.magenta('[BACKEND] Error starting server:'), error);
    if (error.code === 'EACCES') {
        console.error(chalk.magenta('[BACKEND] Permission denied. Try using a port number above 1024.'));
    } else if (error.code === 'EADDRINUSE') {
        console.error(chalk.magenta('[BACKEND] Port is already in use. Try a different port.'));
    }
});



// =====================================================
// END OF Server.js FILE v2
// =====================================================

// GET /api/chat - Placeholder for chat history (prevents 404)
app.get('/api/chat', async (req, res) => {
    // TODO: Implement real chat history if needed
    res.json({ success: true, history: [] });
});

const mediaLibraryRoutes = require('./routes/mediaLibrary.routes');
app.use('/api', mediaLibraryRoutes);

// Serve emby-posters.json
app.get('/emby-posters.json', (req, res) => {
  const postersPath = path.join(__dirname, 'data', 'emby-posters.json');
  fs.readFile(postersPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read emby-posters.json', details: err.message });
    }
    res.type('application/json').send(data);
  });
});

// Serve Emby poster images securely
app.get('/api/poster', (req, res) => {
  const posterPath = req.query.path;
  if (!posterPath) return res.status(400).send('Missing path');

  // Only allow access to files inside the Emby metadata directory
  const embyRoot = path.join(process.env.HOME || process.env.USERPROFILE, 'AppData/Roaming/Emby-Server/programdata/metadata/library');
  const resolvedPath = path.resolve(posterPath);

  if (!resolvedPath.startsWith(embyRoot)) {
    return res.status(403).send('Forbidden');
  }

  fs.access(resolvedPath, fs.constants.R_OK, (err) => {
    if (err) return res.status(404).send('Not found');
    res.sendFile(resolvedPath);
  });
});

// Serve video files securely
app.get('/api/video', (req, res) => {
  let videoPath = req.query.path;
  if (!videoPath) return res.status(400).send('Missing path');

  // Decode URL-encoded path
  try {
    videoPath = decodeURIComponent(videoPath);
  } catch (e) {
    console.log('🎬 [VIDEO] Failed to decode path:', e);
    return res.status(400).send('Invalid path encoding');
  }

  // Handle different path formats
  let resolvedPath;
  const mediaRoots = ['S:/MEDIA', 'S:\\MEDIA']; // Support both forward and backward slashes
  
  // Check if this is a /media/ path (from TV shows)
  if (videoPath.startsWith('/media/')) {
    // Convert /media/ path to actual file system path
    const relativePath = videoPath.substring(7); // Remove '/media/' prefix
    
    // NEW: Remove leading 'movies/' or 'tv-shows/' if present
    const cleanedPath = relativePath.replace(/^movies[\\/]/i, '').replace(/^tv-shows[\\/]/i, '');
    
    const possiblePaths = [
      path.join('S:/MEDIA/TV-SHOWS', cleanedPath),
      path.join('S:/MEDIA/MOVIES', cleanedPath),
      path.join('S:\\MEDIA\\TV-SHOWS', cleanedPath),
      path.join('S:\\MEDIA\\MOVIES', cleanedPath)
    ];
    
    resolvedPath = possiblePaths.find(p => fs.existsSync(p));
    
    if (!resolvedPath) {
      console.log('🎬 [VIDEO] File not found in any media root for path:', videoPath);
      console.log('🎬 [VIDEO] Tried paths:', possiblePaths);
      return res.status(404).send('File not found');
    }
  } else {
    // Handle absolute paths (from movies)
    resolvedPath = path.resolve(videoPath);
    
    // Check if the path is within any of the allowed media roots
    const isAllowed = mediaRoots.some(root => resolvedPath.startsWith(root));

    if (!isAllowed) {
      console.log('🎬 [VIDEO] Forbidden access attempt:', resolvedPath);
      return res.status(403).send('Forbidden');
    }
  }

  fs.access(resolvedPath, fs.constants.R_OK, (err) => {
    if (err) {
      console.log('🎬 [VIDEO] File not found:', resolvedPath);
      return res.status(404).send('Not found');
    }
    
    console.log('🎬 [VIDEO] Serving video:', resolvedPath);

    // --- Range request support for seeking ---
    const stat = fs.statSync(resolvedPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    if (range) {
      // Example: 'bytes=12345-'
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      if (start >= fileSize || end >= fileSize) {
        res.status(416).send('Requested range not satisfiable');
        return;
      }
      const chunkSize = (end - start) + 1;
      const file = fs.createReadStream(resolvedPath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      });
      file.pipe(res);
      file.on('error', (error) => {
        console.error('🎬 [VIDEO] Error streaming video:', error);
        if (!res.headersSent) {
          res.status(500).send('Error streaming video');
        }
      });
    } else {
      // No range header, send entire file
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
      });
      const file = fs.createReadStream(resolvedPath);
      file.pipe(res);
      file.on('error', (error) => {
        console.error('🎬 [VIDEO] Error streaming video:', error);
        if (!res.headersSent) {
          res.status(500).send('Error streaming video');
        }
      });
    }
  });
});

// Mount admin API routes
const adminRoutes = require('./routes/admin.routes');
app.use('/api', adminRoutes);

// =========================
// BUG TRACKING ENDPOINTS
// =========================

// Submit a new bug (anyone)
app.post('/api/bugs', async (req, res) => {
    try {
        const { title, description, submittedBy } = req.body;
        if (!title || !description || !submittedBy) {
            return res.status(400).json({ success: false, message: 'Title, description, and submittedBy are required.' });
        }
        const bug = new Bug({ title, description, submittedBy });
        await bug.save();
        res.status(201).json({ success: true, bug });
    } catch (error) {
        console.error('[BUGS] Error submitting bug:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// List bugs (admin: all, user: their own)
app.get('/api/bugs', authenticateToken, async (req, res) => {
    try {
        let bugs;
        if (req.user.role === 'admin' || req.user.role === 'superadmin') {
            bugs = await Bug.find().sort({ created: -1 });
        } else {
            bugs = await Bug.find({ submittedBy: req.user.email }).sort({ created: -1 });
        }
        res.json({ success: true, bugs });
    } catch (error) {
        console.error('[BUGS] Error listing bugs:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Update bug (admin only)
app.put('/api/bugs/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { severity, status, comment, commentAuthor } = req.body;
        const bug = await Bug.findById(id);
        if (!bug) {
            return res.status(404).json({ success: false, message: 'Bug not found' });
        }
        if (severity) bug.severity = severity;
        if (status) bug.status = status;
        if (comment && commentAuthor) {
            bug.comments.push({ author: commentAuthor, message: comment });
        }
        await bug.save();
        res.json({ success: true, bug });
    } catch (error) {
        console.error('[BUGS] Error updating bug:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// === ADMIN: BACKFILL YOUTUBESEARCH TIMESTAMPS ===
app.post('/api/admin/backfill-youtube-timestamps', async (req, res) => {
    try {
        const now = new Date();
        const result = await YouTubeSearch.updateMany(
            { $or: [ { dateCreated: { $exists: false } }, { lastSearched: { $exists: false } } ] },
            [
                {
                    $set: {
                        dateCreated: { $ifNull: ["$dateCreated", now] },
                        lastSearched: { $ifNull: ["$lastSearched", now] }
                    }
                }
            ]
        );
        res.json({ success: true, matched: result.matchedCount || result.n, modified: result.modifiedCount || result.nModified });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================
// WATCH LATER DATA API ENDPOINTS
// =========================
// Note: Watch Later functionality has been moved to MongoDB-based API routes
// See /api/watch-later/* endpoints for the new implementation

// =========================
// SERVER STARTUP
// =========================

// Audio & Video Converter API Routes
app.post('/api/audio/convert', upload.single('file'), async (req, res) => {
    try {
        const { targetAudioCodec, targetVideoContainer, qualityPreset } = req.body;
        const inputFile = req.file;
        
        if (!inputFile) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Set up SSE for real-time progress
        res.writeHead(200, {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        
        const inputPath = inputFile.path;
        const outputDir = path.join(__dirname, 'converted');
        const outputFilename = path.parse(inputFile.originalname).name + '_converted.' + targetVideoContainer;
        const outputPath = path.join(outputDir, outputFilename);
        
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Build FFmpeg command based on settings
        let ffmpegArgs = [
            '-i', inputPath,
            '-c:v', 'copy', // Copy video stream without re-encoding
            '-c:a', targetAudioCodec === 'aac' ? 'aac' : 
                   targetAudioCodec === 'mp3' ? 'mp3' : 
                   targetAudioCodec === 'opus' ? 'libopus' : 'aac',
            '-b:a', qualityPreset === 'high' ? '192k' : 
                   qualityPreset === 'medium' ? '128k' : '96k',
            '-y', // Overwrite output file
            outputPath
        ];
        
        // Send initial progress
        res.write(`data: ${JSON.stringify({ progress: 0, log: 'Starting FFmpeg conversion...' })}\n\n`);
        
        // Execute FFmpeg
        const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
        
        let progress = 0;
        let duration = 0;
        
        ffmpegProcess.stderr.on('data', (data) => {
            const output = data.toString();
            
            // Extract duration if not already set
            if (!duration) {
                const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
                if (durationMatch) {
                    duration = parseInt(durationMatch[1]) * 3600 + 
                              parseInt(durationMatch[2]) * 60 + 
                              parseInt(durationMatch[3]) + 
                              parseInt(durationMatch[4]) / 100;
                }
            }
            
            // Extract current time and calculate progress
            const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
            if (timeMatch && duration > 0) {
                const currentTime = parseInt(timeMatch[1]) * 3600 + 
                                   parseInt(timeMatch[2]) * 60 + 
                                   parseInt(timeMatch[3]) + 
                                   parseInt(timeMatch[4]) / 100;
                progress = Math.min(100, Math.round((currentTime / duration) * 100));
                
                res.write(`data: ${JSON.stringify({ progress, log: `Converting... ${progress}%` })}\n\n`);
            }
            
            // Send log messages
            if (output.includes('frame=') || output.includes('size=')) {
                res.write(`data: ${JSON.stringify({ log: output.trim() })}\n\n`);
            }
        });
        
        ffmpegProcess.on('close', (code) => {
            if (code === 0) {
                // Move converted file to file server
                const fileServerPath = path.join('S:/MEDIA', outputFilename);
                
                try {
                    // Copy file to file server
                    fs.copyFileSync(outputPath, fileServerPath);
                    
                    // Clean up temporary files
                    fs.unlinkSync(inputPath); // Remove uploaded file
                    fs.unlinkSync(outputPath); // Remove converted file from server/converted/
                    
                    res.write(`data: ${JSON.stringify({ 
                        progress: 100, 
                        log: `Conversion completed successfully. File moved to: ${fileServerPath}`,
                        outputPath: fileServerPath 
                    })}\n\n`);
                } catch (moveError) {
                    console.error('[DEBUG - AUDIOMANAGER] Error moving file to file server:', moveError);
                    res.write(`data: ${JSON.stringify({ 
                        progress: 100, 
                        log: `Conversion completed but failed to move to file server: ${moveError.message}`,
                        outputPath: outputPath,
                        warning: true 
                    })}\n\n`);
                }
            } else {
                res.write(`data: ${JSON.stringify({ progress: 0, log: `FFmpeg process exited with code ${code}`, error: true })}\n\n`);
            }
            res.end();
        });
        
        ffmpegProcess.on('error', (error) => {
            res.write(`data: ${JSON.stringify({ progress: 0, log: `FFmpeg error: ${error.message}`, error: true })}\n\n`);
            res.end();
        });
        
    } catch (error) {
        console.error('[DEBUG - AUDIOMANAGER] Conversion error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/audio/check-ffmpeg', async (req, res) => {
    try {
        const ffmpegProcess = spawn('ffmpeg', ['-version']);
        
        ffmpegProcess.on('close', (code) => {
            if (code === 0) {
                res.json({ available: true, path: 'ffmpeg' });
            } else {
                res.json({ available: false, error: 'FFmpeg not found or not accessible' });
            }
        });
        
        ffmpegProcess.on('error', (error) => {
            res.json({ available: false, error: error.message });
        });
        
    } catch (error) {
        res.json({ available: false, error: error.message });
    }
});

app.get('/api/audio/config', (req, res) => {
    res.json({
        targetAudioCodec: 'aac',
        targetVideoContainer: 'mkv',
        qualityPreset: 'high'
    });
});

// Run existing scan scripts endpoint
app.post('/api/audio/run-scan-script', async (req, res) => {
    try {
        const { scriptName, filePath, folderPath, targetAudioCodec, targetVideoContainer, qualityPreset } = req.body;
        
        if (!scriptName) {
            return res.status(400).json({ error: 'Script name is required' });
        }
        
        // For single file conversion
        if (scriptName === 'convert_single_file_audio.js') {
            if (!filePath) {
                return res.status(400).json({ error: 'File path is required for single file conversion' });
            }
        }
        // For folder conversion
        else if (scriptName === 'convert_folder_audio_to_aac.js') {
            if (!folderPath) {
                return res.status(400).json({ error: 'Folder path is required for folder conversion' });
            }
        }
        
        // Set up SSE for real-time progress
        res.writeHead(200, {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        
        // Construct the script path
        const scriptPath = path.join(__dirname, '../scripts', scriptName);
        
        if (!fs.existsSync(scriptPath)) {
            res.write(`data: ${JSON.stringify({ progress: 0, log: `Script not found: ${scriptName}`, error: true })}\n\n`);
            res.end();
            return;
        }
        
        let scriptArgs = [];
        
        // Set up script arguments based on script type
        if (scriptName === 'convert_single_file_audio.js') {
            scriptArgs = [scriptPath, filePath, targetAudioCodec, targetVideoContainer, qualityPreset];
            res.write(`data: ${JSON.stringify({ progress: 0, log: `Starting ${scriptName} on file: ${filePath}` })}\n\n`);
        } else if (scriptName === 'convert_folder_audio_to_aac.js') {
            scriptArgs = [scriptPath, folderPath];
            res.write(`data: ${JSON.stringify({ progress: 0, log: `Starting ${scriptName} on folder: ${folderPath}` })}\n\n`);
        }
        
        // Run the script
        const scriptProcess = spawn('node', scriptArgs, {
            cwd: path.join(__dirname, '../scripts')
        });
        
        let progress = 0;
        
        scriptProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('[DEBUG - AUDIOMANAGER] Script output:', output);
            
            // Parse script output for progress updates
            if (output.includes('[CONVERT]') || output.includes('[SCAN]')) {
                progress = Math.min(progress + 10, 90);
                res.write(`data: ${JSON.stringify({ progress, log: output.trim() })}\n\n`);
            } else if (output.includes('✅') || output.includes('SUCCESS')) {
                progress = 100;
                res.write(`data: ${JSON.stringify({ progress, log: output.trim() })}\n\n`);
            } else {
                res.write(`data: ${JSON.stringify({ log: output.trim() })}\n\n`);
            }
        });
        
        scriptProcess.stderr.on('data', (data) => {
            const error = data.toString();
            console.error('[DEBUG - AUDIOMANAGER] Script error:', error);
            res.write(`data: ${JSON.stringify({ log: `Error: ${error.trim()}`, error: true })}\n\n`);
        });
        
        scriptProcess.on('close', (code) => {
            if (code === 0) {
                res.write(`data: ${JSON.stringify({ progress: 100, log: `Script completed successfully` })}\n\n`);
            } else {
                res.write(`data: ${JSON.stringify({ progress: 0, log: `Script exited with code ${code}`, error: true })}\n\n`);
            }
            res.end();
        });
        
        scriptProcess.on('error', (error) => {
            res.write(`data: ${JSON.stringify({ progress: 0, log: `Script error: ${error.message}`, error: true })}\n\n`);
            res.end();
        });
        
    } catch (error) {
        console.error('[DEBUG - AUDIOMANAGER] Script execution error:', error);
        res.status(500).json({ error: error.message });
    }
});


