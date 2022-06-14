const LANG: string = "hu";

function main(sources: Promise<any>, cnames: Promise<any>, deps: Promise<any>): Promise<void> {
  document.querySelector(".theme-switcher-menu .light-mode").addEventListener("click", (): void => {
    document.body.className = "light";
  });
  document.querySelector(".theme-switcher-menu .dark-mode").addEventListener("click", (): void => {
    document.body.className = "dark";
  });
  document.getElementById("toggle-caps").addEventListener("click", (): void => {
    document.getElementById("common-names").classList.toggle("toggle-caps");
  });
  document.getElementById("toggle-articles").addEventListener("click", (): void => {
    document.getElementById("common-names").classList.toggle("toggle-articles");
  });
  document.getElementById("refresh-all").addEventListener("click", (): void => {
    window.localStorage.clear();
    location.reload();
  });

  let active: boolean = false;
  const filter: HTMLInputElement = document.getElementById("filter") as HTMLInputElement;
  document.body.addEventListener("keydown", (evt: KeyboardEvent): void => {
    if (evt.key === "/" && !active) {
      evt.preventDefault();
      filter.focus();
      active = true;
    }
  });
  filter.addEventListener("blur", () => {
    active = false;
  });

  sources.then(async (res) => {
    let num: number = 1;
    for (let pair of Object.entries(await res.json())) {
      const [id, source] = pair as [string, Source];
      SOURCES[id] = new Source(id, num++, source);
      SOURCE_IDX[num] = id;
    };
  });

  return new Promise(async (resolve) => {
    for (let pair of Object.entries(await (await cnames).json())) {
      const [src, cnames] = pair as [string, Array<any>];
      cnames.forEach((data: any): void => {
        const cname = new CommonName(src, data);
        (CNAMES[cname.scientificName] = CNAMES[cname.scientificName] || []).push(cname);
      });
    }

    ROWS.push(...Object
      .keys(CNAMES)
      .map((key: string): Row => new Row(key)));

    // TODO: Wait for above promise to complete!
    await Promise.all([sources, deps]);
    displayCommonNames();
  });
}

const SOURCES: { [key: string]: Source } = {};
const SOURCE_IDX: { [key: number]: string } = {};

// Map scientific names to references.
// This is needed since the same scientific name may occur in multiple sources.
const CNAMES: { [key: string]: Array<CommonName> } = {};

// Rows to feed to Tabulator.
// The actual rendering is done dynamically, this is just a list of keys.
const ROWS: Array<Row> = [];

class Row {
  key: string;

  constructor(key: string) {
    this.key = key;
  }
};

class Source {
  id: string;
  num: number;
  mTitle: string; // "title" won't get optimised properly
  subTitle: string;

  constructor(id: string, num: number, data: any) {
    this.id = id;
    this.num = num;
    this.mTitle = data["title"];
    this.subTitle = data["subtitle"];
  }
};

class CommonName {
  sourceId: string;
  pageNum: number;
  scientificName: string;
  synonyms: Array<string>;
  commonNames: Translations;

  constructor(sourceId: string, data: any) {
    this.sourceId = sourceId;
    this.pageNum = data["page"];
    this.scientificName = data["scientific_name"];
    this.synonyms = data["synonyms"] || [];
    this.commonNames = data["common_names"];
  }
};

type Translations = { [key: string]: Array<string> };

let table: typeof Tabulator = null;

function displayCommonNames(): void {
  const count: number = Object.keys(CNAMES).length;
  document.querySelectorAll("[data-tpl]").forEach((elem: HTMLElement): void => {
    const tpl: string = elem.dataset["tpl"];
    const rx: RegExp = /\{common_names.count\}/g;
    if (tpl.match(rx)) {
      elem.innerText = tpl.replaceAll(rx, count.toLocaleString(LANG));
    }
  });

  ["change", "keyup"].forEach((evt: string): void => {
    document.getElementById("filter").addEventListener(evt, handleFilterInput);
  });

  const _Tabulator = window["Tabulator"] as typeof Tabulator;
  table = new _Tabulator("#common-names .table", {
    "data": ROWS,
    "pagination": true,
    "paginationSize": 20,
    "layout": "fitDataFill",
    "rowHeight": 80,
    "rowFormatter": fmtRow,
    "columns": [{
      "field": "key",
      "cssClass": "content flex-row",
      "width": "100%",
      "formatter": fmtCell,
    }],
  });
}

// Format a single row.
// This should finish as soon as possible, and update the row asynchronously.
function fmtRow(row: typeof RowComponent): void {
  const el: HTMLElement = row["getElement"]();
  const key: string = row.getData().key;

  setTimeout((): void => {
    iNatRow(el, key);
  }, 50);
}

function fmtCell(cell, formatterParams, onRendered): string {
  const key: string = cell["getValue"]();
  const cnames: Array<CommonName> = CNAMES[key];

  let line1: HTMLDivElement = document.createElement("div");
  line1.className = "common-names";

  let article: HTMLElement = document.createElement("span");
  article.className = "article";
  line1.append(article);
  line1.append(" ");

  let first: boolean = true;
  cnames
    .map((cname: CommonName): Array<string> => cname.commonNames[LANG])
    .reduce(flatten)
    .filter(uniq)
    .forEach((name: string): void => {
      if (first) {
        article.innerText = articleFor(name);
      }
      const el: HTMLElement = document.createElement(first ? "strong" : "span");
      el.innerText = name;

      cnames
        .filter((cn: CommonName): boolean => cn.commonNames[LANG].indexOf(name) != -1)
        .forEach((cn: CommonName): void => {
          const src: Source = SOURCES[cn.sourceId];
          const sup: HTMLElement = document.createElement("sup");
          sup.className = "tooltip";
          sup.dataset["tooltip"] = refText(src, cn.pageNum);
          sup.innerText = `[${src.num}]`;
          el.append(sup);
        });

      line1.append(el);
      first = false;
    });

  const line2: HTMLDivElement = document.createElement("div");
  line2.className = "scientific-name";

  const em: HTMLElement = document.createElement("em");
  em.innerText = key;
  line2.append(em);

  const synonyms: Array<string> = cnames
    .map((cn: CommonName): Array<string> => cn.synonyms)
    .reduce(flatten)
    .filter(uniq);

  if (synonyms.length) {
    line2.append(" (");
    const span: HTMLElement = document.createElement("span")
    span.className = "syn-marker";
    span.innerText = "syn.";
    line2.append(span);

    line2.append(" ");
    const syn: HTMLElement = document.createElement("em");
    syn.className = "synonym"
    // TODO: A separate <em> per synonym!
    syn.innerText = synonyms.join(", ");
    line2.append(syn);
    line2.append(")");
  }

  const photo: HTMLDivElement = document.createElement("div");
  photo.className = "photo material-symbols-outlined";
  photo.innerText = "downloading";

  const names: HTMLDivElement = document.createElement("div");
  names.className = "flex-col";
  names.append(line1);
  names.append(line2);

  const ext: HTMLDivElement = document.createElement("div");
  ext.className = "ext";

  return [photo, names, ext]
    .map((el: HTMLElement): string => el.outerHTML)
    .join("");
}

function refText(src: Source, page: number): string {
  let text = src.mTitle;
  if (src.subTitle) {
    text += ` — ${src.subTitle}`
  }
  return [
    text,
    PAGE_NUM.replace(/\{page\}/, page.toLocaleString(LANG)),
  ].join("; ");
}

function articleFor(cname: string): string {
  if (!cname) {
    return "";
  }
  // TODO: Add support for exceptions!
  return "AÁEÉIÍOÓÖŐUÚÜŰ".includes(cname[0].toUpperCase()) ? "az" : "a";
}

function flatten<T>(x: Array<T>, y: Array<T>): Array<T> {
  return x.concat(y);
}

function uniq(value, index: number, self): boolean {
  return self.indexOf(value) === index;
}

// TODO: Parse this from the template!
const PAGE_NUM = "{page}. o."
