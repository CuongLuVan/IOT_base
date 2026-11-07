# Host unit tests of the pure firmware logic (tests/core_logic_test.cpp).
#
#   make test    build and run the tests of DeviceIOT and DeviceIOT8266
#   make clean   remove the build directory
#
# AddressSanitizer and UBSan are used when the toolchain can link them (Linux,
# macOS). MinGW has no libasan / libubsan: there UBSan runs in trap mode and
# ASan is off.

CXX ?= g++
CXXFLAGS ?= -std=c++17 -O1 -g -Wall -Wextra -Werror
BUILD_DIR := build/tests

SANITIZE_FULL := -fsanitize=address,undefined -fno-omit-frame-pointer -fno-sanitize-recover=all
SANITIZE_TRAP := -fsanitize=undefined -fsanitize-trap=undefined
SANITIZE ?= $(shell mkdir -p $(BUILD_DIR) && echo 'int main(){return 0;}' | \
	$(CXX) $(SANITIZE_FULL) -x c++ - -o $(BUILD_DIR)/sanitizer_probe >/dev/null 2>&1 && \
	echo '$(SANITIZE_FULL)' || echo '$(SANITIZE_TRAP)')

SKETCHES := DeviceIOT DeviceIOT8266
TEST_BINARIES := $(foreach sketch,$(SKETCHES),$(BUILD_DIR)/$(sketch)_core_logic_test)

.PHONY: test clean

test: $(TEST_BINARIES)
	@echo "Sanitizers: $(SANITIZE)"
	@for binary in $(TEST_BINARIES); do echo "== $$binary"; ./$$binary || exit 1; done

$(BUILD_DIR)/%_core_logic_test: %/tests/core_logic_test.cpp %/*.h
	@mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) $(SANITIZE) $< -o $@

clean:
	rm -rf build
