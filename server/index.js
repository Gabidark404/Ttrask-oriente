require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression = require('compression');
const fileUpload = require('express-fileupload');
const swaggerUi  = require('swagger-ui-express');
const YAML       = require('yamljs');
const path       = require('path');
const cookieParser = require('cookie-parser');

const { verifyJwt, verifyPageCookie } = require('./middleware/auth');
const inventoryRoutes    = require('./routes/inventory');
const requestRoutes      = require('./routes/requests');
const notificationRoutes = require('./routes/notifications');
const uploadRoutes       = require('./routes/upload');
const authRoutes         = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Static client files (CSS, JS, assets)
app.use(express.static(path.join(__dirname, '..', 'client')));

// ── Global Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc:    ["'self'", "fonts.gstatic.com"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
      connectSrc: ["'self'", "https://*.supabase.co"],
      imgSrc:     ["'self'", "data:"],
    }
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(cookieParser());          // Needed to read req.cookies
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 10 * 1024 * 1024 },
  abortOnLimit: true
}));

// ── API Routes
// Auth session (set/clear cookie) — public, no JWT needed
app.use('/api/auth', authRoutes);

// All other /api routes require JWT in Authorization header
app.use('/api', verifyJwt);
app.use('/api/inventory',    inventoryRoutes);
app.use('/api/requests',     requestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload',       uploadRoutes);

// ── Swagger Documentation
try {
  const swaggerDoc = YAML.load(path.join(__dirname, '..', 'swagger.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'TTRAKS ORIENTE API Docs'
  }));
} catch (e) {
  console.warn('Swagger.yaml no encontrado, docs deshabilitadas');
}

// ── Health check (public)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'TTRAKS ORIENTE API' });
});

// ── Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ══════════════════════════════════════════════
//  SPA FALLBACK ROUTE
// ══════════════════════════════════════════════
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Ruta no encontrada' });
  }
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 TTRAKS ORIENTE API corriendo en http://localhost:${PORT}`);
  console.log(`📚 Documentación: http://localhost:${PORT}/api-docs`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;