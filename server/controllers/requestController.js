function buildRequestResponse(data) {
  if (!data) return null;
  if (Array.isArray(data)) return data.map(buildRequestResponse);
  return {
    id: data.id,
    toolId: data.tool_id,
    toolName: data.tool_name,
    user: data.requested_by,
    reason: data.reason,
    estimatedReturnDate: data.estimated_return,
    requestDate: data.request_date,
    status: data.status,
    tool: data.tools ? {
      id: data.tools.id,
      code: data.tools.code,
      description: data.tools.description,
      available: data.tools.available,
      status: data.tools.status
    } : undefined
  };
}

const REQUEST_STATUS = ['Pendiente', 'Aprobada', 'Rechazada'];

exports.createRequest = async (req, res) => {
  try {
    const { code, reason, estimatedReturnDate, user } = req.body;
    if (!code || !reason) {
      return res.status(400).json({ error: 'Código de herramienta y motivo son obligatorios' });
    }

    const { data: tool, error: toolErr } = await req.supabase
      .from('tools')
      .select('*')
      .eq('code', code)
      .single();
    if (toolErr) return res.status(404).json({ error: 'Herramienta no encontrada' });

    if (tool.status !== 'Disponible' || tool.available <= 0) {
      return res.status(400).json({ error: 'Herramienta no disponible para préstamo' });
    }

    const newRequest = {
      tool_id: tool.id,
      tool_name: tool.description,
      requested_by: user || req.user?.email || 'Técnico de Guardia',
      reason,
      estimated_return: estimatedReturnDate ? new Date(estimatedReturnDate).toISOString() : null,
      status: 'Pendiente'
    };

    const { data: request, error: reqErr } = await req.supabase
      .from('requests')
      .insert([newRequest])
      .select()
      .single();
    if (reqErr) throw reqErr;

    await req.supabase.from('notifications').insert([{
      message: `Nueva solicitud: ${tool.description} por ${newRequest.requested_by}`,
      created_by: newRequest.requested_by
    }]);

    res.status(201).json({ requestId: request.id, request: buildRequestResponse(request) });
  } catch (err) {
    console.error('Error createRequest:', err);
    res.status(500).json({ error: 'Error al crear solicitud', details: err.message });
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !REQUEST_STATUS.includes(status)) {
      return res.status(400).json({ error: `Estado inválido. Valores: ${REQUEST_STATUS.join(', ')}` });
    }

    const { data: request, error: reqErr } = await req.supabase
      .from('requests')
      .select('*, tools(*)')
      .eq('id', id)
      .single();
    if (reqErr) return res.status(404).json({ error: 'Solicitud no encontrada' });

    const { data: updatedRequest, error: updErr } = await req.supabase
      .from('requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (updErr) throw updErr;

    const tool = request.tools;

    if (status === 'Rechazada' && tool) {
      await req.supabase
        .from('tools')
        .update({
          available: Math.min(tool.available + 1, tool.quantity),
          status: 'Disponible',
          last_update: new Date().toISOString()
        })
        .eq('id', tool.id);
    }

    if (status === 'Aprobada' && tool) {
      await req.supabase
        .from('tools')
        .update({
          status: 'Prestada',
          last_update: new Date().toISOString()
        })
        .eq('id', tool.id);
    }

    const action = status === 'Aprobada' ? 'aprobada' : 'rechazada';
    await req.supabase.from('notifications').insert([{
      message: `Solicitud ${action}: ${request.tool_name} (${request.requested_by})`,
      created_by: req.user?.email || 'Supervisor'
    }]);

    res.json({ status, request: buildRequestResponse(updatedRequest) });
  } catch (err) {
    console.error('Error updateRequestStatus:', err);
    res.status(500).json({ error: 'Error al actualizar solicitud', details: err.message });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = req.supabase
      .from('requests')
      .select('*, tools(*)', { count: 'exact' })
      .order('request_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      data: buildRequestResponse(data),
      pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (err) {
    console.error('Error getRequests:', err);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

exports.getRequestById = async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('requests')
      .select('*, tools(*)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json(buildRequestResponse(data));
  } catch (err) {
    console.error('Error getRequestById:', err);
    res.status(500).json({ error: 'Error al obtener solicitud' });
  }
};