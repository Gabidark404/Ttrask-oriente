-- ============================================
-- TTRAKS ORIENTE - Esquema Supabase (PostgreSQL)
-- Versión final corregida (22 Jun 2026)
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================

-- 1. TABLA DE HERRAMIENTAS
CREATE TABLE IF NOT EXISTS tools (
    id BIGSERIAL PRIMARY KEY,
    item INTEGER,
    code TEXT UNIQUE NOT NULL,
    codification TEXT,
    description TEXT NOT NULL,
    brand TEXT,
    quantity INTEGER DEFAULT 0,
    available INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Disponible' CHECK (status IN (
        'Disponible', 'Prestada', 'Reservada', 'En mantenimiento', 'Extraviada', 'Fuera de servicio'
    )),
    location TEXT,
    last_update TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tools_code ON tools(code);
CREATE INDEX IF NOT EXISTS idx_tools_status ON tools(status);
CREATE INDEX IF NOT EXISTS idx_tools_brand ON tools(brand);

-- 2. TABLA DE SOLICITUDES (usa requested_by, NO "user" que es palabra reservada)
CREATE TABLE IF NOT EXISTS requests (
    id BIGSERIAL PRIMARY KEY,
    tool_id BIGINT REFERENCES tools(id) ON DELETE SET NULL,
    tool_name TEXT,
    requested_by TEXT DEFAULT 'Tecnico de Guardia',
    reason TEXT NOT NULL,
    estimated_return TIMESTAMPTZ,
    request_date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'Aprobada', 'Rechazada'))
);

CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_tool_id ON requests(tool_id);
CREATE INDEX IF NOT EXISTS idx_requests_date ON requests(request_date DESC);

-- 3. TABLA DE NOTIFICACIONES (usa created_by, NO "user")
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    created_by TEXT DEFAULT 'Sistema',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_date ON notifications(created_at DESC);

-- 4. ROW LEVEL SECURITY
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Limpiar politicas viejas
DROP POLICY IF EXISTS "tools_select_authenticated" ON tools;
DROP POLICY IF EXISTS "tools_modify_supervisor" ON tools;
DROP POLICY IF EXISTS "tools_insert_supervisor" ON tools;
DROP POLICY IF EXISTS "tools_update_supervisor" ON tools;
DROP POLICY IF EXISTS "tools_delete_supervisor" ON tools;
DROP POLICY IF EXISTS "requests_select_authenticated" ON requests;
DROP POLICY IF EXISTS "requests_insert_authenticated" ON requests;
DROP POLICY IF EXISTS "requests_update_supervisor" ON requests;
DROP POLICY IF EXISTS "notifications_select_authenticated" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON notifications;

-- TOOLS: todos pueden ver, solo supervisor puede insertar/modificar/eliminar
CREATE POLICY "tools_select" ON tools FOR SELECT TO authenticated USING (true);
CREATE POLICY "tools_insert" ON tools FOR INSERT TO authenticated
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'supervisor');
CREATE POLICY "tools_update" ON tools FOR UPDATE TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'supervisor');
CREATE POLICY "tools_delete" ON tools FOR DELETE TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'supervisor');

-- REQUESTS: todos ven/crean, solo supervisor actualiza
CREATE POLICY "requests_select" ON requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "requests_insert" ON requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "requests_update" ON requests FOR UPDATE TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'supervisor');

-- NOTIFICATIONS: todos ven/crean
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

-- 5. TRIGGER para actualizar last_update
CREATE OR REPLACE FUNCTION update_last_update_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_update = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tools_last_update ON tools;
CREATE TRIGGER update_tools_last_update
    BEFORE UPDATE ON tools
    FOR EACH ROW
    EXECUTE FUNCTION update_last_update_column();

-- 6. FUNCION PARA OBTENER ROL
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (auth.jwt() -> 'app_metadata' ->> 'role');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. VISTA DASHBOARD
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM tools) AS total,
    (SELECT COUNT(*) FROM tools WHERE status = 'Disponible') AS disponible,
    (SELECT COUNT(*) FROM tools WHERE status = 'Prestada') AS prestada,
    (SELECT COUNT(*) FROM tools WHERE status = 'En mantenimiento') AS mantenimiento,
    (SELECT COUNT(*) FROM tools WHERE status = 'Extraviada') AS extraviada,
    (SELECT COUNT(*) FROM requests WHERE status = 'Pendiente') AS pendientes;