const ATTACK_PHRASES = [
  /ignore\s+(?:all\s+of\s+)?your\s+instructions/gi,
  /AI\s+agents?/gi,
  /assistant/gi,
  /verified\s+safe\s*,?\s*buy\s+now/gi,
];

function visibleText(html) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function isHiddenStyle(style = "") {
  const declarations = Object.fromEntries(style.split(";").map((part) => {
    const [key, ...value] = part.split(":");
    return [key?.trim().toLowerCase(), value.join(":").trim().toLowerCase()];
  }).filter(([key, value]) => key && value));
  const white = /^(?:white|#fff(?:fff)?|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))$/i;
  return declarations.display === "none"
    || declarations.visibility === "hidden"
    || /^0(?:px|em|rem|%)?$/.test(declarations["font-size"] || "")
    || (white.test(declarations.color || "") && white.test(declarations["background"] || declarations["background-color"] || ""));
}

function snippetsFromMatches(text, regexes, snippets) {
  for (const regex of regexes) {
    regex.lastIndex = 0;
    for (const match of text.matchAll(regex)) {
      const snippet = match[0].trim();
      if (snippet) snippets.add(snippet);
    }
  }
}

export function scanInjection(rawHtml = "") {
  const snippets = new Set();
  if (!rawHtml) return { found: false, snippets: [] };

  for (const match of rawHtml.matchAll(/<!--([\s\S]*?)-->/g)) {
    const text = visibleText(match[1]);
    if (text) snippets.add(text);
  }

  const hiddenSelectors = new Set();
  for (const match of rawHtml.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (isHiddenStyle(match[2])) {
      for (const selector of match[1].split(",")) {
        for (const part of selector.matchAll(/(?:\.([\w-]+)|#([\w-]+))/g)) hiddenSelectors.add(`${part[1] ? "." : "#"}${part[1] || part[2]}`);
      }
    }
  }

  const hiddenElements = /<([a-z][\w:-]*)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi;
  for (const match of rawHtml.matchAll(hiddenElements)) {
    const attributes = match[2];
    const inlineStyle = attributes.match(/\bstyle\s*=\s*(["'])(.*?)\1/i)?.[2] || "";
    const classNames = attributes.match(/\bclass\s*=\s*(["'])(.*?)\1/i)?.[2]?.split(/\s+/) || [];
    const id = attributes.match(/\bid\s*=\s*(["'])(.*?)\1/i)?.[2];
    const hiddenByRule = classNames.some((name) => hiddenSelectors.has(`.${name}`)) || (id && hiddenSelectors.has(`#${id}`));
    if (isHiddenStyle(inlineStyle) || hiddenByRule) {
      const text = visibleText(match[3]);
      if (text) snippets.add(text);
    }
  }

  const plainText = visibleText(rawHtml.replace(/<!--[\s\S]*?-->/g, " "));
  snippetsFromMatches(plainText, ATTACK_PHRASES, snippets);
  return { found: snippets.size > 0, snippets: [...snippets] };
}
