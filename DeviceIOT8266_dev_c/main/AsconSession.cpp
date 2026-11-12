// End-to-end Ascon-AEAD128 between the device and the server; the broker only
// relays it (same protocol as DeviceIOT8266). The session key lives in RAM
// only: it is the XOR of ASCON_RANDOM_DIGITS keys of the EEPROM key table,
// chosen at random, and the server learns it from the digits in the plaintext
// handshake {"rc":7,"rs":0,"ky":"<digits>"} sent on connect, on {"com":7} and
// on every rotation (ASCON_KEY_ROTATION_MS). With ENABLE_ASCON_AEAD128 0
// every entry point is a no-op.

#include <new>
#include <string.h>

#include "AsconAead128.h"
#include "DebugInfo.h"
#include "Memory.h"
#include "MqttInternal.h"
#include "MqttPlatform.h"
#include "NetworkMqtt.h"

namespace mqtt {
namespace ascon {
namespace {

constexpr size_t kKeyBytes = 16;
constexpr size_t kNonceBytes = 16;
constexpr size_t kTagBytes = 16;
static_assert(ASCON_PUBLIC_KEY_HEX_LENGTH == 2 * kKeyBytes, "Ascon key table holds 128-bit keys");

struct Session {
    uint8_t key[kKeyBytes];
    char digits[ASCON_RANDOM_DIGITS + 1];
    uint32_t createdMs;
    bool ready;
};

Session session = {};

bool readTableKey(int index, uint8_t key[kKeyBytes])
{
    const std::string hexKey = Memory::GetInstance()->readString(
        ASCON_PUBLIC_KEYS_ADDRESS + index * ASCON_PUBLIC_KEY_ENTRY_LENGTH, ASCON_PUBLIC_KEY_HEX_LENGTH);
    return hexKey.size() == ASCON_PUBLIC_KEY_HEX_LENGTH && security::hexDecode(hexKey.c_str(), key, kKeyBytes);
}

bool rotateKey()
{
    char digits[ASCON_RANDOM_DIGITS + 1];
    uint8_t key[kKeyBytes] = {};
    for (int position = 0; position < ASCON_RANDOM_DIGITS; ++position) {
        const int index = static_cast<int>(mqtt_platform::secureRandom32() % ASCON_PUBLIC_KEY_COUNT);
        uint8_t tableKey[kKeyBytes];
        if (!readTableKey(index, tableKey)) {
            DEVICE_LOG_ERROR("[ASCON] Key table is missing or invalid");
            return false;
        }
        for (size_t byte = 0; byte < kKeyBytes; ++byte) {
            key[byte] ^= tableKey[byte];
        }
        digits[position] = static_cast<char>('0' + index);
    }
    digits[ASCON_RANDOM_DIGITS] = '\0';
    memcpy(session.key, key, sizeof(session.key));
    memcpy(session.digits, digits, sizeof(session.digits));
    session.createdMs = millis();
    session.ready = true;
    DEVICE_LOG_INFO("[ASCON] Session key rotated");
    return true;
}

bool rotationDue()
{
    return !session.ready || millis() - session.createdMs >= ASCON_KEY_ROTATION_MS;
}

bool encryptToHex(const std::string& plainText, std::string& hex)
{
    const size_t length = plainText.size();
    uint8_t* cipher = new (std::nothrow) uint8_t[length > 0 ? length : 1];
    if (cipher == nullptr) {
        return false;
    }
    hex.reserve(2 * (kNonceBytes + length + kTagBytes));
    uint8_t nonce[kNonceBytes];
    mqtt_platform::fillSecureRandom(nonce, sizeof(nonce));
    uint8_t tag[kTagBytes];
    asconAead128Encrypt(session.key, nonce, nullptr, 0, reinterpret_cast<const uint8_t*>(plainText.data()), length,
                        cipher, tag);
    security::appendHex(hex, nonce, sizeof(nonce));
    security::appendHex(hex, cipher, length);
    security::appendHex(hex, tag, sizeof(tag));
    delete[] cipher;
    return true;
}

bool decryptHex(const char* hex, std::string& plainText)
{
    const size_t hexLength = strlen(hex);
    if (!session.ready || hexLength % 2 != 0 || hexLength <= 2 * (kNonceBytes + kTagBytes)) {
        return false;
    }
    const size_t packedLength = hexLength / 2;
    const size_t cipherLength = packedLength - kNonceBytes - kTagBytes;
    uint8_t* packed = new (std::nothrow) uint8_t[packedLength];
    uint8_t* plain = new (std::nothrow) uint8_t[cipherLength + 1];
    bool ok = packed != nullptr && plain != nullptr && security::hexDecode(hex, packed, packedLength);
    if (ok) {
        const uint8_t* nonce = packed;
        const uint8_t* cipher = nonce + kNonceBytes;
        const uint8_t* tag = cipher + cipherLength;
        ok = asconAead128Decrypt(session.key, nonce, nullptr, 0, cipher, cipherLength, tag, plain);
    }
    if (ok) {
        plain[cipherLength] = '\0';
        // An embedded '\0' would silently truncate the command.
        ok = strlen(reinterpret_cast<const char*>(plain)) == cipherLength;
        if (ok) plainText.assign(reinterpret_cast<const char*>(plain), cipherLength);
    }
    delete[] packed;
    delete[] plain;
    return ok;
}

}  // namespace

bool prepareKey()
{
    if (!kEnabled) {
        return true;
    }
    // The server learns a new key only from the handshake; if that publish
    // fails, rotate again next time instead of using a key it does not know.
    if (rotationDue() && !announceKey()) {
        session.ready = false;
        DEVICE_LOG_WARNING("[ASCON] Publish blocked: session key is not available");
        return false;
    }
    return true;
}

bool announceKey()
{
    if (!kEnabled || (rotationDue() && !rotateKey())) {
        return false;
    }
    json::Ptr handshake = json::newObject();
    if (!handshake) return false;
    json::setNumber(handshake.get(), "rc", COMMAND_TYPE_ASCON_HANDSHAKE);
    json::setNumber(handshake.get(), "rs", toWire(CommandStatus::Ok));
    json::setString(handshake.get(), "ky", session.digits);
    return publishPlain(handshake.get());
}

bool seal(const std::string& plainText, cJSON* envelope)
{
    std::string hex;
    if (!kEnabled || !session.ready || envelope == nullptr || !encryptToHex(plainText, hex)) {
        DEVICE_LOG_WARNING("[ASCON] Encryption failed");
        return false;
    }
    json::clear(envelope);
    return json::setNumber(envelope, "com", COMMAND_TYPE_CONTROL) && json::setString(envelope, "value", hex);
}

bool open(json::Ptr& command)
{
    if (!kEnabled) {
        return true;
    }
    long com = 0;
    if (!json::isInteger(json::get(command.get(), "com"), com)) {
        return false;
    }
    if (com == COMMAND_TYPE_ASCON_HANDSHAKE) {
        return true;
    }
    const cJSON* value = json::get(command.get(), "value");
    std::string plainText;
    if (com != COMMAND_TYPE_CONTROL || !json::isString(value) || !decryptHex(value->valuestring, plainText)) {
        return false;
    }
    command = json::parseObject(plainText);
    return static_cast<bool>(command);
}

}  // namespace ascon
}  // namespace mqtt

#if ENABLE_ASCON_AEAD128
std::string getAsconEncryptedPayload(const std::string& payload)
{
    json::Ptr envelope = json::newObject();
    std::string encrypted;
    if (envelope && mqtt::ascon::seal(payload, envelope.get())) encrypted = json::print(envelope.get());
    if (encrypted.empty()) return "{\"error\":\"ascon_key_not_ready\"}";
    return encrypted;
}
#endif
