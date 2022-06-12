use std::error;
use std::fmt;
use std::fs;
use std::io;

use clap::Parser;
use serde::Deserialize;

#[derive(Parser)]
#[clap()]
struct Args {
    /// Input CSV file path.
    #[clap(short, long, default_value = "")]
    input: String,

    /// Output JSON file path.
    #[clap(short, long, default_value = "")]
    output: String,
}

#[derive(Debug, Deserialize)]
struct Row {
    /// Page number.
    page: Option<i32>,
    /// Scientific name (and synonyms).
    /// Special markers: ^ (first-word reference).
    scientific_name: String,
    /// Common names (translations).
    /// Special markers: ~ (last-word reference).
    #[serde(rename = "common_name.hu")]
    common_name_hu: String,
}

#[derive(Debug)]
enum Error {
    IoError(io::Error),
    CsvError(csv::Error),
    JsonError(serde_json::Error),
    ValidationError(String),
}

impl Error {
    fn validation_error(err: String) -> Self {
        Error::ValidationError(err)
    }
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::IoError(err) => write!(f, "{}", err),
            Error::CsvError(err) => write!(f, "{}", err),
            Error::JsonError(err) => write!(f, "{}", err),
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

impl From<serde_json::Error> for Error {
    fn from(err: serde_json::Error) -> Self {
        Error::JsonError(err)
    }
}

impl error::Error for Error {}

fn main() -> Result<(), Error> {
    let args = Args::parse();

    let mut r = csv::Reader::from_path(args.input)?;
    let mut out: Box<dyn io::Write> = if args.output != "" {
        Box::new(fs::File::create(&args.output)?)
    } else {
        Box::new(io::stdout())
    };

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
    let mut scientific_name_caret: Option<String> = None;
    let mut common_name_hu_tilde: Option<String> = None;

    write!(out, "[")?;

    let mut written = false;
    for (n, res) in r.deserialize().into_iter().enumerate() {
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
        if row.scientific_name.contains('^') {
            row.scientific_name = row.scientific_name.replace(
                '^',
                &scientific_name_caret
                    .to_owned()
                    .ok_or(Error::validation_error(format!(
                        "bad reference: {}",
                        row.scientific_name
                    )))?,
            );
        } else {
            scientific_name_caret = Some(
                row.scientific_name
                    .split_whitespace()
                    .next()
                    .unwrap_or("")
                    .to_string(),
            );
        }

        // Common names.
        if row.common_name_hu.contains('~') {
            row.common_name_hu = row.common_name_hu.replace(
                '~',
                &common_name_hu_tilde
                    .to_owned()
                    .ok_or(Error::validation_error(format!(
                        "bad reference: {}",
                        row.common_name_hu
                    )))?,
            );
        } else {
            common_name_hu_tilde = Some(
                row.common_name_hu
                    .split_whitespace()
                    .last()
                    .unwrap_or("")
                    .to_string(),
            );
        }

        if n > 0 {
            write!(out, ",")?;
        }

        write!(out, "{{")?;

        if let Some(page) = row.page {
            write!(out, r#""page": {}, "#, page)?;
        }

        let mut close = "";
        for (i, sn) in row.scientific_name.split(';').enumerate() {
            if i == 0 {
                write!(out, r#""scientific_name": "#)?;
            } else if i == 1 {
                write!(out, r#", "synonyms": ["#)?;
                close = "]";
            } else {
                write!(out, r#", "#)?;
            }
            serde_json::to_writer(&mut out, sn.trim())?;
        }
        write!(out, "{}", close)?;

        write!(out, r#", "common_names": {{"hu": ["#)?;
        for (i, field) in row.common_name_hu.split(';').enumerate() {
            if i != 0 {
                write!(out, ", ")?;
            }
            serde_json::to_writer(&mut out, field.trim())?;
        }
        writeln!(out, "]}}}}")?;

        written = true;
    }

    if !written {
        // Make sure we keep the output's "streamable" property.
        // Every line must contain one of `[`, `]`, or `,`, followed by an optional record.
        writeln!(out, "")?;
    }

    writeln!(out, "]")?;

    Ok(())
}
