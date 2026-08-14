/**
 * Identifiant du conteneur défilant de l'application.
 *
 * Depuis que la coquille fige la barre latérale, la page elle-même ne défile
 * plus : c'est `<main>` qui porte le défilement. Tout code qui manipulait
 * `document.body.style.overflow` doit viser cet élément.
 */
export const APP_SCROLL_ID = "app-scroll";

/** Le conteneur défilant, ou `body` sur les pages hors coquille (connexion). */
function scrollContainer(): HTMLElement {
  return document.getElementById(APP_SCROLL_ID) ?? document.body;
}

/**
 * Bloque le défilement pendant qu'un tiroir est ouvert.
 *
 * Renvoie la fonction de restauration : l'appelant la place dans le nettoyage
 * de son effet, ce qui évite d'oublier de rétablir la valeur d'origine.
 */
export function lockAppScroll(): () => void {
  const element = scrollContainer();
  const previous = element.style.overflow;
  element.style.overflow = "hidden";

  return () => {
    element.style.overflow = previous;
  };
}
