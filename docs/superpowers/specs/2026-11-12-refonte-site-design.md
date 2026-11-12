# Refonte du site RemplaCare — spécification de design

Date : 2026-11-12
Statut : en attente de relecture par le propriétaire du site

## 1. Objectif

Donner au site RemplaCare un aspect plus professionnel et moins « généré par IA », en reprenant la structure
du site de Calendly (barre fixe, hero centré, carrousel d'outils, panneau détaillé), avec les couleurs et le
vocabulaire de RemplaCare.

- Cible : professionnels de santé libéraux remplaçants (infirmiers, kinés, orthophonistes, sages-femmes…).
- Réussite : un site cohérent sur toutes les pages (barre et pied de page uniques, vouvoiement partout,
  palette unique), un hero et un carrousel conformes à la maquette validée, et une page comparative
  Gratuit / Pro.
- Le propriétaire du site a explicitement demandé : moins « IA », plus pro, structure Calendly, couleurs et
  vocabulaire RemplaCare, vouvoiement partout.

## 2. Périmètre

### Inclus
- Nouvelle architecture de build (Eleventy) avec barre du haut, pied de page et gabarit communs.
- Nouveau design de la page d'accueil (hero, deux boutons, carrousel de quatre outils, sections suivantes).
- Page « Nos solutions » : comparatif Gratuit / Pro.
- Nouvelle barre du haut et nouveau pied de page sur toutes les pages, vouvoiement et nouvelle palette
  sur toutes les pages existantes.
- Page « Ressources » en construction (non indexée).

### Exclu (noté pour plus tard)
- Funnel du simulateur (résultat partiel puis inscription et paiement) et son filtrage côté serveur.
  Constat : l'API `compute-net` renvoie aujourd'hui tous les champs à n'importe quel visiteur, donc
  verrouiller seulement l'affichage ne protégerait rien.
- Compte web, inscription, paiement.
- Contenu de la page Ressources, page Contact complète.
- Toute modification de l'app mobile ou de la base de données.

## 3. Architecture

Approche retenue : générateur de site statique Eleventy, sortie HTML pure (pas de JavaScript pour la
navigation). Alternatives écartées : injection de la barre par JavaScript (invisible pour les robots,
saut visuel) ; framework complet (disproportionné pour une dizaine de pages ; à reconsidérer quand le
funnel et le compte web seront décidés).

```
src/
  _includes/   base.njk (gabarit), nav.njk, footer.njk
  assets/      css/tokens.css, css/site.css ; js/carousel.js, js/download.js (existant) ; icons/*.svg
  index.njk, nos-solutions.njk, simulateur.njk, ordonnance.njk,
  cgu.njk, confidentialite.njk, feedback.njk, reset-password.njk, ressources.njk
package.json, eleventy.config.js
```

- Vercel : commande de build `npx @11ty/eleventy`, dossier publié `_site`. `vercel.json` conservé
  (URLs sans `.html`, redirections `/beta` et `/landing`).
- `_site/` et `node_modules/` sont ignorés par git.
- `simulateur` et `ordonnance` conservent leur logique (calcul via l'API existante, génération du PDF) ;
  seuls le gabarit, le texte (vouvoiement) et les couleurs changent.
- `download.js` (fenêtre App Store / APK Android) est conservé tel quel et relié aux boutons « Télécharger ».
- Polices conservées : Fraunces (titres) et Jost (texte).

## 4. Barre du haut

- Toujours visible en haut de l'écran, y compris au scroll (`position: sticky`), translucide avec flou
  léger. C'est le seul endroit où un effet de verre est utilisé.
- Gauche : logo et nom « remplacare ».
- Centre : **Ordonnance**, **Simulateur de cotisation**, **Ressources**, **Nos Solutions**.
- Droite : bouton **Télécharger** (ouvre la fenêtre de téléchargement), bouton **Nous contacter**.
- Cibles provisoires : « Nous contacter » → `mailto:contact@remplacare.fr` ; « Ressources » → page
  « En construction » (`noindex`). Le propriétaire remplira ces liens ensuite.
- Mobile (< 900 px) : logo, bouton Télécharger et menu burger qui ouvre la liste complète.

## 5. Page d'accueil

Ordre des sections :
1. Hero + carrousel (voir §6).
2. « Pour les remplaçants qui pilotent leur activité avec précision » : quatre questions en cartes arrondies.
3. Avant / après : trois comparaisons.
4. Trois cartes : « Votre temps », « Votre argent », « Votre liberté ».
5. Fondateur : citation et histoire (seule preuve sociale réelle ; aucun logo ni témoignage inventé).
6. FAQ, avec « C'est vraiment gratuit ? » réécrite pour annoncer la version Pro (8,99 €/mois).
7. Bandeau final avec le dégradé de la palette, deux boutons, pied de page.

- Le premier bandeau d'appel à l'action de l'ancienne page est supprimé (doublon avec le bandeau final).
- Les formulations « ≈ 2 h récupérées par mois » et « Zéro surprise en fin d'année » ne sont pas reprises
  (aucune donnée derrière ; la seconde sur-promet pour un outil indicatif). Remplacées par des formulations
  sans chiffre.
- Tout le texte existant est réécrit au vouvoiement.

## 6. Hero et carrousel

### Contenu du hero (vouvoiement)
- Titre : « Le calendrier des professionnels de santé »
- Sous-titre : « Spécialement conçu pour les remplaçants »
- Texte : « Ayez une vision de votre CA prévisionnel, anticipez vos cotisations et consacrez-vous à votre pratique. »
- Deux boutons : **S'inscrire** (provisoirement : ouvre la même fenêtre que Télécharger) et **Télécharger l'app**.

### Carrousel
Quatre onglets-icônes (carrés arrondis, icônes redessinées en SVG d'après celles de l'app), flèches gauche et
droite, un panneau arrondi dessous (pastille d'outil, titre, texte, puces, « En savoir plus → », visuel de l'app).

| Onglet | Titre du panneau | Texte et puces |
|---|---|---|
| Calendrier | Organisez votre vie grâce à un calendrier répondant à vos besoins. | Importez vos jours travaillés de votre téléphone ; entrez votre CA journalier, votre amplitude horaire et planifiez votre réveil ; ne vous souciez plus de rien |
| Moniteur | Suivez quotidiennement votre activité | Évaluez vos revenus tout en gardant un œil sur votre rythme de travail ; fixez-vous des objectifs et mettez en place ce qu'il faut pour les atteindre ; tracez vos paiements |
| Simulateur de cotisation | Ne craignez plus les rattrapages et anticipez pour ne plus subir | URSSAF et CARPIMKO : découvrez à l'avance ce que vous devez provisionner ; consacrez-vous à votre pratique, payez-vous le prix juste et soyez serein pour l'avenir |
| Trousse de secours | Des outils à votre disposition | Générateur d'ordonnance, guide de cotations, astuces pour votre pratique… tout ce dont vous avez besoin pour répondre à vos besoins du quotidien |

Le texte du Moniteur reste inchangé sur demande du propriétaire.
« Impôts » a été retiré du texte du simulateur : `simulateur.html` indique qu'il ne calcule pas l'impôt sur le revenu.

### Comportement
- Passage automatique à l'onglet suivant toutes les 6 secondes. Le contour de l'icône active se trace sur
  6 secondes (minuteur), en partant du haut au centre.
- Le défilement s'arrête : au survol du carrousel, au focus clavier, au clic sur une icône ou une flèche
  (arrêt définitif pour la visite), et si l'appareil est réglé sur « réduire les animations ».
- Navigation : clic sur les icônes, flèches, touches gauche/droite du clavier, balayage sur mobile.
- Les quatre panneaux sont présents dans le HTML (lisibles par les moteurs de recherche), un seul est affiché.
- « En savoir plus » : Calendrier et Moniteur → `/nos-solutions` (ancres) ; Simulateur → `/simulateur` ;
  Trousse de secours → `/ordonnance`. (Hypothèse à confirmer.)

## 7. Page « Nos solutions » (Gratuit / Pro)

- Deux colonnes. Prix du Pro : **8,99 €/mois** ou **79 €/an** (≈ 27 % d'économie).
- **Gratuit** : calendrier, import de calendrier, suivi du CA et des paiements, moniteur, trousse de secours
  (générateur d'ordonnance, guide de cotations, astuces), **un objectif par an**.
- **Pro** : simulateur détaillé avec les cotisations à provisionner chaque mois, **objectifs illimités**.
- Bouton du Pro : « Bientôt disponible » avec inscription par e-mail, tant que l'abonnement n'est pas
  ouvert ; « Choisir le Pro » ensuite. (Hypothèse : abonnement pas encore ouvert.)
- Positionnement prix : 8,99 € vise à rester nettement sous les apps de planning pour remplaçants
  (Oly : 15,99 €/mois) et très en dessous des logiciels de cabinet (89 à 160 €/mois). Sources et limites
  à garder en tête : le tarif de « Chef IDEL » n'a pas pu être vérifié ; la plupart des tarifs relevés sont
  indicatifs.

## 8. Design visuel

Palette (variables CSS dans `tokens.css`) :

| Rôle | Couleur |
|---|---|
| Texte, titres, boutons | Navy `#1E324A` |
| Accents, sous-titre, minuteur | Vert `#006026` |
| Fonds, pastilles | Bleu poudre `#C2E0F2` |
| Décor, illustrations | Olive `#A0B352` |
| Accents rares et petits (pastille « Bientôt », notification) | Orange `#F25C05` |
| Dégradés | Bleu poudre → saumon `#D9967E` |

Règles d'accessibilité (contrastes mesurés sur blanc) : olive (2,3), saumon (2,4), bleu poudre (1,4) et
orange (3,3) ne servent **jamais** de couleur de texte sur blanc. Texte navy sur ces fonds : 5,6 / 5,3 / 9,5 / 3,9
(l'orange ne porte aucun texte courant). Seuil visé : 4,5 pour le texte courant.

Style : grands arrondis et surfaces pleines pour cartes et bulles ; translucidité uniquement sur la barre du haut ;
dégradé en fond du hero et du bandeau final.

## 9. Vérifications avant de livrer

- Le build passe sans erreur.
- Captures à 375, 768 et 1200 px sur chaque page.
- Barre fixe au scroll ; menu burger sur mobile.
- Carrousel : passage à l'onglet suivant après 6 s, arrêt au clic, au survol, au focus et avec « réduire les animations ».
- Aucun lien interne cassé ; la fenêtre « Télécharger » s'ouvre depuis tous les boutons.
- Contrastes de texte ≥ 4,5.
- Le simulateur et l'ordonnance fonctionnent comme avant (même résultats pour les mêmes entrées).

## 10. Livraison

Ordre : (1) socle Eleventy et migration à l'identique ; (2) hero et carrousel ; (3) sections de l'accueil ;
(4) Nos solutions ; (5) vouvoiement et couleurs sur les autres pages ; (6) page Ressources en construction.
Développement sur la branche `claude/great-franklin-8npvyi`, aperçu Vercel avant toute mise en production.
Aucune pull request sans demande explicite.

## 11. À fournir par le propriétaire

- Fichier du logo (remplace le carré provisoire des maquettes).
- Quatre captures de l'app (calendrier, moniteur, simulateur, trousse de secours) pour les visuels du carrousel.
- Confirmation des deux hypothèses : cibles des « En savoir plus » et état de l'abonnement Pro.

## 12. Points ouverts

- Cibles définitives de « S'inscrire », « Nous contacter » et « Ressources ».
- Date et mode d'ouverture de l'abonnement Pro.
- Visuel de référence du hero et du carrousel : `2026-11-12-maquette-hero.png` (même dossier). Le logo et les captures y sont des emplacements provisoires.
