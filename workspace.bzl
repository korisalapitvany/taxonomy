load("@bazel_tools//tools/build_defs/repo:http.bzl", _http_archive = "http_archive")
load("//:versions.bzl", "CHECKSUMS", "VERSIONS")

def http_archive(name, **kwargs):
    """HTTP archive with centrally managed versions and checksums."""

    ver = VERSIONS[name]

    if "strip_prefix" in kwargs:
        kwargs["strip_prefix"] = kwargs["strip_prefix"].format(version = ver)
    for i, url in enumerate(kwargs["urls"]):
        kwargs["urls"][i] = url.format(version = ver)

    _http_archive(
        name = name,
        sha256 = CHECKSUMS[name],
        **kwargs
    )

def dependencies():
    """Workspace dependencies."""
    http_archive(
        name = "mdn_yari",
        build_file = "//theme:mdn_yari.bazel",
        strip_prefix = "yari-{version}",
        urls = ["https://github.com/mdn/yari/archive/{version}.zip"],
    )
