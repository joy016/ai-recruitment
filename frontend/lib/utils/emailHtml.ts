import DOMPurify from "dompurify";

/**
 * Email HTML helpers. The backend sanitizes bodies too, but nothing from the
 * API is rendered without passing through DOMPurify here first.
 */

const FORBID_TAGS = [
  "style",
  "script",
  "iframe",
  "frame",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "link",
  "meta",
  "base",
  "svg",
  "math",
];

const REMOTE_URL = /^(https?:)?\/\//i;
const CSS_URL = /url\s*\([^)]*\)/gi;
// Separate non-global copy: .test() on a /g regex keeps lastIndex between calls.
const HAS_CSS_URL = /url\s*\(/i;

export type SanitizedEmail = { html: string; blockedImages: number };

/**
 * Sanitizes an email body for rendering. Remote images (img src, background
 * attributes and CSS url()) are removed unless `allowRemoteImages` is set,
 * so opening a message doesn't ping trackers.
 */
export const sanitizeEmailHtml = (
  html: string,
  { allowRemoteImages = false }: { allowRemoteImages?: boolean } = {},
): SanitizedEmail => {
  if (typeof window === "undefined") return { html: "", blockedImages: 0 };

  // A private instance so these hooks don't leak into other DOMPurify users.
  const purifier = DOMPurify(window);
  let blockedImages = 0;

  purifier.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.hasAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    }
    if (allowRemoteImages) return;

    if (node.tagName === "IMG" && REMOTE_URL.test(node.getAttribute("src") ?? "")) {
      node.removeAttribute("src");
      node.removeAttribute("srcset");
      if (!node.getAttribute("alt")) node.setAttribute("alt", "[image blocked]");
      blockedImages++;
    }
    if (node.hasAttribute("background")) {
      node.removeAttribute("background");
      blockedImages++;
    }
    const style = node.getAttribute("style");
    if (style && HAS_CSS_URL.test(style)) {
      node.setAttribute("style", style.replace(CSS_URL, "none"));
      blockedImages++;
    }
  });

  const clean = purifier.sanitize(html, {
    FORBID_TAGS,
    FORBID_ATTR: ["srcset"],
    ALLOW_DATA_ATTR: false,
  });
  return { html: clean, blockedImages };
};

const BLOCK_TAGS = "p,div,h1,h2,h3,h4,h5,h6,blockquote,pre,table,tr,ul,ol";

/** Plain text for the composer, e.g. from a template, AI result or draft. */
export const htmlToText = (html: string): string => {
  if (typeof window === "undefined") return html;
  const clean = DOMPurify.sanitize(html, { FORBID_TAGS });
  const doc = new DOMParser().parseFromString(clean, "text/html");
  doc.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  doc.querySelectorAll("li").forEach((li) => {
    li.prepend("• ");
    li.append("\n");
  });
  doc.querySelectorAll(BLOCK_TAGS).forEach((element) => element.append("\n\n"));
  return (doc.body.textContent ?? "")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const escapeHtml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/** The composer is plain text; blank lines become paragraphs. */
export const textToHtml = (text: string): string =>
  text
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");
