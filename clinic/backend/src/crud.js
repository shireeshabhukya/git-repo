import { Router } from 'express';
import { query } from './db.js';
import { clean } from './validate.js';
import { notFound, wrap } from './errors.js';

// Generic CRUD router for simple resources (patients, doctors).
export function crudRouter({ table, label, fields, searchCols }) {
  const r = Router(), cols = Object.keys(fields);
  r.get('/', wrap(async (req, res) => {
    const q = (req.query.search || '').trim();
    const where = q ? `WHERE ${searchCols.map((c) => `${c} ILIKE $1`).join(' OR ')}` : '';
    const { rows } = await query(`SELECT * FROM ${table} ${where} ORDER BY name`, q ? [`%${q}%`] : []);
    res.json(rows);
  }));
  r.get('/:id', wrap(async (req, res) => {
    const { rows } = await query(`SELECT * FROM ${table} WHERE id=$1`, [req.params.id]);
    if (!rows[0]) throw notFound(label);
    res.json(rows[0]);
  }));
  r.post('/', wrap(async (req, res) => {
    const d = clean(req.body, { fields }), k = Object.keys(d);
    const { rows } = await query(`INSERT INTO ${table} (${k.join(',')}) VALUES (${k.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`, k.map((c) => d[c]));
    res.status(201).json(rows[0]);
  }));
  const update = wrap(async (req, res) => {
    const d = clean(req.body, { fields, partial: req.method === 'PATCH' }), k = Object.keys(d);
    if (!k.length) return res.status(400).json({ error: { status: 400, message: 'No fields to update' } });
    const { rows } = await query(`UPDATE ${table} SET ${k.map((c, i) => `${c}=$${i + 1}`).join(',')} WHERE id=$${k.length + 1} RETURNING *`, [...k.map((c) => d[c]), req.params.id]);
    if (!rows[0]) throw notFound(label);
    res.json(rows[0]);
  });
  r.put('/:id', update); r.patch('/:id', update);
  // Hard delete; blocked with 409 by the FK if the record has appointments (cancel those first).
  r.delete('/:id', wrap(async (req, res) => {
    const { rowCount } = await query(`DELETE FROM ${table} WHERE id=$1`, [req.params.id]);
    if (!rowCount) throw notFound(label);
    res.status(204).end();
  }));
  return r;
}
