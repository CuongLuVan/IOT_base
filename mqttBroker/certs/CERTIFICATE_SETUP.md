# MQTT client Certificate Setup


  Step 1:

  openssl genpkey  -algorithm RSA -out iot_ai_control.key -pkeyopt rsa_keygen_bits:2048
  openssl req -new -key iot_ai_control.key -out iot_ai_control.csr  -subj "/CN=iot_ai_control"


@"
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature
extendedKeyUsage=clientAuth
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid,issuer
"@ | Set-Content -Encoding ascii "iot_ai_control.cnf"


openssl x509 -req  -in iot_ai_control.csr  -CA ca.crt  -CAkey ca.key  -CAcreateserial   -out iot_ai_control.crt -days 3650   -sha256  -extfile iot_ai_control.cnf

step 4: đăng ký tại 
openssl x509 -in iot_ai_control.crt -noout -subject -fingerprint -sha256 -serial
subject=CN=iot_ai_control
sha256 Fingerprint=EB:6D:CC:04:37:E3:B4:31:31:BB:0E:18:4E:B7:DA:0C:34:96:A9:B7:2B:6A:04:78:2A:87:74:31:7B:1B:94:82
serial=50496C77108D2BC40F7E550234290A64D7E0E1BE

đăng ký  Fingerprint vào  mqtt_device_certs.json

step 5 điền thông tin vào 
mqtt_device_certs.json
{
      "clientId": "iot_ai_control",
      "fingerprint256": "36:A1:5F:EB:31:F9:9F:11:FC:DD:11:9F:E6:07:47:0B:FC:AB:04:D4:F8:39:09:36:9D:77:D9:A6:64:F6:7A:6D"
    }
step 6  thêm vào mqtt_message_auth.json
Step 7: bổ xung mqtt_client_ids.js
step 8 bổ xung mqtt_users.json
step 9 mqtt_acl.json





	
	
