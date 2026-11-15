import type { Database } from "@/integrations/supabase/types";

export type Emirate = Database["public"]["Enums"]["uae_emirate"];

export const EMIRATES: { value: Emirate; label: string; short: string }[] = [
  { value: "dubai", label: "Dubai", short: "DXB" },
  { value: "abu_dhabi", label: "Abu Dhabi", short: "AUH" },
  { value: "sharjah", label: "Sharjah", short: "SHJ" },
  { value: "ajman", label: "Ajman", short: "AJM" },
  { value: "umm_al_quwain", label: "Umm Al Quwain", short: "UAQ" },
  { value: "ras_al_khaimah", label: "Ras Al Khaimah", short: "RAK" },
  { value: "fujairah", label: "Fujairah", short: "FUJ" },
];

export function emirateLabel(e: Emirate | null | undefined) {
  return EMIRATES.find((x) => x.value === e)?.label ?? "";
}

export function emirateShort(e: Emirate | null | undefined) {
  return EMIRATES.find((x) => x.value === e)?.short ?? "";
}

export function formatPlate(v: {
  plate_emirate: Emirate | null;
  plate_code: string | null;
  plate_number: string | null;
}) {
  if (!v.plate_number) return "No plate";
  return [emirateShort(v.plate_emirate), v.plate_code, v.plate_number].filter(Boolean).join(" ");
}

export const CAR_MAKES = [
  "Toyota", "Nissan", "Lexus", "Mercedes-Benz", "BMW", "Audi", "Porsche", "Land Rover",
  "Range Rover", "Bentley", "Rolls-Royce", "Ferrari", "Lamborghini", "Maserati", "McLaren",
  "Aston Martin", "Cadillac", "Chevrolet", "GMC", "Ford", "Dodge", "Jeep", "Lincoln",
  "Honda", "Hyundai", "Kia", "Mitsubishi", "Mazda", "Infiniti", "Volkswagen", "Volvo",
  "Jaguar", "Tesla", "Genesis", "Mini", "Peugeot", "Renault", "Suzuki", "Subaru", "MG",
  "Geely", "Chery", "Haval", "Changan", "Jetour",
];

/** Escape user search input for PostgREST `or()` filters. */
export function searchTerm(q: string) {
  return q.trim().replace(/[,()*%\\]/g, " ").replace(/\s+/g, " ");
}
