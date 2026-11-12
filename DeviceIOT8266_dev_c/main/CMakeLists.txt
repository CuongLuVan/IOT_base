set(COMPONENT_SRCDIRS ".")
set(COMPONENT_ADD_INCLUDEDIRS ".")

register_component()

# C++14 (the firmware code is C++11/14) and no hard error on GCC's
# "may be used uninitialized" false positives at -Os.
component_compile_options($<$<COMPILE_LANGUAGE:CXX>:-std=gnu++14> -Wno-error=maybe-uninitialized)
