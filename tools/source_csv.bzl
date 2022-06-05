def source_csv(name, srcs):
    if len(srcs) != 2:
        fail("expected exactly 2 source files, got: " + str(len(srcs)))

    srcs_csv = [src for src in srcs if src.endswith(".csv")]
    srcs_json = [src for src in srcs if src.endswith(".json")]

    if not srcs_csv:
        fail("CSV source file missing")
    if not srcs_json:
        fail("JSON source file missing")

    _source_csv(
        name = name,
        src = srcs_csv[0],
    )

    native.sh_test(
        name = name + "_test",
        srcs = ["//tools:source_json_test.sh"],
        data = srcs_json + [
            ":" + name,
        ],
        env = {
            "INPUT_JSON": "$(rootpath " + srcs_json[0] + ")",
            "EXPECTED_JSON": "$(rootpath :" + name + ")",
        },
    )

def _source_csv_impl(ctx):
    output_json = ctx.actions.declare_file(ctx.attr.name + ".data.json")

    args = ctx.actions.args()
    args.add("--input", ctx.file.src)
    args.add("--output", output_json)

    ctx.actions.run(
        executable = ctx.executable._csv_to_json,
        arguments = [args],
        inputs = [ctx.file.src],
        outputs = [output_json],
        mnemonic = "CSV2JSON",
    )

    return DefaultInfo(
        files = depset([output_json]),
        runfiles = ctx.runfiles(files = [output_json]),
    )

_source_csv = rule(
    implementation = _source_csv_impl,
    attrs = {
        "src": attr.label(
            allow_single_file = [".csv"],
            doc = "Source CSV file.",
            mandatory = True,
        ),
        "_csv_to_json": attr.label(
            default = "//tools/csv_to_json",
            executable = True,
            cfg = "exec",
        ),
    },
)
