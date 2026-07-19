import { API_URL, httpClient } from './httpClient';

const normalizeRecord = (record) => ({
  ...record,
  id: record._id ?? record.id,
});

const parseTotal = (headers) => {
  const v = headers.get('x-total-count') ?? headers.get('X-Total-Count') ?? '0';
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
};

const toArray = (json) => Array.isArray(json) ? json : [];

export const dataProvider = {
  getList: async (resource, params) => {
    const { page = 1, perPage = 10 } = params.pagination ?? {};
    const { field = 'created_at', order = 'DESC' } = params.sort ?? {};
    const start = (page - 1) * perPage;
    const end = start + perPage;

    const query = new URLSearchParams({
      _start: String(start),
      _end: String(end),
      _sort: field,
      _order: order,
      ...(params.filter?.q ? { q: params.filter.q } : {}),
      ...Object.fromEntries(
        Object.entries(params.filter ?? {})
          .filter(([k]) => k !== 'q')
          .map(([k, v]) => [k, String(v)])
      ),
    });

    const { headers, json } = await httpClient(`${API_URL}/${resource}?${query}`);
    return { data: toArray(json).map(normalizeRecord), total: parseTotal(headers) };
  },

  getOne: async (resource, params) => {
    const { json } = await httpClient(`${API_URL}/${resource}/${params.id}`);
    return { data: normalizeRecord(json) };
  },

  getMany: async (resource, params) => {
    const results = await Promise.all(
      params.ids.map((id) => httpClient(`${API_URL}/${resource}/${id}`))
    );
    return { data: results.map((r) => normalizeRecord(r.json)) };
  },

  getManyReference: async (resource, params) => {
    const { page = 1, perPage = 10 } = params.pagination ?? {};
    const { field = 'created_at', order = 'DESC' } = params.sort ?? {};
    const start = (page - 1) * perPage;
    const end = start + perPage;

    const query = new URLSearchParams({
      _start: String(start),
      _end: String(end),
      _sort: field,
      _order: order,
      [params.target]: String(params.id),
    });

    const { headers, json } = await httpClient(`${API_URL}/${resource}?${query}`);
    return { data: toArray(json).map(normalizeRecord), total: parseTotal(headers) };
  },

  create: async (resource, params) => {
    const { json } = await httpClient(`${API_URL}/${resource}`, {
      method: 'POST',
      body: JSON.stringify(params.data),
    });
    return { data: normalizeRecord(json) };
  },

  update: async (resource, params) => {
    // The backend strips role/is_banned/is_premium from PUT /users/:id —
    // those changes must go through the dedicated PATCH endpoints
    // (explicit admin intent)
    if (resource === 'users') {
      const { role, is_banned, is_premium, ...rest } = params.data;
      const prev = params.previousData ?? {};

      let { json } = await httpClient(`${API_URL}/users/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(rest),
      });

      if (role !== undefined && role !== prev.role) {
        ({ json } = await httpClient(`${API_URL}/users/${params.id}/role`, {
          method: 'PATCH',
          body: JSON.stringify({ role }),
        }));
      }
      if (is_banned !== undefined && is_banned !== prev.is_banned) {
        ({ json } = await httpClient(`${API_URL}/users/${params.id}/ban`, {
          method: 'PATCH',
          body: JSON.stringify({ is_banned }),
        }));
      }
      if (is_premium !== undefined && is_premium !== prev.is_premium) {
        ({ json } = await httpClient(`${API_URL}/users/${params.id}/premium`, {
          method: 'PATCH',
          body: JSON.stringify({ is_premium }),
        }));
      }
      return { data: normalizeRecord(json) };
    }

    // Same pattern for event promotion (PUT /events/:id ignores is_promoted)
    if (resource === 'events') {
      const { is_promoted, ...rest } = params.data;
      const prev = params.previousData ?? {};

      let { json } = await httpClient(`${API_URL}/events/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(rest),
      });

      if (is_promoted !== undefined && is_promoted !== prev.is_promoted) {
        const res = await httpClient(`${API_URL}/events/${params.id}/promote`, {
          method: 'PATCH',
          body: JSON.stringify({ is_promoted }),
        });
        json = res.json.data ?? res.json;
      }
      return { data: normalizeRecord(json) };
    }

    const { json } = await httpClient(`${API_URL}/${resource}/${params.id}`, {
      method: 'PUT',
      body: JSON.stringify(params.data),
    });
    return { data: normalizeRecord(json) };
  },

  updateMany: async (resource, params) => {
    await Promise.all(
      params.ids.map((id) =>
        httpClient(`${API_URL}/${resource}/${id}`, {
          method: 'PUT',
          body: JSON.stringify(params.data),
        })
      )
    );
    return { data: params.ids };
  },

  delete: async (resource, params) => {
    const { json } = await httpClient(`${API_URL}/${resource}/${params.id}`, { method: 'DELETE' });
    return { data: normalizeRecord(json) };
  },

  deleteMany: async (resource, params) => {
    await Promise.all(
      params.ids.map((id) => httpClient(`${API_URL}/${resource}/${id}`, { method: 'DELETE' }))
    );
    return { data: params.ids };
  },
};
