#!/usr/bin/env bash
# Fails when a file that must be identical in DeviceIOT and DeviceIOT8266 differs.
# Arduino IDE only compiles the sketch folder, so shared code is kept as two
# byte-identical copies; edit both (or copy one over the other) and run this.
set -u
cd "$(dirname "$0")/.."
status=0
for file in $(grep -l "identical in DeviceIOT and DeviceIOT8266" DeviceIOT/*.h DeviceIOT/*.cpp DeviceIOT/tests/* 2>/dev/null); do
    other="DeviceIOT8266/${file#DeviceIOT/}"
    if ! cmp -s "$file" "$other"; then
        echo "DIFFERENT: $file <-> $other"
        status=1
    fi
done
if ! cmp -s DeviceIOT/DeviceIOT.ino DeviceIOT8266/DeviceIOT8266.ino; then
    echo "DIFFERENT: DeviceIOT/DeviceIOT.ino <-> DeviceIOT8266/DeviceIOT8266.ino"
    status=1
fi
[ $status -eq 0 ] && echo "Shared files are identical."
exit $status
