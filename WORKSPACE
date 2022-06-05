load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
load("//:workspace.bzl", "dependencies")

dependencies()

load("@build_bazel_rules_nodejs//:repositories.bzl", "build_bazel_rules_nodejs_dependencies")
load("@com_google_protobuf//:protobuf_deps.bzl", "protobuf_deps")
load("@io_bazel_rules_go//go:deps.bzl", "go_register_toolchains", "go_rules_dependencies")
load("@rules_rust//rust:repositories.bzl", "rules_rust_dependencies", "rust_register_toolchains")
load("//:versions.bzl", "VERSIONS")

go_rules_dependencies()

protobuf_deps()

go_register_toolchains(version = VERSIONS["go"])

build_bazel_rules_nodejs_dependencies()

load("@build_bazel_rules_nodejs//:index.bzl", "node_repositories", "npm_install")

node_repositories()

load("@io_bazel_rules_sass//:defs.bzl", "sass_repositories")

sass_repositories()

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
