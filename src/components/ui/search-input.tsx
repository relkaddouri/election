"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";

/**
 * Champ de recherche synchronisé avec l'URL.
 *
 * Passer par l'URL plutôt que par un état local rend la recherche partageable,
 * conservée au rechargement et compatible avec le bouton retour — et laisse le
 * filtrage à PostgreSQL, indispensable dès quelques milliers de lignes.
 */
export function SearchInput({
  paramName = "q",
  placeholder,
  label,
  delay = 350,
}: {
  paramName?: string;
  placeholder?: string;
  label: string;
  delay?: number;
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

  useEffect(() => {
    const current = searchParams.get(paramName) ?? "";
    if (value === current) return;

    // Anti-rebond : sans lui, chaque frappe déclencherait une navigation
    // serveur.
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value) params.set(paramName, value);
      else params.delete(paramName);
      // Une nouvelle recherche repart de la première page.
      params.delete("page");
      router.replace(`${pathname}?${params}`, { scroll: false });
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay, paramName, pathname, router, searchParams]);

  return (
    <div className="relative">
      <label htmlFor="search" className="sr-only">
        {label}
      </label>
      <Input
        id="search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  );
}
