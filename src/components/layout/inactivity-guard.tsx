"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { signOutForInactivity } from "@/lib/actions/auth";
import { INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS } from "@/lib/constants";
import { APP_SCROLL_ID } from "@/lib/scroll-lock";

/**
 * Horodatage de la dernière interaction, partagé entre les onglets.
 *
 * `localStorage` et non un état React : la déconnexion vide le cookie de
 * session, donc tous les onglets. Un compteur par onglet couperait la session
 * d'un utilisateur resté actif ailleurs.
 */
const STORAGE_KEY = "derniere-activite";

/** Écritures espacées : un défilement en émet des dizaines par seconde. */
const WRITE_THROTTLE_MS = 5_000;

/** Rythme de contrôle — assez fin pour un décompte à la seconde. */
const TICK_MS = 1_000;

const ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "touchstart",
  "wheel",
] as const;

function readLastActivity(): number {
  const raw = Number(window.localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : Date.now();
}

/**
 * Déconnexion automatique après une période sans interaction.
 *
 * Monté dans le layout des pages authentifiées seulement : la page de
 * connexion n'a pas de session à faire expirer.
 */
export function InactivityGuard() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  // Évite d'enchaîner plusieurs déconnexions si un tick se déclenche pendant
  // que la précédente est encore en vol.
  const loggingOut = useRef(false);

  useEffect(() => {
    let lastWrite = 0;

    const noteActivity = () => {
      const now = Date.now();
      if (now - lastWrite < WRITE_THROTTLE_MS) return;
      lastWrite = now;
      window.localStorage.setItem(STORAGE_KEY, String(now));
    };

    // Première marque : sans elle, un onglet ouvert de longue date hériterait
    // d'un horodatage périmé et se déconnecterait aussitôt.
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));

    for (const type of ACTIVITY_EVENTS) {
      document.addEventListener(type, noteActivity, { passive: true });
    }
    // Le défilement appartient à `<main>`, pas à la fenêtre, et l'événement
    // `scroll` ne remonte pas : il faut l'écouter en phase de capture.
    const scroller = document.getElementById(APP_SCROLL_ID);
    scroller?.addEventListener("scroll", noteActivity, { passive: true });

    const tick = setInterval(() => {
      const idle = Date.now() - readLastActivity();

      if (idle >= INACTIVITY_TIMEOUT_MS) {
        if (loggingOut.current) return;
        loggingOut.current = true;
        window.localStorage.removeItem(STORAGE_KEY);
        void signOutForInactivity();
        return;
      }

      const remaining = INACTIVITY_TIMEOUT_MS - idle;
      // `null` referme l'avertissement dès qu'une activité — y compris dans un
      // autre onglet — a repoussé l'échéance.
      setSecondsLeft(
        remaining <= INACTIVITY_WARNING_MS ? Math.ceil(remaining / 1000) : null,
      );
    }, TICK_MS);

    return () => {
      clearInterval(tick);
      for (const type of ACTIVITY_EVENTS) {
        document.removeEventListener(type, noteActivity);
      }
      scroller?.removeEventListener("scroll", noteActivity);
    };
    // Comparer par mesure du temps écoulé plutôt que par minuteurs enchaînés :
    // une mise en veille de la machine fausserait un `setTimeout`, alors qu'un
    // écart d'horodatages reste juste au réveil.
  }, []);

  if (secondsLeft === null) return null;

  const rester = () => {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setSecondsLeft(null);
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="inactivite-titre"
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
    >
      <div className="fixed inset-0 bg-slate-900/50" aria-hidden="true" />

      <div className="relative w-full max-w-sm animate-fade-in rounded-xl border border-line bg-surface p-5 shadow-xl">
        <h2 id="inactivite-titre" className="text-lg font-bold">
          سيتم تسجيل خروجك قريباً
        </h2>
        <p className="mt-2 text-slate-600">
          لم يُسجَّل أي نشاط منذ مدة. سيُغلق الحساب تلقائياً خلال{" "}
          <span className="ltr-field font-semibold text-slate-900">
            {secondsLeft}
          </span>{" "}
          ثانية.
        </p>

        <Button size="lg" onClick={rester} className="mt-5 w-full" autoFocus>
          أنا هنا
        </Button>
      </div>
    </div>
  );
}
