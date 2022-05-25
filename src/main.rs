mod wikispecies;


#[tokio::main]
async fn main() -> Result<(), &'static str> {
    wikispecies::sync_all().await
}
