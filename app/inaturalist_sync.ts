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
  matched_term: string;
  observations_count: number;
  taxon_schemes_count: number;
  ancestry: string;
  is_active: boolean;
  flag_counts: {
    resolved: number;
    unresolved: number;
  };
  wikipedia_url: string;
  current_synonymous_taxon_ids: any;
  iconic_taxon_id: number;
  iconic_taxon_name: string;
  rank_level: number;
  taxon_changes_count: number;
  atlas_id: any;
  complete_species_count: any;
  parent_id: number;
  rank: string;
  extinct: boolean;
  ancestor_ids: Array<number>;
  defaultPhoto: INatDefaultPhoto;

  constructor(data: any) {
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
  const data: INatResult = await iNatFetch(key, 1);
  if (!data) {
    // Taxon not found on iNaturalist.
    return;
  }

  const photo: HTMLDivElement = row.querySelector(".photo") as HTMLDivElement;
  const ext: HTMLDivElement = row.querySelector(".ext") as HTMLDivElement;
  if (!photo || !ext) {
    // Maybe the row has disappeared since.
    return;
  }

  // TODO: Update the row!
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

  const chip: HTMLDivElement = document.createElement("div");
  chip.className = "inaturalist";

  // TODO: Go through common names for this cell,
  // mark each one that appears in iNat with a chip.

  ext.append(chip);
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
