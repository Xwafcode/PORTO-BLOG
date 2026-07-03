const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    res.send("HELLO VERCEL - If you see this, Supabase/EJS is the culprit!");
});

router.get('/blog', async (req, res) => {
    try {
        const { data: articles } = await req.supabase.from('articles')
            .select('*')
            .eq('status', 'published')
            .order('createdAt', { ascending: false });
            
        res.render('pages/blog', { articles: articles || [] });
    } catch (err) {
        console.error(err);
        res.render('pages/blog', { articles: [] });
    }
});

router.get('/article/:slug', async (req, res) => {
    try {
        const { data: article } = await req.supabase.from('articles')
            .select('*')
            .eq('slug', req.params.slug)
            .eq('status', 'published')
            .single();
        
        if (!article) {
            return res.status(404).send('Article not found');
        }
        
        res.render('pages/article', { article });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.get('/about', (req, res) => {
    res.render('pages/about');
});

router.get('/contact', (req, res) => {
    res.render('pages/contact');
});

router.get('/search', async (req, res) => {
    const q = req.query.q ? req.query.q.toLowerCase() : '';
    
    try {
        let query = req.supabase.from('articles').select('*').eq('status', 'published');
        
        if (q) {
            // Basic text search using OR
            query = query.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%,content.ilike.%${q}%`);
        }
        
        const { data: articles } = await query.order('createdAt', { ascending: false });
        
        res.render('pages/search', { articles: articles || [], query: q });
    } catch (err) {
        console.error(err);
        res.render('pages/search', { articles: [], query: q });
    }
});

module.exports = router;

