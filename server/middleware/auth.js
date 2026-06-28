const supabase = require('../config/supabase');

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
      id: user.id,
      email: user.email,
      role: user.app_metadata?.role || 'tecnico'
    };

    // Cliente Supabase autenticado por request (necesario para que RLS funcione)
    req.supabase = require('../config/supabase').getAuthenticatedClient(token);

    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'Error validando token' });
  }
}

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

module.exports = { verifyJwt, authorize };