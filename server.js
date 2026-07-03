process.on('uncaughtException', (err) => {
    console.error('CRITICAL UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('CRITICAL UNHANDLED REJECTION:', reason);
});

if (!process.env.VERCEL) {
    require('dotenv').config();
}
const express = require('express');
const path = require('path');
// session removed
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

let supabase;
try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://ytvbquzdkxzochidwigo.supabase.co';
    const supabaseKey = process.env.SUPABASE_KEY || 'dummy_key';
    // Clean up quotes just in case the user accidentally included them in Vercel dashboard
    const cleanUrl = supabaseUrl.replace(/^["']|["']$/g, '');
    const cleanKey = supabaseKey.replace(/^["']|["']$/g, '');
    supabase = createClient(cleanUrl, cleanKey);
} catch (err) {
    console.error("FATAL SUPABASE INIT ERROR:", err);
    // Create a dummy supabase client so the app doesn't crash on boot
    supabase = {
        from: () => ({
            select: () => ({
                eq: () => ({
                    single: async () => ({ data: null, error: err })
                }),
                order: async () => ({ data: null, error: err })
            }),
            insert: async () => ({ data: null, error: err })
        })
    };
}

// Debug route to check env
app.get('/debug-env', (req, res) => {
    res.json({
        hasUrl: !!process.env.SUPABASE_URL,
        hasKey: !!process.env.SUPABASE_KEY,
        nodeEnv: process.env.NODE_ENV
    });
});


// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// app.use(session({...})) removed for Vercel compatibility

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Global variables for templates (Async fetching from Supabase)
app.use(async (req, res, next) => {
    try {
        const { data: settingsData } = await supabase.from('settings').select('*').eq('id', 'default').single();
        res.locals.settings = settingsData || {};
    } catch (err) {
        console.error("Error fetching settings:", err);
        res.locals.settings = {};
    }
    res.locals.user = (req.session && req.session.user) ? req.session.user : null;
    
    // Attach supabase to req for routes to use
    req.supabase = supabase;
    
    next();
});

// Routes
app.use('/', require('./routes/public'));
app.use('/admin', require('./routes/admin'));

// Express Error Handler
app.use((err, req, res, next) => {
    console.error("EXPRESS ERROR HANDLER CAUGHT:", err);
    res.status(500).send("Express Error: " + err.message);
});

// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;

