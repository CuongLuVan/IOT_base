#pragma once

// JSON helpers on cJSON (bundled with ESP8266_RTOS_SDK, component "json"),
// replacing ArduinoJson. Only parsing uses cJSON_Parse(); serialisation is
// done here so integers are always printed as integers (no %g, which needs
// the float printf of newlib) and strings are escaped exactly like
// JSON.stringify() (the HMAC canonical form depends on it).
//
// Ownership: json::Ptr deletes its tree. set*() replace an existing key (the
// "document[key] = value" of ArduinoJson) and keep insertion order otherwise.

#include <stddef.h>
#include <stdint.h>
#include <memory>
#include <string>

#include "cJSON.h"

namespace json {

// Deeper input is rejected before cJSON parses it: cJSON recurses per level,
// and a LAN / MQTT payload of "[[[[..." must not overflow the task stack.
// ArduinoJson used the same default limit.
constexpr int kMaxNesting = 10;

struct Deleter {
    void operator()(cJSON* item) const
    {
        cJSON_Delete(item);
    }
};
using Ptr = std::unique_ptr<cJSON, Deleter>;

// A new empty object / array; nullptr when out of memory.
Ptr newObject();
Ptr newArray();

// Parses length bytes (need not be '\0'-terminated). nullptr: invalid JSON,
// nested deeper than kMaxNesting, or out of memory.
Ptr parse(const char* text, size_t length);
inline Ptr parse(const std::string& text)
{
    return parse(text.data(), text.size());
}
// parse() that also requires a JSON object.
Ptr parseObject(const char* text, size_t length);
inline Ptr parseObject(const std::string& text)
{
    return parseObject(text.data(), text.size());
}

// Compact serialisation appended to out; false when item is null or an
// object is nested too deeply.
bool appendTo(std::string& out, const cJSON* item);
// Compact serialisation; empty on failure.
std::string print(const cJSON* item);
// JSON string literal of value (JSON.stringify escaping).
void appendString(std::string& out, const char* value);
// Number as JSON text: integers without a fraction, others with up to 6 decimals.
void appendNumber(std::string& out, double value);

// Member lookup (case sensitive); nullptr when object is not an object.
const cJSON* get(const cJSON* object, const char* key);
// true when the key is missing or JSON null.
bool isNull(const cJSON* object, const char* key);
// true when item is a number without a fraction that fits in a long.
bool isInteger(const cJSON* item);
bool isInteger(const cJSON* item, long& value);
bool isString(const cJSON* item);
bool isObject(const cJSON* item);
// String member or fallback (ArduinoJson "document[key] | fallback").
const char* getString(const cJSON* object, const char* key, const char* fallback = "");

// Reads an integer field into out. A missing key gives fallback; a value that
// is not an integer, or lies outside min..max, makes it return false.
bool readIntField(const cJSON* object, const char* key, long fallback, long min, long max, long& out);

// Setters on an object; they take ownership of item and return false (item
// freed) when out of memory.
bool set(cJSON* object, const char* key, cJSON* item);
bool setNumber(cJSON* object, const char* key, double value);
bool setString(cJSON* object, const char* key, const char* value);
inline bool setString(cJSON* object, const char* key, const std::string& value)
{
    return setString(object, key, value.c_str());
}
bool setBool(cJSON* object, const char* key, bool value);
// A new array / object member (replacing key); nullptr when out of memory.
cJSON* setArray(cJSON* object, const char* key);
cJSON* setObject(cJSON* object, const char* key);
void remove(cJSON* object, const char* key);
// Removes every member.
void clear(cJSON* object);

// Array appends; false when out of memory.
bool addNumber(cJSON* array, double value);
bool addString(cJSON* array, const char* value);
// A new array / object element; nullptr when out of memory.
cJSON* addArray(cJSON* array);

}  // namespace json
