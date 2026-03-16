import { Router, Request, Response } from 'express';
import db from '../database/db';
import { v4 as uuid } from 'uuid';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { ativo, origem_id, destino_id, produto_id, fornecedor_id } = req.query;
  let sql = `
    SELECT p.*,
      o.nome as origem_nome, o.cidade as origem_cidade,
      d.nome as destino_nome, d.cidade as destino_cidade,
      pr.nome as produto_nome, pr.tipo as produto_tipo,
      f.nome as fornecedor_nome
    FROM precos_contratados p
    LEFT JOIN locais o ON o.id = p.origem_id
    LEFT JOIN locais d ON d.id = p.destino_id
    LEFT JOIN produtos pr ON pr.id = p.produto_id
    LEFT JOIN fornecedores f ON f.id = p.fornecedor_id
  `;
  const conditions: string[] = [];
  const params: any[] = [];

  if (ativo !== undefined) {
    conditions.push('p.ativo = ?');
    params.push(Number(ativo));
  }
  if (origem_id) {
    conditions.push('p.origem_id = ?');
    params.push(origem_id);
  }
  if (destino_id) {
    conditions.push('p.destino_id = ?');
    params.push(destino_id);
  }
  if (produto_id) {
    conditions.push('p.produto_id = ?');
    params.push(produto_id);
  }
  if (fornecedor_id) {
    conditions.push('p.fornecedor_id = ?');
    params.push(fornecedor_id);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY o.nome, d.nome, pr.nome';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.get('/:id', (req: Request, res: Response) => {
  const row = db.prepare(`
    SELECT p.*,
      o.nome as origem_nome, o.cidade as origem_cidade,
      d.nome as destino_nome, d.cidade as destino_cidade,
      pr.nome as produto_nome, pr.tipo as produto_tipo,
      f.nome as fornecedor_nome
    FROM precos_contratados p
    LEFT JOIN locais o ON o.id = p.origem_id
    LEFT JOIN locais d ON d.id = p.destino_id
    LEFT JOIN produtos pr ON pr.id = p.produto_id
    LEFT JOIN fornecedores f ON f.id = p.fornecedor_id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Preço não encontrado' });
  res.json(row);
});

router.post('/', (req: Request, res: Response) => {
  const { origem_id, destino_id, produto_id, fornecedor_id, valor, unidade_preco, distancia_km, vigencia_inicio, vigencia_fim, observacoes } = req.body;
  if (!origem_id || !destino_id || !produto_id || valor === undefined) {
    return res.status(400).json({ error: 'Origem, destino, produto e valor são obrigatórios' });
  }

  const id = uuid();
  db.prepare(`
    INSERT INTO precos_contratados (id, origem_id, destino_id, produto_id, fornecedor_id, valor, unidade_preco, distancia_km, vigencia_inicio, vigencia_fim, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, origem_id, destino_id, produto_id, fornecedor_id || null, valor, unidade_preco || 'R$/ton', distancia_km || null, vigencia_inicio || null, vigencia_fim || null, observacoes || null);

  const row = db.prepare(`
    SELECT p.*,
      o.nome as origem_nome, d.nome as destino_nome,
      pr.nome as produto_nome, f.nome as fornecedor_nome
    FROM precos_contratados p
    LEFT JOIN locais o ON o.id = p.origem_id
    LEFT JOIN locais d ON d.id = p.destino_id
    LEFT JOIN produtos pr ON pr.id = p.produto_id
    LEFT JOIN fornecedores f ON f.id = p.fornecedor_id
    WHERE p.id = ?
  `).get(id);
  res.status(201).json(row);
});

router.put('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM precos_contratados WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Preço não encontrado' });

  const { origem_id, destino_id, produto_id, fornecedor_id, valor, unidade_preco, distancia_km, vigencia_inicio, vigencia_fim, observacoes, ativo } = req.body;
  if (!origem_id || !destino_id || !produto_id || valor === undefined) {
    return res.status(400).json({ error: 'Origem, destino, produto e valor são obrigatórios' });
  }

  db.prepare(`
    UPDATE precos_contratados SET origem_id=?, destino_id=?, produto_id=?, fornecedor_id=?, valor=?, unidade_preco=?, distancia_km=?, vigencia_inicio=?, vigencia_fim=?, observacoes=?, ativo=?, updated_at=datetime('now','localtime')
    WHERE id=?
  `).run(origem_id, destino_id, produto_id, fornecedor_id || null, valor, unidade_preco || 'R$/ton', distancia_km || null, vigencia_inicio || null, vigencia_fim || null, observacoes || null, ativo ?? 1, req.params.id);

  const row = db.prepare(`
    SELECT p.*,
      o.nome as origem_nome, d.nome as destino_nome,
      pr.nome as produto_nome, f.nome as fornecedor_nome
    FROM precos_contratados p
    LEFT JOIN locais o ON o.id = p.origem_id
    LEFT JOIN locais d ON d.id = p.destino_id
    LEFT JOIN produtos pr ON pr.id = p.produto_id
    LEFT JOIN fornecedores f ON f.id = p.fornecedor_id
    WHERE p.id = ?
  `).get(req.params.id);
  res.json(row);
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM precos_contratados WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Preço não encontrado' });

  db.prepare('DELETE FROM precos_contratados WHERE id = ?').run(req.params.id);
  res.json({ message: 'Preço removido com sucesso' });
});

export default router;
