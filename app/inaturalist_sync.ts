// iNaturalist.
const INAT_URL: string = "https://www.inaturalist.org";

// iNaturalist API.
const INAT_API: string = `${INAT_URL.replace(/www/, "api")}/v1`;

// Cache of response objects / promises.
// Used more or less like a queue. Promises are never cancelled.
const INAT: {
  [key: string]: INatResults | Promise<Response> | null
} = {};

class INatResults {
  totalResults: number;
  currentPage: number;
  perPage: number;
  results: Array<INatResult>;
  updatedAt: Date;

  constructor(data: any) {
    this.totalResults = data["total_results"];
    this.currentPage = data["page"];
    this.perPage = data["per_page"];
    this.results = data["results"].map((res: any): INatResult => new INatResult(res));
    this.updatedAt = new Date();
  }
};

class INatResult {
  id: number;
  name: string;
  preferredCommonName: string;
  matchedTerm: string;
  observationsCount: number;
  taxonSchemesCount: number;
  ancestry: string;
  isActive: boolean;
  flagCounts: {
    resolved: number;
    unresolved: number;
  };
  wikipediaUrl: string;
  currentSynonymousTaxonIds: any;
  iconicTaxonId: number;
  iconicTaxonName: string;
  rankLevel: number;
  taxonChangesCount: number;
  atlasId: any;
  completeSpeciesCount: any;
  parentId: number;
  rank: string;
  extinct: boolean;
  ancestorIds: Array<number>;
  defaultPhoto: INatDefaultPhoto;

  constructor(data: any) {
    this.id = data["id"];
    this.name = data["name"];
    this.preferredCommonName = data["preferred_common_name"];
    if (data["default_photo"]) {
      this.defaultPhoto = new INatDefaultPhoto(data["default_photo"]);
    }
  }
};

class INatDefaultPhoto {
  attribution: string;
  squareUrl: string;

  constructor(data: any) {
    this.attribution = data["attribution"];
    this.squareUrl = data["square_url"];
  }
};

async function iNatRow(row: HTMLElement, key: string): Promise<void> {
  const photo: HTMLDivElement = querySelector(row, ".photo") as HTMLDivElement;
  const ext: HTMLDivElement = querySelector(row, ".ext") as HTMLDivElement;

  const chip: HTMLDivElement = createChild(ext, "div", [
    "chip",
    "flex-row",
    "inaturalist",
  ]) as HTMLDivElement;

  const idIcon: HTMLElement = createChild(chip, "span", [ICON_CLASS]);
  const idLink: HTMLAnchorElement = createChild(chip, "a", ["id", "label"]) as HTMLAnchorElement;

  const statusIcon: HTMLElement = createElement("span", [ICON_CLASS, "last"]);
  const statusLabel: HTMLElement = createElement("span", ["label", "extra"]);

  function tooltip(text: string): void {
    addClass(statusLabel, "tooltip");
    setData(statusLabel, "tooltip", text);
  }

  const data: INatResult = await iNatFetch(key, 1);

  setText(idIcon, data ? "pin" : "search");

  if (!data) {
    addClass(photo, "missing");
    photo.innerText = "broken_image";
    idLink.innerText = "keresés";
    idLink.href = `${INAT_URL}/search?source[]=taxa&q=${
      encodeURIComponent(key)
    }`;
    addClass(chip, "missing");

    return;
  }

  if (data.defaultPhoto) {
    photo.innerText = "";
    photo.style.backgroundImage = `url(${data.defaultPhoto.squareUrl})`;
    photo.title = data
      .defaultPhoto
      .attribution
      .replace(/\(c\)/, "©")
      // TODO: Source translations from the layout file!
      .replaceAll(/\ball rights reserved\b/g, "minden jog fenntartva")
      .replaceAll(/\bsome rights reserved\b/g, "néhány jog fenntartva")
      .replaceAll(/\buploaded by\b/g, "feltöltötte:");
  }

  // Not great, but will do for now.
  const cnames: string = CNAMES[key]
    // TODO: Extract this to some function!
    .map((cname: CommonName): Array<string> => cname.commonNames[LANG])
    .reduce((x: Array<string>, y: Array<string>): Array<string> => x.concat(y))
    .join(", ");

  idLink.innerText = data.id.toString();
  idLink.href = `${INAT_URL}/taxa/${data.id}`;

  if (!data.preferredCommonName) {
    addClass(chip, "missing");
    statusLabel.innerText = "név hiányzik";
    statusIcon.innerText = "error";

    // TODO: Add icon for individual names!
    const cn: CommonName = CNAMES[key][0];
    const src: Source = SOURCES[cn.sourceId];
    const actionIcon: HTMLElement = createChild(chip, "span", [ICON_CLASS, "extra"]);
    actionIcon.innerText = "add_circle";
    const actionLink: HTMLAnchorElement = createChild(chip, "a", ["extra"]) as HTMLAnchorElement;
    actionLink.target = "_blank";
    actionLink.innerText = "név hozzáadása";

    // TODO: Set the lexicon name!
    actionLink.href = `${idLink.href}/taxon_names/new?taxon_name_name=${
      encodeURIComponent(cnames)
    }&taxon_name_audit_comment=${
      encodeURIComponent(refText(src, cn.pageNum))
    }`;

    append(chip, [
      statusIcon,
      statusLabel,
    ]);
    return;
  }

  append(chip, [
    statusIcon,
    statusLabel,
  ]);

  if (data.preferredCommonName === cnames) {
    addClass(chip, "match");
    statusIcon.innerText = "done_all";
    tooltip(`"${data.preferredCommonName}"`);
    statusLabel.innerText = "név megegyezik";
    return;
  }

  if (data.preferredCommonName.toUpperCase() === cnames.toUpperCase()) {
    addClass(chip, "near-match");
    statusIcon.innerText = "done";
    tooltip(`"${data.preferredCommonName}"`);
    statusLabel.innerText = "név hasonló";
    return;
  }

  addClass(chip, "mismatch");
  statusIcon.innerText = "emergency_home";
  tooltip(`"${data.preferredCommonName}"`);
  statusLabel.innerText = "név különbözik";
}

async function iNatFetch(sname: string, perPage: number): Promise<INatResult | null> {
  const url: string = `${INAT_API}/taxa?q=${encodeURIComponent(sname)}&locale=${LANG}&per_page=${perPage}`;

  // Try to look up the result in the cache/queue.
  let res: INatResults | Promise<Response> | null = INAT[url];

  if (res === null) {
    return null; // Not found.
  }

  if (res === undefined) {
    // Not found, try local storage.
    const cache = window.localStorage.getItem(url);
    INAT[url] = res = cache
      ? new INatResults(JSON.parse(cache))
      : fetch(url);
  }

  if (!(res instanceof INatResults)) {
    // We have a promise, await and decode it.
    const raw = await (await res).json();
    window.localStorage.setItem(url, JSON.stringify(raw));
    INAT[url] = res = new INatResults(raw);
  }

  const data = res.results.find((result: INatResult): boolean => result.name === sname);
  if (data) {
    return data;
  }

  if (!res.totalResults || res.totalResults <= perPage || perPage >= 200) {
    // Giving up at 200 results.
    INAT[url] = null;
    return null;
  }

  return (await iNatFetch(
    sname,  perPage > 1 ?  perPage * 2 : 25
  ));
}
