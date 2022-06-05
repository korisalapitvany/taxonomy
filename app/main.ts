const CNAMES = fetch(relativeURL("data/common_names.json"));
const SOURCES = fetch(relativeURL("data/sources.json"));

async function main(): Promise<void> {
  const cnames = await (await CNAMES).json();
  console.log(cnames);
}
