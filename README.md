# Pokédex — ECF Front

Application web interactive "Pokedex" permettant de parcourir, rechercher et consulter les fiches détaillées des Pokémon, en utilisant les données de la [PokéAPI](https://pokeapi.co/).

---

## Installation

Aucune installation requise. L'application fonctionne directement dans le navigateur.

**Option 1 — Ouvrir le fichier directement**
```
Récupérer le projet. 
Ouvrir index.html dans un navigateur (Chrome, Firefox, Edge...)
```

**Option 2 — GitHub Pages**
```
https://jules-95.github.io/ECF-Front-Pokedex-DWWM/
```

---

## Technologies utilisées

| Technologie | Utilisation |
|---|---|
| HTML5 | Structure sémantique des pages |
| CSS3 | Mise en page (Grid, Flexbox), variables CSS, responsive |
| JavaScript ES6+ | Logique applicative, appels API, manipulation du DOM |
| [PokéAPI](https://pokeapi.co/) | Source de toutes les données Pokémon |
| GitHub Pages | Hébergement et déploiement |

Aucun framework ni bibliothèque externe — JavaScript et CSS vanilla uniquement.

---

## Structure du projet

```
ECF Front/
├── index.html          → Page principale (liste + pagination + filtre)
├── detail.html         → Page de détail d'un Pokémon
├── css/
│   ├── reset.css       → Remise à zéro des styles navigateur
│   ├── helpers.css     → Utilitaires globaux (rem, focus, screen-reader...)
│   ├── style.css       → Styles de la page principale
│   └── detail.css      → Styles spécifiques à la page de détail
└── js/
    ├── api.js          → Couche API : toutes les fonctions de requête PokéAPI
    ├── app.js          → Logique de la page principale
    └── detail.js       → Logique de la page de détail
```

---

## Flux de l'application

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                           │
│                                                             │
│  api.js chargé en premier (fonctions et constantes partagées)│
│  └── traductionTypes, POKEMONS_PAR_PAGE, fetchJson()        │
│      getImageUrl(), getListePokemons(), getNombreTotal()     │
│                                                             │
│  app.js s'exécute → afficherPage(1)                         │
│  ├── getListePokemons(page)                                 │
│  │   ├── fetchJson(liste)      → 1 requête (noms + URLs)    │
│  │   └── Promise.all(détails) → 20 requêtes en parallèle   │
│  ├── creerCartePokemon()  × 20 → insertion dans le DOM      │
│  └── mettreAJourPagination()  → getNombreTotal() (en cache) │
└─────────────────────────────────────────────────────────────┘
                          │
              Clic sur une carte
              <a href="detail.html?id=25">
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       detail.html                           │
│                                                             │
│  api.js rechargé (même fonctions partagées)                 │
│                                                             │
│  detail.js s'exécute → afficherDetail()                     │
│  ├── getIdDepuisUrl()         → lit ?id=25 dans l'URL       │
│  ├── fetchJson(pokemon/25)    → données complètes           │
│  ├── afficherStats()          → barres de progression       │
│  ├── afficherCapacites()      → badges de capacités         │
│  └── afficherEvolutions(25)                                 │
│      ├── fetchJson(species/25)  → lien chaîne d'évolution   │
│      └── fetchJson(chain/url)   → arbre d'évolutions        │
└─────────────────────────────────────────────────────────────┘
```

---

## Fonctionnalités implémentées

### Liste des Pokémon
- Affichage de 20 Pokémon par page avec image (sprite front_default), nom et types colorés
- Pagination avec boutons précédent/suivant et numéros de page (fenêtre glissante ±3)
- Retour automatique à la bonne page après consultation d'une fiche (via `sessionStorage`)

### Recherche et filtrage
- Filtrage en temps réel par nom sur la page en cours (sans rechargement)
- Bouton "Filtrer" en complément de la saisie 
- Message "Aucun Pokémon trouvé" si aucun résultat

### Fiche détail
- Nom, numéro, types, images face et dos
- Taille et poids (conversion décimètres → cm, hectogrammes → kg)
- Statistiques avec barres de progression colorées (rouge / orange / vert selon la valeur)
- Capacités (abilities)
- Chaîne d'évolutions cliquable avec mise en valeur du Pokémon actuel

### Gestion des erreurs
- Message affiché si l'API ne répond pas
- Message spécifique si le Pokémon n'existe pas (erreur 404)
- Message générique pour toute autre erreur inattendue
- L'application ne plante jamais sur un écran blanc

### Accessibilité (WCAG 2.1 AA)
- Balises HTML sémantiques (`header`, `main`, `footer`, `nav`, `section`, `ul`)
- Labels de formulaire masqués visuellement mais lus par les lecteurs d'écran
- Attributs ARIA (`aria-live`, `aria-label`, `role`, `aria-hidden`)
- Barres de statistiques avec `role="progressbar"` et valeurs ARIA
- Navigation clavier dans la grille (touches fléchées)
- Focus visible sur tous les éléments interactifs

### Responsive design
| Breakpoint | Comportement |
|---|---|
| Desktop (> 1024px) | Grille auto-fill, header horizontal |
| Tablette (≤ 1024px) | Grille 2 colonnes |
| Mobile (≤ 768px) | Grille 1 colonne, header en colonne, lien rapide vers la pagination |
| Très petit (≤ 500px) | Numéros de page masqués, flèches seules |

---

## Difficultés rencontrées et solutions

### 1. Structure en arbre de l'API d'évolution
**Problème** : L'endpoint `/evolution-chain` retourne un arbre récursif, pas une liste simple. Il faut d'abord appeler `/pokemon-species` pour obtenir l'URL de la chaîne.

**Solution** : Deux appels API successifs, puis parcours de l'arbre avec une boucle `while` en suivant le premier enfant (`evolves_to[0]`) à chaque niveau pour extraire la chaîne linéaire principale.

---

### 2. Performance — 20 requêtes par page
**Problème** : La liste de base retournée par l'API ne contient que les noms et URLs — il faut une requête supplémentaire par Pokémon pour obtenir ses types et son image, soit 21 requêtes par changement de page.

**Solution** : `Promise.all()` pour effectuer les 20 requêtes de détail en parallèle au lieu de les enchaîner une par une.

---

### 3. Requête répétée pour le nombre total de Pokémon
**Problème** : `getNombreTotal()` était appelé à chaque changement de page pour calculer la pagination, ajoutant une requête inutile à chaque fois.

**Solution** : Mise en cache du résultat dans une variable `totalPokemonsCache`. La requête n'est effectuée qu'une seule fois par session.

---

### 4. Retour à la mauvaise page depuis une fiche détail
**Problème** : Après avoir consulté un Pokémon en page X et cliqué sur "Retour", l'application revenait toujours à la page 1.

**Solution** : Sauvegarde du numéro de page courant dans `sessionStorage` au moment du clic sur une carte. À l'initialisation d'`app.js`, la valeur est lue et restaurée avant d'être supprimée.

---

### 5. Noms des Pokémon non traduits
**Problème** : La PokéAPI retourne les noms en anglais. Les noms français sont disponibles via `/pokemon-species/{id}`, mais cela nécessiterait une requête supplémentaire par Pokémon.

**Décision** : Fonctionnalité non implémentée pour ne pas doubler le nombre de requêtes (déjà 20 par page) et dégrader les performances. Les types et les statistiques sont traduits via un dictionnaire local.

---

### 6. Taille des sprites front_default
**Problème** : Les sprites `front_default` (96×96 px) apparaissent flous lorsqu'ils sont agrandis avec du CSS standard.

**Solution** : Ajout de `image-rendering: pixelated` pour forcer un rendu en pixels nets.

---

## Limitations connues

- Les noms des Pokémon sont affichés en anglais (voir difficulté n°5)

- Le filtre de recherche opère uniquement sur les 20 Pokémon de la page affichée, pas sur l'ensemble du Pokédex (Feature prévue avec le bouton "Filtrer" qui ne sert finalement à rien actuellement)

- L'API d'évolution ne gère que la chaîne linéaire principale (certains Pokémon ont des évolutions ramifiées non affichées)

- Ensemble de bugs visuels sur mobil invisible avec l'inspecteur sur desktop recensés dans les issues du repo (Images de "dos" ne s'affichent pas correctement / Léger zoom sur la barre de recherche créant un petit décalage / problème d'affichage sur petit écran de la chaine d'évolution qui aurait dû être en vertical pour ce format / Bug visuel des icones  fléchées de pagination ">" "<" )

- Le style général aurait pu être plus aboutit dans l'ensemble, de nombreuses idées visuelles abandonnées par manque de temps.
