export type ThemePref = "dark" | "light" | "auto";

const ORDER: ThemePref[] = ["dark", "light", "auto"];

export function nextThemePref(current: ThemePref): ThemePref {
  return ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
}

export function resolveTheme(pref: ThemePref, systemPrefersDark: boolean): "dark" | "light" {
  return pref === "auto" ? (systemPrefersDark ? "dark" : "light") : pref;
}

export function isThemePref(value: string | null): value is ThemePref {
  return value === "dark" || value === "light" || value === "auto";
}
