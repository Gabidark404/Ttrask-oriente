const supabase = require('../config/supabase');

exports.getAll = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    let query = req.supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      data: data.map(n => ({
        id: n.id,
        message: n.message,
        user: n.created_by,
        createdAt: n.created_at
      })),
      pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (err) {
    console.error('Error getAll notifications:', err);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
};

exports.create = async (req, res) => {
  try {
    const { message, user } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensaje obligatorio' });

    const { data, error } = await req.supabase
      .from('notifications')
      .insert([{ message, created_by: user || 'Sistema' }])
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({ id: data.id, message: data.message, user: data.created_by, createdAt: data.created_at });
  } catch (err) {
    console.error('Error create notification:', err);
    res.status(500).json({ error: 'Error al crear notificación' });
  }
};

exports.markAsRead = async (req, res) => {
  res.json({ success: true, message: 'Funcionalidad pendiente' });
};