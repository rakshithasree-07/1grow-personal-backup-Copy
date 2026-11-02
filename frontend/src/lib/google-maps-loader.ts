declare global {
  interface Window {
    google: typeof google;
    __googleMapsLoaderPromise?: Promise<typeof google>;
    __googleMapsCallback?: () => void;
  }
}

/**
 * Loads the Google Maps JavaScript API (with the Places library) exactly once
 * and caches the in-flight/resolved promise on `window` so it survives Next.js
 * Fast Refresh / multiple module instances during dev.
 *
 * Because the script is loaded with `loading=async`, the `load` event only
 * guarantees the bootstrap loader is present — the actual classes (Map,
 * Marker, Geocoder, places.Autocomplete, ...) must be requested explicitly
 * via `google.maps.importLibrary(...)` before they can be constructed.
 */
export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only be loaded in the browser"));
  }

  if (window.__googleMapsLoaderPromise) {
    return window.__googleMapsLoaderPromise;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured"),
    );
  }

  const promise = (async () => {
    if (!window.google?.maps || !window.google.maps.Map) {
      await new Promise<void>((resolve, reject) => {
        const existing = document.getElementById(
          "google-maps-script",
        ) as HTMLScriptElement | null;

        if (existing) {
          if (window.google?.maps && window.google.maps.Map) {
            resolve();
            return;
          }
          const oldCallback = window.__googleMapsCallback;
          window.__googleMapsCallback = () => {
             if (oldCallback) oldCallback();
             resolve();
          };
          existing.addEventListener("error", () =>
            reject(new Error("Failed to load Google Maps")),
          );
          return;
        }

        window.__googleMapsCallback = () => {
          resolve();
        };

        const script = document.createElement("script");
        script.id = "google-maps-script";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=places,marker,geocoding&callback=__googleMapsCallback`;
        script.async = true;
        script.defer = true;
        script.onerror = () => reject(new Error("Failed to load Google Maps"));
        document.head.appendChild(script);
      });
    }

    return window.google;
  })();

  window.__googleMapsLoaderPromise = promise;

  promise.catch(() => {
    delete window.__googleMapsLoaderPromise;
  });

  return promise;
}
