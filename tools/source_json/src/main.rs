use std::error;
use std::fmt;
use std::io;

use clap::Parser;
use serde::Deserialize;

#[derive(Parser)]
#[clap()]
struct Args {
    /// Input CSV file path.
    #[clap(short, long, default_value = "-")]
    input: String,

    /// Output JSON file path.
    #[clap(short, long, default_value = "-")]
    output: String,
}

#[derive(Debug, Deserialize)]
struct Row {
    /// Page number.
    page: Option<i32>,
    /// Scientific name.
    /// This could be a synonym or can contain references (&) and pointers (^, *).
    scientific_name: String,
    /// Common names (translations).
    /// This could contain references, pointers and plural marks.
    #[serde(rename = "common_name.hu")]
    common_name_hu: String,
}

#[derive(Debug)]
enum Error {
    IoError(io::Error),
    CsvError(csv::Error),
    ValidationError(String),
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::IoError(err) => write!(f, "{}", err),
            Error::CsvError(err) => write!(f, "{}", err),
            Error::ValidationError(err) => write!(f, "validation error: {}", err),
        }
    }
}

impl From<io::Error> for Error {
    fn from(err: io::Error) -> Self {
        Error::IoError(err)
    }
}

impl From<csv::Error> for Error {
    fn from(err: csv::Error) -> Self {
        Error::CsvError(err)
    }
}

impl Error {
    fn validation_error(err: String) -> Self {
        Error::ValidationError(err)
    }
}

impl error::Error for Error {}

fn main() -> Result<(), Error> {
    let args = Args::parse();

    let mut r = csv::Reader::from_path(args.input)?;

    {
        // Validate the headers.
        let c = r
            .headers()?
            .iter()
            .map(|th| th.trim_end_matches('^'))
            .filter(|th| *th == "page")
            .count();
        if c != 1 {
            return Err(Error::validation_error(format!(
                "expected exactly one page header, found: {}",
                c
            )));
        }
    }

    let mut page: Option<i32> = None;
    let mut ref_scientific_name: Option<String> = None;
    let mut ref_common_name_hu: Option<String> = None;

    let mut rows: Vec<Row> = vec![];
    for res in r.deserialize() {
        let mut row: Row = res?;

        // Page number.
        if row.page == None {
            row.page = Some(page.ok_or(Error::validation_error(
                "first row must contain a page number".to_string(),
            ))?);
        } else {
            page = row.page;
        }

        // Scientific name.
        if row.scientific_name.contains('&') {
            ref_scientific_name = Some(row.scientific_name.replace('&', ""));
            row.scientific_name = row.scientific_name.replace('&', "");
        }

        while row.scientific_name.contains('*') {
            row.scientific_name = row
                .scientific_name
                .replace('*', &ref_scientific_name.to_owned().unwrap());
        }

        // Common names.
        if row.common_name_hu.contains('&') {
            // TODO: Apply singular/plural transformations.
            ref_common_name_hu = Some(row.common_name_hu.replace('&', ""));
            row.common_name_hu = row.common_name_hu.replace('&', "");
        }

        while row.common_name_hu.contains('*') {
            row.common_name_hu = row
                .common_name_hu
                .replace('*', &ref_common_name_hu.to_owned().unwrap());
        }

        rows.push(row);
    }

    for row in &rows {
        println!(
            "{}: {} -> {}",
            row.page.unwrap(),
            row.scientific_name,
            row.common_name_hu
        );
    }

    Ok(())
}
