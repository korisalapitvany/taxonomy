// iNaturalist API.
const INAT_API = "https://api.inaturalist.org/v1";

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
  const photo: HTMLDivElement = row.querySelector(".photo") as HTMLDivElement;
  const ext: HTMLDivElement = row.querySelector(".ext") as HTMLDivElement;

  const chip: HTMLAnchorElement = document.createElement("a");
  chip.className = "chip flex-row inaturalist";
  ext.append(chip);

  const data: INatResult = await iNatFetch(key, 1);

  if (!data) {
    chip.classList.add("missing");
    chip.innerText = "hiányzik";
    return;
  }

  chip.href = `https://www.inaturalist.org/taxa/${data.id}`;

  if (data.defaultPhoto) {
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

  if (!data.preferredCommonName) {
    chip.classList.add("missing");
    chip.innerText = "név hiányzik";
    return;
  }

  // Not great, but will do for now.
  const cnames: string = CNAMES[key]
    // TODO: Extract this to some function!
    .map((cname: CommonName): Array<string> => cname.commonNames[LANG])
    .reduce((x: Array<string>, y: Array<string>): Array<string> => x.concat(y))
    .join(", ");

  if (data.preferredCommonName === cnames) {
    chip.classList.add("match");
    chip.innerText = "név megegyezik";
    return;
  }

  if (data.preferredCommonName.replaceAll(/\W/g, "").toUpperCase() ===
      cnames.replaceAll(/\W/g, "").toUpperCase()) {
    chip.classList.add("near-match");

    const span: HTMLElement = document.createElement("span");
    span.className = "tooltip";
    span.dataset["tooltip"] = `"${data.preferredCommonName}"`;
    span.innerText = "név hasonló";
    chip.append(span);

    return;
  }

  chip.classList.add("mismatch");
  chip.innerText = "név különbözik";

  // TODO: Go through common names for this cell,
  // mark each one that appears in iNat with a chip.
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
