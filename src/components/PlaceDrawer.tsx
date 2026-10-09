"use client";

import { useEffect } from "react";
import { CATEGORY_META, type Place } from "@/data/places";

type PlaceDrawerProps = {
  place: Place | null;
  onClose: () => void;
};

const kindLabels: Record<Place["kind"], string> = {
  landmark: "Landmark",
  restaurant: "Restaurante icónico",
  adventure: "Actividad de aventura",
  "food-stop": "Parada gastronómica",
  "tourism-office": "Oficina de turismo",
};

export default function PlaceDrawer({ place, onClose }: PlaceDrawerProps) {
  useEffect(() => {
    if (!place) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [place, onClose]);

  const open = Boolean(place);
  const meta = place ? CATEGORY_META[place.category] : null;

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-teal-950/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        aria-label="Cerrar ficha del lugar"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="place-drawer-title"
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl shadow-teal-950/20 transition-transform duration-300 ease-out dark:bg-zinc-950 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {place && meta ? (
          <>
            <header
              className="relative overflow-hidden px-6 pb-6 pt-5 text-white"
              style={{
                background: `linear-gradient(135deg, ${meta.color} 0%, #134e4a 100%)`,
              }}
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium tracking-wide uppercase">
                  <span aria-hidden>{meta.emoji}</span>
                  {place.category}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full bg-white/15 px-3 py-1 text-sm hover:bg-white/25"
                >
                  Cerrar
                </button>
              </div>
              <p className="text-xs font-medium tracking-[0.18em] text-white/70 uppercase">
                {kindLabels[place.kind]}
              </p>
              <h2
                id="place-drawer-title"
                className="mt-1 text-2xl font-semibold tracking-tight"
              >
                {place.name}
              </h2>
              <p className="mt-2 text-sm text-white/85">
                {place.city} · {place.region}
              </p>
            </header>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <p className="rounded-xl bg-teal-50 px-4 py-3 text-sm font-medium text-teal-950 dark:bg-teal-950/40 dark:text-teal-50">
                {place.highlight}
              </p>
              <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                {place.description}
              </p>

              <section>
                <h3 className="text-xs font-semibold tracking-[0.16em] text-zinc-400 uppercase">
                  Dirección
                </h3>
                <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
                  {place.address}
                </p>
                {place.hours ? (
                  <p className="mt-1 text-sm text-zinc-500">{place.hours}</p>
                ) : null}
              </section>

              {place.typicalDishes && place.typicalDishes.length > 0 ? (
                <section>
                  <h3 className="text-xs font-semibold tracking-[0.16em] text-zinc-400 uppercase">
                    Platos típicos y sabores
                  </h3>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {place.typicalDishes.map((dish) => (
                      <li
                        key={dish}
                        className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-100"
                      >
                        {dish}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section>
                <h3 className="text-xs font-semibold tracking-[0.16em] text-zinc-400 uppercase">
                  Tips locales
                </h3>
                <ul className="mt-2 space-y-2">
                  {place.localTips.map((tip) => (
                    <li
                      key={tip}
                      className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm leading-5 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    >
                      {tip}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-xs font-semibold tracking-[0.16em] text-zinc-400 uppercase">
                  Tags
                </h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {place.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      #{tag}
                    </li>
                  ))}
                </ul>
              </section>

              {place.website ? (
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  Sitio oficial
                </a>
              ) : null}
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}
