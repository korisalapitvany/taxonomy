const LAYOUT_HTML: string = "layout.html";
const THEME_CSS: string = "themes/mdn-yari.css";

const COPT: boolean = COMPILATION_MODE == "opt";

// PrismJS version to use:
const PRISM_VERSION: string = "1.27.0";

const currentScript: HTMLScriptElement =
  (document["currentScript"] || Array.from(
    // In case this script is loaded as a module:
    document.querySelectorAll('script[type=module]'),
  ).pop()) as HTMLScriptElement;
const ownerDocument = currentScript.ownerDocument;
const ownerHead = ownerDocument.head;

async function main(): Promise<void> {
  // Wait for CSS to load, then clean up.
  await mainCSS;
  cleanups.forEach((cleanup) => cleanup());
}

function prepare(): void {
  const style = ownerDocument.createElement("style");
  // Blank loading style, unless the script was loaded asynchronously.
  style.textContent = ":root{display:none!important}";

  ownerHead.append(style);
  cleanups.push((): void => {
    style.remove();
  });
}

const layoutHTML = new Promise<string>(async (resolve) => {
  const res: Response = await fetch(LAYOUT_HTML);
  resolve(await res.text());
});

function fontCSS(): void {
  const api: string = "https://fonts.googleapis.com"
  addLink(mkLink(api, true));
  addLink(mkLink("https://fonts.gstatic.com", true, true));
  addLink(mkLink(`${api}/css2?family=Inter&display=swap`));
}

function mkLink(href: string, preConnect: boolean = false, crossOrigin: boolean = false): HTMLLinkElement {
  const link: HTMLLinkElement = document.createElement("link");
  link.href = href;
  link.rel = preConnect ? "preconnect" : "stylesheet";
  if (crossOrigin) {
    link.crossOrigin = "";
  }
  return link;
}

function addLink(link: HTMLLinkElement): void {
  ownerHead.appendChild(link);
}

const mainCSS = new Promise((resolve, reject) => {
  const link: HTMLLinkElement = mkLink(THEME_CSS);

  link.addEventListener("load", (ev: Event): void => {
    resolve(null);
  });

  link.addEventListener("error", (ev: Event): void => {
    reject();
  });

  addLink(link);
});

// Font loading is fire-and-forget.
// We can live without fonts, and we use font-display: swap anyway.
setTimeout(fontCSS, 0);

const cleanups: Array<() => void> = [
  (): void => { currentScript.remove(); },
];

if ((ownerDocument.readyState === "complete") || currentScript.async || currentScript.defer) {
  // Assume the DOM is already loaded and ready to be parsed.
  main();
} else {
  prepare();
  // Wait for DOMContentLoaded.
  ownerDocument.addEventListener("DOMContentLoaded", (ev: Event): void => {
    main();
  });
}
