/* ============================================
   APP.JS — Page principale
   Liste des Pokémon, pagination, filtre.
   ============================================ */

/* Éléments du DOM ciblés une seule fois */
const grillePokemons   = document.getElementById("grille-pokemons");
const messageErreur    = document.getElementById("message-erreur");
const messageVide      = document.getElementById("message-vide");
const champRecherche   = document.getElementById("champ-recherche");
const boutonFiltrer    = document.getElementById("bouton-filtrer");
const boutonPrecedent  = document.getElementById("bouton-precedent");
const boutonSuivant    = document.getElementById("bouton-suivant");
const paginationNumeros = document.getElementById("pagination-numeros");

/* Page affichée en ce moment. (sauvegardée dans sessionStorage). */
let pageActuelle = parseInt(sessionStorage.getItem("pageRetour")) || 1;
sessionStorage.removeItem("pageRetour");

/* POKEMONS_PAR_PAGE et traductionTypes sont définis dans api.js*/

/* --- Gestion des erreurs --- */

function afficherErreur(texte) {
  messageErreur.textContent = texte;
  messageErreur.hidden = false;
}

function masquerErreur() {
  messageErreur.textContent = "";
  messageErreur.hidden = true;
}

/* --- Construction d'une carte Pokémon ---
   Reçoit un objet pokemon { id, nom, image, types },
   retourne un élément <li> prêt à insérer dans la liste.

   Note : le <ul> id="grille-pokemons" est sémantiquement une liste,
   mais il est mis en page avec display:grid en CSS — d'où le nom "grille". */

function creerCartePokemon(pokemon) {
  /* padStart(3, "0") formate le numéro sur 3 chiffres : 1 → "001", 25 → "025" */
  const numeroFormate = `#${String(pokemon.id).padStart(3, "0")}`;

  /* On construit le HTML des badges de type avant de l'injecter dans la carte. */
  const badgesTypes = pokemon.types
    .map((type) => {
      const traduction = traductionTypes[type] || type;
      return `<span class="badge-type type-${type}">${traduction}</span>`;
    })
    .join("");

  const carte = document.createElement("li");
  carte.className = "carte-pokemon";

  carte.innerHTML = `
    <a href="detail.html?id=${pokemon.id}" class="carte-pokemon__lien">
      <span class="carte-pokemon__numero">${numeroFormate}</span>
      <div class="carte-pokemon__image-wrapper">
        <img
          src="${pokemon.image}"
          alt="${pokemon.nom}"
          class="carte-pokemon__image"
          loading="lazy"
        />
      </div>
      <p class="carte-pokemon__nom">${pokemon.nom}</p>
      <div class="carte-pokemon__types">${badgesTypes}</div>
    </a>
  `;

  return carte;
}

/* --- Affichage de la grille ---
   Vide la grille et la remplit avec les Pokémon de la page demandée. */

async function afficherPage(page) {
  grillePokemons.innerHTML = "";
  masquerErreur();
  messageVide.hidden = true;

  try {
    const pokemons = await getListePokemons(page);

    pokemons.forEach((pokemon) => {
      grillePokemons.appendChild(creerCartePokemon(pokemon));
    });

    await mettreAJourPagination(page);

    /* Focus sur la première carte pour la navigation clavier */
    const premiereCarte = grillePokemons.querySelector(".carte-pokemon__lien");
    if (premiereCarte) premiereCarte.focus();
  } catch (erreur) {
    if (erreur.message.includes("Failed to fetch")) {
      afficherErreur("Erreur de connexion, veuillez réessayer.");
    } else {
      afficherErreur("Une erreur inattendue est survenue.");
    }
    console.error(erreur);
  }
}

/* --- Pagination ---
   Génère les numéros de page et gère les boutons précédent / suivant. */

async function mettreAJourPagination(page) {
  const total = await getNombreTotal();
  const nombreDePages = Math.ceil(total / POKEMONS_PAR_PAGE);

  boutonPrecedent.disabled = page === 1;
  boutonSuivant.disabled = page === nombreDePages;

  paginationNumeros.innerHTML = "";

  /* On affiche au maximum 7 numéros autour de la page actuelle (±3) */
  const debut = Math.max(1, page - 3);
  const fin   = Math.min(nombreDePages, page + 3);

  for (let i = debut; i <= fin; i++) {
    const bouton = document.createElement("li");
    bouton.className =
      "pagination__numero" + (i === page ? " pagination__numero--actif" : "");
    bouton.textContent = i;
    bouton.setAttribute("aria-label", `Page ${i}`);

    bouton.addEventListener("click", () => {
      pageActuelle = i;
      afficherPage(pageActuelle);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    paginationNumeros.appendChild(bouton);
  }
}

/* --- Filtre de recherche ---
   Masque les cartes dont le nom ne correspond pas à la saisie. */

function filtrerPokemons() {
  const saisie = champRecherche.value.trim().toLowerCase();
  const cartes = grillePokemons.querySelectorAll(".carte-pokemon");
  let nombreVisibles = 0;

  cartes.forEach((carte) => {
    const nom = carte.querySelector(".carte-pokemon__nom").textContent.toLowerCase();
    if (nom.includes(saisie)) {
      carte.style.display = "";
      nombreVisibles++;
    } else {
      carte.style.display = "none";
    }
  });

  /* Message "aucun résultat" si la saisie ne correspond à rien */
  messageVide.hidden = nombreVisibles > 0 || saisie === "";
}

/* --- Écouteurs d'événements --- */

champRecherche.addEventListener("input", filtrerPokemons);
// Bouton prévu pour le filtre dans tout le Pokédex
boutonFiltrer.addEventListener("click", filtrerPokemons);

boutonPrecedent.addEventListener("click", () => {
  if (pageActuelle > 1) {
    pageActuelle--;
    champRecherche.value = "";
    afficherPage(pageActuelle);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

boutonSuivant.addEventListener("click", () => {
  pageActuelle++;
  champRecherche.value = "";
  afficherPage(pageActuelle);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* Sauvegarde la page actuelle avant de naviguer vers une fiche détail.
   Au retour sur index.html, pageActuelle sera restauré depuis sessionStorage. */
grillePokemons.addEventListener("click", (e) => {
  if (e.target.closest(".carte-pokemon__lien")) {
    sessionStorage.setItem("pageRetour", pageActuelle);
  }
});

/* Navigation clavier dans la grille avec les touches fléchées */
grillePokemons.addEventListener("keydown", (evenement) => {
  const liens = [...grillePokemons.querySelectorAll(".carte-pokemon__lien")];
  const indexActuel = liens.indexOf(document.activeElement);
  if (indexActuel === -1) return;

  let indexCible = indexActuel;

  switch (evenement.key) {
    case "ArrowRight": indexCible = indexActuel + 1; break;
    case "ArrowLeft":  indexCible = indexActuel - 1; break;
    case "ArrowDown":  indexCible = indexActuel + 5; break;
    case "ArrowUp":    indexCible = indexActuel - 5; break;
    default: return;
  }

  if (indexCible >= 0 && indexCible < liens.length) {
    evenement.preventDefault();
    liens[indexCible].focus();
  }
});

/* --- Initialisation --- */
afficherPage(pageActuelle);
