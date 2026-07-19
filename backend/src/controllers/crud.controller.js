import { asyncHandler } from '../middleware/asyncHandler.js';

const BLOCKED_WRITE_FIELDS = new Set([
  'password_hash', 'role', '__v', '_id',
]);

const BLOCKED_QUERY_PREFIXES = /^\$/;

// Escape user input before placing it in a $regex to prevent ReDoS
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sanitizeFilters = (raw) => {
  const clean = {};
  for (const [key, value] of Object.entries(raw)) {
    if (BLOCKED_QUERY_PREFIXES.test(key)) continue;
    if (typeof value === 'object' && value !== null) continue;
    // Query strings are always strings — coerce booleans so filters like
    // ?is_promoted=true match Mongo's boolean fields
    clean[key] = value === 'true' ? true : value === 'false' ? false : value;
  }
  return clean;
};

const sanitizeBody = (body) => {
  const clean = {};
  for (const [key, value] of Object.entries(body)) {
    if (!BLOCKED_WRITE_FIELDS.has(key) && !BLOCKED_QUERY_PREFIXES.test(key)) {
      clean[key] = value;
    }
  }
  return clean;
};

export const makeCrudController = (model, populateFields = []) => {
  const getList = asyncHandler(async (req, res) => {
    const {
      _start = '0',
      _end = '10',
      _sort = 'created_at',
      _order = 'DESC',
      q,
      ...rawFilters
    } = req.query;

    const skip = Math.max(0, parseInt(_start, 10) || 0);
    const endVal = parseInt(_end, 10) || 10;
    const limit = Math.min(Math.max(endVal - skip, 1), 100);

    const sort = { [_sort]: _order === 'ASC' ? 1 : -1 };
    const query = {};

    if (q && typeof q === 'string' && q.trim()) {
      const safe = escapeRegex(q.trim());
      query['$or'] = [
        { name: { $regex: safe, $options: 'i' } },
        { title: { $regex: safe, $options: 'i' } },
        { full_name: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
      ];
    }

    const filters = sanitizeFilters(rawFilters);
    for (const [key, value] of Object.entries(filters)) {
      query[key] = value;
    }

    const [docs, total] = await Promise.all([
      model.find(query).sort(sort).skip(skip).limit(limit),
      model.countDocuments(query),
    ]);

    res.setHeader('X-Total-Count', total);
    res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
    res.json(docs);
  });

  const getOne = asyncHandler(async (req, res) => {
    let q = model.findById(req.params.id);
    for (const f of populateFields) q = q.populate(f);
    const doc = await q;

    if (!doc) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ressource introuvable' } });
      return;
    }
    res.json(doc);
  });

  const create = asyncHandler(async (req, res) => {
    const safeBody = sanitizeBody(req.body);
    const doc = await model.create(safeBody);
    res.status(201).json(doc);
  });

  const update = asyncHandler(async (req, res) => {
    const safeBody = sanitizeBody(req.body);
    const doc = await model.findByIdAndUpdate(req.params.id, safeBody, { new: true, runValidators: true });
    if (!doc) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ressource introuvable' } });
      return;
    }
    res.json(doc);
  });

  const remove = asyncHandler(async (req, res) => {
    const doc = await model.findByIdAndDelete(req.params.id);
    if (!doc) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ressource introuvable' } });
      return;
    }
    res.json(doc);
  });

  return { getList, getOne, create, update, remove };
};
