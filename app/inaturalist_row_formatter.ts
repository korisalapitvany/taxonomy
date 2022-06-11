async function iNatRow(row: HTMLElement, key: string): Promise<void> {
  const data: INatTaxonSearchResult = await iNatFetch(key, 1);
  iNatPhoto(data, row);
  iNatChip(data, row, key);
}

function iNatPhoto(data: INatTaxonSearchResult, row: HTMLElement): void {
  const photo: HTMLElement = querySelector(row, ".photo");
  if (!(data && data.defaultPhoto)) {
    addClass(photo, "missing");
    photo.innerText = "broken_image";
    return;
  }

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

function iNatChip(data: INatTaxonSearchResult, row: HTMLElement, key: string): void {
  const chip: HTMLElement = createChild(querySelector(row, ".ext"), "div", [
    "chip",
    "flex-row",
    "inaturalist",
  ]);

  const idIcon: HTMLElement = createChild(chip, "span", [ICON_CLASS]);
  const idLink: HTMLAnchorElement = createChild(chip, "a", ["id", "label"]) as HTMLAnchorElement;

  const statusIcon: HTMLElement = createElement("span", [ICON_CLASS, "last"]);
  const statusLabel: HTMLElement = createElement("span", ["label", "extra"]);

  function tooltip(text: string): void {
    addClass(statusLabel, "tooltip");
    setData(statusLabel, "tooltip", text);
  }

  setText(idIcon, data ? "pin" : "search");

  if (!data) {
    idLink.innerText = "keresés";
    idLink.href = `${INAT_URL}/search?source[]=taxa&q=${
      encodeURIComponent(key)
    }`;
    addClass(chip, "missing");

    return;
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
