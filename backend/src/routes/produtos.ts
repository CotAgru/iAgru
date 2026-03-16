import { Router, Request, Response } from 'express';
import db from '../database/db';
import { v4 as uuid } from 'uuid';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { ativo, tipo, busca } = req.query;
  let sql = 'SELECT * FROM produtos';
  const conditions: string[] = [];
  const params: any[] = [];

  if (ativo !== undefined) {
    conditions.push('ativo = ?');
    params.push(Number(ativo));
  }
  if (tipo) {
    conditions.push('tipo = ?');
    params.push(tipo);
  }
  if (busca) {
    conditions.push('nome LIKE ?');
    params.push(`%${busca}%`);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY tipo, nome';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.get('/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json(row);
});

router.post('/', (req: Request, res: Response) => {
  const { nome, tipo, unidade_medida, observacoes } = req.body;
  if (!nome || !tipo) return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });

  const id = uuid();
  db.prepare(`
    INSERT INTO produtos (id, nome, tipo, unidade_medida, observacoes)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, nome, tipo, unidade_medida || 'ton', observacoes || null);

  const row = db.prepare('SELECT * FROM produtos WHERE id = ?').get(id);
  res.status(201).json(row);
});

router.put('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Produto não encontrado' });

  const { nome, tipo, unidade_medida, observacoes, ativo } = req.body;
  if (!nome || !tipo) return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });

  db.prepare(`
    UPDATE produtos SET nome=?, tipo=?, unidade_medida=?, observacoes=?, ativo=?, updated_at=datetime('now','localtime')
    WHERE id=?
  `).run(nome, tipo, unidade_medida || 'ton', observacoes || null, ativo ?? 1, req.params.id);

  const row = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  res.json(row);
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Produto não encontrado' });

  db.prepare('DELETE FROM produtos WHERE id = ?').run(req.params.id);
  res.json({ message: 'Produto removido com sucesso' });
});

export default router;
