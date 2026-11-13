// End-to-end Ascon-AEAD128 between the device and the server; the broker only
// relays it. The session key lives in RAM only: it is the XOR of
// ASCON_RANDOM_DIGITS keys of the EEPROM key table, chosen at random, and the
// server learns it from the digits in the plaintext handshake
// {"rc":7,"rs":0,"ky":"<digits>"} sent on connect, on {"com":7} and on every
// rotation (ASCON_KEY_ROTATION_MS). The code is always compiled; with
// ENABLE_ASCON_AEAD128 0 every entry point is a no-op.
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include <memory>
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
    const String hexKey = Memory::GetInstance()->readString(
        ASCON_PUBLIC_KEYS_ADDRESS + index * ASCON_PUBLIC_KEY_ENTRY_LENGTH, ASCON_PUBLIC_KEY_HEX_LENGTH);
    return hexKey.length() == ASCON_PUBLIC_KEY_HEX_LENGTH && security::hexDecode(hexKey.c_str(), key, kKeyBytes);
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

bool encryptToHex(const String& plainText, String& hex)
{
    const size_t length = plainText.length();
    std::unique_ptr<uint8_t[]> cipher(new (std::nothrow) uint8_t[length > 0 ? length : 1]);
    if (!cipher || !hex.reserve(2 * (kNonceBytes + length + kTagBytes))) {
        return false;
    }
    uint8_t nonce[kNonceBytes];
    mqtt_platform::fillSecureRandom(nonce, sizeof(nonce));
    uint8_t tag[kTagBytes];
    asconAead128Encrypt(session.key, nonce, nullptr, 0, reinterpret_cast<const uint8_t*>(plainText.c_str()), length,
                        cipher.get(), tag);
    security::appendHex(hex, nonce, sizeof(nonce));
    security::appendHex(hex, cipher.get(), length);
    security::appendHex(hex, tag, sizeof(tag));
    return true;
}

bool decryptHex(const char* hex, String& plainText)
{
    const size_t hexLength = strlen(hex);
    if (!session.ready || hexLength % 2 != 0 || hexLength <= 2 * (kNonceBytes + kTagBytes)) {
        return false;
    }
    const size_t packedLength = hexLength / 2;
    const size_t cipherLength = packedLength - kNonceBytes - kTagBytes;
    std::unique_ptr<uint8_t[]> packed(new (std::nothrow) uint8_t[packedLength]);
    std::unique_ptr<uint8_t[]> plain(new (std::nothrow) uint8_t[cipherLength + 1]);
    if (!packed || !plain || !security::hexDecode(hex, packed.get(), packedLength)) {
        return false;
    }
    const uint8_t* nonce = packed.get();
    const uint8_t* cipher = nonce + kNonceBytes;
    const uint8_t* tag = cipher + cipherLength;
    if (!asconAead128Decrypt(session.key, nonce, nullptr, 0, cipher, cipherLength, tag, plain.get())) {
        return false;
    }
    plain[cipherLength] = '\0';
    // An embedded '\0' would silently truncate the command.
    if (strlen(reinterpret_cast<const char*>(plain.get())) != cipherLength) {
        return false;
    }
    plainText = reinterpret_cast<const char*>(plain.get());
    return true;
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
    JsonDocument handshake;
    handshake["rc"] = static_cast<int>(COMMAND_TYPE_ASCON_HANDSHAKE);
    handshake["rs"] = toWire(CommandStatus::Ok);
    handshake["ky"] = static_cast<const char*>(session.digits);
    return publishPlain(handshake);
}

bool seal(const String& plainText, JsonDocument& envelope)
{
    String hex;
    if (!kEnabled || !session.ready || !encryptToHex(plainText, hex)) {
        DEVICE_LOG_WARNING("[ASCON] Encryption failed");
        return false;
    }
    envelope.clear();
    envelope["com"] = static_cast<int>(COMMAND_TYPE_CONTROL);
    envelope["value"] = hex;
    return !envelope.overflowed();
}

bool open(JsonDocument& command)
{
    if (!kEnabled) {
        return true;
    }
    JsonVariantConst com = command["com"];
    if (!com.is<long>()) {
        return false;
    }
    // The handshake, and certificate renewals (com 16 / 17): web_manager has no
    // Ascon session key, and these carry public data the device checks itself
    // (key match / same CA key, then a test connect). "pa" is still required.
    if (com.as<long>() == COMMAND_TYPE_ASCON_HANDSHAKE || com.as<long>() == COMMAND_TYPE_CERTIFICATE_RENEW ||
        com.as<long>() == COMMAND_TYPE_CA_RENEW) {
        return true;
    }
    const char* hex = command["value"].as<const char*>();
    String plainText;
    if (com.as<long>() != COMMAND_TYPE_CONTROL || hex == nullptr || !decryptHex(hex, plainText)) {
        return false;
    }
    command.clear();
    return !deserializeJson(command, plainText) && command.is<JsonObject>();
}

}  // namespace ascon
}  // namespace mqtt

#if ENABLE_ASCON_AEAD128
String getAsconEncryptedPayload(const String& payload)
{
    JsonDocument envelope;
    String encrypted;
    if (!mqtt::ascon::seal(payload, envelope) || serializeJson(envelope, encrypted) == 0) {
        return String(F("{\"error\":\"ascon_key_not_ready\"}"));
    }
    return encrypted;
}
#endif
