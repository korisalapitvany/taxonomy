function main(sources: Promise<any>, cnames: Promise<any>, deps: Promise<any>) {
  sources.then(async (res) => {
    await deps;
    displaySources(await res.json());
  });

  cnames.then(async (res) => {
    await Promise.all([sources, deps]);
    displayCommonNames(await res.json());
  });
}

function displaySources(data): void {
  console.log("SOURCES: loaded!");

  new Tabulator("#sources", {
    data: Object.values(data),
    autoColumns: true,
  });
}

interface CommonName {
  page: number;
  scientific_name: string;
  common_names: Translations;
  source_id: string;
};

type Translations = { [key: string]: Array<string> };


function displayCommonNames(data: {[key: string]: Array<CommonName>}): void {
  const cnames: { [key: string]: Array<CommonName> } = {};

  Object.values(data).reduce((x, y) => x.concat(y)).forEach(row => {
    (cnames[row.scientific_name] = cnames[row.scientific_name] || []).push(row);
  });

  new Tabulator("#common-names", {
    data: Object.entries(cnames).map(([key, cnames]) => {
      const cname = cnames.shift();
      cnames.forEach(extra => {
        // TODO: Remove duplicates!
        cname.common_names.hu.concat(extra.common_names.hu);
      })
      return cname;
    }),
    pagination: true,
    paginationSize: 10,
    columns: [
      {title: "Magyar nevek", field: "common_names", cssClass: "common_names", formatter: joinNames},
      {title: "Tud. név", field: "scientific_name", cssClass: "scientific_name", formatter: fmtScientificName},
    ],
  });
}

function fmtScientificName(cell, formatterParams, onRendered): HTMLDivElement {
  // TODO: Add a note when a synonym was used!
  const div: HTMLDivElement = document.createElement("div");
  div.innerText = cell.getValue();
  return div;
}

function joinNames(cell, formatterParams, onRendered): string {
  const cnames: Array<string> = cell.getValue().hu;
  if (cnames.length) {
    cnames[0] = `<em>${cnames[0]}</em>`;
  }
  return cnames.join(", ");
}
