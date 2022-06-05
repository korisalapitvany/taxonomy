load("@bazel_tools//tools/build_defs/repo:http.bzl", _http_archive = "http_archive")
load("//app:javascript_target.bzl", "JS_TARGET")
load("//:versions.bzl", "CHECKSUMS", "VERSIONS")

def http_archive(name, **kwargs):
    """HTTP archive with centrally managed versions and checksums."""

    ver = VERSIONS[name]

    if "strip_prefix" in kwargs:
        kwargs["strip_prefix"] = kwargs["strip_prefix"].format(version = ver)

    mirrors = []
    for i, url in enumerate(kwargs["urls"]):
        url = url.format(version = ver)
        kwargs["urls"][i] = url
        mirrors.append("https://mirror.bazel.build/" + url.partition("://")[2])
    kwargs["urls"].extend(mirrors)

    _http_archive(
        name = name,
        sha256 = CHECKSUMS[name],
        **kwargs
    )

def dependencies():
    """Workspace dependencies."""
    http_archive(
        name = "bazelruby_rules_ruby",
        strip_prefix = "rules_ruby-{version}",
        urls = ["https://github.com/bazelruby/rules_ruby/archive/{version}.zip"],
    )

    http_archive(
        name = "com_github_bazelbuild_buildtools",
        strip_prefix = "buildtools-{version}",
        urls = ["https://github.com/bazelbuild/buildtools/archive/refs/tags/{version}.tar.gz"],
    )

    http_archive(
        name = "com_google_protobuf",
        strip_prefix = "protobuf-3.{version}",
        urls = ["https://github.com/protocolbuffers/protobuf/releases/download/v{version}/protobuf-all-{version}.tar.gz"],
    )

    http_archive(
        name = "io_bazel_rules_go",
        urls = ["https://github.com/bazelbuild/rules_go/releases/download/v{version}/rules_go-v{version}.zip"],
    )

    http_archive(
        name = "build_bazel_rules_nodejs",
        urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/{version}/rules_nodejs-{version}.tar.gz"],
    )

    http_archive(
        name = "io_bazel_rules_closure",
        strip_prefix = "rules_closure-{version}",
        urls = ["https://github.com/bazelbuild/rules_closure/archive/{version}.zip"],
        patch_cmds = _patch_files({
            "closure/private/defs.bzl": 's/JS_LANGUAGE_IN = "STABLE"/JS_LANGUAGE_IN = "{}"/'.format(JS_TARGET),
        }),
    )

    http_archive(
        name = "io_bazel_rules_go",
        urls = ["https://github.com/bazelbuild/rules_go/releases/download/v{version}/rules_go-v{version}.zip"],
    )

    http_archive(
        name = "io_bazel_rules_sass",
        urls = ["https://github.com/bazelbuild/rules_sass/archive/refs/tags/{version}.tar.gz"],
        strip_prefix = "rules_sass-{version}",
    )

    http_archive(
        name = "mdn_yari",
        build_file = "//themes:mdn_yari.bazel",
        strip_prefix = "yari-{version}",
        urls = ["https://github.com/mdn/yari/archive/{version}.zip"],
    )

    http_archive(
        name = "rules_rust",
        urls = ["https://github.com/bazelbuild/rules_rust/releases/download/{version}/rules_rust-v{version}.tar.gz"],
    )

def _patch_files(patch_map):
    """Generates a list of 'sed' commands that patch files in-place."""
    return [
        "sed --in-place --regexp-extended '{}' \"{}\"".format(regex, filename)
        for filename, regex in sorted(patch_map.items())
    ]
