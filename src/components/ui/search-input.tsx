"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import { Input } from "@/components/ui/input";

/**
 * Champ de recherche synchronisé avec l'URL.
 *
 * Passer par l'URL plutôt que par un état local rend la recherche partageable,
 * conservée au rechargement et compatible avec le bouton retour — et laisse le
 * filtrage à PostgreSQL, indispensable dès quelques milliers de lignes.
 *
 * Une recherche **non vide** part au clic sur « بحث » ou à la touche Entrée,
 * jamais pendant la frappe : sur une liste de plusieurs milliers d'électeurs,
 * chaque caractère déclencherait une requête serveur, et les résultats
 * sauteraient sous les yeux de l'utilisateur en pleine saisie.
 *
 * Vider le champ fait **exception et réinitialise aussitôt** la liste. Exiger
 * un clic pour revenir à l'état complet serait un piège : le champ paraît
 * vide, mais les résultats restent filtrés — l'utilisateur croit voir toute la
 * liste alors qu'il n'en voit qu'une partie. Le risque de requête inutile
 * n'existe pas ici, puisqu'un champ vidé ne peut l'être qu'une fois.
 */
export function SearchInput({
  paramName = "q",
  placeholder,
  label,
  submitLabel = "بحث",
}: {
  paramName?: string;
  placeholder?: string;
  label: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlValue = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(urlValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Le champ doit se réaligner quand l'URL change sans passer par lui :
  // « إعادة ضبط الفلاتر » ou le bouton retour du navigateur.
  //
  // Ajustement pendant le rendu, motif recommandé par React pour synchroniser
  // un état sur une prop. Quand c'est le champ lui-même qui a poussé la
  // valeur, `urlValue` rejoint `value` et rien ne se déclenche.
  const [lastUrlValue, setLastUrlValue] = useState(urlValue);
  if (urlValue !== lastUrlValue) {
    setLastUrlValue(urlValue);
    if (urlValue !== value) setValue(urlValue);
  }

  function rechercher(terme: string) {
    const params = new URLSearchParams(searchParams);
    if (terme) params.set(paramName, terme);
    else params.delete(paramName);
    // Une nouvelle recherche repart de la première page.
    params.delete("page");
    router.replace(`${pathname}?${params}`, { scroll: false });
  }

  function saisir(saisie: string) {
    setValue(saisie);

    // Champ vidé : on rétablit la liste complète sans attendre de clic.
    // Conditionné à la présence d'un terme dans l'URL — sinon taper puis
    // effacer avant toute recherche déclencherait une navigation pour rien.
    if (!saisie.trim() && urlValue) rechercher("");
  }

  function effacer() {
    saisir("");
    // Le curseur revient dans le champ : l'utilisateur qui efface veut le plus
    // souvent saisir autre chose.
    inputRef.current?.focus();
  }

  return (
    // Un vrai `<form>` : la touche Entrée dans le champ le soumet nativement,
    // sans écouteur clavier à écrire ni à maintenir.
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        rechercher(value.trim());
      }}
      className="flex gap-2"
    >
      <div className="relative min-w-0 flex-1">
        <label htmlFor={`search-${paramName}`} className="sr-only">
          {label}
        </label>
        <Input
          ref={inputRef}
          id={`search-${paramName}`}
          // `type="search"` et non `text` : le clavier mobile affiche alors une
          // touche de validation plutôt qu'un retour à la ligne.
          type="search"
          value={value}
          onChange={(event) => saisir(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          // Réserve la place du bouton d'effacement du côté `end` — à gauche
          // en RTL — pour que le texte ne passe pas dessous.
          className={value ? "pe-11" : undefined}
        />

        {/*
          Bouton d'effacement maison plutôt que celui du navigateur : Firefox
          n'en affiche aucun, et celui de WebKit ne se positionne ni ne se
          dimensionne (il tombe sous les 44px exigés en usage tactile). Le
          natif est masqué en CSS pour éviter deux croix côte à côte.
        */}
        {value && (
          <button
            type="button"
            onClick={effacer}
            aria-label="مسح البحث"
            className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-900"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>

      <button
        type="submit"
        className="inline-flex min-h-touch shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-4 font-medium text-white transition-colors hover:bg-brand-700"
      >
        <Search aria-hidden="true" className="size-4 shrink-0" />
        <span>{submitLabel}</span>
      </button>
    </form>
  );
}
