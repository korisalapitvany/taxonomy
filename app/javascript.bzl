def iife(name, srcs, replace = None):
    """Wraps all inputs in an IIFE."""
    native.genrule(
        name = name,
        srcs = srcs,
        outs = ["{}.js".format(name)],
        cmd = _IIFE_WRAP_ALL.format(
            replacements = " ".join([
                '-e "s/{}/{}/g"'.format(src, dst)
                for src, dst in (replace or {}).items()
            ]),
        ),
        visibility = ["//:__pkg__"],
    )

_IIFE_WRAP_ALL = """\
echo "(() => {{" > $@
for input in $(SRCS); do
  if [[ $$(basename "$${{input}}") != type_hints.* ]]; then
    sed {replacements} "$${{input}}" >> $@
  fi
done
echo "}})();" >> $@
"""
