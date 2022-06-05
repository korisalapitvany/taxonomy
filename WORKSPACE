load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
    name = "com_github_bazelbuild_buildtools",
    sha256 = "e3bb0dc8b0274ea1aca75f1f8c0c835adbe589708ea89bf698069d0790701ea3",
    strip_prefix = "buildtools-5.1.0",
    urls = [
        "https://github.com/bazelbuild/buildtools/archive/refs/tags/5.1.0.tar.gz",
        "https://mirror.bazel.build/github.com/bazelbuild/buildtools/archive/refs/tags/5.1.0.tar.gz",
    ],
)

http_archive(
    name = "io_bazel_rules_go",
    sha256 = "ab21448cef298740765f33a7f5acee0607203e4ea321219f2a4c85a6e0fb0a27",
    urls = [
        "https://github.com/bazelbuild/rules_go/releases/download/v0.32.0/rules_go-v0.32.0.zip",
        "https://mirror.bazel.build/github.com/bazelbuild/rules_go/releases/download/v0.32.0/rules_go-v0.32.0.zip",
    ],
)

http_archive(
    name = "com_google_protobuf",
    sha256 = "ad22f1624e237c0b3d362f78de7d96bf88b78d1fe19ae5dfa528a27306c7aaad",
    strip_prefix = "protobuf-3.21.1",
    urls = [
        "https://github.com/protocolbuffers/protobuf/releases/download/v21.1/protobuf-all-21.1.tar.gz",
        "https://mirror.bazel.build/github.com/protocolbuffers/protobuf/releases/download/v21.1/protobuf-all-21.1.tar.gz",
    ],
)

http_archive(
    name = "rules_rust",
    sha256 = "73580f341f251f2fc633b73cdf74910f4da64d06a44c063cbf5c01b1de753ec1",
    urls = [
        "https://github.com/bazelbuild/rules_rust/releases/download/0.5.0/rules_rust-v0.5.0.tar.gz",
        "https://mirror.bazel.build/github.com/bazelbuild/rules_rust/releases/download/0.5.0/rules_rust-v0.5.0.tar.gz",
    ],
)

load("@com_google_protobuf//:protobuf_deps.bzl", "protobuf_deps")
load("@io_bazel_rules_go//go:deps.bzl", "go_register_toolchains", "go_rules_dependencies")
load("@rules_rust//rust:repositories.bzl", "rules_rust_dependencies", "rust_register_toolchains")
load("//:versions.bzl", "GO_VERSION")

go_rules_dependencies()

protobuf_deps()

go_register_toolchains(version = GO_VERSION)

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
