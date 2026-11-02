"use client";

import * as React from "react";
import { LocateFixed, MapPin, Search, AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { Button } from "./Button";

export interface LocationResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  addressLine1: string;
  city: string;
  district: string;
  state: string;
  country: string;
  pincode: string;
}

interface LocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  disabled?: boolean;
  onLocationChange: (result: LocationResult) => void;
}

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // India, used until a location is known

function componentValue(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  type: string,
): string {
  return components?.find((c) => c.types.includes(type))?.long_name ?? "";
}

function toLocationResult(
  latLng: google.maps.LatLng,
  geocodeResult: google.maps.GeocoderResult | undefined,
): LocationResult {
  const components = geocodeResult?.address_components;
  const streetNumber = componentValue(components, "street_number");
  const route = componentValue(components, "route");
  const addressLine1 = [streetNumber, route].filter(Boolean).join(" ") ||
    componentValue(components, "sublocality") ||
    componentValue(components, "neighborhood");

  return {
    latitude: latLng.lat(),
    longitude: latLng.lng(),
    formattedAddress: geocodeResult?.formatted_address ?? "",
    addressLine1,
    city: componentValue(components, "locality") || componentValue(components, "postal_town"),
    district: componentValue(components, "administrative_area_level_3") ||
      componentValue(components, "administrative_area_level_2"),
    state: componentValue(components, "administrative_area_level_1"),
    country: componentValue(components, "country"),
    pincode: componentValue(components, "postal_code"),
  };
}

export function LocationPicker({ latitude, longitude, disabled, onLocationChange }: LocationPickerProps) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const markerRef = React.useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const geocoderRef = React.useRef<google.maps.Geocoder | null>(null);

  const [mapReady, setMapReady] = React.useState(false);
  const [mapError, setMapError] = React.useState<string | null>(null);
  const [locating, setLocating] = React.useState(false);
  const [resolving, setResolving] = React.useState(false);
  const [resolvedAddress, setResolvedAddress] = React.useState<string | null>(null);
  const [retryToken, setRetryToken] = React.useState(0);

  const applyPosition = React.useCallback(async (lat: number, lng: number) => {
    if (!mapRef.current || !markerRef.current || !geocoderRef.current) return;
    const latLng = new google.maps.LatLng(lat, lng);
    markerRef.current.position = latLng;
    mapRef.current.panTo(latLng);

    setResolving(true);
    try {
      const { results } = await geocoderRef.current.geocode({ location: latLng });
      const result = toLocationResult(latLng, results?.[0]);
      setResolvedAddress(result.formattedAddress || null);
      onLocationChange(result);
    } catch {
      const result = toLocationResult(latLng, undefined);
      setResolvedAddress(null);
      onLocationChange(result);
    } finally {
      setResolving(false);
    }
  }, [onLocationChange]);

  React.useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapContainerRef.current) return;

        const center = latitude && longitude ? { lat: latitude, lng: longitude } : DEFAULT_CENTER;
        const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined;
        const map = new google.maps.Map(mapContainerRef.current, {
          center,
          zoom: latitude && longitude ? 15 : 5,
          mapId,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: { position: 9 /* RIGHT_BOTTOM */ as unknown as google.maps.ControlPosition },
          clickableIcons: false,
        });
        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: center,
          map,
          gmpDraggable: !disabled,
        });
        const geocoder = new google.maps.Geocoder();

        mapRef.current = map;
        markerRef.current = marker;
        geocoderRef.current = geocoder;

        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (disabled || !e.latLng) return;
          void applyPosition(e.latLng.lat(), e.latLng.lng());
        });
        marker.addListener("gmp-dragend", () => {
          const pos = marker.position as google.maps.LatLng;
          if (pos) void applyPosition(pos.lat(), pos.lng());
        });

        setMapReady(true);
      })
      .catch((err: Error) => {
        if (!cancelled) setMapError(err.message || "Failed to load Google Maps");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryToken]);

  React.useEffect(() => {
    if (!mapReady || !searchContainerRef.current || !mapRef.current) return;
    const map = mapRef.current;
    const container = searchContainerRef.current;

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Search location...";
    input.className = cn(
      "h-10 w-full rounded-full border border-border bg-surface pl-9 pr-3 text-sm text-text-primary shadow-md placeholder:text-text-placeholder",
      "transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
    );
    container.appendChild(input);

    const autocomplete = new google.maps.places.Autocomplete(input, {
      fields: ["name", "formatted_address", "geometry", "address_components"],
    });
    
    // Bind the autocomplete bounds to the map's viewport so it prioritizes local results
    autocomplete.bindTo("bounds", map);

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const loc = place.geometry?.location;
      if (!loc) return;
      if (markerRef.current) markerRef.current.position = loc;
      map.setZoom(15);
      map.panTo(loc);
      const result = toLocationResult(loc, {
        formatted_address: place.formatted_address ?? "",
        address_components: place.address_components as google.maps.GeocoderAddressComponent[] | undefined,
      } as google.maps.GeocoderResult);
      setResolvedAddress(result.formattedAddress || null);
      onLocationChange(result);
    });

    return () => {
      container.innerHTML = "";
    };
  }, [mapReady, onLocationChange]);

  const handleUseCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      setMapError("Geolocation is not supported by this browser");
      return;
    }
    setLocating(true);
    setMapError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        void applyPosition(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setLocating(false);
        setMapError(err.message || "Unable to detect your location. Please allow location access or drop a pin manually.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  if (mapError && !mapReady) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-6 text-center">
        <AlertTriangle size={20} className="text-danger" />
        <p className="text-sm text-danger">{mapError}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setMapError(null);
            setRetryToken((t) => t + 1);
          }}
          leftIcon={<RefreshCw size={14} />}
        >
          Retry loading map
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-border shadow-sm" style={{ height: 320 }}>
        <div ref={mapContainerRef} className="h-full w-full" />

        {!mapReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-overlay text-sm text-text-secondary">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading map…
          </div>
        )}

        {mapReady && !disabled && (
          <div className="absolute left-3 right-3 top-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-text-secondary" />
              <div ref={searchContainerRef} className="relative" />
            </div>
          </div>
        )}

        {mapReady && !disabled && (
          <button
            type="button"
            disabled={disabled || locating}
            onClick={handleUseCurrentLocation}
            aria-label="Use my current location"
            title="Use my current location"
            className={cn(
              "absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-primary shadow-md",
              "transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100",
            )}
          >
            {locating ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <LocateFixed size={18} />
            )}
          </button>
        )}

        {resolving && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs text-text-secondary shadow">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Resolving address…
          </div>
        )}
      </div>

      {resolvedAddress && !resolving && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-text-secondary">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-success" />
          <span>{resolvedAddress}</span>
        </div>
      )}

      {mapError && (
        <p className="flex items-center gap-1.5 text-xs text-danger"><AlertTriangle size={12} /> {mapError}</p>
      )}
      <p className="flex items-center gap-1.5 text-xs text-text-secondary">
        <MapPin size={12} /> Click on the map or drag the pin to set your exact location.
      </p>
    </div>
  );
}
