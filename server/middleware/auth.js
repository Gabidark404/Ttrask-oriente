const supabase = require('../config/supabase');

/* ------------------------------------------------------------------
   verifyJwt — usado en rutas /api (lee el header Authorization: Bearer)
------------------------------------------------------------------ */
async function verifyJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no provisto' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    req.user = {
      id:    user.id,
      email: user.email,
      role:  user.app_metadata?.role || 'tecnico'
    };

    // Cliente Supabase autenticado por request (necesario para que RLS funcione)
    req.supabase = require('../config/supabase').getAuthenticatedClient(token);

    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'Error validando token' });
  }
}

/* ------------------------------------------------------------------
   authorize — restringe por rol (para rutas /api)
   Uso: router.get('/ruta', verifyJwt, authorize(['supervisor']), handler)
------------------------------------------------------------------ */
function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ error: 'Usuario no autenticado' });
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acceso denegado. Rol requerido: ${allowedRoles.join(' o ')}`
      });
    }
    next();
  };
}

/* ------------------------------------------------------------------
   verifyPageCookie — middleware para rutas de página HTML.
   Lee el JWT desde la cookie "ttraks_token", lo verifica con Supabase
   y pone req.user disponible. Si falla → redirect a /login.

   Uso: app.get('/dashboard', verifyPageCookie(), handler)
        app.get('/supervision', verifyPageCookie(['supervisor']), handler)
------------------------------------------------------------------ */
function verifyPageCookie(allowedRoles = []) {
  return async (req, res, next) => {
    const token = req.cookies?.ttraks_token;

    if (!token) {
      return res.redirect('/login');
    }

    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        // Cookie inválida o expirada — limpiarla y redirigir
        res.clearCookie('ttraks_token', { path: '/' });
        return res.redirect('/login');
      }

      const role = user.app_metadata?.role || 'tecnico';

      // Verificar rol si se especificó
      if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        return res.redirect('/dashboard');
      }

      req.user = { id: user.id, email: user.email, role };
      next();

    } catch (err) {
      console.error('Page auth error:', err);
      res.clearCookie('ttraks_token', { path: '/' });
      return res.redirect('/login');
    }
  };
}

module.exports = { verifyJwt, authorize, verifyPageCookie };