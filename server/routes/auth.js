const express = require('express');
const router  = express.Router();

const COOKIE_NAME    = 'ttraks_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 * 1000; // 7 días en ms

/* POST /api/auth/session
   Body: { token: "<supabase-jwt>" }
   Guarda el token en una cookie HttpOnly segura.
   Lo llama el cliente tras un login exitoso. */
router.post('/session', (req, res) => {
  const { token } = req.body;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token requerido' });
  }

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,               // No accesible desde JS del cliente
    secure:   process.env.NODE_ENV === 'production', // HTTPS solo en prod
    sameSite: 'Lax',              // Protección CSRF básica
    maxAge:   COOKIE_MAX_AGE,
    path:     '/'
  });

  res.json({ ok: true });
});

/* DELETE /api/auth/session
   Limpia la cookie de sesión (logout). */
router.delete('/session', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

module.exports = router;
