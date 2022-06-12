def source_repository(name, sources, **kwargs):
    native.genrule(
        name = name,
        srcs = [
            ":" + source
            for source in sources
        ] + [
            source + ".json"
            for source in sources
        ],
        outs = [
            "sources.json",
            "common_names.json",
        ],
        cmd = _MERGE_DATA,
        **kwargs
    )

    for source in sources:
        _source_csv(
            name = source,
            src = source + ".csv",
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

_MERGE_DATA = """\
echo -n '{' >$(location sources.json)
echo -n '{' >$(location common_names.json)
for input in $(SRCS); do
  if [[ "$${input}" != *.data.json ]]; then
    echo '"'$$(basename $${input} .json)'":' >>$(location sources.json)
    cat $${input} >>$(location sources.json)
    echo -n , >>$(location sources.json)
  else
    echo '"'$$(basename $${input} .data.json)'":' >>$(location common_names.json)
    cat $${input} >>$(location common_names.json)
    echo -n , >>$(location common_names.json)
  fi
done
echo '}' >>$(location sources.json)
echo '}' >>$(location common_names.json)
sed --regexp-extended --in-place 's/^,}$$/}/' $(location sources.json)
sed --regexp-extended --in-place 's/^,}$$/}/' $(location common_names.json)

touch $(location common_names.json)
"""
