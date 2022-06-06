const LANG: string = "hu";

function main(sources: Promise<any>, cnames: Promise<any>, deps: Promise<any>): Promise<void> {
  document.querySelector(".theme-switcher-menu .light-mode").addEventListener("click", (): void => {
    document.body.className = "light";
  });
  document.querySelector(".theme-switcher-menu .dark-mode").addEventListener("click", (): void => {
    document.body.className = "dark";
  });

  sources.then(async (res) => {
    let num: number = 1;
    for (let pair of Object.entries(await res.json())) {
      const [id, source] = pair as [string, Source];
      source.num = num++;
      source.id = id;

      SOURCE_IDX[num] = id;
      SOURCES[id] = source;
      displaySources();
    };
  });

  return new Promise(async (resolve) => {
    for (let pair of Object.entries(await (await cnames).json())) {
      const [src, cnames] = pair as [string, Array<CommonName>];
      cnames.forEach((cname: CommonName): void => {
        (CNAMES[cname.scientific_name] = CNAMES[cname.scientific_name] || []).push(cname);
        cname.source_id = src;
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

interface Source {
  title: string;
  subtitle: string;

  // Dynamically added:
  num: number;
  id: string;
};

interface CommonName {
  page: number;
  scientific_name: string;
  synonym: string;
  common_names: Translations;

  // Dynamically added fields:
  source_id: string;
};

type Translations = { [key: string]: Array<string> };

function displaySources(): void {
}

let table: typeof Tabulator = null;

function displayCommonNames(): void {
  const count: number = Object.keys(CNAMES).length;
  document.querySelectorAll("[data-tpl]").forEach((elem: HTMLElement): void => {
    const tpl: string = elem.dataset.tpl;
    const rx: RegExp = /\{common_names.count\}/g;
    if (tpl.match(rx)) {
      elem.innerText = tpl.replaceAll(rx, count.toLocaleString(LANG));
    }
  });

  ["change", "keyup"].forEach((evt: string): void => {
    document.getElementById("filter").addEventListener(evt, filterCommonNames);
  });

  table = new Tabulator("#common-names", {
    data: ROWS,
    pagination: true,
    paginationSize: 40,
    layout: "fitDataFill",
    rowHeight: 80,
    columns: [{
      field: "key",
      cssClass: "content",
      width: "100%",
      formatter: fmtCell,
    }],
  });
}

let filterVal: string = "";
let filterApplied: string = "";
let filterTimeout: number = 0;
function filterCommonNames(evt: InputEvent): void {
  const filter: HTMLInputElement = evt.target as HTMLInputElement;

  filterVal = filter.value;
  if (filterTimeout) {
    clearTimeout(filterTimeout);
  }
  setTimeout((): void => {
    filterTimeout = 0;
    if (filterApplied === filterVal || !table) {
      return;
    }

    filterApplied = filterVal;
    table.setFilter(filterTable, {val: filterVal});
    console.log(`Filter: ${filterVal}`);
  }, 200);
}

function filterTable(data, params): boolean {
  const value: string = params.val;
  if (!value) {
    // Clear the filter.
    return true;
  }

  const cnames: Array<CommonName> = CNAMES[data.key];

  return cnames
    .map((cn: CommonName): Array<string> => cn.common_names[LANG].concat(cn.scientific_name))
    .reduce((x: Array<string>, y: Array<string>): Array<string> => x.concat(y))
    .join(" ")
    .toLowerCase()
    .includes(value);
}

function fmtCell(cell, formatterParams, onRendered): HTMLDivElement | string {
  const key: string = cell.getValue();
  const cnames: Array<CommonName> = CNAMES[key];

  let line1: HTMLDivElement = document.createElement("div");
  line1.className = "common-names";

  let first: boolean = true;
  cnames
    .map((cname: CommonName): Array<string> => cname.common_names[LANG])
    .reduce((x: Array<string>, y: Array<string>): Array<string> => x.concat(y))
    .forEach((name: string): void => {
      const el: HTMLElement = document.createElement(first ? "strong" : "span");
      el.innerText = name;

      cnames
        .filter((cn: CommonName): boolean => cn.common_names[LANG].indexOf(name) != -1)
        .forEach((cn: CommonName): void => {
          const src: Source = SOURCES[cn.source_id];
          const sup: HTMLElement = document.createElement("sup");
          sup.innerText = `[${src.num}]`;
          sup.title = refText(src, cn.page);
          el.append(sup);
        });

      line1.append(el);
      first = false;
    });

  let line2: HTMLDivElement = document.createElement("div");
  line2.className = "scientific-name";

  let em: HTMLElement = document.createElement("em");
  em.innerText = key;
  line2.append(em);

  let photo: HTMLDivElement = document.createElement("div");
  photo.className = "photo";

  const div: HTMLDivElement = document.createElement("div");
  div.append(photo);
  div.append(line1);
  div.append(line2);

  return div;
}

function refText(src: Source, page: number): string {
  let text = src.title;
  if (src.subtitle) {
    text += ` — ${src.subtitle}`
  }
  return [
    text,
    PAGE_NUM.replace(/\{page\}/, page.toLocaleString(LANG)),
  ].join("; ");
}

// TODO: Parse this from the template!
const PAGE_NUM = "{page}. o."
