import { Router, Request, Response } from 'express';
import db from '../database/db';
import { v4 as uuid } from 'uuid';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { ativo, fornecedor_id, busca } = req.query;
  let sql = `
    SELECT v.*, f.nome as fornecedor_nome
    FROM veiculos v
    LEFT JOIN fornecedores f ON f.id = v.fornecedor_id
  `;
  const conditions: string[] = [];
  const params: any[] = [];

  if (ativo !== undefined) {
    conditions.push('v.ativo = ?');
    params.push(Number(ativo));
  }
  if (fornecedor_id) {
    conditions.push('v.fornecedor_id = ?');
    params.push(fornecedor_id);
  }
  if (busca) {
    conditions.push('(v.placa LIKE ? OR v.marca LIKE ? OR v.modelo LIKE ? OR f.nome LIKE ?)');
    const term = `%${busca}%`;
    params.push(term, term, term, term);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY f.nome, v.placa';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.get('/:id', (req: Request, res: Response) => {
  const row = db.prepare(`
    SELECT v.*, f.nome as fornecedor_nome
    FROM veiculos v
    LEFT JOIN fornecedores f ON f.id = v.fornecedor_id
    WHERE v.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Veículo não encontrado' });
  res.json(row);
});

router.post('/', (req: Request, res: Response) => {
  const { fornecedor_id, placa, tipo, marca, modelo, ano, capacidade_kg, observacoes } = req.body;
  if (!fornecedor_id || !placa || !tipo) {
    return res.status(400).json({ error: 'Fornecedor, placa e tipo são obrigatórios' });
  }

  const id = uuid();
  db.prepare(`
    INSERT INTO veiculos (id, fornecedor_id, placa, tipo, marca, modelo, ano, capacidade_kg, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, fornecedor_id, placa.toUpperCase(), tipo, marca || null, modelo || null, ano || null, capacidade_kg || null, observacoes || null);

  const row = db.prepare(`
    SELECT v.*, f.nome as fornecedor_nome
    FROM veiculos v LEFT JOIN fornecedores f ON f.id = v.fornecedor_id
    WHERE v.id = ?
  `).get(id);
  res.status(201).json(row);
});

router.put('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM veiculos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Veículo não encontrado' });

  const { fornecedor_id, placa, tipo, marca, modelo, ano, capacidade_kg, observacoes, ativo } = req.body;
  if (!fornecedor_id || !placa || !tipo) {
    return res.status(400).json({ error: 'Fornecedor, placa e tipo são obrigatórios' });
  }

  db.prepare(`
    UPDATE veiculos SET fornecedor_id=?, placa=?, tipo=?, marca=?, modelo=?, ano=?, capacidade_kg=?, observacoes=?, ativo=?, updated_at=datetime('now','localtime')
    WHERE id=?
  `).run(fornecedor_id, placa.toUpperCase(), tipo, marca || null, modelo || null, ano || null, capacidade_kg || null, observacoes || null, ativo ?? 1, req.params.id);

  const row = db.prepare(`
    SELECT v.*, f.nome as fornecedor_nome
    FROM veiculos v LEFT JOIN fornecedores f ON f.id = v.fornecedor_id
    WHERE v.id = ?
  `).get(req.params.id);
  res.json(row);
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM veiculos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Veículo não encontrado' });

  db.prepare('DELETE FROM veiculos WHERE id = ?').run(req.params.id);
  res.json({ message: 'Veículo removido com sucesso' });
});

export default router;
