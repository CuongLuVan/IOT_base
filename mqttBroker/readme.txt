Step 1. creata CA

openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 7650 -out ca.crt -subj "/CN=Local MQTT Test CA"

Step 2. create Server key
openssl genrsa -out server.key 2048

openssl req -new -key server.key -out server.csr -subj "/CN=103.1.238.175"


create server.cnf 
subjectAltName = IP:192.168.1.10,DNS
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

create key

@"
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=@alt_names

[alt_names]
IP.1=103.1.238.175
"@ | Set-Content -Encoding ascii server.ext

openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 7650 -sha256 -extfile server.ext

Step 4 check connect
openssl s_client -connect 103.1.238.175:2885 -CAfile ca.crt -verify_ip 103.1.238.175
