use chrono::{Date, TimeZone, Utc};
use futures::future::join_all;
use itertools::Itertools;
use lazy_static::lazy_static;
use regex::Regex;
use scraper::{Html, Selector};
use serde::Deserialize;
use std::collections::BTreeMap as Map;

// Source: https://dumps.wikimedia.org/mirrors.html
const MIRRORS: [&str; 4] = [
    "https://dumps.wikimedia.your.org/specieswiki/",
    "https://ftp.acc.umu.se/mirror/wikimedia.org/dumps/specieswiki/",
    "https://wikimedia.bringyour.com/specieswiki/",
    "https://wikimedia.bytemark.co.uk/specieswiki/",
];

lazy_static! {
    static ref SEL_A: Selector = Selector::parse("table tr td a").unwrap();
    static ref RE_HREF: Regex = Regex::new(r"^\d{8}/?$").unwrap();
}

#[derive(Deserialize)]
struct DumpStatus {
    jobs: DumpStatusJobs,
}

#[derive(Deserialize)]
struct DumpStatusJobs {
    articlesdump: JobStatus,
}

#[derive(Deserialize)]
struct JobStatus {
    status: String,
    files: Map<String, FileStatus>,
}

#[derive(Deserialize, Debug)]
struct FileStatus {
    url: String,
    sha1: String,
}

pub async fn sync_all() -> Result<(), &'static str> {
    let urls = dump_status_latest().await.unwrap();

    let all_results = join_all(urls.iter().map(|url| reqwest::get(url)));
    let all_json = join_all(
        all_results
            .await
            .into_iter()
            .filter_map(|res| res.ok())
            .map(|res| res.json::<DumpStatus>()),
    );

    for ds in all_json
        .await
        .into_iter()
        .flatten()
        .filter(|ds| ds.jobs.articlesdump.status == "done")
    {
        for (filename, status) in ds.jobs.articlesdump.files {
            println!("fetch: {} -> cache/{}", status.url, status.sha1);
            println!("symlink: {} -> cache/{}", filename, status.sha1);
        }
    }

    Ok(())
}

/// Finds the latest dump among all mirrors.
/// The returned vector contains URLs that all map to the dump status from the same day.
async fn dump_status_latest() -> Result<Vec<String>, &'static str> {
    let all_dumps: Vec<Map<Date<Utc>, String>> =
        join_all(MIRRORS.map(|mirror| dump_status_mirror(mirror)))
            .await
            .into_iter()
            .filter_map(|ds| ds.map_err(|e| println!("{}", e)).ok())
            .filter(|ds| !ds.is_empty())
            .collect();
    let all_dates: Vec<&Date<Utc>> = all_dumps
        .iter()
        .map(|m| m.keys())
        .flatten()
        .unique()
        .sorted()
        .collect();
    println!("DATES: {:?}", all_dates);

    let newest_date = all_dates.last().unwrap().to_owned().to_owned();
    let all_urls = all_dumps
        .into_iter()
        .filter(|ds| ds.contains_key(&newest_date))
        .map(|ds| ds[&newest_date].to_owned())
        .collect();
    println!("NEWEST: {:?} {:?}", newest_date, all_urls);

    Ok(all_urls)
}

/// Fetches a vector of URLs containing dump status results, mapped by date.
async fn dump_status_mirror(mirror: &str) -> Result<Map<Date<Utc>, String>, reqwest::Error> {
    Ok(
        Html::parse_document(&reqwest::get(mirror).await?.text().await?)
            .select(&SEL_A)
            .into_iter()
            .map(|a| a.value().attr("href"))
            .flatten()
            .filter(|href| RE_HREF.is_match(href))
            .map(|href| {
                (
                    Utc.ymd(
                        href[..4].parse::<i32>().unwrap(),
                        href[4..6].parse::<u32>().unwrap(),
                        href[6..8].parse::<u32>().unwrap(),
                    ),
                    [mirror, href, "dumpstatus.json"].join(""),
                )
            })
            .collect(),
    )
}
