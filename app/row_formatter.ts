const INAT_API = "https://api.inaturalist.org/v1";
// https://api.inaturalist.org/v1/taxa?q=Philanthus%20triangulum&per_page=1

const INAT: { [key: string]: Promise<Response> | INatResults } = {};

class INatResults {
  total_results: number;
  page: number;
  per_page: number;
  results: Array<INatResult>;
  updated_at: Date;

  constructor(json: any) {
    Object.assign(this, json);
    this.updated_at = new Date();
  }
};

interface INatResult {
  id: number;
  name: string;
  preferred_common_name: string;
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
  default_photo: {
    attribution: string;
    square_url: string;
  };
};

// Format a single row.
// This should finish as soon as possible, and update the row asynchronously.
function fmtRow(row: typeof RowComponent): void {
  const el: HTMLElement = row.getElement();
  const key: string = row.getData().key;

  setTimeout((): void => {
    iNatFetch(el, key);
  }, 50);
}

async function iNatFetch(row: HTMLElement, key: string): Promise<void> {
  const url: string = `${INAT_API}/taxa?q=${encodeURIComponent(key)}&locale=${LANG}&per_page=1`;

  let res = INAT[key];
  if (!res) {
    const cache = localStorage.getItem(url);
    INAT[key] = res = cache
      ? new INatResults(JSON.parse(cache))
      : fetch(url);
  }
  if (!(res instanceof INatResults)) {
    // We have a promise, await and decode it.
    const raw = await (await res).json();
    localStorage.setItem(url, JSON.stringify(raw));
    INAT[key] = res = new INatResults(raw);
  }

  if (!res.total_results) {
    // TODO: mismatch, mark it as so!
    console.log(`NOT FOUND: iNaturalist: ${key}`);
    return;
  }

  const data = res.results.shift();

  const photo: HTMLDivElement = row.querySelector(".photo") as HTMLDivElement;
  if (!photo) {
    // Maybe the element has disappeared.
    return;
  }

  // TODO: Update the row!
  const def = data.default_photo;
  if (def) {
    photo.style.backgroundImage = `url(${def.square_url})`;
    photo.title = def
      .attribution
      .replaceAll(/\(c\)/g, "©")
      // TODO: Source translations from the layout file!
      .replaceAll(/\ball rights reserved\b/g, "minden jog fenntartva")
      .replaceAll(/\bsome rights reserved\b/g, "néhány jog fenntartva")
      .replaceAll(/\buploaded by\b/g, "feltöltötte:");
  }
}
