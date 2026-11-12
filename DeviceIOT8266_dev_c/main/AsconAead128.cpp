// NIST SP 800-232 Ascon-AEAD128 (128-bit key, nonce and tag; 128-bit rate).
//
// Copied unchanged (logic) from DeviceIOT8266; independent of the platform.

#include "AsconAead128.h"

namespace {

constexpr uint64_t kInitialValue = 0x00001000808c0001ULL;
constexpr int kRoundsA = 12;  // Initialisation and finalisation.
constexpr int kRoundsB = 8;   // Per data block.
constexpr size_t kRate = 16;
constexpr size_t kHalfRate = 8;

struct AsconState {
    uint64_t x[5];
};

uint64_t rotateRight(uint64_t value, int count)
{
    return (value >> count) | (value << ((64 - count) & 63));
}

// Little-endian load / store of length (<= 8) bytes.
uint64_t load(const uint8_t* bytes, size_t length)
{
    uint64_t value = 0;
    for (size_t i = 0; i < length; i++) {
        value |= static_cast<uint64_t>(bytes[i]) << (8 * i);
    }
    return value;
}

void store(uint8_t* bytes, uint64_t value, size_t length)
{
    for (size_t i = 0; i < length; i++) {
        bytes[i] = static_cast<uint8_t>(value >> (8 * i));
    }
}

uint64_t clearBytes(uint64_t value, size_t length)
{
    for (size_t i = 0; i < length; i++) {
        value &= ~(static_cast<uint64_t>(0xff) << (8 * i));
    }
    return value;
}

uint64_t padding(size_t length)
{
    return static_cast<uint64_t>(1) << (8 * length);
}

void permutationRound(AsconState& s, uint8_t constant)
{
    s.x[2] ^= constant;
    s.x[0] ^= s.x[4];
    s.x[4] ^= s.x[3];
    s.x[2] ^= s.x[1];
    AsconState t;
    t.x[0] = s.x[0] ^ (~s.x[1] & s.x[2]);
    t.x[1] = s.x[1] ^ (~s.x[2] & s.x[3]);
    t.x[2] = s.x[2] ^ (~s.x[3] & s.x[4]);
    t.x[3] = s.x[3] ^ (~s.x[4] & s.x[0]);
    t.x[4] = s.x[4] ^ (~s.x[0] & s.x[1]);
    t.x[1] ^= t.x[0];
    t.x[0] ^= t.x[4];
    t.x[3] ^= t.x[2];
    t.x[2] = ~t.x[2];
    s.x[0] = t.x[0] ^ rotateRight(t.x[0], 19) ^ rotateRight(t.x[0], 28);
    s.x[1] = t.x[1] ^ rotateRight(t.x[1], 61) ^ rotateRight(t.x[1], 39);
    s.x[2] = t.x[2] ^ rotateRight(t.x[2], 1) ^ rotateRight(t.x[2], 6);
    s.x[3] = t.x[3] ^ rotateRight(t.x[3], 10) ^ rotateRight(t.x[3], 17);
    s.x[4] = t.x[4] ^ rotateRight(t.x[4], 7) ^ rotateRight(t.x[4], 41);
}

void permute(AsconState& s, int rounds)
{
    static const uint8_t kRoundConstants[12] = {0xf0, 0xe1, 0xd2, 0xc3, 0xb4, 0xa5,
                                                0x96, 0x87, 0x78, 0x69, 0x5a, 0x4b};
    for (int i = 12 - rounds; i < 12; i++) {
        permutationRound(s, kRoundConstants[i]);
    }
}

void initialize(AsconState& s, const uint8_t key[16], const uint8_t nonce[16])
{
    const uint64_t k0 = load(key, 8);
    const uint64_t k1 = load(key + 8, 8);
    s.x[0] = kInitialValue;
    s.x[1] = k0;
    s.x[2] = k1;
    s.x[3] = load(nonce, 8);
    s.x[4] = load(nonce + 8, 8);
    permute(s, kRoundsA);
    s.x[3] ^= k0;
    s.x[4] ^= k1;
}

void absorbAssociatedData(AsconState& s, const uint8_t* ad, size_t length)
{
    if (length > 0) {
        while (length >= kRate) {
            s.x[0] ^= load(ad, 8);
            s.x[1] ^= load(ad + 8, 8);
            permute(s, kRoundsB);
            ad += kRate;
            length -= kRate;
        }
        if (length >= kHalfRate) {
            s.x[0] ^= load(ad, 8);
            s.x[1] ^= load(ad + 8, length - kHalfRate);
            s.x[1] ^= padding(length - kHalfRate);
        } else {
            s.x[0] ^= load(ad, length);
            s.x[0] ^= padding(length);
        }
        permute(s, kRoundsB);
    }
    // Domain separation.
    s.x[4] ^= 0x8000000000000000ULL;
}

void finalize(AsconState& s, const uint8_t key[16], uint8_t tag[16])
{
    const uint64_t k0 = load(key, 8);
    const uint64_t k1 = load(key + 8, 8);
    s.x[2] ^= k0;
    s.x[3] ^= k1;
    permute(s, kRoundsA);
    s.x[3] ^= k0;
    s.x[4] ^= k1;
    store(tag, s.x[3], 8);
    store(tag + 8, s.x[4], 8);
}

}  // namespace

bool asconAead128Encrypt(const uint8_t key[16], const uint8_t nonce[16], const uint8_t* ad, size_t adLength,
                         const uint8_t* plainText, size_t plainTextLength, uint8_t* cipherText, uint8_t tag[16])
{
    AsconState s;
    initialize(s, key, nonce);
    absorbAssociatedData(s, ad, adLength);
    const uint8_t* m = plainText;
    uint8_t* c = cipherText;
    size_t length = plainTextLength;
    while (length >= kRate) {
        s.x[0] ^= load(m, 8);
        s.x[1] ^= load(m + 8, 8);
        store(c, s.x[0], 8);
        store(c + 8, s.x[1], 8);
        permute(s, kRoundsB);
        m += kRate;
        c += kRate;
        length -= kRate;
    }
    if (length >= kHalfRate) {
        s.x[0] ^= load(m, 8);
        s.x[1] ^= load(m + 8, length - kHalfRate);
        store(c, s.x[0], 8);
        store(c + 8, s.x[1], length - kHalfRate);
        s.x[1] ^= padding(length - kHalfRate);
    } else {
        s.x[0] ^= load(m, length);
        store(c, s.x[0], length);
        s.x[0] ^= padding(length);
    }
    finalize(s, key, tag);
    return true;
}

bool asconAead128Decrypt(const uint8_t key[16], const uint8_t nonce[16], const uint8_t* ad, size_t adLength,
                         const uint8_t* cipherText, size_t cipherTextLength, const uint8_t tag[16],
                         uint8_t* plainText)
{
    AsconState s;
    initialize(s, key, nonce);
    absorbAssociatedData(s, ad, adLength);
    const uint8_t* c = cipherText;
    uint8_t* m = plainText;
    size_t length = cipherTextLength;
    while (length >= kRate) {
        const uint64_t c0 = load(c, 8);
        const uint64_t c1 = load(c + 8, 8);
        store(m, s.x[0] ^ c0, 8);
        store(m + 8, s.x[1] ^ c1, 8);
        s.x[0] = c0;
        s.x[1] = c1;
        permute(s, kRoundsB);
        c += kRate;
        m += kRate;
        length -= kRate;
    }
    if (length >= kHalfRate) {
        const uint64_t c0 = load(c, 8);
        const uint64_t c1 = load(c + 8, length - kHalfRate);
        store(m, s.x[0] ^ c0, 8);
        store(m + 8, s.x[1] ^ c1, length - kHalfRate);
        s.x[0] = c0;
        s.x[1] = clearBytes(s.x[1], length - kHalfRate) | c1;
        s.x[1] ^= padding(length - kHalfRate);
    } else {
        const uint64_t c0 = load(c, length);
        store(m, s.x[0] ^ c0, length);
        s.x[0] = clearBytes(s.x[0], length) | c0;
        s.x[0] ^= padding(length);
    }
    uint8_t expected[16];
    finalize(s, key, expected);
    // Constant time.
    uint8_t difference = 0;
    for (int i = 0; i < 16; i++) {
        difference |= expected[i] ^ tag[i];
    }
    return difference == 0;
}
