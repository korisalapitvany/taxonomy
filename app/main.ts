const LANG: string = "hu";

function main(sources: Promise<any>, cnames: Promise<any>, deps: Promise<any>): Promise<void> {
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
        cname.source_id = src;
      });

      CNAMES[src] = cnames;
    }
    await Promise.all([sources, deps]);
    displayCommonNames();
  });
}

const SOURCES: { [key: string]: Source } = {};
const SOURCE_IDX: { [key: number]: string } = {};
const CNAMES: { [key: string]: Array<CommonName> } = {};

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

function displayCommonNames(): void {
  const cnames: { [key: string]: Array<CommonName> } = {};

  Object.values(CNAMES).reduce((x, y) => x.concat(y)).forEach(row => {
    (cnames[row.scientific_name] = cnames[row.scientific_name] || []).push(row);
  });

  new Tabulator("#common-names", {
    data: Object.entries(cnames).map(([key, cnames]) => {
      const cname = cnames.shift();
      cnames.forEach(extra => {
        // TODO: Remove duplicates!
        cname.common_names[LANG].concat(extra.common_names[LANG]);
      })
      return cname;
    }),
    pagination: true,
    paginationSize: 10,
    columns: [
      {title: "Magyar nevek", field: "common_names", cssClass: "common_names", width: "60%", formatter: fmtCommonNames},
      {title: "Tud. név", field: "scientific_name", cssClass: "scientific_name", width: "40%", formatter: fmtScientificName},
    ],
  });
}

function fmtScientificName(cell, formatterParams, onRendered): HTMLDivElement | string {
  const data: CommonName = cell.getData();
  if (!data.synonym) {
    return cell.getValue();
  }

  const div: HTMLDivElement = document.createElement("div");
  div.innerText = cell.getValue();
  div.innerHTML += "<sup>Syn.</sup>";
  return div;
}

function fmtCommonNames(cell, formatterParams, onRendered): string {
  const cnames: Array<string> = cell.getValue()[LANG];
  if (cnames.length) {
    cnames[0] = `<em>${cnames[0]}</em>`;
  }
  return cnames.join(", ");
}
