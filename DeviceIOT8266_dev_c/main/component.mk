COMPONENT_SRCDIRS := .
COMPONENT_ADD_INCLUDEDIRS := .

# C++14 (the firmware code is C++11/14) and no hard error on GCC's
# "may be used uninitialized" false positives at -Os.
CXXFLAGS += -std=gnu++14 -Wno-error=maybe-uninitialized
CFLAGS += -Wno-error=maybe-uninitialized
