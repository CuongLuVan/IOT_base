#include "JsonUtil.h"

#include <limits.h>
#include <math.h>
#include <stdio.h>
#include <string.h>

namespace json {
namespace {

// Bracket depth of text, ignoring brackets inside strings; -1 when deeper than limit.
int nestingDepth(const char* text, size_t length, int limit)
{
    int depth = 0;
    int deepest = 0;
    bool inString = false;
    bool escaped = false;
    for (size_t i = 0; i < length; ++i) {
        const char c = text[i];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (c == '\\') {
                escaped = true;
            } else if (c == '"') {
                inString = false;
            }
            continue;
        }
        if (c == '"') {
            inString = true;
        } else if (c == '{' || c == '[') {
            if (++depth > limit) return -1;
            if (depth > deepest) deepest = depth;
        } else if ((c == '}' || c == ']') && depth > 0) {
            --depth;
        }
    }
    return deepest;
}

bool appendValue(std::string& out, const cJSON* item, int depth)
{
    if (item == nullptr || depth > kMaxNesting) return false;
    if (cJSON_IsObject(item) || cJSON_IsArray(item)) {
        const bool object = cJSON_IsObject(item);
        out += object ? '{' : '[';
        bool first = true;
        for (const cJSON* child = item->child; child != nullptr; child = child->next) {
            if (!first) out += ',';
            first = false;
            if (object) {
                appendString(out, child->string != nullptr ? child->string : "");
                out += ':';
            }
            if (!appendValue(out, child, depth + 1)) return false;
        }
        out += object ? '}' : ']';
        return true;
    }
    if (cJSON_IsString(item)) {
        appendString(out, item->valuestring != nullptr ? item->valuestring : "");
        return true;
    }
    if (cJSON_IsNumber(item)) {
        appendNumber(out, item->valuedouble);
        return true;
    }
    if (cJSON_IsTrue(item)) {
        out += "true";
        return true;
    }
    if (cJSON_IsFalse(item)) {
        out += "false";
        return true;
    }
    out += "null";
    return true;
}

bool replaceOrAdd(cJSON* object, const char* key, cJSON* item)
{
    if (item == nullptr) return false;
    if (object == nullptr || !cJSON_IsObject(object)) {
        cJSON_Delete(item);
        return false;
    }
    if (cJSON_GetObjectItemCaseSensitive(object, key) != nullptr) {
        cJSON_ReplaceItemInObjectCaseSensitive(object, key, item);
    } else {
        cJSON_AddItemToObject(object, key, item);
    }
    return true;
}

}  // namespace

Ptr newObject()
{
    return Ptr(cJSON_CreateObject());
}

Ptr newArray()
{
    return Ptr(cJSON_CreateArray());
}

Ptr parse(const char* text, size_t length)
{
    if (text == nullptr || length == 0 || nestingDepth(text, length, kMaxNesting) < 0) return Ptr();
    // cJSON_Parse() needs a terminated string.
    std::string copy(text, length);
    return Ptr(cJSON_Parse(copy.c_str()));
}

Ptr parseObject(const char* text, size_t length)
{
    Ptr document = parse(text, length);
    if (!document || !cJSON_IsObject(document.get())) return Ptr();
    return document;
}

bool appendTo(std::string& out, const cJSON* item)
{
    return appendValue(out, item, 0);
}

std::string print(const cJSON* item)
{
    std::string out;
    if (!appendValue(out, item, 0)) out.clear();
    return out;
}

void appendString(std::string& out, const char* value)
{
    out += '"';
    for (const char* cursor = value; *cursor != '\0'; ++cursor) {
        const char character = *cursor;
        switch (character) {
            case '"': out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\b': out += "\\b"; break;
            case '\f': out += "\\f"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default:
                if (static_cast<uint8_t>(character) < 0x20) {
                    char escaped[7];
                    snprintf(escaped, sizeof(escaped), "\\u%04x", static_cast<unsigned>(static_cast<uint8_t>(character)));
                    out += escaped;
                } else {
                    out += character;
                }
        }
    }
    out += '"';
}

namespace {

// Decimal digits of value, without printf: the SDK links newlib-nano
// (CONFIG_NEWLIB_NANO_FORMAT), which has no %lld and no float formats.
void appendUnsigned(std::string& out, uint64_t value, int minDigits)
{
    char digits[24];
    int count = 0;
    do {
        digits[count++] = static_cast<char>('0' + static_cast<int>(value % 10U));
        value /= 10U;
    } while (value != 0 && count < static_cast<int>(sizeof(digits)));
    while (count < minDigits && count < static_cast<int>(sizeof(digits))) digits[count++] = '0';
    while (count > 0) out += digits[--count];
}

}  // namespace

void appendNumber(std::string& out, double value)
{
    if (isnan(value) || isinf(value)) {
        out += "null";
        return;
    }
    const bool negative = value < 0;
    const double magnitude = fabs(value);
    // Integers up to 2^53 are exact in a double (millisecond timestamps included).
    if (value == floor(value) && magnitude < 9007199254740992.0) {
        if (negative) out += '-';
        appendUnsigned(out, static_cast<uint64_t>(magnitude), 1);
        return;
    }
    uint64_t whole = static_cast<uint64_t>(magnitude);
    uint64_t fraction = static_cast<uint64_t>((magnitude - static_cast<double>(whole)) * 1000000.0 + 0.5);
    if (fraction >= 1000000U) {
        ++whole;
        fraction -= 1000000U;
    }
    // Up to 6 decimals, trailing zeros trimmed, at least one decimal kept.
    int decimals = 6;
    while (decimals > 1 && fraction % 10U == 0) {
        fraction /= 10U;
        --decimals;
    }
    if (negative) out += '-';
    appendUnsigned(out, whole, 1);
    out += '.';
    appendUnsigned(out, fraction, decimals);
}

const cJSON* get(const cJSON* object, const char* key)
{
    if (object == nullptr || !cJSON_IsObject(object)) return nullptr;
    return cJSON_GetObjectItemCaseSensitive(object, key);
}

bool isNull(const cJSON* object, const char* key)
{
    const cJSON* item = get(object, key);
    return item == nullptr || cJSON_IsNull(item);
}

bool isInteger(const cJSON* item, long& value)
{
    if (item == nullptr || !cJSON_IsNumber(item)) return false;
    const double number = item->valuedouble;
    if (number != floor(number) || number < static_cast<double>(LONG_MIN) || number > static_cast<double>(LONG_MAX)) {
        return false;
    }
    value = static_cast<long>(number);
    return true;
}

bool isInteger(const cJSON* item)
{
    long ignored = 0;
    return isInteger(item, ignored);
}

bool isString(const cJSON* item)
{
    return item != nullptr && cJSON_IsString(item) && item->valuestring != nullptr;
}

bool isObject(const cJSON* item)
{
    return item != nullptr && cJSON_IsObject(item);
}

const char* getString(const cJSON* object, const char* key, const char* fallback)
{
    const cJSON* item = get(object, key);
    return isString(item) ? item->valuestring : fallback;
}

bool readIntField(const cJSON* object, const char* key, long fallback, long min, long max, long& out)
{
    const cJSON* value = get(object, key);
    if (value == nullptr || cJSON_IsNull(value)) {
        out = fallback;
    } else if (!isInteger(value, out)) {
        return false;
    }
    return out >= min && out <= max;
}

bool set(cJSON* object, const char* key, cJSON* item)
{
    return replaceOrAdd(object, key, item);
}

bool setNumber(cJSON* object, const char* key, double value)
{
    return replaceOrAdd(object, key, cJSON_CreateNumber(value));
}

bool setString(cJSON* object, const char* key, const char* value)
{
    return replaceOrAdd(object, key, cJSON_CreateString(value != nullptr ? value : ""));
}

bool setBool(cJSON* object, const char* key, bool value)
{
    return replaceOrAdd(object, key, cJSON_CreateBool(value ? 1 : 0));
}

cJSON* setArray(cJSON* object, const char* key)
{
    cJSON* array = cJSON_CreateArray();
    return replaceOrAdd(object, key, array) ? array : nullptr;
}

cJSON* setObject(cJSON* object, const char* key)
{
    cJSON* child = cJSON_CreateObject();
    return replaceOrAdd(object, key, child) ? child : nullptr;
}

void remove(cJSON* object, const char* key)
{
    if (object != nullptr && cJSON_IsObject(object)) cJSON_DeleteItemFromObjectCaseSensitive(object, key);
}

void clear(cJSON* object)
{
    if (object == nullptr) return;
    while (object->child != nullptr) {
        cJSON* child = cJSON_DetachItemViaPointer(object, object->child);
        cJSON_Delete(child);
    }
}

bool addNumber(cJSON* array, double value)
{
    cJSON* item = cJSON_CreateNumber(value);
    if (item == nullptr || array == nullptr) {
        cJSON_Delete(item);
        return false;
    }
    cJSON_AddItemToArray(array, item);
    return true;
}

bool addString(cJSON* array, const char* value)
{
    cJSON* item = cJSON_CreateString(value != nullptr ? value : "");
    if (item == nullptr || array == nullptr) {
        cJSON_Delete(item);
        return false;
    }
    cJSON_AddItemToArray(array, item);
    return true;
}

cJSON* addArray(cJSON* array)
{
    cJSON* item = cJSON_CreateArray();
    if (item == nullptr || array == nullptr) {
        cJSON_Delete(item);
        return nullptr;
    }
    cJSON_AddItemToArray(array, item);
    return item;
}

}  // namespace json
