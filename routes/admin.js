const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const mammoth = require('mammoth');

// Multer setup using memory storage for Vercel / Supabase
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to upload to Supabase Storage
const uploadToSupabase = async (supabase, file) => {
    if (!file) return null;
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    
    const { data, error } = await supabase.storage
        .from('uploads')
        .upload(filename, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });
        
    if (error) {
        console.error("Upload error:", error);
        return null;
    }
    
    const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filename);
    return publicUrlData.publicUrl;
};

// Authentication Middleware
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/admin/login');
    }
};

// Routes - Auth
router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/admin/dashboard');
    res.render('admin/login');
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'ariqew' && password === 'ariqew123') {
        req.session.user = { username };
        res.redirect('/admin/dashboard');
    } else {
        res.render('admin/login', { error: 'Invalid credentials' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Protect all routes below this point
router.use(requireAuth);

// Routes - Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const [{ data: articles }, { data: categories }] = await Promise.all([
            req.supabase.from('articles').select('*').order('createdAt', { ascending: false }),
            req.supabase.from('categories').select('*')
        ]);
        
        res.render('admin/dashboard', { 
            totalArticles: articles ? articles.length : 0,
            totalCategories: categories ? categories.length : 0,
            recentArticles: articles ? articles.slice(0, 5) : []
        });
    } catch (err) {
        console.error(err);
        res.send("Dashboard Error");
    }
});

// Routes - Articles
router.get('/articles', async (req, res) => {
    const { data: articles } = await req.supabase.from('articles').select('*').order('createdAt', { ascending: false });
    res.render('admin/articles', { articles: articles || [] });
});

router.get('/articles/new', async (req, res) => {
    const { data: categories } = await req.supabase.from('categories').select('*');
    res.render('admin/article-form', { article: null, categories: categories || [] });
});

router.post('/articles', upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'document', maxCount: 1 }]), async (req, res) => {
    const { title, excerpt, content, category, tags, status } = req.body;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    
    let thumbnailUrl = '';
    let documentUrl = '';
    
    if (req.files && req.files.thumbnail) {
        thumbnailUrl = await uploadToSupabase(req.supabase, req.files.thumbnail[0]);
    }
    if (req.files && req.files.document) {
        documentUrl = await uploadToSupabase(req.supabase, req.files.document[0]);
    }
    
    const newArticle = {
        id: uuidv4(),
        title,
        slug,
        excerpt,
        content,
        category,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        status: status || 'draft',
        thumbnail: thumbnailUrl,
        document: documentUrl,
        author: req.session.user.username
    };
    
    await req.supabase.from('articles').insert([newArticle]);
    res.redirect('/admin/articles');
});

router.get('/articles/edit/:id', async (req, res) => {
    const [{ data: article }, { data: categories }] = await Promise.all([
        req.supabase.from('articles').select('*').eq('id', req.params.id).single(),
        req.supabase.from('categories').select('*')
    ]);
    
    if (!article) return res.redirect('/admin/articles');
    res.render('admin/article-form', { article, categories: categories || [] });
});

router.post('/articles/edit/:id', upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'document', maxCount: 1 }]), async (req, res) => {
    const { title, excerpt, content, category, tags, status } = req.body;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    
    const updateData = {
        title,
        slug,
        excerpt,
        content,
        category,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        status: status || 'draft',
        updatedAt: new Date().toISOString()
    };
    
    if (req.files && req.files.thumbnail) {
        const url = await uploadToSupabase(req.supabase, req.files.thumbnail[0]);
        if (url) updateData.thumbnail = url;
    }
    if (req.files && req.files.document) {
        const url = await uploadToSupabase(req.supabase, req.files.document[0]);
        if (url) updateData.document = url;
    }
    
    await req.supabase.from('articles').update(updateData).eq('id', req.params.id);
    res.redirect('/admin/articles');
});

router.post('/articles/delete/:id', async (req, res) => {
    await req.supabase.from('articles').delete().eq('id', req.params.id);
    res.redirect('/admin/articles');
});

// Routes - Experiences
router.get('/experiences', async (req, res) => {
    const { data: experiences } = await req.supabase.from('experiences').select('*').order('year', { ascending: false });
    res.render('admin/experiences', { experiences: experiences || [] });
});

router.post('/experiences', async (req, res) => {
    const { title, organization, year, description } = req.body;
    await req.supabase.from('experiences').insert([{
        id: uuidv4(),
        title,
        organization,
        year,
        description
    }]);
    res.redirect('/admin/experiences');
});

router.post('/experiences/delete/:id', async (req, res) => {
    await req.supabase.from('experiences').delete().eq('id', req.params.id);
    res.redirect('/admin/experiences');
});

// Routes - Settings
router.get('/settings', async (req, res) => {
    const { data: settings } = await req.supabase.from('settings').select('*').eq('id', 'default').single();
    res.render('admin/settings', { settings: settings || {} });
});

router.post('/settings', async (req, res) => {
    const newSettings = {
        blogName: req.body.blogName,
        tagline: req.body.tagline,
        description: req.body.description,
        authorName: req.body.authorName,
        whatsappNumber: req.body.whatsappNumber,
        whatsappMessage: req.body.whatsappMessage,
        darkModeDefault: req.body.darkModeDefault === 'on'
    };
    
    await req.supabase.from('settings').update(newSettings).eq('id', 'default');
    res.redirect('/admin/settings');
});

// Routes - Extract DOCX API
router.post('/extract-docx', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Extract using mammoth directly from memory buffer
        const result = await mammoth.convertToHtml({ buffer: req.file.buffer });
        const html = result.value; 
        
        res.json({ html });
    } catch (error) {
        console.error('Error extracting docx:', error);
        res.status(500).json({ error: 'Failed to extract document' });
    }
});

module.exports = router;

