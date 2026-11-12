# Host unit tests of the pure logic (run on the PC, not on the ESP8266):
#   make -C tests        (needs g++ or clang++ on the PC)
CXX ?= g++
CXXFLAGS ?= -std=c++14 -Wall -Wextra -O1

core_logic_test: core_logic_test.cpp ../main/*.h
	$(CXX) $(CXXFLAGS) -o $@ core_logic_test.cpp

test: core_logic_test
	./core_logic_test

.PHONY: test
.DEFAULT_GOAL := test
