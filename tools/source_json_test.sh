#!/usr/bin/env bash

RED="\033[0;31m"
GRN="\033[0;32m"
RST="\033[0m"

if [[ $* == *--update* ]]; then
	cp "${EXPECTED_JSON?}" "${BUILD_WORKSPACE_DIRECTORY?}/${INPUT_JSON?}"
	exit 0;
fi

diff --unified --color "${INPUT_JSON?}" "${EXPECTED_JSON?}" && (
    echo -e "${GRN}PASS${RST}"
	exit 0
) || (
    echo -e "${RED}FAIL${RST}"
	echo "${INPUT_JSON?} is out of sync with its source! To regenerate it, run:"
	echo "bazel run ${TEST_TARGET?} -- --update"
	exit 1
)
