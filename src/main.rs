mod wikispecies;


#[tokio::main]
async fn main() {
    wikispecies::sync().await;
}
