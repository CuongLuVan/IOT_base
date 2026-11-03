"""Security required by mqttBroker/MqttBroker1885.js for Python clients.

- mTLS with an ECDSA P-256 client certificate registered for the clientId in
  mqtt_device_certs.json (enableTLSCertificate, enableECDSA);
- "timestamp" + "nonce" in every JSON publish (enableAttack);
- optional HMAC-SHA256 "keyId" + "signature" (enableMessageAuthentication),
  over the same canonical form as canonicalizePayloadValue() in the broker.
"""
import hashlib
import hmac
import json
import math
import os
import re
import ssl
import time
import uuid

CREDENTIAL_REJECTED = (4, 5, 134, 135)  # CONNACK: bad credentials / not authorized


def tls_context(ca_file, cert_file, key_file):
    """Verifies the broker (CA + host name) and presents the client certificate."""
    for path in (ca_file, cert_file, key_file):
        if not os.path.isfile(path):
            raise FileNotFoundError(f"MQTT credential not found: {path}")
    context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH, cafile=ca_file)
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.load_cert_chain(cert_file, key_file)
    return context


def _js_number(value):
    """Formats a number like JavaScript's JSON.stringify()."""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if math.isnan(value) or math.isinf(value):
        return "null"
    if value.is_integer() and abs(value) < 1e21:
        return str(int(value))  # JSON.stringify(230.0) == "230", json.dumps gives "230.0"
    return re.sub(r"e([+-])0*(\d)", r"e\1\2", repr(value))  # 1e-07 -> 1e-7


def canonicalize(value):
    if isinstance(value, dict):
        return "{" + ",".join(
            json.dumps(key, ensure_ascii=False) + ":" + canonicalize(value[key])
            for key in sorted(value)) + "}"
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(canonicalize(item) for item in value) + "]"
    if isinstance(value, (bool, int, float)):
        return _js_number(value)
    if value is None:
        return "null"
    return json.dumps(value, ensure_ascii=False)


def protect_payload(body, client_id):
    """Returns the JSON text to publish for a dict payload."""
    body = {k: v for k, v in body.items() if k not in ("signature", "keyId")}
    if os.environ.get("MQTT_REPLAY_PROTECTION", "true").lower() != "false":
        body["timestamp"] = int(time.time() * 1000)
        body["nonce"] = str(uuid.uuid4())
    secret = os.environ.get("MQTT_HMAC_SECRET", "")
    if secret:
        # The broker removes "signature" and "keyId" before computing the HMAC.
        signature = hmac.new(secret.encode(), canonicalize(body).encode(), hashlib.sha256).hexdigest()
        body["keyId"] = os.environ.get("MQTT_HMAC_KEY_ID") or client_id
        body["signature"] = signature
    return json.dumps(body, ensure_ascii=False, separators=(",", ":"))
