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

const SECRET = 'secret'; // ❌ Secret JWT faible (détecté par Semgrep rule: hardcoded-secret)

// ❌ VULNÉRABILITÉ 1 : SQL Injection
// Semgrep règle : node.js.injections.node-sqli-injection
app.get('/products/search', (req, res) => {
  const q = req.query.q;
  // La concaténation directe permet des injections SQL
  const results = db.prepare(
    `SELECT * FROM products WHERE name LIKE '%${q}%'`
  ).all();
  res.json({ results });
});

// ❌ VULNÉRABILITÉ 2 : JWT sans vérification d'algorithme
// Semgrep règle : javascript.jsonwebtoken.security.jwt-none-alg
app.post('/auth', (req, res) => {
  const { username } = req.body || {};
  const token = jwt.sign({ username, role: 'user' }, SECRET);
  // Pas d'algorithm: 'HS256' → alg:none possible
  res.json({ token });
});

app.get('/admin', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requis' });
  const decoded = jwt.verify(token, SECRET); // ❌ pas de { algorithms: ['HS256'] }
  if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  res.json({ secret: 'données admin' });
});

// ❌ VULNÉRABILITÉ 3 : eval() sur input utilisateur
// Semgrep règle : javascript.lang.security.audit.eval-detected
app.post('/compute', (req, res) => {
  const { expression } = req.body;
  const result = eval(expression); // ← Semgrep doit détecter ceci
  res.json({ result });
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.listen(3000, () => console.log('[TP7] App sur http://localhost:3000'));
