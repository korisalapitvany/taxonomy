const COPT: boolean = COMPILATION_MODE == "opt";
const MIN: string = COPT ? ".min" : "";

const CDNJS: string = "https://cdnjs.cloudflare.com/ajax/libs";

const TABULATOR: string = `${CDNJS}/tabulator/5.2.7`;
const TABULATOR_JS: string = `${TABULATOR}/js/tabulator${MIN}.js`;
const TABULATOR_CSS: string = `${TABULATOR}/css/tabulator_materialize${MIN}.css`;

const TABULATOR_JS_INTEGRITY = COPT ?
  "sha512-X+/BF5SW/6WTNbMtxDCRauCI+N4bd81XQFTTK+Eo4yveAFuEIGDzLV9zaxJLFYl5gzWmbMZb27c9k4fds22khA==" :
  "sha512-Q1KM/vQvzzss5Qt0GMLZD5bcM+e471q1P6c1lH3PtBx1WkY0AsVWddqD4AN6rVKtqhoSv5hELg25X8qbMoJW9w==";
const TABULATOR_CSS_INTEGRITY = COPT ?
  "sha512-iNQ9peZHckZCzkkHjF4H6BsbP4W/gloaWm3SbnVXe5CY62LDVDRfvFpC7V2H+GpWsVP7IbfY/t7jjMYAy3bBFQ==" :
  "sha512-+ZuRItu0WRx+t277kyj24bHknqTYYx+PT9OIDaa8sb2OKBohrUojmT80UH/zEjt4WFKdQTmqNENrMb8qSNkEQw==";

const currentScript: HTMLScriptElement =
  (document["currentScript"] || Array.from(
    // In case this script is loaded as a module:
    document.querySelectorAll('script[type=module]'),
  ).pop()) as HTMLScriptElement;
const ownerDocument = currentScript.ownerDocument;
const ownerHead = ownerDocument.head;

async function bootstrap(): Promise<void> {
  // Start dependency loading in parallel.
  const deps: Promise<Array<void>> = Promise.all([
    loadJS(TABULATOR_JS, TABULATOR_JS_INTEGRITY),
    loadCSS(TABULATOR_CSS, TABULATOR_CSS_INTEGRITY),
    loadCSS(relativeURL("themes/mdn-yari.css")),
  ]);
  const layout = fetch(relativeURL("layout.html"));
  const sources = fetch(relativeURL("data/sources.json"));
  const cnames = fetch(relativeURL("data/common_names.json"));

  ownerDocument.body.innerHTML = await (await layout).text();
  ownerDocument.title = ownerDocument.body.querySelector("h1").innerText;

  await main(sources, cnames, deps);
}

function relativeURL(path: string): string {
   return currentScript.src.replace(/[^\/]+$/, path);
}

function fontCSS(): void {
  const api: string = "https://fonts.googleapis.com"
  addLink(mkLink("https://fonts.gstatic.com", true, true));
  addLink(mkLink(api, true));
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

function loadCSS(url: string, integrity: string = ""): Promise<void> {
  return new Promise((resolve, reject) => {
    const link: HTMLLinkElement = mkLink(url);
    if (integrity) {
      link.integrity = integrity;
      link.referrerPolicy = "no-referrer";
      link.crossOrigin = "anonymous";
    }

    link.addEventListener("load", (ev: Event): void => {
      resolve(null);
    });
    link.addEventListener("error", (ev: Event): void => {
      reject();
    });

    addLink(link);
  });
}

function loadJS(url: string, integrity: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.integrity = integrity;
    script.referrerPolicy = "no-referrer";
    script.crossOrigin = "anonymous";
    script.src = url;

    script.addEventListener("load", (ev: Event): void => {
      resolve(null);
    });
    script.addEventListener("error", (ev: Event): void => {
      reject();
    });

    ownerHead.appendChild(script);
  });
}

// Font loading is fire-and-forget.
// We can start rendering without fonts, and we use font-display: swap anyway.
setTimeout(fontCSS, 0);

if ((ownerDocument.readyState === "complete") || currentScript.async || currentScript.defer) {
  // Assume the DOM is already loaded and ready to be parsed.
  bootstrap();
} else {
  // Wait for DOMContentLoaded.
  ownerDocument.addEventListener("DOMContentLoaded", (ev: Event): void => {
    bootstrap();
  });
}
