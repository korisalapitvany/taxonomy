// iNaturalist.
const INAT_URL: string = "https://www.inaturalist.org";

// iNaturalist API.
const INAT_API: string = `${INAT_URL.replace(/www/, "api")}/v1`;

// Cache of response objects / promises.
// Used more or less like a queue. Promises are never cancelled.
const INAT: {
  [key: string]: INatTaxonSearchResults | Promise<Response> | null
} = {};

class INatTaxonSearchResults {
  totalResults: number;
  currentPage: number;
  perPage: number;
  results: Array<INatTaxonSearchResult>;
  updatedAt: Date;

  constructor(data: any) {
    this.totalResults = data["total_results"];
    this.currentPage = data["page"];
    this.perPage = data["per_page"];
    this.results = data["results"].map((res: any): INatTaxonSearchResult => new INatTaxonSearchResult(res));
    this.updatedAt = new Date();
  }
};

class INatTaxonSearchResult {
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

async function iNatFetch(sname: string, perPage: number): Promise<INatTaxonSearchResult | null> {
  const url: string = `${INAT_API}/taxa?q=${encodeURIComponent(sname)}&locale=${LANG}&per_page=${perPage}`;

  // Try to look up the result in the cache/queue.
  let res: INatTaxonSearchResults | Promise<Response> | null = INAT[url];

  if (res === null) {
    return null; // Not found.
  }

  if (res === undefined) {
    // Not found, try local storage.
    const cache = window.localStorage.getItem(url);
    INAT[url] = res = cache
      ? new INatTaxonSearchResults(JSON.parse(cache))
      : fetch(url);
  }

  if (!(res instanceof INatTaxonSearchResults)) {
    // We have a promise, await and decode it.
    const raw = await (await res).json();
    window.localStorage.setItem(url, JSON.stringify(raw));
    INAT[url] = res = new INatTaxonSearchResults(raw);
  }

  const data = res.results.find((result: INatTaxonSearchResult): boolean => result.name === sname);
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
