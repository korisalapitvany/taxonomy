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
    /// Page number, where missing values are treated as repeats.
    #[serde(rename = "page^")]
    page_repeat: Option<i32>,
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

    let mut rows: Vec<Row> = vec!();
    for res in r.deserialize() {
        rows.push(res?);
    }

    println!("{} rows", rows.len());

    Ok(())
}
