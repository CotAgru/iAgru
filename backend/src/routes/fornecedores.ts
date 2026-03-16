import { Router, Request, Response } from 'express';
import db from '../database/db';
import { v4 as uuid } from 'uuid';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { ativo, busca } = req.query;
  let sql = 'SELECT * FROM fornecedores';
  const conditions: string[] = [];
  const params: any[] = [];

  if (ativo !== undefined) {
    conditions.push('ativo = ?');
    params.push(Number(ativo));
  }
  if (busca) {
    conditions.push('(nome LIKE ? OR cpf_cnpj LIKE ? OR cidade LIKE ?)');
    const term = `%${busca}%`;
    params.push(term, term, term);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY nome';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.get('/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Fornecedor não encontrado' });
  res.json(row);
});

router.post('/', (req: Request, res: Response) => {
  const { nome, cpf_cnpj, telefone, email, endereco, cidade, estado, observacoes } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  const id = uuid();
  db.prepare(`
    INSERT INTO fornecedores (id, nome, cpf_cnpj, telefone, email, endereco, cidade, estado, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, nome, cpf_cnpj || null, telefone || null, email || null, endereco || null, cidade || null, estado || null, observacoes || null);

  const row = db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(id);
  res.status(201).json(row);
});

router.put('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Fornecedor não encontrado' });

  const { nome, cpf_cnpj, telefone, email, endereco, cidade, estado, observacoes, ativo } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  db.prepare(`
    UPDATE fornecedores SET nome=?, cpf_cnpj=?, telefone=?, email=?, endereco=?, cidade=?, estado=?, observacoes=?, ativo=?, updated_at=datetime('now','localtime')
    WHERE id=?
  `).run(nome, cpf_cnpj || null, telefone || null, email || null, endereco || null, cidade || null, estado || null, observacoes || null, ativo ?? 1, req.params.id);

  const row = db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(req.params.id);
  res.json(row);
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Fornecedor não encontrado' });

  db.prepare('DELETE FROM fornecedores WHERE id = ?').run(req.params.id);
  res.json({ message: 'Fornecedor removido com sucesso' });
});

export default router;
