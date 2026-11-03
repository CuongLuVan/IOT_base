Broker certificates (ECDSA P-256)
=================================

The broker (enableECDSA in MqttBroker1885.js) and the devices only accept
ECDSA P-256 certificates. RSA certificates are rejected and do not fit the
device EEPROM. Full guide: certs/CERTIFICATE_SETUP.md

All commands run in mqttBroker/certs and are identical on Windows
(PowerShell/cmd) and Linux. In Git Bash run first: export MSYS_NO_PATHCONV=1

Step 1. Create the CA (once)

openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -pkeyopt ec_param_enc:named_curve -out ca.key
openssl req -x509 -new -key ca.key -sha256 -days 3650 -subj "/CN=Local MQTT CA" -config pki.cnf -extensions v3_ca -out ca.crt

Step 2. Create the broker certificate

subjectAltName in pki.cnf, section [v3_server], must list every IP/DNS name
that devices and clients put in mqtt_host / MQTT_HOST. It currently contains:
    DNS:localhost,IP:127.0.0.1,IP:103.1.238.175

openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -pkeyopt ec_param_enc:named_curve -out server.key
openssl req -new -key server.key -subj "/CN=103.1.238.175" -config pki.cnf -out server.csr
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 3650 -sha256 -extfile pki.cnf -extensions v3_server -out server.crt

Step 3. Create the device/client certificates

See certs/CERTIFICATE_SETUP.md, step 4 (or certs/generate_ecdsa_certs.ps1).

Step 4. Check the connection

openssl verify -CAfile ca.crt -verify_ip 103.1.238.175 server.crt
openssl s_client -connect 103.1.238.175:2885 -CAfile ca.crt -verify_ip 103.1.238.175 -cert device1.crt -key device1.key
