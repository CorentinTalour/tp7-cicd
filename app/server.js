// ============================================================
// TP 7 — Application avec vulnérabilités intentionnelles
// Ces vulnérabilités doivent être détectées par le pipeline CI/CD
// Node.js >= 22.5.0 requis (node:sqlite intégré)
// ============================================================
'use strict';
const express  = require('express');
const jwt      = require('jsonwebtoken');
const { DatabaseSync } = require('node:sqlite'); // ← intégré, aucune compilation

const app = express();
const db  = new DatabaseSync(':memory:');

db.exec(`
  CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price REAL);
  INSERT INTO products VALUES (1,'Widget',9.99),(2,'Gadget',19.99),(3,'Gizmo',29.99);
`);

app.use(express.json());

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

app.get('/products/search', (req, res) => {
  const q = String(req.query.q || '');
  const results = db.prepare(
    'SELECT * FROM products WHERE name LIKE ?'
  ).all(`%${q}%`);
  res.json({ results });
});

app.post('/auth', (req, res) => {
  const { username } = req.body || {};
  const token = jwt.sign({ username, role: 'user' }, SECRET, { algorithm: 'HS256' });
  res.json({ token });
});

app.get('/admin', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requis' });
  const decoded = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
  if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  res.json({ secret: 'données admin' });
});

function calculateExpression(expression) {
  const tokens = String(expression).match(/\d+(?:\.\d+)?|[()+\-*/]/g);
  if (!tokens || tokens.join('') !== String(expression).replace(/\s+/g, '')) {
    throw new Error('Expression invalide');
  }

  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const values = [];
  const operators = [];

  const applyOperator = () => {
    const operator = operators.pop();
    const right = values.pop();
    const left = values.pop();
    if (left === undefined || right === undefined) throw new Error('Expression invalide');
    if (operator === '+') values.push(left + right);
    if (operator === '-') values.push(left - right);
    if (operator === '*') values.push(left * right);
    if (operator === '/') values.push(left / right);
  };

  for (const token of tokens) {
    if (/^\d/.test(token)) {
      values.push(Number(token));
    } else if (token === '(') {
      operators.push(token);
    } else if (token === ')') {
      while (operators.length && operators[operators.length - 1] !== '(') applyOperator();
      if (operators.pop() !== '(') throw new Error('Expression invalide');
    } else {
      while (
        operators.length &&
        operators[operators.length - 1] !== '(' &&
        precedence[operators[operators.length - 1]] >= precedence[token]
      ) {
        applyOperator();
      }
      operators.push(token);
    }
  }

  while (operators.length) {
    if (operators[operators.length - 1] === '(') throw new Error('Expression invalide');
    applyOperator();
  }

  if (values.length !== 1 || !Number.isFinite(values[0])) throw new Error('Expression invalide');
  return values[0];
}

app.post('/compute', (req, res) => {
  try {
    const result = calculateExpression(req.body?.expression);
    res.json({ result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.listen(3000, () => console.log('[TP7] App sur http://localhost:3000'));
