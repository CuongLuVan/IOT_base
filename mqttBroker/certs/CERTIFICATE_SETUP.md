# MQTT Broker Certificate Setup

This directory stores the TLS certificates for the MQTT broker. The broker
configuration in ../MqttBroker1885.js uses server.key and server.crt on port
1885. When mutual TLS is enabled, it also reads ca.crt and verifies each device
against ../mqtt_device_certs.json.

## Files

| File | Purpose | Private |
| --- | --- | --- |
| ca.key | Certificate authority (CA) private key. | Yes |
| ca.crt | CA certificate trusted by MQTT clients. | No |
| server.key | MQTT broker private key. | Yes |
| server.crt | MQTT broker TLS certificate. | No |
| server.cnf | Broker certificate SAN configuration. | No |
| device-<clientId>.key | Private key for one device. | Yes |
| device-<clientId>.crt | Client certificate for one device. | No |

Never commit, share, or deploy a .key file to an untrusted system. In
production, keep ca.key on a separate, secure certificate-issuing machine.

## Prerequisite

Run the commands from this directory with OpenSSL available on PATH:

~~~powershell
cd mqttBroker/certs
openssl version
~~~

## Create a local CA

Use this for development or when an organization CA is not available:

~~~powershell
openssl req -x509 -new -nodes -sha256 -days 3650 -newkey rsa:2048 -keyout ca.key -out ca.crt -subj "/CN=Local MQTT CA"
~~~

Distribute ca.crt to every MQTT client. Do not distribute ca.key.

## Create the broker certificate

First update server.cnf. Its subjectAltName value must include every DNS name
and IP address clients use to reach the broker. For example, add
DNS:mqtt.example.com if clients connect with that hostname.

~~~powershell
openssl genrsa -out server.key 2048
openssl req -new -sha256 -key server.key -out server.csr -subj "/CN=localhost"
openssl x509 -req -sha256 -days 825 -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -extfile server.cnf -extensions v3_req
~~~

Restart the broker after replacing server.key or server.crt.

## Create a device certificate

Replace device-new with the exact MQTT client ID for the device:

~~~powershell
openssl genrsa -out device-new.key 2048
openssl req -new -sha256 -key device-new.key -out device-new.csr -subj "/CN=device-new"
@('keyUsage = critical, digitalSignature', 'extendedKeyUsage = clientAuth', 'subjectKeyIdentifier = hash') | Set-Content device-new.ext
openssl x509 -req -sha256 -days 365 -in device-new.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out device-new.crt -extfile device-new.ext
~~~

Securely provision only device-new.key, device-new.crt, and ca.crt to that
device. Never provision ca.key, server.key, or another device key.

## Register the device fingerprint

With enableTLSCertificate = true, the broker accepts a device only if the MQTT
client ID and presented certificate fingerprint both match an entry in
../mqtt_device_certs.json.

~~~powershell
openssl x509 -in device-new.crt -noout -fingerprint -sha256
~~~

Add the returned value to the devices array:

~~~json
{
  "clientId": "device-new",
  "fingerprint256": "AA:BB:CC:...:YY:ZZ"
}
~~~

Keep the JSON valid. A renewed certificate has a new fingerprint, so update
this mapping whenever the device certificate changes. Restart the broker or
reconnect the client after saving the mapping.

## Verify certificates

~~~powershell
openssl verify -CAfile ca.crt server.crt
openssl x509 -in server.crt -noout -subject -issuer -dates -ext subjectAltName
openssl verify -CAfile ca.crt device-new.crt
openssl x509 -in device-new.crt -noout -subject -issuer -fingerprint -sha256
~~~

## Renewal and revocation

- Renew certificates before their expiration date and update the device
  fingerprint mapping after every device certificate renewal.
- To block a device, remove its entry from ../mqtt_device_certs.json and
  restart the broker.
- If a private key is exposed, replace the affected key and certificate. If
  ca.key is exposed, create a new CA and replace all dependent certificates.