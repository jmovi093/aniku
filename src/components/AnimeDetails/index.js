// index.js
// Punto de entrada centralizado para AnimeDetails components

//  Componentes modulares
export { default as AnimeDetailsHeader } from "./AnimeDetailsHeader";
export { default as AnimeDetailsEpisodes } from "./AnimeDetailsEpisodes";
export { default as AnimeDetailsSkeletonLoader } from "./AnimeDetailsSkeletonLoader";

//  Estilos
export { default as AnimeDetailsStyles } from "./styles/AnimeDetailsStyles";

//  Utilidades
export * from "./utils/animeDetailsUtils";
export { default as animeDetailsUtils } from "./utils/animeDetailsUtils";

//  Custom Hooks
export { default as useAnimeDetails } from "./hooks/useAnimeDetails";
export { default as useEpisodePlayer } from "./hooks/useEpisodePlayer";
