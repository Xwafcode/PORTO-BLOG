require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'blog_secret_key_2026',
    resave: false,
    saveUninitialized: false
}));

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
    res.locals.user = req.session.user || null;
    
    // Attach supabase to req for routes to use
    req.supabase = supabase;
    
    next();
});

// Routes
app.use('/', require('./routes/public'));
app.use('/admin', require('./routes/admin'));

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

