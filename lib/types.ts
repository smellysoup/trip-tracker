import type { Database } from "./database.types"

export type { Database }

// ============================================================
// Row types — tables
// ============================================================

export type Category = Database["public"]["Tables"]["categories"]["Row"]
export type Trip = Database["public"]["Tables"]["trips"]["Row"]
export type Expense = Database["public"]["Tables"]["expenses"]["Row"]
export type ExpenseSplit =
  Database["public"]["Tables"]["expense_splits"]["Row"]
export type ItineraryDay =
  Database["public"]["Tables"]["itinerary_days"]["Row"]
export type AccommodationResearch =
  Database["public"]["Tables"]["accommodation_research"]["Row"]

// ============================================================
// Row types — views (all columns nullable due to aggregates / outer joins)
// ============================================================

export type TripTotal = Database["public"]["Views"]["trip_totals"]["Row"]
export type CategoryTotal =
  Database["public"]["Views"]["category_totals"]["Row"]

// ============================================================
// Insert / Update — writable tables only (categories is read-only)
// ============================================================

export type TripInsert = Database["public"]["Tables"]["trips"]["Insert"]
export type TripUpdate = Database["public"]["Tables"]["trips"]["Update"]

export type ExpenseInsert = Database["public"]["Tables"]["expenses"]["Insert"]
export type ExpenseUpdate = Database["public"]["Tables"]["expenses"]["Update"]

export type ExpenseSplitInsert =
  Database["public"]["Tables"]["expense_splits"]["Insert"]
export type ExpenseSplitUpdate =
  Database["public"]["Tables"]["expense_splits"]["Update"]

export type ItineraryDayInsert =
  Database["public"]["Tables"]["itinerary_days"]["Insert"]
export type ItineraryDayUpdate =
  Database["public"]["Tables"]["itinerary_days"]["Update"]

export type AccommodationResearchInsert =
  Database["public"]["Tables"]["accommodation_research"]["Insert"]
export type AccommodationResearchUpdate =
  Database["public"]["Tables"]["accommodation_research"]["Update"]

// ============================================================
// Enums
// ============================================================

export type Participant = Database["public"]["Enums"]["participant"]
export type SplitType = Database["public"]["Enums"]["split_type"]
export type PaymentMethod = Database["public"]["Enums"]["payment_method"]

// ============================================================
// View-models — manual composed types
// ------------------------------------------------------------
// Populated in a later step. Use this section for app-level shapes
// that combine generated rows (e.g. Trip + its expenses + splits),
// not for anything regeneratable from the schema.
// ============================================================
