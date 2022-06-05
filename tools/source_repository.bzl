def source_repository(name, sources):
    native.genrule(
        name = name,
        srcs = [
            source + ".json"
            for source in sources
        ],
        outs = ["data.json"],
        cmd = _MERGE_JSON,
    )

    for source in sources:
        _source_csv(
            name = source,
            src = source + ".csv",
        )

        native.sh_test(
            name = source + "_test",
            srcs = ["//tools:source_json_test.sh"],
            data = [
                ":" + source,
                source + ".data.json",
            ],
            env = {
                "INPUT_JSON": "$(rootpath " + source + ".data.json)",
                "EXPECTED_JSON": "$(rootpath :" + source + ")",
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

_MERGE_JSON = """\
echo -n '{' >$@
for input in $(SRCS); do
  echo >>$@
  echo '"'$$(basename $${input} .json)'":' >>$@
  cat $${input} >>$@
  echo -n , >>$@
done
echo '}' >>$@
sed --regexp-extended --in-place 's/^,}$$/}/' $@
"""
