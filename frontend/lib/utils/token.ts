/**
 * Token storage is abstracted behind this module so the mechanism can be
 * swapped later without touching call sites. Currently backed by a
 * JS-readable cookie rather than an httpOnly one: the api-client request
 * interceptor needs to read the token in the browser to attach it to calls
 * made directly to the external backend (see lib/api-client.ts). A cookie is
 * still preferred over localStorage because proxy.ts (server-side route
 * protection) can read cookies but has no access to localStorage.
 */

const TOKEN_COOKIE_NAME = "auth_token";
const TOKEN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;

const isBrowser = () => typeof document !== "undefined";

export const getToken = (): string | null => {
  if (!isBrowser()) {
    return null;
  }

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${TOKEN_COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
};

export const setToken = (token: string): void => {
  if (!isBrowser()) {
    return;
  }

  const cookieParts = [
    `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "path=/",
    `max-age=${TOKEN_COOKIE_MAX_AGE_SECONDS}`,
    "samesite=lax",
  ];

  if (window.location.protocol === "https:") {
    cookieParts.push("secure");
  }

  document.cookie = cookieParts.join("; ");
};

export const clearToken = (): void => {
  if (!isBrowser()) {
    return;
  }

  document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; max-age=0`;
};
