#pragma once

#include <stddef.h>
#include <stdint.h>

// NIST SP 800-232 Ascon-AEAD128. Tag is always 16 bytes.
bool asconAead128Encrypt(const uint8_t key[16], const uint8_t nonce[16],
                         const uint8_t *ad, size_t adLength,
                         const uint8_t *plainText, size_t plainTextLength,
                         uint8_t *cipherText, uint8_t tag[16]);
bool asconAead128Decrypt(const uint8_t key[16], const uint8_t nonce[16],
                         const uint8_t *ad, size_t adLength,
                         const uint8_t *cipherText, size_t cipherTextLength,
                         const uint8_t tag[16], uint8_t *plainText);
