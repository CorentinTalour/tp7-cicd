# TP 7 — Pipeline CI/CD avec Securite Integree

**Duree** : 1h30 | **Outils** : GitHub Actions, Semgrep, npm audit, Dependabot

---

## Objectifs pedagogiques

- Creer un workflow GitHub Actions integrant SAST, audit de dependances et secret scanning
- Faire echouer le pipeline sur des vulnerabilites critiques (fail-fast)
- Configurer Dependabot pour les mises a jour automatiques

---

## Partie 1 — Analyse de l'application cible (15 min)

**1.1** Installez et lancez Semgrep localement :
```bash
cd app && pip install semgrep
semgrep --config=p/javascript --config=p/nodejs .
```
Combien de findings ? De quels types ?
* 3 findings au total
* Tous classés Blocking

**1.2** Lancez l'audit npm :
```bash
npm install && npm audit
```

**1.3** Lancez gitleaks :
```bash
gitleaks detect --source . --report-format table
```

---

## Partie 2 — Creer le workflow (20 min)

Ouvrez `.github/workflows/security-a-completer.yml`.
Completez les sections marquees `# TODO` :

**2.1** Job SAST — commande Semgrep avec `--error` (exit 1 si finding)

**2.2** Job dependency-audit — `npm ci` puis `npm audit --audit-level=high`

**2.3** Job secret-scan — action officielle `gitleaks/gitleaks-action@v2`

---

## Partie 3 — Tester le pipeline (25 min)

**3.1** Poussez sur GitHub. Le pipeline doit echouer. Verifiez l'onglet Actions.

**3.2** Corrigez une vulnerabilite dans `app/server.js`, repush.
Le job SAST doit passer pour cette vulnerabilite.

**3.3** Committez une fausse cle API :
```bash
echo 'const K = "AKIAIOSFODNN7EXAMPLE"' > test-secret.js
git add test-secret.js && git commit -m "test" && git push
```
Le job secret-scan doit echouer. Nettoyez et repoussez.

---

## Partie 4 — Dependabot (10 min)

**4.1** Analysez `.github/dependabot.yml`. Que fait chaque section ?

**4.2** Dans GitHub, activez Dependabot (Settings > Security).

**4.3** Difference entre `npm audit fix` et Dependabot ?

---

## Partie 5 — Comparaison (20 min)

Comparez avec `security-corrigee.yml`. Qu'apporte le job `notify` ?

Proposez 2 autres jobs de securite possibles (DAST, scan Docker, etc.).

---

## Questions de validation

1. Qu'est-ce que le principe "Shift Left" en securite ?
2. Difference entre SAST et DAST ?
3. Pourquoi `--audit-level=high` plutot que `--audit-level=low` ?
4. Que risque-t-on si le pipeline est trop strict (trop de faux positifs) ?
