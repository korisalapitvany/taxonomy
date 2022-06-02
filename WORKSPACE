load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
    name = "rules_rust",
    sha256 = "73580f341f251f2fc633b73cdf74910f4da64d06a44c063cbf5c01b1de753ec1",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/rules_rust/releases/download/0.5.0/rules_rust-v0.5.0.tar.gz",
        "https://github.com/bazelbuild/rules_rust/releases/download/0.5.0/rules_rust-v0.5.0.tar.gz",
    ],
)

load("@rules_rust//rust:repositories.bzl", "rules_rust_dependencies", "rust_register_toolchains")

rules_rust_dependencies()

rust_register_toolchains(edition = "2021")

load("@rules_rust//crate_universe:repositories.bzl", "crate_universe_dependencies")

crate_universe_dependencies()

load("@rules_rust//crate_universe:defs.bzl", "crates_repository")

crates_repository(
    name = "crate_index",
    lockfile = "//tools/csv_to_json:Cargo.Bazel.lock",
    manifests = ["//tools/csv_to_json:Cargo.toml"],
)

load("@crate_index//:defs.bzl", "crate_repositories")

crate_repositories()
