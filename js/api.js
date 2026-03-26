/* ============================================
   API.JS — Communication avec la PokéAPI
   Pas de manipulation du DOM ici.
   ============================================ */

const URL_BASE = "https://pokeapi.co/api/v2";

/* Nombre de Pokémon par page — utilisé ici et dans app.js */
const POKEMONS_PAR_PAGE = 20;

/* Traduction des types anglais → français.
   Déclaré ici une seule fois, utilisé par app.js et detail.js.
   Note : les noms des Pokémon eux-mêmes ne sont pas traduits —
   cela nécessiterait un appel supplémentaire à /pokemon-species/{id}
   pour chaque Pokémon, ce qui doublerait le nombre de requêtes. */
const traductionTypes = {
  fire: "Feu",
  water: "Eau",
  grass: "Plante",
  electric: "Électrik",
  ice: "Glace",
  fighting: "Combat",
  poison: "Poison",
  ground: "Sol",
  flying: "Vol",
  psychic: "Psy",
  bug: "Insecte",
  rock: "Roche",
  ghost: "Spectre",
  dragon: "Dragon",
  dark: "Ténèbre",
  steel: "Acier",
  fairy: "Fée",
  normal: "Normal",
};

/* Requête vers une URL, retourne le JSON.
   Lance une erreur si la réponse n'est pas OK (ex: 404). */
async function fetchJson(url) {
  const reponse = await fetch(url);
  if (!reponse.ok) {
    throw new Error(`Erreur HTTP ${reponse.status}`);
  }
  return reponse.json();
}

/* Retourne l'URL du sprite front_default d'un Pokémon depuis son ID.
   Utilisé pour la liste et les évolutions où on n'a que l'id disponible. */
function getImageUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

/* Récupère les Pokémon d'une page donnée.
   La PokéAPI ne retourne pas directement les détails dans la liste —
   elle donne d'abord les noms et URLs, puis il faut une requête
   individuelle par Pokémon pour obtenir ses types et son image.
   Promise.all() permet de faire ces 20 requêtes en parallèle plutôt
   qu'une par une, ce qui est beaucoup plus rapide.
   Retourne un tableau d'objets { id, nom, image, types }. */
async function getListePokemons(page) {
  /* Offset : nombre de Pokémon à sauter (page 1 → 0, page 2 → 20...) */
  const offset = (page - 1) * POKEMONS_PAR_PAGE;

  /* 1. Liste brute : noms + URLs des Pokémon de la page */
  const listeBrute = await fetchJson(
    `${URL_BASE}/pokemon?limit=${POKEMONS_PAR_PAGE}&offset=${offset}`
  );

  /* 2. Détails de chaque Pokémon en parallèle */
  const details = await Promise.all(
    listeBrute.results.map((pokemon) => fetchJson(pokemon.url))
  );

  /* 3. On ne garde que les données nécessaires à l'affichage */
  return details.map((pokemon) => ({
    id:    pokemon.id,
    nom:   pokemon.name,
    image: getImageUrl(pokemon.id),
    types: pokemon.types.map((t) => t.type.name),
  }));
}

/* Récupère le nombre total de Pokémon dans l'API.
   Le résultat est mis en cache après le premier appel pour éviter
   de refaire la requête à chaque changement de page. */
let totalPokemonsCache = null;

async function getNombreTotal() {
  if (totalPokemonsCache !== null) return totalPokemonsCache;
  const data = await fetchJson(`${URL_BASE}/pokemon?limit=1`);
  totalPokemonsCache = data.count;
  return totalPokemonsCache;
}
