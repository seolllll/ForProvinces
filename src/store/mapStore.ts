"use client";

import { create } from "zustand";
import type { MapBounds, VenueMarker } from "@/types";

interface ZoomTarget {
  lat: number;
  lng: number;
  level: number;
}

interface MapState {
  bounds: MapBounds | null;
  selectedVenueId: string | null;
  venueMarkers: VenueMarker[];
  activeGenres: string[];
  activeStates: string[];
  isSidebarOpen: boolean;
  zoomTarget: ZoomTarget | null;
  pendingPrfmId: string | null;

  setBounds: (bounds: MapBounds) => void;
  selectVenue: (venueId: string | null) => void;
  setVenueMarkers: (markers: VenueMarker[]) => void;
  toggleGenre: (genre: string) => void;
  enableGenre: (genre: string) => void;
  toggleState: (state: string) => void;
  enableState: (state: string) => void;
  closeSidebar: () => void;
  setZoomTarget: (target: ZoomTarget | null) => void;
  setPendingPrfmId: (prfmId: string | null) => void;
  openDirectPrfm: (prfmId: string) => void;
}

export const useMapStore = create<MapState>((set) => ({
  bounds: null,
  selectedVenueId: null,
  venueMarkers: [],
  activeGenres: ["뮤지컬", "연극"],
  activeStates: ["공연중"],
  isSidebarOpen: false,
  zoomTarget: null,
  pendingPrfmId: null,

  setBounds: (bounds) => set({ bounds }),

  selectVenue: (venueId) =>
    set({
      selectedVenueId: venueId,
      isSidebarOpen: venueId !== null,
    }),

  setVenueMarkers: (venueMarkers) => set({ venueMarkers }),

  toggleGenre: (genre) =>
    set((state) => {
      if (state.activeGenres.includes(genre)) {
        if (state.activeGenres.length <= 1) return state;
        return { activeGenres: state.activeGenres.filter((g) => g !== genre) };
      }
      return { activeGenres: [...state.activeGenres, genre] };
    }),

  enableGenre: (genre) =>
    set((state) =>
      state.activeGenres.includes(genre)
        ? state
        : { activeGenres: [...state.activeGenres, genre] }
    ),

  enableState: (prfmState) =>
    set((state) =>
      state.activeStates.includes(prfmState)
        ? state
        : { activeStates: [...state.activeStates, prfmState] }
    ),

  toggleState: (prfmState) =>
    set((state) => {
      if (state.activeStates.includes(prfmState)) {
        if (state.activeStates.length <= 1) return state;
        return { activeStates: state.activeStates.filter((s) => s !== prfmState) };
      }
      return { activeStates: [...state.activeStates, prfmState] };
    }),

  closeSidebar: () =>
    set({ isSidebarOpen: false, selectedVenueId: null }),

  setZoomTarget: (target) => set({ zoomTarget: target }),

  setPendingPrfmId: (prfmId) => set({ pendingPrfmId: prfmId }),

  openDirectPrfm: (prfmId) =>
    set({ isSidebarOpen: true, selectedVenueId: null, pendingPrfmId: prfmId }),
}));
