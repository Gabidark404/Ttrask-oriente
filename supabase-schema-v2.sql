-- ============================================================
-- TTRAKS ORIENTE — Migración SQL v2 (8 Módulos)
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. EXTENDER TABLA tools
-- ─────────────────────────────────────────────────────────────
ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS concesionario TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS area TEXT,
  ADD COLUMN IF NOT EXISTS responsible TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_tools_concesionario ON tools(concesionario);

-- ─────────────────────────────────────────────────────────────
-- 2. EXTENDER TABLA requests
-- ─────────────────────────────────────────────────────────────
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS concesionario TEXT,
  ADD COLUMN IF NOT EXISTS queue_position INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_queued BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS return_evidence_url TEXT,
  ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS returned_by TEXT;

ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_status_check;
ALTER TABLE requests ADD CONSTRAINT requests_status_check
  CHECK (status IN ('Pendiente', 'Aprobada', 'Rechazada', 'Devuelta', 'En cola'));

CREATE INDEX IF NOT EXISTS idx_requests_queued ON requests(is_queued) WHERE is_queued = TRUE;
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);

-- ─────────────────────────────────────────────────────────────
-- 3. EXTENDER TABLA notifications
-- ─────────────────────────────────────────────────────────────
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read) WHERE is_read = FALSE;

-- ─────────────────────────────────────────────────────────────
-- 4. NUEVA TABLA: tool_history
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tool_history (
  id BIGSERIAL PRIMARY KEY,
  tool_id BIGINT REFERENCES tools(id) ON DELETE SET NULL,
  tool_code TEXT,
  tool_name TEXT,
  action TEXT NOT NULL CHECK (action IN (
    'Prestamo', 'Devolucion', 'Reserva cancelada', 'Mantenimiento',
    'Baja', 'Alta', 'Actualizacion', 'En cola'
  )),
  performed_by TEXT NOT NULL,
  user_role TEXT,
  area TEXT,
  concesionario TEXT,
  notes TEXT,
  evidence_url TEXT,
  request_id BIGINT REFERENCES requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_tool_id ON tool_history(tool_id);
CREATE INDEX IF NOT EXISTS idx_history_date ON tool_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_action ON tool_history(action);
CREATE INDEX IF NOT EXISTS idx_history_concesionario ON tool_history(concesionario);

-- ─────────────────────────────────────────────────────────────
-- 5. NUEVA TABLA: concesionarios
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS concesionarios (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO concesionarios (name, code, color) VALUES
  ('Changan',      'CHA', '#E53E3E'),
  ('Foton',        'FOT', '#3182CE'),
  ('Centromotriz', 'CEN', '#38A169'),
  ('Toyota',       'TOY', '#D69E2E'),
  ('Chevrolet',    'CHE', '#805AD5'),
  ('General',      'GEN', '#718096')
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 6. NUEVA TABLA: push_subscriptions
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

-- ─────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY — NUEVAS TABLAS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE tool_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE concesionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "history_select" ON tool_history;
DROP POLICY IF EXISTS "history_insert" ON tool_history;
CREATE POLICY "history_select" ON tool_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "history_insert" ON tool_history FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "concesionarios_select" ON concesionarios;
DROP POLICY IF EXISTS "concesionarios_insert" ON concesionarios;
DROP POLICY IF EXISTS "concesionarios_update" ON concesionarios;
DROP POLICY IF EXISTS "concesionarios_delete" ON concesionarios;
CREATE POLICY "concesionarios_select" ON concesionarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "concesionarios_insert" ON concesionarios FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'supervisor'));
CREATE POLICY "concesionarios_update" ON concesionarios FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'supervisor'));
CREATE POLICY "concesionarios_delete" ON concesionarios FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "push_select_own" ON push_subscriptions;
DROP POLICY IF EXISTS "push_insert_own" ON push_subscriptions;
DROP POLICY IF EXISTS "push_delete_own" ON push_subscriptions;
DROP POLICY IF EXISTS "push_select_admin" ON push_subscriptions;
CREATE POLICY "push_select_own" ON push_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "push_insert_own" ON push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_delete_own" ON push_subscriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "push_select_admin" ON push_subscriptions FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'supervisor'));

-- ─────────────────────────────────────────────────────────────
-- 8. ACTUALIZAR RLS DE tools — 5 ROLES
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tools_insert" ON tools;
DROP POLICY IF EXISTS "tools_update" ON tools;
DROP POLICY IF EXISTS "tools_delete" ON tools;

CREATE POLICY "tools_insert" ON tools FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'almacenista', 'supervisor'));
CREATE POLICY "tools_update" ON tools FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'almacenista', 'supervisor', 'jefe_taller'));
CREATE POLICY "tools_delete" ON tools FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─────────────────────────────────────────────────────────────
-- 9. ACTUALIZAR RLS DE requests — 5 ROLES
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "requests_update" ON requests;
CREATE POLICY "requests_update" ON requests FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'supervisor', 'jefe_taller', 'almacenista'));

-- ─────────────────────────────────────────────────────────────
-- 10. ACTUALIZAR VISTA dashboard_stats
-- ─────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS dashboard_stats;
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM tools) AS total,
  (SELECT COUNT(*) FROM tools WHERE status = 'Disponible') AS disponible,
  (SELECT COUNT(*) FROM tools WHERE status = 'Prestada') AS prestada,
  (SELECT COUNT(*) FROM tools WHERE status = 'En mantenimiento') AS mantenimiento,
  (SELECT COUNT(*) FROM tools WHERE status = 'Extraviada') AS extraviada,
  (SELECT COUNT(*) FROM requests WHERE status = 'Pendiente') AS pendientes,
  (SELECT COUNT(*) FROM requests WHERE is_queued = TRUE) AS en_cola,
  (SELECT COUNT(*) FROM requests WHERE status = 'Aprobada' AND returned_at IS NULL) AS prestamos_activos;

-- ─────────────────────────────────────────────────────────────
-- 11. FUNCIÓN PARA PROCESAR COLA DE ESPERA
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION process_tool_queue(p_tool_id BIGINT)
RETURNS VOID AS $$
DECLARE
  next_request RECORD;
BEGIN
  SELECT * INTO next_request
  FROM requests
  WHERE tool_id = p_tool_id
    AND is_queued = TRUE
    AND status = 'En cola'
  ORDER BY request_date ASC
  LIMIT 1;

  IF FOUND THEN
    UPDATE requests
    SET is_queued = FALSE,
        queue_position = 0,
        status = 'Pendiente'
    WHERE id = next_request.id;

    INSERT INTO notifications (message, created_by, type)
    VALUES (
      'Tu solicitud para "' || next_request.tool_name || '" esta ahora pendiente de aprobacion.',
      'Sistema',
      'queue_promoted'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- 12. USUARIOS Y ROLES (Ejecutar manualmente por usuario)
-- ─────────────────────────────────────────────────────────────
-- Después de crear usuarios en Authentication > Users, ejecutar:
/*
UPDATE auth.users SET raw_app_meta_data = '{"role":"admin"}' WHERE email = 'admin@ttraks.com';
UPDATE auth.users SET raw_app_meta_data = '{"role":"jefe_taller"}' WHERE email = 'jefe.taller@ttraks.com';
UPDATE auth.users SET raw_app_meta_data = '{"role":"almacenista"}' WHERE email = 'almacenista@ttraks.com';
UPDATE auth.users SET raw_app_meta_data = '{"role":"tecnico"}' WHERE email = 'tecnico1@ttraks.com';
UPDATE auth.users SET raw_app_meta_data = '{"role":"auditor"}' WHERE email = 'auditor@ttraks.com';
-- El supervisor existente puede pasarse a admin:
UPDATE auth.users SET raw_app_meta_data = '{"role":"admin"}' WHERE email = 'supervisor1@ttraks.com';
*/
