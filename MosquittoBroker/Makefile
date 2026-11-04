# Linux / WSL:  sudo apt install mosquitto mosquitto-dev libssl-dev libcjson-dev gcc make
CC ?= gcc
CFLAGS ?= -O2 -Wall -Wextra
LDLIBS = -lcjson -lcrypto

build/mosquitto_iot_auth.so: src/mosquitto_iot_auth.c
	mkdir -p build
	$(CC) $(CFLAGS) -fPIC -shared -o $@ $< $(LDLIBS)

clean:
	rm -rf build

.PHONY: clean
