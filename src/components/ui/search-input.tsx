"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";

/**
 * Champ de recherche synchronisé avec l'URL.
 *
 * Passer par l'URL plutôt que par un état local rend la recherche partageable,
 * conservée au rechargement et compatible avec le bouton retour — et laisse le
 * filtrage à PostgreSQL, indispensable dès quelques milliers de lignes.
 *
 * Deux déclenchements possibles :
 *
 * - `"submit"` : au clic sur « بحث » ou à la touche Entrée. Sur une
 *   liste de plusieurs milliers d'électeurs, chaque frappe déclencherait
 *   sinon une requête serveur — coûteux, et les résultats sautent sous les
 *   yeux pendant la saisie.
 * - `"live"` (défaut) : recherche à la frappe, avec anti-rebond. Convient aux
 *   listes courtes, comme celle des cadres.
 */
export function SearchInput({
  paramName = "q",
  placeholder,
  label,
  mode = "live",
  delay = 350,
  submitLabel = "بحث",
}: {
  paramName?: string;
  placeholder?: string;
  label: string;
  mode?: "submit" | "live";
  delay?: number;
  submitLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlValue = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(urlValue);

  // Le champ doit se réaligner quand l'URL change sans passer par lui :
  // « إعادة ضبط الفلاتر » ou le bouton retour du navigateur. Sans cela,
  // l'effet ci-dessous réécrirait aussitôt le paramètre tout juste effacé.
  //
  // Ajustement pendant le rendu, motif recommandé par React pour synchroniser
  // un état sur une prop. Quand c'est le champ lui-même qui a poussé la
  // valeur, `urlValue` rejoint `value` et rien ne se déclenche.
  const [lastUrlValue, setLastUrlValue] = useState(urlValue);
  if (urlValue !== lastUrlValue) {
    setLastUrlValue(urlValue);
    if (urlValue !== value) setValue(urlValue);
  }

  function pousser(terme: string) {
    const params = new URLSearchParams(searchParams);
    if (terme) params.set(paramName, terme);
    else params.delete(paramName);
    // Une nouvelle recherche repart de la première page.
    params.delete("page");
    router.replace(`${pathname}?${params}`, { scroll: false });
  }

  useEffect(() => {
    if (mode !== "live") return;
    const current = searchParams.get(paramName) ?? "";
    if (value === current) return;

    const timer = setTimeout(() => pousser(value), delay);
    return () => clearTimeout(timer);
    // `pousser` est recréé à chaque rendu ; le dépendre relancerait l'effet en
    // boucle. Ses entrées réelles figurent déjà dans la liste.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, mode, delay, paramName, pathname, router, searchParams]);

  const champ = (
    <>
      <label htmlFor={`search-${paramName}`} className="sr-only">
        {label}
      </label>
      <Input
        id={`search-${paramName}`}
        // `type="search"` et non `text` : le clavier mobile affiche alors une
        // touche de validation plutôt qu'un retour à la ligne.
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    </>
  );

  if (mode === "live") return <div className="relative">{champ}</div>;

  return (
    // Un vrai `<form>` : la touche Entrée dans le champ le soumet nativement,
    // sans écouteur clavier à écrire ni à maintenir.
    <form
      onSubmit={(event) => {
        event.preventDefault();
        pousser(value.trim());
      }}
      className="flex gap-2"
      role="search"
    >
      <div className="min-w-0 flex-1">{champ}</div>
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
