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
    let mut ref_scientific_name: Option<String> = None;
    let mut ref_scientific_name_used = false;
    let mut ref_common_name_hu: Option<String> = None;
    let mut ref_common_name_hu_used = false;

    write!(out, "[");

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
        if row.scientific_name.contains('&') {
            if !ref_scientific_name_used {
                if let Some(unused) = ref_scientific_name {
                    return Err(Error::validation_error(format!(
                        "unused reference: {}",
                        unused
                    )));
                }
            }
            ref_scientific_name = row
                .scientific_name
                .split_whitespace()
                .find(|w| w.starts_with('&'))
                .and_then(|w| Some(w.replace('&', "")));
            ref_scientific_name_used = false;
            row.scientific_name = row.scientific_name.replace('&', "");
        }

        while row.scientific_name.contains('*') {
            row.scientific_name = row
                .scientific_name
                .replace('*', &ref_scientific_name.to_owned().unwrap());
            ref_scientific_name_used = true;
        }

        // Common names.
        if row.common_name_hu.contains('&') {
            if !ref_common_name_hu_used {
                if let Some(unused) = ref_common_name_hu {
                    return Err(Error::validation_error(format!(
                        "unused reference: {}",
                        unused
                    )));
                }
            }
            ref_common_name_hu = row
                .common_name_hu
                .split_whitespace()
                .find(|w| w.starts_with('&'))
                .and_then(|w| Some(w.replace('&', "")));
            row.common_name_hu = row.common_name_hu.replace('&', "");
            ref_common_name_hu_used = false;
        }

        while row.common_name_hu.contains('*') {
            row.common_name_hu = row
                .common_name_hu
                .replace('*', &ref_common_name_hu.to_owned().unwrap());
            ref_common_name_hu_used = true;
        }

        let mut scientific_name: &str = &row.scientific_name;
        let mut synonym: Option<&str> = None;
        if scientific_name.contains('=') {
            let mut parts = scientific_name.split('=');
            synonym = Some(&parts.next().unwrap_or(&"").trim());
            scientific_name = &parts.last().unwrap_or(&"").trim();
        }

        if n > 0 {
            write!(out, ",");
        }

        write!(out, "{{");

        if let Some(page) = row.page {
            write!(out, r#""page": {}, "#, page);
        }

        write!(out, r#""scientific_name": "#);
        serde_json::to_writer(&mut out, scientific_name)?;

        if let Some(synonym) = synonym {
            write!(out, r#", "synonym": "#);
            serde_json::to_writer(&mut out, synonym)?;
        }

        write!(out, r#", "common_names": {{"hu": ["#);
        for (i, field) in row.common_name_hu.split(';').enumerate() {
            if i != 0 {
                write!(out, ", ");
            }
            serde_json::to_writer(&mut out, field.trim())?;
        }
        writeln!(out, "]}}}}");

        written = true;
    }

    if !written {
        // Write a single newline to make sure we keep the output's "streamable" property.
        writeln!(out, "");
    }

    writeln!(out, "]");

    Ok(())
}
