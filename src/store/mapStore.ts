"use client";

import { create } from "zustand";
import type { MapBounds, VenueMarker, PerformanceSummary, Category } from "@/types";

interface MapState {
  bounds: MapBounds | null;
  selectedVenueId: string | null;
  selectedPerformanceId: string | null;
  performances: PerformanceSummary[];
  venueMarkers: VenueMarker[];
  activeCategories: Category[];
  isSidebarOpen: boolean;

  setBounds: (bounds: MapBounds) => void;
  selectVenue: (venueId: string | null) => void;
  selectPerformance: (performanceId: string | null) => void;
  setPerformances: (performances: PerformanceSummary[]) => void;
  setVenueMarkers: (markers: VenueMarker[]) => void;
  toggleCategory: (category: Category) => void;
  closeSidebar: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  bounds: null,
  selectedVenueId: null,
  selectedPerformanceId: null,
  performances: [],
  venueMarkers: [],
  activeCategories: ["THEATER", "MUSICAL", "EXHIBITION"],
  isSidebarOpen: false,

  setBounds: (bounds) => set({ bounds }),

  selectVenue: (venueId) =>
    set({
      selectedVenueId: venueId,
      selectedPerformanceId: null,
      isSidebarOpen: venueId !== null,
    }),

  selectPerformance: (performanceId) =>
    set({ selectedPerformanceId: performanceId }),

  setPerformances: (performances) => set({ performances }),

  setVenueMarkers: (venueMarkers) => set({ venueMarkers }),

  toggleCategory: (category) =>
    set((state) => ({
      activeCategories: state.activeCategories.includes(category)
        ? state.activeCategories.filter((c) => c !== category)
        : [...state.activeCategories, category],
    })),

  closeSidebar: () =>
    set({ isSidebarOpen: false, selectedVenueId: null, selectedPerformanceId: null }),
}));
