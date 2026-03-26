/* ============================================
   DETAIL.JS — Page de détail d'un Pokémon
   Stats, capacités, évolutions.
   ============================================ */

/* Éléments du DOM — on les cible une seule fois ici pour les
   réutiliser dans toutes les fonctions sans refaire getElementById */
const ficheDetail      = document.getElementById("fiche-detail");
const messageErreur    = document.getElementById("message-erreur");
const detailNumero     = document.getElementById("detail-numero");
const detailNom        = document.getElementById("detail-nom");
const detailTypes      = document.getElementById("detail-types");
const detailImageFace  = document.getElementById("detail-image-face");
const detailImageDos   = document.getElementById("detail-image-dos");
const detailTaille     = document.getElementById("detail-taille");
const detailPoids      = document.getElementById("detail-poids");
const detailStats      = document.getElementById("detail-stats");
const detailCapacites  = document.getElementById("detail-capacites");
const detailEvolutions = document.getElementById("detail-evolutions");

/* traductionTypes est défini dans api.js (chargé avant ce fichier) */

/* Traduction des noms de stats anglais → français.
   L'API retourne les stats sous forme de clés anglaises
   (ex: "special-attack"), on les affiche en français. */
const traductionStats = {
  hp:               "PV",
  attack:           "Attaque",
  defense:          "Défense",
  "special-attack": "Att. Spé.",
  "special-defense":"Déf. Spé.",
  speed:            "Vitesse",
};

/* --- Gestion des erreurs --- */

function afficherErreur(texte) {
  messageErreur.textContent = texte;
  messageErreur.hidden = false;
}

/* Lit le paramètre "id" dans l'URL de la page.
   Exemple : detail.html?id=25 → retourne "25" */
function getIdDepuisUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

/* --- Statistiques ---
   Pour chaque stat (PV, Attaque, Défense...),
   on affiche : le nom traduit, la valeur numérique,
   et une barre de progression colorée selon le niveau. */

function afficherStats(stats) {
  detailStats.innerHTML = "";

  stats.forEach((stat) => {
    const nomTraduit = traductionStats[stat.stat.name] || stat.stat.name;
    const valeur = stat.base_stat;

    /* On ramène la valeur à un pourcentage sur une base de 150
       (valeur max raisonnable). On plafonne à 100% pour les Pokémon
       légendaires qui peuvent dépasser 150 sur certaines stats. */
    const pourcentage = Math.min((valeur / 150) * 100, 100);

    /* Couleur de la barre selon le niveau de la stat */
    let classeCouleur = "detail-stat__barre-rempli--faible"; /* rouge  : < 50  */
    if (valeur >= 80)      classeCouleur = "detail-stat__barre-rempli--bon";    /* vert   : ≥ 80  */
    else if (valeur >= 50) classeCouleur = "detail-stat__barre-rempli--moyen";  /* orange : 50-79 */

    const ligne = document.createElement("li");
    ligne.className = "detail-stat";

    /* role="progressbar" et les attributs aria-* rendent la barre
       lisible par les lecteurs d'écran (accessibilité WCAG) */
    ligne.innerHTML = `
      <span class="detail-stat__nom">${nomTraduit}</span>
      <span class="detail-stat__valeur">${valeur}</span>
      <div class="detail-stat__barre-fond">
        <div
          class="detail-stat__barre-rempli ${classeCouleur}"
          style="width: ${pourcentage}%"
          role="progressbar"
          aria-valuenow="${valeur}"
          aria-valuemin="0"
          aria-valuemax="150"
          aria-label="${nomTraduit} : ${valeur}"
        ></div>
      </div>
    `;

    detailStats.appendChild(ligne);
  });
}

/* --- Capacités ---
   On affiche simplement les noms des capacités (abilities)
   tels que retournés par l'API, sans traduction. */

function afficherCapacites(capacites) {
  detailCapacites.innerHTML = "";

  capacites.forEach((item) => {
    const li = document.createElement("li");
    li.className = "detail-capacite";
    li.textContent = item.ability.name;
    detailCapacites.appendChild(li);
  });
}

/* --- Évolutions ---
   C'est la partie la plus complexe. L'API d'évolution ne fait
   pas partie des données du Pokémon directement — il faut :
   1. Appeler /pokemon-species/{id} pour obtenir l'URL de la chaîne
   2. Appeler cette URL pour obtenir l'arbre d'évolutions
   3. Parcourir cet arbre (structure récursive) pour en extraire
      la liste ordonnée des évolutions (forme linéaire) */

async function afficherEvolutions(idPokemon) {
  try {
    /* Étape 1 : données de l'espèce (contient le lien vers la chaîne) */
    const espece = await fetchJson(
      `https://pokeapi.co/api/v2/pokemon-species/${idPokemon}`
    );

    /* Étape 2 : chaîne d'évolution complète */
    const chaineDonnees = await fetchJson(espece.evolution_chain.url);

    /* Étape 3 : parcours de l'arbre.
       L'arbre a la forme : { chain: { species, evolves_to: [ { species, evolves_to: [...] } ] } }
       On suit le premier enfant à chaque niveau pour obtenir la ligne principale. */
    const evolutions = [];
    let etape = chaineDonnees.chain;

    while (etape) {
      const nom = etape.species.name;
      /* L'ID est extrait depuis l'URL de l'espèce (ex: ".../pokemon-species/4/") */
      const morceaux = etape.species.url.split("/").filter(Boolean);
      const id = morceaux[morceaux.length - 1];

      evolutions.push({ id, nom });

      /* On s'arrête quand il n'y a plus d'évolution suivante */
      if (!etape.evolves_to || etape.evolves_to.length === 0) break;
      etape = etape.evolves_to[0];
    }

    /* Un seul élément dans la chaîne = ce Pokémon n'évolue pas */
    if (evolutions.length <= 1) {
      detailEvolutions.innerHTML = `<p style="color: var(--couleur-texte-discret)">Ce Pokémon n'évolue pas.</p>`;
      return;
    }

    /* Affichage : image + nom pour chaque étape, séparés par une flèche →
       Le Pokémon actuellement affiché reçoit la classe "actif" (mise en valeur) */
    detailEvolutions.innerHTML = "";

    evolutions.forEach((evolution, index) => {
      if (index > 0) {
        const fleche = document.createElement("span");
        fleche.className = "evolution-fleche";
        fleche.textContent = "→";
        fleche.setAttribute("aria-hidden", "true"); /* Décoratif, pas lu par les lecteurs d'écran */
        detailEvolutions.appendChild(fleche);
      }

      const lien = document.createElement("a");
      lien.href = `detail.html?id=${evolution.id}`;
      lien.className =
        "evolution-etape" +
        (evolution.id === String(idPokemon) ? " evolution-etape--actif" : "");

      lien.innerHTML = `
        <img
          src="${getImageUrl(evolution.id)}"
          alt="${evolution.nom}"
          class="evolution-etape__image"
          loading="lazy"
        />
        <span class="evolution-etape__nom">${evolution.nom}</span>
      `;

      detailEvolutions.appendChild(lien);
    });
  } catch (erreur) {
    /* En cas d'erreur (réseau ou données manquantes), on affiche un message discret */
    detailEvolutions.innerHTML = `<p style="color: var(--couleur-texte-discret)">Aucune évolution disponible.</p>`;
    console.error(erreur);
  }
}

/* --- Fonction principale ---
   Orchestre tous les appels API et l'affichage de la fiche.
   La fiche est cachée par défaut dans le HTML (attribut hidden)
   et ne devient visible qu'une fois toutes les données chargées. */

async function afficherDetail() {
  const id = getIdDepuisUrl();

  /* Si on arrive sur cette page sans paramètre ?id= dans l'URL */
  if (!id) {
    afficherErreur("Pokémon introuvable. Retournez à la liste.");
    return;
  }

  try {
    /* Récupération de toutes les données du Pokémon en une seule requête */
    const pokemon = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${id}`);

    /* Numéro affiché sur 3 chiffres : ex. id=4 → "# 004" */
    detailNumero.textContent = `#${String(pokemon.id).padStart(3, "0")}`;
    detailNom.textContent = pokemon.name;

    /* Badges de types (même logique que dans app.js) */
    detailTypes.innerHTML = pokemon.types
      .map((t) => {
        const traduction = traductionTypes[t.type.name] || t.type.name;
        return `<span class="badge-type type-${t.type.name}">${traduction}</span>`;
      })
      .join("");

    /* Images face et dos — les sprites viennent de raw.githubusercontent.com via getImageUrl */
    detailImageFace.src = getImageUrl(pokemon.id);
    detailImageFace.alt = `${pokemon.name} — face`;

    /* L'image dos n'existe pas pour tous les Pokémon — on cache le bloc si absent */
    const imageDos = pokemon.sprites.back_default;
    if (imageDos) {
      detailImageDos.src = imageDos;
      detailImageDos.alt = `${pokemon.name} — dos`;
    } else {
      detailImageDos.closest(".detail-image-wrapper").hidden = true;
    }

    /* Conversions d'unités : l'API retourne en décimètres et hectogrammes */
    detailTaille.textContent = `${pokemon.height * 10} cm`;
    detailPoids.textContent  = `${(pokemon.weight / 10).toFixed(1)} kg`;

    afficherStats(pokemon.stats);
    afficherCapacites(pokemon.abilities);
    await afficherEvolutions(pokemon.id);

    /* On rend la fiche visible maintenant que tout est prêt */
    ficheDetail.hidden = false;
  } catch (erreur) {
    if (erreur.message.includes("404")) {
      afficherErreur("Ce Pokémon n'existe pas.");
    } else {
      afficherErreur("Erreur de connexion, veuillez réessayer.");
    }
    console.error(erreur);
  }
}

/* --- Initialisation --- */
afficherDetail();
