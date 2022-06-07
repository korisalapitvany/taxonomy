// How much to wait before we start filtering. Starting too early introduces
// too much churn, but starting too late results in a visible lag. 
const FILTER_DELAY: number = 200;

let filterVal: string = "";
let filterApplied: string = "";
let filterTimeout: number = 0;

interface FilterParams {
  val: string;
};

// Handle filter input events.
// This function sholud be as light-weight as possible.
function handleFilterInput(evt: InputEvent): void {
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
    table["setFilter"](filterTable, {
      val: filterVal,
    } as FilterParams);
  }, FILTER_DELAY);
}

// Tabulator filter handler.
function filterTable(data, params: FilterParams): boolean {
  const value: string = params.val;
  if (!value) {
    // Clear the filter.
    return true;
  }

  const cnames: Array<CommonName> = CNAMES[data.key];

  return fuzzyText(
    cnames
      .map((cn: CommonName): Array<string> => {
        return cn["common_names"][LANG]
          .concat(cn["scientific_name"])
          .concat(cn["synonym"] ? "syn" : "")
          .concat(cn["synonym"] || "");
      })
      .reduce((x: Array<string>, y: Array<string>): Array<string> => x.concat(y))
      .join(" "))
    .includes(fuzzyText(value));
}

// Prepare text for simple "fuzzy" mtaching.
function fuzzyText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
