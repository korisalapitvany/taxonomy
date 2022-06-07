const INAT_API = "https://api.inaturalist.org/v1";
// https://api.inaturalist.org/v1/taxa?q=Philanthus%20triangulum&per_page=1

const INAT: { [key: string]: Promise<Response> | INatResults } = {};

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

// Format a single row.
// This should finish as soon as possible, and update the row asynchronously.
function fmtRow(row: typeof RowComponent): void {
  const el: HTMLElement = row["getElement"]();
  const key: string = row.getData().key;

  setTimeout((): void => {
    iNatFetch(el, key);
  }, 50);
}

async function iNatFetch(row: HTMLElement, key: string): Promise<void> {
  const url: string = `${INAT_API}/taxa?q=${encodeURIComponent(key)}&locale=${LANG}&per_page=1`;

  let res = INAT[key];
  if (!res) {
    const cache = window.localStorage.getItem(url);
    INAT[key] = res = cache
      ? new INatResults(JSON.parse(cache))
      : fetch(url);
  }
  if (!(res instanceof INatResults)) {
    // We have a promise, await and decode it.
    const raw = await (await res).json();
    window.localStorage.setItem(url, JSON.stringify(raw));
    INAT[key] = res = new INatResults(raw);
  }

  if (!res.totalResults) {
    // TODO: mismatch, mark it as so!
    console.log(`NOT FOUND: iNaturalist: ${key}`);
    return;
  }

  const data = res.results[0];

  const photo: HTMLDivElement = row.querySelector(".photo") as HTMLDivElement;
  if (!photo) {
    // Maybe the element has disappeared.
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
}
