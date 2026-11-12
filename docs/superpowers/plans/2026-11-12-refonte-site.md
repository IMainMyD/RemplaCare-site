# Refonte du site RemplaCare — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Remplacer le site HTML copié-collé par un site Eleventy à barre et pied de page uniques, avec le nouveau hero + carrousel (maquette A v3), la page « Nos solutions » Gratuit / Pro, le vouvoiement et la nouvelle palette partout.

**Architecture :** Eleventy 3 (sortie HTML pure) assemble des pages `.njk` à partir d'un gabarit `base.njk` et de deux inclusions (`nav.njk`, `footer.njk`). Les pages existantes sont d'abord migrées à l'identique (passthrough), puis converties une à une. Le carrousel est un petit module pur (`carousel-core.js`, testé en Node) piloté par une colle DOM (`carousel.js`) dont le minuteur est l'animation CSS de l'anneau (`animationend`).

**Tech Stack :** Eleventy 3, Nunjucks, CSS pur, JavaScript sans bibliothèque, `node:test`, Playwright (déjà installé globalement dans l'environnement ; pas de dépendance npm).

**Spec :** `docs/superpowers/specs/2026-11-12-refonte-site-design.md` (visuel de référence : `docs/superpowers/specs/2026-11-12-maquette-hero.png`).

## Global Constraints

- Branche de travail `claude/great-franklin-8npvyi` ; **aucune pull request** ; pas de mise en production sans demande du propriétaire.
- Vouvoiement partout, dans tout le texte visible. Jamais de tutoiement (`tu`, `toi`, `ton`, `ta`, `tes`, `te`, `t'`, impératifs en `-e`/`-is` du type « Clique », « Installe »).
- Barre du haut, de gauche à droite : logo + « remplacare » ; **Ordonnance**, **Simulateur de cotisation**, **Ressources**, **Nos Solutions** ; à droite **Télécharger** puis **Nous contacter**. Toujours visible au scroll (`position: sticky; top: 0`). Sous 900 px : logo, Télécharger, menu burger.
- Cibles : Ordonnance `/ordonnance`, Simulateur `/simulateur`, Ressources `/ressources`, Nos Solutions `/nos-solutions`, Nous contacter `mailto:contact@remplacare.fr`, Télécharger = lien `data-download` (fenêtre existante de `download.js`).
- Palette (variables CSS) : navy `#1E324A`, vert `#006026`, bleu poudre `#C2E0F2`, olive `#A0B352`, orange `#F25C05`, saumon `#D9967E`. Olive, saumon, bleu poudre et orange ne servent **jamais** de couleur de texte sur blanc ; l'orange ne porte aucun texte courant. Contraste de texte ≥ 4,5.
- Polices : Fraunces (titres), Jost (texte). Arrondis généreux, surfaces pleines ; translucidité uniquement sur la barre du haut.
- Hero : titre « Le calendrier des professionnels de santé », sous-titre « Spécialement conçu pour les remplaçants », texte « Ayez une vision de votre CA prévisionnel, anticipez vos cotisations et consacrez-vous à votre pratique. », boutons « S'inscrire » et « Télécharger l'app » (tous deux `data-download`).
- Carrousel : 6 secondes par onglet ; arrêt au survol, au focus clavier, au clic sur une icône ou une flèche (définitif pour la visite), et sous « réduire les animations ». Quatre panneaux dans le HTML. Texte des panneaux : copie exacte du tableau du §6 de la spec.
- « Impôts » n'apparaît pas dans le texte du simulateur (le simulateur ne calcule pas l'impôt sur le revenu).
- Prix : **8,99 €/mois** ou **79 €/an**. Gratuit : **un objectif par an** ; Pro : **objectifs illimités** + simulateur détaillé (cotisations à provisionner par mois).
- Ne pas reprendre : « ≈ 2 h récupérées par mois », « Zéro surprise en fin d'année », le bandeau « Ton prochain mois commence maintenant ».
- Build Vercel : `npx @11ty/eleventy`, dossier `_site`. `vercel.json` garde `cleanUrls` et les redirections `/beta` et `/landing`.
- `download.js`, `dispositifs.json`, `images/`, `vendor/` restent à leur place à la racine du dépôt (copiés tels quels vers `_site`).

## Review Focus

Les cinq cas que la spec implique sans qu'aucune tâche ne les exerce naturellement ; chacun a son test dans la tâche indiquée.

1. **Visiteur sans JavaScript** : la barre et ses liens existent, et les quatre panneaux du carrousel sont tous visibles (empilés) — Tâche 7.
2. **Impression et PDF de l'ordonnance** : la nouvelle barre ne doit apparaître ni à l'impression ni dans le PDF du simulateur et de l'ordonnance — Tâches 4 et 5.
3. **« Réduire les animations »** : pas de défilement automatique ni d'anneau animé — Tâche 8.
4. **Téléphone 375 px** : aucun défilement horizontal sur aucune page — Tâche 11.
5. **Anciennes URL** : `/simulateur.html` et `/simulateur` répondent toutes deux ; les redirections `/beta` et `/landing` subsistent — Tâches 1 et 11.

---

### Task 1: Socle Eleventy et migration à l'identique

**Files:**
- Create: `package.json`, `eleventy.config.js`, `.gitignore`, `src/src.11tydata.json`, `tests/helpers/serve.js`, `tests/helpers/browser.js`, `tests/build.test.js`
- Move (git mv, contenu inchangé) : `index.html cgu.html confidentialite.html feedback.html reset-password.html simulateur.html ordonnance.html` → `src/`
- Modify: `vercel.json`

**Interfaces:**
- Produces: `startServer(dir: string) => Promise<{ url: string, close: () => Promise<void> }>` dans `tests/helpers/serve.js` (sert `dir`, émule `cleanUrls` : essaie le chemin exact, puis `chemin + '.html'`, puis `chemin + '/index.html'`).
- Produces: `launch() => Promise<Browser>` dans `tests/helpers/browser.js` (`require('playwright').chromium.launch()`).
- Produces: scripts npm `build` (`eleventy`), `test` (`npm run build && node --test tests/*.test.js`), `test:e2e` (`npm run build && node --test tests/e2e/*.test.js`). Les tests e2e se lancent avec `NODE_PATH=$(npm root -g)` car Playwright est installé globalement.

- [ ] **Step 1: Relever les empreintes des pages d'origine**

Run : `for f in index cgu confidentialite feedback reset-password simulateur ordonnance; do git show HEAD:$f.html | sha256sum | cut -c1-12 | sed "s/$/  $f/"; done > /tmp/sha-before.txt; cat /tmp/sha-before.txt`
Expected : sept lignes, une empreinte par page.

- [ ] **Step 2: Écrire le test de build qui échoue**

`tests/build.test.js` (nom des tests, assertions) :
- `test('le build produit les sept pages avec leurs URL actuelles')` : après `execSync('npx @11ty/eleventy')`, `_site/index.html`, `_site/simulateur.html`, `_site/ordonnance.html`, `_site/cgu.html`, `_site/confidentialite.html`, `_site/feedback.html`, `_site/reset-password.html` existent.
- `test('les fichiers statiques sont copiés')` : `_site/download.js`, `_site/dispositifs.json`, `_site/images/logo-ordonnance.png`, `_site/vendor/html2canvas-1.4.1.min.js`, `_site/vendor/jspdf-2.5.1.umd.min.js` existent.
- `test('vercel.json garde cleanUrls et les redirections')` : `cleanUrls === true`, redirections `/beta` et `/landing` vers `/`, `buildCommand === 'npx @11ty/eleventy'`, `outputDirectory === '_site'`.
- `test('/simulateur et /simulateur.html répondent')` : serveur `startServer('_site')`, deux `fetch` renvoient 200.

- [ ] **Step 3: Lancer le test pour vérifier qu'il échoue**

Run : `node --test tests/build.test.js`
Expected : FAIL (`eleventy` ou `_site/` introuvable).

- [ ] **Step 4: Installer et configurer Eleventy**

`npm init -y`, puis `npm i -D @11ty/eleventy@3.0.0`. `eleventy.config.js` (CommonJS, `module.exports = function (eleventyConfig) {...}`) : entrée `src`, sortie `_site`, inclusions `_includes`, `htmlTemplateEngine: false` (les `.html` ne sont pas interprétés), `templateFormats: ['njk', 'html']`, `addPassthroughCopy({ 'download.js': 'download.js', 'dispositifs.json': 'dispositifs.json', 'images': 'images', 'vendor': 'vendor', 'src/assets': 'assets' })`. `src/src.11tydata.json` : `{ "permalink": "{{ page.filePathStem }}.html" }`. `.gitignore` : `_site/`, `node_modules/`, `.superpowers/`. `vercel.json` : ajouter `"buildCommand": "npx @11ty/eleventy"` et `"outputDirectory": "_site"` sans toucher au reste.

- [ ] **Step 5: Déplacer les sept pages dans `src/` sans les modifier**

`git mv` des sept fichiers vers `src/` (créer `src/assets/.gitkeep`).

- [ ] **Step 6: Lancer le test et comparer les empreintes**

Run : `npm test`
Expected : PASS.
Run : `for f in index cgu confidentialite feedback reset-password simulateur ordonnance; do sha256sum _site/$f.html | cut -c1-12 | sed "s/$/  $f/"; done | diff - /tmp/sha-before.txt && echo IDENTIQUE`
Expected : `IDENTIQUE`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Introduit Eleventy et migre les sept pages à l'identique"
```

---

### Task 2: Palette, gabarit, barre du haut, pied de page, page Ressources

**Files:**
- Create: `src/assets/css/tokens.css`, `src/assets/css/site.css`, `src/assets/js/nav.js`, `src/assets/icons/logo.svg` (carré arrondi navy provisoire), `src/_includes/base.njk`, `src/_includes/nav.njk`, `src/_includes/footer.njk`, `src/ressources.njk`
- Test: `tests/contrast.test.js`, `tests/e2e/nav.test.js`

**Interfaces:**
- Produces: gabarit `base.njk` avec variables de front matter `title`, `description`, `robots` (optionnel, `noindex`), `navCurrent` (`ordonnance`|`simulateur`|`ressources`|`solutions`) et blocs Nunjucks `{% block head %}`, `{% block content %}`, `{% block scripts %}`. Une page l'utilise par `{% extends "base.njk" %}`.
- Produces: classes/attributs de la barre utilisés par les tests : `header.site-header > nav.site-nav`, liens `a.nav-link[data-nav="ordonnance|simulateur|ressources|solutions"]` (texte exact : « Ordonnance », « Simulateur de cotisation », « Ressources », « Nos Solutions »), `a.nav-download[data-download]` « Télécharger », `a.nav-contact` « Nous contacter », `button.nav-burger[aria-expanded][aria-controls="nav-menu"]`, panneau `#nav-menu`.
- Produces: variables CSS `--navy --green --powder --olive --orange --salmon --ink --muted --line --nav-h` (`68px`), plus alias hérités pour les pages migrées : `--sage-dark: var(--green)`, `--sage: var(--olive)`, `--navy-deep: #15263A`, `--bg: #FAFAF7`.
- Produces: classe `html.js` posée par un script inline du `<head>` (sert au repli sans JavaScript).

- [ ] **Step 1: Écrire les tests qui échouent**

`tests/contrast.test.js` (unit, lit `tokens.css`) : fonction `contrast(hexA, hexB)`. Assertions : navy/blanc ≥ 4,5 ; blanc/navy ≥ 4,5 ; vert/blanc ≥ 4,5 ; blanc/vert ≥ 4,5 ; navy sur poudre, olive et saumon ≥ 4,5 ; **et** le vert sur blanc, poudre, saumon est ≥ 4,5 pour le sous-titre du hero sur le dégradé (vert sur `#D5E6F2` ≥ 4,5).
`tests/e2e/nav.test.js` (Playwright + `startServer('_site')`, page `/ressources`) :
- `test('liens de la barre dans l'ordre')` : `.nav-link` donne exactement `['Ordonnance','Simulateur de cotisation','Ressources','Nos Solutions']` avec les `href` `/ordonnance`, `/simulateur`, `/ressources`, `/nos-solutions` ; `.nav-contact` a `href="mailto:contact@remplacare.fr"` ; `.nav-download` a l'attribut `data-download`.
- `test('la barre reste en haut au scroll')` : viewport 1280×800, `scrollTo(0, 3000)` sur une page rendue plus haute que l'écran (ajouter `style="height:3000px"` via `page.addStyleTag`), `getBoundingClientRect().top` de `.site-header` vaut 0.
- `test('menu burger sous 900 px')` : viewport 375×700, `.nav-link` masqués, `.nav-burger` visible, clic → `aria-expanded="true"` et `#nav-menu` visible avec les quatre liens, deuxième clic → refermé ; `.nav-download` reste visible barre fermée.
- `test('ressources est noindex')` : `meta[name=robots]` contient `noindex`.

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run : `NODE_PATH=$(npm root -g) node --test tests/contrast.test.js tests/e2e/nav.test.js`
Expected : FAIL (fichiers absents).

- [ ] **Step 3: Implémenter tokens, gabarit et barre**

`tokens.css` : variables ci-dessus et règles de base (`body` en Jost, titres en Fraunces). `base.njk` : `<!doctype html>`, `lang="fr"`, polices Google existantes (Fraunces 400/600/700 et Jost 400/500/600), `tokens.css` puis `site.css`, script inline `document.documentElement.classList.add('js')`, `{% block head %}`, `{% include "nav.njk" %}`, `<main>{% block content %}`, `{% include "footer.njk" %}`, `<script src="/download.js" defer>`, `<script src="/assets/js/nav.js" defer>`, `{% block scripts %}`. `site.css` : `.site-header{position:sticky;top:0;z-index:50;height:var(--nav-h);background:rgba(255,255,255,.55);backdrop-filter:blur(14px)}` ; style des liens et boutons (`.pill` arrondi 999px, bouton plein navy pour « Nous contacter », contour navy pour « Télécharger »), `@media (max-width:899px)` : liens masqués, burger visible, `#nav-menu` en panneau sous la barre ; `@media print{.site-header{display:none !important}}`. `nav.js` : bascule `aria-expanded` du burger, ferme le menu au clic sur un lien ou sur Échap. `footer.njk` : le pied de page actuel (marque, liens Télécharger / Simulateur / Contact / CGU / Confidentialité, copyright `contact@remplacare.fr`), vouvoiement sans objet. `ressources.njk` : titre « Ressources », texte « Cette page est en construction. », `robots: noindex`.

- [ ] **Step 4: Lancer les tests**

Run : `NODE_PATH=$(npm root -g) npm run test:e2e && node --test tests/contrast.test.js`
Expected : PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Ajoute la palette, le gabarit commun, la barre fixe, le pied de page et la page Ressources"
```

---

### Task 3: Pages légales, feedback et reset-password dans le gabarit

**Files:**
- Modify (renommer en `.njk` avec `git mv`) : `src/cgu.html`, `src/confidentialite.html`, `src/feedback.html`, `src/reset-password.html`
- Create: `tests/vouvoiement.test.js`, `tests/helpers/pages.js`

**Interfaces:**
- Produces: `VOUVOIEMENT_PAGES: string[]` dans `tests/helpers/pages.js` (noms de fichiers de `_site` à contrôler ; chaque tâche de migration y ajoute sa page). Valeur initiale : `['cgu.html','confidentialite.html','feedback.html','reset-password.html','ressources.html']`.
- Produces: `visibleText(html: string): string` dans `tests/vouvoiement.test.js` (retire `<script>`, `<style>`, commentaires et balises).
- Consumes: `base.njk` et ses blocs (Tâche 2).

- [ ] **Step 1: Écrire le test de vouvoiement qui échoue**

`test('aucun tutoiement dans les pages migrées')` : pour chaque page de `VOUVOIEMENT_PAGES`, `visibleText` ne contient aucune correspondance de `/\b(tu|toi|ton|ta|tes|te)\b|\bt'|-toi\b|-tu\b/i`, ni de l'expression **sensible à la casse** `/\b(Clique|Installe|Pointe|Importe|Choisis|Saisis|Pose|Regarde|Touche|Essaie|Appuie|Utilise|Télécharge)\b/` (impératifs en début de phrase ; « entre » et « dis » sont exclus car ce sont des mots courants) ; l'échec liste page et extrait. (Ce test échoue d'abord car `reset-password` et `feedback` contiennent des formes en « tu ».)

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run : `npm test`
Expected : FAIL sur `feedback.html`, `reset-password.html`, `cgu.html`.

- [ ] **Step 3: Convertir les quatre pages**

Pour chacune : `git mv src/X.html src/X.njk`, ajouter le front matter (`title`, `description`), `{% extends "base.njk" %}`, et ne garder que `{% block head %}` (le `<style>` propre à la page, sans le CSS de l'ancienne barre `.site-nav*`, sans bloc `:root` : remplacer chaque `var(--sage-dark)` par `var(--green)` et `var(--sage)` par `var(--green)` si utilisé en texte, sinon `var(--olive)`), `{% block content %}` (le contenu entre l'ancienne barre et le pied de page, sans ces deux éléments) et, pour `reset-password`, `{% block scripts %}` avec son script Supabase inchangé (le `<script src="…supabase…">` du `<head>` va dans `{% block head %}`). Passer tous les textes visibles au vouvoiement ; ne pas toucher aux textes juridiques de fond (dates, noms de caisse, adresses).

- [ ] **Step 4: Lancer les tests**

Run : `npm test`
Expected : PASS.
Puis vérifier visuellement `cgu`, `confidentialite`, `feedback`, `reset-password` avec une capture Playwright à 1200 px (`page.screenshot`) : barre et pied de page nouveaux, contenu intact.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Convertit les pages légales, feedback et reset-password au gabarit commun et au vouvoiement"
```

---

### Task 4: Simulateur dans le gabarit

**Files:**
- Modify: `src/simulateur.html` → `src/simulateur.njk` (`git mv`)
- Modify: `tests/helpers/pages.js`
- Test: `tests/e2e/simulateur.test.js`

**Interfaces:**
- Consumes: `base.njk` (Tâche 2) ; `VOUVOIEMENT_PAGES` (Tâche 3).
- Produces: aucune interface nouvelle ; la logique JavaScript du simulateur et l'appel à `compute-net` restent identiques.

- [ ] **Step 1: Écrire les tests qui échouent**

`tests/e2e/simulateur.test.js` :
- `test('le formulaire et le résultat sont présents')` : `/simulateur` contient `#ca`, `#go`, `#resultats`.
- `test('nav : Simulateur est la page courante')` : `a.nav-link[data-nav="simulateur"]` porte `aria-current="page"`.
- `test('la barre est masquée à l'impression')` : `page.emulateMedia({ media: 'print' })`, `.site-header` a `display: none`.
- `test('la mention sur l'impôt est conservée')` : le texte visible contient toujours « Il ne calcule pas l'impôt sur le revenu » (le test de vouvoiement de la Tâche 3 couvre le reste).
Ajouter `simulateur.html` à `VOUVOIEMENT_PAGES`.

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run : `NODE_PATH=$(npm root -g) npm run test:e2e && npm test`
Expected : FAIL (page encore en `.html`, tutoiement présent).

- [ ] **Step 3: Convertir**

Même méthode que la Tâche 3 : front matter (`title` « Simulateur de cotisations — infirmier libéral remplaçant », `navCurrent: simulateur`), `{% block head %}` avec le CSS propre au simulateur (retirer `.site-nav*`, `@media print{.site-nav…}` et le bloc `:root`, remapper les variables comme en Tâche 3), `{% block content %}` avec le contenu (de `<div class="wrap">` au dernier bloc `.legal`), `{% block scripts %}` avec le script du simulateur **copié sans modification de logique** ; le `<script src="/download.js">` est déjà dans le gabarit. Vouvoiement des textes visibles, y compris les chaînes de `MESSAGES` et de `LABELS` dans le script (`grep -nE "\b(tu|ton|ta|tes|te|Vérifie|Réessaie)\b" src/simulateur.njk` ne doit plus rien renvoyer).

- [ ] **Step 4: Lancer les tests et comparer le calcul**

Run : `NODE_PATH=$(npm root -g) npm run test:e2e && npm test`
Expected : PASS.
Puis une capture à 1200 px avec une saisie (`#ca` = 350, clic sur `#go`) pour vérifier que le résultat s'affiche (si l'API est injoignable depuis l'environnement, vérifier que le message d'erreur du service s'affiche sans erreur JavaScript dans la console).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Convertit le simulateur au gabarit commun et au vouvoiement"
```

---

### Task 5: Ordonnance dans le gabarit

**Files:**
- Modify: `src/ordonnance.html` → `src/ordonnance.njk` (`git mv`)
- Modify: `tests/helpers/pages.js`
- Test: `tests/e2e/ordonnance.test.js`

**Interfaces:**
- Consumes: `base.njk` et la variable `--nav-h` (Tâche 2).
- Produces: aucune interface nouvelle ; `window` n'expose rien de plus.

- [ ] **Step 1: Écrire les tests qui échouent**

`tests/e2e/ordonnance.test.js` :
- `test('le générateur se charge')` : `/ordonnance` expose le bouton `#btnPrintTop` et charge `dispositifs.json` (statut 200 de la requête).
- `test('l'en-tête de page colle sous la nouvelle barre')` : viewport 1280×800, après `scrollTo(0, 400)`, le haut de `.page-header` est égal à la hauteur de `.site-header` (± 1 px) — pas de chevauchement.
- `test('la barre est masquée à l'impression')` : `emulateMedia({ media: 'print' })`, `.site-header` a `display: none`.
- `test('Ordonnance est la page courante')` : `a.nav-link[data-nav="ordonnance"]` porte `aria-current="page"`.
Ajouter `ordonnance.html` à `VOUVOIEMENT_PAGES`.

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run : `NODE_PATH=$(npm root -g) npm run test:e2e`
Expected : FAIL.

- [ ] **Step 3: Convertir**

Même méthode ; points propres à cette page : le second `<nav class="tab-bar">` (onglets Formulaire/Aperçu) **reste** dans le contenu de la page (c'est de la navigation interne, pas la barre du site) ; chercher les `position:sticky` de `.page-header` et `.tab-bar` (`grep -n "sticky" src/ordonnance.njk`) et remplacer leur `top` par `var(--nav-h)` (ou `calc(var(--nav-h) + hauteur de .page-header)` pour la barre d'onglets) ; les scripts chargés par `script('vendor/…')` gardent leurs chemins relatifs ; le `@media print` existant continue de masquer ce qui doit l'être (la barre du gabarit est déjà masquée). Vouvoiement : `grep -nE "\b(tu|ton|ta|tes|te)\b" src/ordonnance.njk` (hors logique) ne renvoie plus rien.

- [ ] **Step 4: Lancer les tests**

Run : `NODE_PATH=$(npm root -g) npm run test:e2e && npm test`
Expected : PASS. Capture à 375 px de l'onglet Aperçu pour vérifier que la barre d'onglets n'est pas recouverte.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Convertit le générateur d'ordonnance au gabarit commun et au vouvoiement"
```

---

### Task 6: Cœur du carrousel (module pur)

**Files:**
- Create: `src/assets/js/carousel-core.js`
- Test: `tests/carousel-core.test.js`

**Interfaces:**
- Produces: `createCarousel({ count: number, startIndex?: number }) => { getIndex(): number, isAutoplay(): boolean, next(): number, prev(): number, goTo(i: number): number, userInteracted(): void, tick(): number | null }`.
  - `next()`/`prev()` bouclent ; `goTo(i)` ignore un indice hors `[0, count-1]` et renvoie l'indice courant ; `userInteracted()` coupe définitivement le défilement automatique ; `tick()` avance et renvoie le nouvel indice si le défilement automatique est actif, sinon renvoie `null` sans changer d'indice.
- Produces: export CommonJS (`module.exports = { createCarousel }`) **et** `window.RemplaCareCarousel = { createCarousel }` dans le navigateur.

- [ ] **Step 1: Écrire les tests qui échouent**

`tests/carousel-core.test.js` :
- `test('démarre à l'indice donné ou 0')` : `createCarousel({count:4}).getIndex() === 0` ; avec `startIndex: 2` → 2.
- `test('next et prev bouclent')` : à 3, `next()` → 0 ; à 0, `prev()` → 3.
- `test('goTo ignore un indice invalide')` : `goTo(9)`, `goTo(-1)`, `goTo(1.5)` laissent l'indice inchangé ; `goTo(2)` → 2.
- `test('tick avance tant que le défilement est actif')` : `tick()` → 1 puis 2 ; `isAutoplay()` vrai.
- `test('un clic utilisateur arrête définitivement le défilement')` : après `userInteracted()`, `tick()` renvoie `null`, `getIndex()` inchangé, `isAutoplay()` faux ; `goTo(1)` fonctionne encore.
- `test('count invalide')` : `createCarousel({count:0})` lève une erreur.

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run : `node --test tests/carousel-core.test.js`
Expected : FAIL (module introuvable).

- [ ] **Step 3: Implémenter `createCarousel`**

État interne : `index`, `autoplay = true`. Rien d'autre (pas de minuteur : c'est l'animation CSS qui déclenche `tick`).

- [ ] **Step 4: Lancer les tests**

Run : `node --test tests/carousel-core.test.js`
Expected : PASS.

- [ ] **Step 5: Commit**

```bash
git add src/assets/js/carousel-core.js tests/carousel-core.test.js
git commit -m "Ajoute le cœur testé du carrousel"
```

---

### Task 7: Accueil — hero, boutons et carrousel (structure et style)

**Files:**
- Create: `src/index.njk` (remplace `src/index.html`, supprimé avec `git rm`), `src/assets/css/home.css`, `src/assets/icons/calendrier.svg`, `moniteur.svg`, `simulateur.svg`, `trousse.svg`
- Test: `tests/e2e/home-hero.test.js`

**Interfaces:**
- Consumes: `base.njk` ; `download.js` (liens `data-download`).
- Produces: structure DOM utilisée par la Tâche 8 : racine `[data-carousel]` ; liste d'onglets `[role="tablist"]` avec quatre `button.tab[role="tab"][data-tool="calendrier|moniteur|simulateur|trousse"]` (`aria-selected`, `aria-controls="panel-<tool>"`, `id="tab-<tool>"`, premier sélectionné) ; boutons `[data-carousel-prev]` et `[data-carousel-next]` ; quatre `section.panel[role="tabpanel"][id="panel-<tool>"][aria-labelledby="tab-<tool>"]` ; dans chaque onglet un `svg.tab-ring` contenant `path.ring-path` ; lien `a.panel-more` « En savoir plus → » par panneau (cibles : `/nos-solutions#calendrier`, `/nos-solutions#moniteur`, `/simulateur`, `/ordonnance`) ; zone `.panel-visual` avec le texte provisoire « [ visuel de l'app ] ».
- Produces: variable CSS `--cycle` (défaut `6s`), animation `ring` (`stroke-dashoffset` 100 → 0) sur `.tab[aria-selected="true"] .ring-path` ; `html:not(.js) .panel { display: block }`, `html.js .panel[hidden] { display: none }`.

- [ ] **Step 1: Écrire les tests qui échouent**

`tests/e2e/home-hero.test.js` :
- `test('hero : textes exacts')` : `h1` = « Le calendrier des professionnels de santé » ; `.hero-sub` = « Spécialement conçu pour les remplaçants » ; `.hero-text` = la phrase de la spec ; deux boutons `.hero-cta a` « S'inscrire » et « Télécharger l'app », tous deux avec `data-download`.
- `test('quatre onglets, un panneau visible')` : avec JavaScript, 4 `[role=tab]` dont un seul `aria-selected="true"`, un seul `[role=tabpanel]` visible.
- `test('titres des panneaux conformes à la spec')` : les quatre `.panel h3` valent, dans l'ordre, « Organisez votre vie grâce à un calendrier répondant à vos besoins. », « Suivez quotidiennement votre activité », « Ne craignez plus les rattrapages et anticipez pour ne plus subir », « Des outils à votre disposition » (même sans JavaScript, ils sont dans le DOM).
- `test('Moniteur garde son texte')` : le panneau Moniteur contient « Fixez-vous des objectifs et mettez en place ce qu'il faut pour les atteindre » et « Tracez vos paiements ».
- `test('le simulateur ne parle pas d'impôts')` : le texte du panneau Simulateur contient « URSSAF et CARPIMKO » et pas « mpôt ».
- `test('durée par défaut du minuteur : 6 s')` : `getComputedStyle` de l'`.ring-path` actif → `animationDuration === '6s'`.
- `test('sans JavaScript, les quatre panneaux sont visibles')` : contexte `javaScriptEnabled: false`, les 4 `.panel` sont visibles ; la barre et ses quatre liens sont présents.
- `test('liens « En savoir plus »')` : quatre `.panel-more` avec les `href` listés ci-dessus.

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run : `NODE_PATH=$(npm root -g) node --test tests/e2e/home-hero.test.js`
Expected : FAIL.

- [ ] **Step 3: Construire le hero et le carrousel**

Créer `src/index.njk` (en reprenant d'abord le contenu de `src/index.html`), puis `git rm src/index.html` : front matter (reprendre `title` et `description` de l'ancienne page, vouvoiement), `{% block head %}` avec `<link rel="stylesheet" href="/assets/css/home.css">`, `{% block content %}` : section `.stage` (dégradé) contenant `.hero` (h1, `.hero-sub`, `.hero-text`, `.hero-cta`), puis le carrousel, puis — **provisoirement et sans modification** — les anciennes sections de l'accueil (de « problème » au bandeau final, copiées de `src/index.html`, avec leur CSS de section dans `home.css`), à réécrire en Tâche 9. Les icônes SVG : traits 1.8, `stroke-linecap/linejoin: round`, viewBox 32 (calendrier, moniteur avec pulsation, flèche de tendance, trousse avec croix) d'après les images de la spec. Valeurs de `home.css` à reproduire (maquette de référence) : `.stage` = `background: radial-gradient(900px 520px at 8% 4%, var(--powder) 0%, rgba(194,224,242,0) 70%), radial-gradient(800px 520px at 95% 40%, #E8D3D6 0%, rgba(232,211,214,0) 70%), radial-gradient(1000px 520px at 70% 105%, var(--salmon) 0%, rgba(217,150,126,0) 72%), linear-gradient(180deg,#D5E6F2 0%,#E9DCDD 60%,#F0C9B8 100%)` ; h1 Fraunces 700, 52 px (36 px sous 640 px) ; `.hero-sub` 24 px, graisse 600, couleur `var(--green)` ; boutons 16 px, `padding: 14px 30px`, pilule ; onglets 76×76 px, rayon 24 px, fond `rgba(255,255,255,.42)` (actif : blanc plein, sans bordure, prolongé par une languette blanche de 34×26 px jusqu'au panneau) ; panneau largeur 940 px max, rayon 32 px, padding `44px 48px`, deux colonnes, visuel `var(--powder)` rayon 24 px. Anneau : `svg.tab-ring` en 88×88, `path.ring-path` = `M44 2 H59 A27 27 0 0 1 86 29 V59 A27 27 0 0 1 59 86 H29 A27 27 0 0 1 2 59 V29 A27 27 0 0 1 29 2 Z`, `pathLength="100"`, `stroke: var(--green)`, `stroke-width: 3.5`, `stroke-dasharray: 100`, positionné au centre de l'onglet par `left:50%; top:50%; margin:-44px 0 0 -44px`. Textes des panneaux : copie exacte du tableau §6 de la spec (vouvoiement déjà appliqué).

- [ ] **Step 4: Lancer les tests**

Run : `NODE_PATH=$(npm root -g) npm run test:e2e && npm test`
Expected : PASS. Comparer visuellement une capture à 1200 px avec `docs/superpowers/specs/2026-11-12-maquette-hero.png`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Construit le hero et la structure du carrousel de l'accueil"
```

---

### Task 8: Carrousel — comportement

**Files:**
- Create: `src/assets/js/carousel.js`
- Modify: `src/index.njk` (ajouter le chargement des deux scripts dans `{% block scripts %}`), `src/assets/css/home.css` (états `data-paused`, `data-autoplay`, mouvement réduit)
- Test: `tests/e2e/carousel.test.js`

**Interfaces:**
- Consumes: `RemplaCareCarousel.createCarousel` (Tâche 6) ; DOM et attributs de la Tâche 7.
- Produces: attributs d'état sur `[data-carousel]` : `data-paused` (présent quand survolé ou focalisé) et `data-autoplay` (`"on"` | `"off"`). Aucune fonction globale.

- [ ] **Step 1: Écrire les tests qui échouent**

`tests/e2e/carousel.test.js` (chaque test injecte d'abord `page.addStyleTag({content: ':root{--cycle:300ms}'})` pour ne pas attendre 6 s, sauf indication) :
- `test('un clic sur une icône affiche son panneau')` : clic sur `#tab-moniteur` → `aria-selected="true"`, `#panel-moniteur` visible, les trois autres masqués.
- `test('flèches : suivant et précédent, avec bouclage')` : sur l'onglet Calendrier, `[data-carousel-prev]` mène à Trousse ; `[data-carousel-next]` ramène à Calendrier.
- `test('clavier : flèches gauche/droite, Début, Fin')` : focus sur l'onglet actif, `ArrowRight` → suivant, `End` → dernier, `Home` → premier.
- `test('défilement automatique après le cycle')` : sans interaction, après ~700 ms l'onglet sélectionné n'est plus Calendrier.
- `test('un clic arrête le défilement')` : clic sur un onglet, attendre 1 s, l'onglet sélectionné n'a pas changé et `data-autoplay="off"`.
- `test('le survol met en pause')` : `hover` sur `[data-carousel]`, attendre 1 s, onglet inchangé ; après `mouse.move` hors du carrousel, le défilement reprend.
- `test('le focus clavier met en pause')` : `focus` sur un onglet, attendre 1 s, onglet inchangé.
- `test('mouvement réduit : pas de défilement automatique')` : `emulateMedia({ reducedMotion: 'reduce' })`, attendre 1 s, onglet inchangé, `data-autoplay="off"`, `animationName` de l'anneau = `none`.
- `test('balayage sur mobile')` : viewport 375×700 avec `hasTouch`, un balayage vers la gauche passe à l'onglet suivant.

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run : `NODE_PATH=$(npm root -g) node --test tests/e2e/carousel.test.js`
Expected : FAIL.

- [ ] **Step 3: Implémenter la colle DOM**

`carousel.js` (IIFE, `defer`) : cherche `[data-carousel]` ; crée `createCarousel({count: 4})` ; `show(i)` met à jour `aria-selected`, `tabindex` (`0` sur l'actif, `-1` sinon), `hidden` des panneaux. Minuteur : écouter `animationend` sur le `.ring-path` de l'onglet actif → `const n = carousel.tick(); if (n !== null) show(n)`. Pause : `mouseenter`/`focusin` posent `data-paused`, `mouseleave`/`focusout` l'enlèvent (CSS : `[data-carousel][data-paused] .ring-path{animation-play-state:paused}`). Interaction : clic sur un onglet ou une flèche, touche clavier de navigation, balayage horizontal > 40 px appellent `carousel.userInteracted()` puis `data-autoplay="off"` (CSS : `[data-autoplay="off"] .ring-path{animation:none}` et anneau masqué). Mouvement réduit : au chargement, si `matchMedia('(prefers-reduced-motion: reduce)').matches`, appeler `userInteracted()` et poser `data-autoplay="off"` ; CSS : `@media (prefers-reduced-motion: reduce){ .ring-path{animation:none} }`. Défaut : `data-autoplay="on"` dans le HTML.

- [ ] **Step 4: Lancer les tests**

Run : `NODE_PATH=$(npm root -g) npm run test:e2e && npm test`
Expected : PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Ajoute le comportement du carrousel : onglets, flèches, clavier, balayage, minuteur, pauses"
```

---

### Task 9: Accueil — sections 2 à 7 et bandeau final

**Files:**
- Modify: `src/index.njk`, `src/assets/css/home.css`, `tests/helpers/pages.js`
- Test: `tests/e2e/home-sections.test.js`

**Interfaces:**
- Consumes: `home.css` et le gabarit ; `data-download` pour les boutons du bandeau final.
- Produces: ancres de sections `#probleme`, `#avant-apres`, `#valeur`, `#fondateur`, `#faq`, `#cta-final` (utilisées par le test).

- [ ] **Step 1: Écrire les tests qui échouent**

`tests/e2e/home-sections.test.js` :
- `test('ordre des sections')` : les ancres `#probleme`, `#avant-apres`, `#valeur`, `#fondateur`, `#faq`, `#cta-final` se suivent dans cet ordre dans le DOM, après le carrousel.
- `test('contenu retiré ou remplacé')` : le texte visible de l'accueil **ne contient pas** « 2 h récupérées », « Zéro surprise », « Ton prochain mois », « Votre prochain mois commence maintenant » (le premier bandeau est supprimé) ; il contient « 8,99 » dans la FAQ ; un seul bandeau d'appel à l'action existe (`.cta-band` × 1).
- `test('quatre questions en cartes')` : `#probleme .pain` × 4, chacune avec un `border-radius` ≥ 16 px.
- `test('pas de tutoiement')` : `index.html` ajouté à `VOUVOIEMENT_PAGES` (le test de la Tâche 3 s'applique).
- `test('boutons du bandeau final')` : deux boutons `data-download` dans `#cta-final`.

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run : `NODE_PATH=$(npm root -g) npm run test:e2e && npm test`
Expected : FAIL.

- [ ] **Step 3: Réécrire les sections**

Sections 2 à 4 : les mêmes contenus que l'ancienne page, **passés au vouvoiement phrase par phrase** (« Pose-toi ces 4 questions » → « Posez-vous ces 4 questions », « tu sais » → « vous savez », etc.), en cartes arrondies (`border-radius: 24px`, fond blanc, bordure `var(--line)`). Section 4 : trois cartes « Votre temps », « Votre argent », « Votre liberté » ; remplacer « ≈ 2 h récupérées par mois » par « Moins de saisie, plus de temps pour vous » et « Zéro surprise en fin d'année » par « Une vision à jour toute l'année ». Section 5 (fondateur) : la citation et le texte actuels, vouvoyés, sans ajout. Section 6 (FAQ) : les questions actuelles en vouvoiement ; la réponse « C'est vraiment gratuit ? » devient : « Oui. Le calendrier, le suivi de CA, le moniteur et la trousse de secours sont gratuits, sans carte bancaire. Une version Pro à 8,99 €/mois ou 79 €/an, avec le simulateur détaillé et des objectifs illimités, est prévue ; voir Nos solutions. » Section 7 (`#cta-final`) : même dégradé que le hero, titre « Le mois prochain, vous saurez. », texte en vouvoiement, boutons « S'inscrire » et « Télécharger l'app ». Supprimer l'ancien bandeau « CTA 1 » et tout le CSS devenu inutile de l'ancienne page (barre, `:root`, nav).

- [ ] **Step 4: Lancer les tests**

Run : `NODE_PATH=$(npm root -g) npm run test:e2e && npm test`
Expected : PASS. Captures de page entière à 375, 768 et 1200 px.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Réécrit les sections de l'accueil en vouvoiement avec le bandeau final en dégradé"
```

---

### Task 10: Page « Nos solutions » (Gratuit / Pro)

**Files:**
- Create: `src/nos-solutions.njk`, `src/assets/css/solutions.css`
- Modify: `tests/helpers/pages.js`
- Test: `tests/e2e/solutions.test.js`

**Interfaces:**
- Consumes: `base.njk` (`navCurrent: solutions`).
- Produces: ancres `#calendrier` et `#moniteur` (cibles des « En savoir plus » de l'accueil) ; colonnes `.plan.plan-free` et `.plan.plan-pro` ; bouton `.plan-pro .plan-cta`.

- [ ] **Step 1: Écrire les tests qui échouent**

`tests/e2e/solutions.test.js` :
- `test('deux colonnes avec les prix')` : `.plan-free` contient « Gratuit » ; `.plan-pro` contient « 8,99 € » et « 79 € » ; le Pro mentionne « par mois » et « par an ».
- `test('contenu des colonnes')` : Gratuit contient « Un objectif par an », « Import de calendrier », « Générateur d'ordonnance » ; Pro contient « Objectifs illimités » et « cotisations à provisionner » ; Gratuit **ne** contient **pas** « Objectifs illimités ».
- `test('bouton du Pro')` : `.plan-pro .plan-cta` a pour texte « Bientôt disponible » et `href` commençant par `mailto:contact@remplacare.fr?subject=` ; l'objet contient « Pro ».
- `test('ancres')` : `#calendrier` et `#moniteur` existent.
- `test('Nos Solutions est la page courante et pas de tutoiement')` : `a.nav-link[data-nav="solutions"]` a `aria-current="page"` ; ajouter `nos-solutions.html` à `VOUVOIEMENT_PAGES`.
- `test('la page tient sur 375 px')` : les deux colonnes s'empilent (une seule colonne), pas de défilement horizontal.

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run : `NODE_PATH=$(npm root -g) npm run test:e2e && npm test`
Expected : FAIL.

- [ ] **Step 3: Construire la page**

Titre « Nos solutions », courte introduction (vouvoiement). Deux cartes arrondies : **Gratuit** (0 €) listant calendrier, import de calendrier, suivi du CA et des paiements, moniteur, trousse de secours (générateur d'ordonnance, guide de cotations, astuces), un objectif par an ; **Pro** (« 8,99 € par mois » et « 79 € par an — soit environ 27 % d'économie ») listant tout le Gratuit, « Simulateur détaillé : cotisations à provisionner chaque mois » et « Objectifs illimités ». Chaque fonctionnalité d'outil est précédée d'une ancre (`id="calendrier"`, `id="moniteur"`). Le bouton du Pro « Bientôt disponible » est un lien `mailto:` (`?subject=Liste d'attente Pro`) : aucun nouveau service back-end n'est créé. Pastille orange « Bientôt » autorisée (petite, texte navy).

- [ ] **Step 4: Lancer les tests**

Run : `NODE_PATH=$(npm root -g) npm run test:e2e && npm test`
Expected : PASS. Captures à 375 et 1200 px.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Ajoute la page Nos solutions : comparatif Gratuit et Pro"
```

---

### Task 11: Contrôles finaux et aperçu Vercel

**Files:**
- Modify: `download.js` (couleurs de la fenêtre : `#4E7A67`/`#3F6354` → `#006026`/`#00451B`, `#1C324A` → `#1E324A`, fond `#E4E8EC` inchangé)
- Create: `tests/links.test.js`, `tests/e2e/responsive.test.js`

**Interfaces:**
- Consumes: toutes les pages de `_site`.

- [ ] **Step 1: Écrire les tests qui échouent**

`tests/links.test.js` : `test('aucun lien ou ressource interne cassé')` — parcourt tous les `_site/**/*.html`, extrait les `href` et `src` internes (commençant par `/` ou relatifs, sans `mailto:`, `#`, `http`), retire l'ancre et la query, et vérifie qu'ils correspondent à un fichier de `_site` (exact, `+ '.html'`, ou `/index.html`) ; vérifie aussi que chaque `/page#ancre` référence un `id` existant dans la page cible.
`tests/e2e/responsive.test.js` : `test('aucun défilement horizontal à 375 px')` — pour chacune des pages (`/`, `/nos-solutions`, `/simulateur`, `/ordonnance`, `/cgu`, `/confidentialite`, `/feedback`, `/ressources`), `document.documentElement.scrollWidth <= window.innerWidth` ; `test('la fenêtre Télécharger s'ouvre depuis les trois boutons')` — clic sur `.nav-download`, sur `.hero-cta a:first-child`, sur `#cta-final [data-download]` : `.dl-overlay.open` apparaît à chaque fois ; `test('les anciennes URL répondent')` — `/simulateur`, `/simulateur.html`, `/ordonnance`, `/ordonnance.html` renvoient 200.

- [ ] **Step 2: Lancer pour vérifier l'échec ou le succès partiel**

Run : `NODE_PATH=$(npm root -g) npm run test:e2e && npm test`
Expected : au moins un FAIL à corriger (couleurs de `download.js`, éventuel lien cassé ou débordement).

- [ ] **Step 3: Corriger ce que les tests révèlent**

Corriger les liens, les débordements et les couleurs de `download.js` signalés ; ne pas contourner un test en le retirant.

- [ ] **Step 4: Tout relancer et prendre les captures de contrôle**

Run : `NODE_PATH=$(npm root -g) npm run test:e2e && npm test`
Expected : PASS. Captures d'écran des huit pages à 375, 768 et 1200 px dans le dossier de travail temporaire, relues une à une (barre fixe, burger, carrousel, hero conformes à la maquette).

- [ ] **Step 5: Pousser et vérifier l'aperçu Vercel**

```bash
git add -A
git commit -m "Termine la refonte : liens, responsive, fenêtre Télécharger"
git push -u origin claude/great-franklin-8npvyi
```
Puis, avec l'outil Vercel (`list_deployments`, `get_deployment`), vérifier que le déploiement d'aperçu de la branche est en état « READY » et donner son adresse au propriétaire. S'il échoue : lire les logs de build, corriger, repousser. Ne rien promouvoir en production.
