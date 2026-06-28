const STATUS_VALUES = ['Disponible', 'Prestada', 'Reservada', 'En mantenimiento', 'Extraviada', 'Fuera de servicio'];

function buildToolResponse(data) {
  return data.map(item => ({
    id: item.id,
    item: item.item,
    code: item.code,
    codification: item.codification,
    description: item.description,
    brand: item.brand,
    quantity: item.quantity,
    available: item.available,
    status: item.status,
    location: item.location,
    lastUpdate: item.last_update
  }));
}

exports.getTools = async (req, res) => {
  try {
    const { status, search, brand, code, codification, limit = 100, offset = 0 } = req.query;

    let query = req.supabase
      .from('tools')
      .select('*', { count: 'exact' })
      .order('last_update', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (code) query = query.ilike('code', `%${code}%`);
    if (brand) query = query.ilike('brand', `%${brand}%`);
    if (codification) query = query.ilike('codification', `%${codification}%`);
    if (search) {
      query = query.or(`description.ilike.%${search}%,brand.ilike.%${search}%,code.ilike.%${search}%,codification.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      data: buildToolResponse(data),
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    console.error('Error getTools:', err);
    res.status(500).json({ error: 'Error al obtener herramientas', details: err.message });
  }
};

exports.getToolById = async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('tools')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Herramienta no encontrada' });
    res.json(buildToolResponse([data])[0]);
  } catch (err) {
    console.error('Error getToolById:', err);
    res.status(500).json({ error: 'Error al obtener herramienta' });
  }
};

exports.getToolByCode = async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('tools')
      .select('*')
      .eq('code', req.params.code)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Herramienta no encontrada' });
    res.json(buildToolResponse([data])[0]);
  } catch (err) {
    console.error('Error getToolByCode:', err);
    res.status(500).json({ error: 'Error al obtener herramienta' });
  }
};

exports.createTool = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'El código es obligatorio' });

    const { data: existing } = await req.supabase
      .from('tools')
      .select('id')
      .eq('code', code)
      .single();
    if (existing) return res.status(409).json({ error: 'Ya existe una herramienta con este código' });

    const tool = {
      item: req.body.item,
      code,
      codification: req.body.codification,
      description: req.body.description,
      brand: req.body.brand,
      quantity: req.body.quantity || 0,
      available: req.body.available !== undefined ? req.body.available : (req.body.quantity || 0),
      status: req.body.status || 'Disponible',
      location: req.body.location,
      last_update: new Date().toISOString()
    };

    if (!STATUS_VALUES.includes(tool.status)) {
      return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${STATUS_VALUES.join(', ')}` });
    }

    const { data, error } = await req.supabase
      .from('tools')
      .insert([tool])
      .select()
      .single();
    if (error) throw error;

    res.status(201).json(buildToolResponse([data])[0]);
  } catch (err) {
    console.error('Error createTool:', err);
    res.status(500).json({ error: 'Error al crear herramienta', details: err.message });
  }
};

exports.updateTool = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, last_update: new Date().toISOString() };
    delete updates.id;
    delete updates.created_at;

    if (updates.status && !STATUS_VALUES.includes(updates.status)) {
      return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${STATUS_VALUES.join(', ')}` });
    }

    const { data, error } = await req.supabase
      .from('tools')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Herramienta no encontrada' });

    res.json(buildToolResponse([data])[0]);
  } catch (err) {
    console.error('Error updateTool:', err);
    res.status(500).json({ error: 'Error al actualizar herramienta', details: err.message });
  }
};

exports.deleteTool = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await req.supabase.from('tools').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Herramienta eliminada' });
  } catch (err) {
    console.error('Error deleteTool:', err);
    res.status(500).json({ error: 'Error al eliminar herramienta' });
  }
};

exports.updateToolStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !STATUS_VALUES.includes(status)) {
      return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${STATUS_VALUES.join(', ')}` });
    }

    const { data, error } = await req.supabase
      .from('tools')
      .update({ status, last_update: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Herramienta no encontrada' });

    res.json(buildToolResponse([data])[0]);
  } catch (err) {
    console.error('Error updateToolStatus:', err);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
};

exports.getDashboardData = async (req, res) => {
  try {
    const [
      { count: total, error: err1 },
      { count: disponible, error: err2 },
      { count: prestada, error: err3 },
      { count: mantenimiento, error: err4 },
      { count: extraviada, error: err5 },
      { count: pendientes, error: err6 }
    ] = await Promise.all([
      req.supabase.from('tools').select('id', { count: 'exact', head: true }),
      req.supabase.from('tools').select('id', { count: 'exact', head: true }).eq('status', 'Disponible'),
      req.supabase.from('tools').select('id', { count: 'exact', head: true }).eq('status', 'Prestada'),
      req.supabase.from('tools').select('id', { count: 'exact', head: true }).eq('status', 'En mantenimiento'),
      req.supabase.from('tools').select('id', { count: 'exact', head: true }).eq('status', 'Extraviada'),
      req.supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'Pendiente')
    ]);

    if (err1 || err2 || err3 || err4 || err5 || err6) {
      throw err1 || err2 || err3 || err4 || err5 || err6;
    }

    res.json({
      total,
      disponible,
      prestada,
      mantenimiento,
      extraviada,
      pendientes
    });
  } catch (err) {
    console.error('Error getDashboardData:', err);
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
};