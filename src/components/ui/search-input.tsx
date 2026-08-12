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
  const [value, setValue] = useState(searchParams.get(paramName) ?? "");

  useEffect(() => {
    const current = searchParams.get(paramName) ?? "";
    if (value === current) return;

    // Anti-rebond : sans lui, chaque frappe déclencherait une navigation
    // serveur.
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value) params.set(paramName, value);
      else params.delete(paramName);
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
