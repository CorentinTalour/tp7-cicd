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
* Types detectes :
  * secret JWT code en dur
  * injection SQL
  * utilisation de `eval()` sur une entree utilisateur

**1.2** Lancez l'audit npm :
```bash
npm install && npm audit
```

L'audit npm analyse les dependances du projet et signale les vulnerabilites connues. Dans le pipeline, la commande utilisee est `npm audit --audit-level=high` afin de bloquer la CI uniquement sur les vulnerabilites importantes ou critiques.

**1.3** Lancez gitleaks :
```bash
gitleaks detect --source . --report-format table
```

Gitleaks recherche des secrets dans le depot, par exemple des cles API, tokens ou identifiants presents dans les fichiers ou l'historique Git. Apres nettoyage, aucun secret ne doit etre detecte.

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

Le pipeline echoue au depart car le job SAST detecte des vulnerabilites bloquantes dans `app/server.js`.

**3.2** Corrigez une vulnerabilite dans `app/server.js`, repush.
Le job SAST doit passer pour cette vulnerabilite.

Une injection SQL a ete corrigee en remplacant la concatenation SQL par une requete parametree avec un placeholder `?`.

**3.3** Committez une fausse cle API :
```bash
echo 'const K = "AKIAIOSFODNN7EXAMPLE"' > test-secret.js
git add test-secret.js && git commit -m "test" && git push
```
Le job secret-scan doit echouer. Nettoyez et repoussez.

Le fichier `test-secret.js` a ete supprime apres le test, puis un nouveau commit de nettoyage a ete pousse.
 
---

## Partie 4 — Dependabot (10 min)

**4.1** Analysez `.github/dependabot.yml`. Que fait chaque section ?

La premiere section surveille les dependances `npm` dans le dossier `/app`. Dependabot verifie chaque semaine les mises a jour disponibles, le lundi a 09h dans le fuseau `Europe/Paris`, et ouvre jusqu'a 5 pull requests avec les labels `dependencies` et `security`.

La deuxieme section surveille les dependances des GitHub Actions a la racine du depot. Elle permet de proposer automatiquement des mises a jour pour les actions utilisees dans les workflows, comme `actions/checkout` ou `actions/setup-node`.

**4.2** Dans GitHub, activez Dependabot (Settings > Security).

Dependabot doit etre active dans les parametres de securite du depot GitHub pour ouvrir automatiquement des pull requests de mise a jour.

**4.3** Difference entre `npm audit fix` et Dependabot ?

`npm audit fix` corrige localement les vulnerabilites connues dans les dependances npm en modifiant directement `package-lock.json`, et parfois `package.json`.

Dependabot fonctionne cote GitHub : il surveille le depot et ouvre des pull requests lorsqu'une dependance ou une action GitHub doit etre mise a jour. Les corrections sont donc visibles, testees par la CI et validees avant integration.

---

## Partie 5 — Comparaison (20 min)

Comparez avec `security-corrigee.yml`. Qu'apporte le job `notify` ?

Le job `notify` affiche un resume final de l'etat des autres jobs : SAST, audit de dependances et scan de secrets. Comme il utilise `if: always()`, il s'execute meme si un job precedent echoue. Cela aide a identifier rapidement quelle partie du pipeline a echoue.

Proposez 2 autres jobs de securite possibles (DAST, scan Docker, etc.).

Deux autres jobs de securite possibles :
* DAST avec OWASP ZAP pour tester l'application en fonctionnement via des requetes HTTP.
* Scan Docker avec Trivy ou Grype pour detecter des CVE dans une image Docker.

---

## Questions de validation

1. Qu'est-ce que le principe "Shift Left" en securite ?

Le principe "Shift Left" consiste a integrer la securite le plus tot possible dans le cycle de developpement, des l'ecriture du code et dans la CI, au lieu d'attendre la mise en production ou la fin du projet.

2. Difference entre SAST et DAST ?

Le SAST analyse le code source sans executer l'application. Exemple : Semgrep detecte une injection SQL directement dans le code.

Le DAST teste une application en fonctionnement, comme le ferait un attaquant externe. Exemple : OWASP ZAP envoie des requetes HTTP pour chercher des failles.

3. Pourquoi `--audit-level=high` plutot que `--audit-level=low` ?

`--audit-level=high` permet de bloquer le pipeline uniquement sur les vulnerabilites importantes ou critiques. Avec `low`, la CI risque d'echouer trop souvent sur des problemes mineurs, ce qui peut ralentir l'equipe et rendre les alertes moins utiles.

4. Que risque-t-on si le pipeline est trop strict (trop de faux positifs) ?

Un pipeline trop strict peut produire trop de faux positifs, bloquer des livraisons legitimes, ralentir les developpeurs et pousser l'equipe a ignorer les alertes de securite.
