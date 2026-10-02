const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function isValidUsername(value: string): boolean {
  return USERNAME_RE.test(value);
}

export function slugifyUsername(seed: string): string {
  const stripped = seed
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/^_+|_+$/g, "")
    .slice(0, 16);

  if (stripped.length >= 3) return stripped;
  if (stripped.length > 0) return `${stripped}nyx`.slice(0, 16);
  return "nyx";
}
