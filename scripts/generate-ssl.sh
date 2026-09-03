#!/usr/bin/env bash
# CyPhish - Self-Signed SSL Certificate Generator
# Generates a modern self-signed certificate with SAN (Subject Alternative Name) for IP or domain.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SSL_DIR="$ROOT_DIR/ssl"
TARGET_HOST="${1:-192.168.88.11}"

mkdir -p "$SSL_DIR"

echo "=============================================="
echo "Generating SSL Certificate for CyPhish"
echo "Target Host / IP: $TARGET_HOST"
echo "Output Directory: $SSL_DIR"
echo "=============================================="

CONFIG_FILE="$SSL_DIR/openssl-san.cnf"

# Determine if TARGET_HOST is an IP address or domain and write config
if [[ "$TARGET_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
cat > "$CONFIG_FILE" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = req_distinguished_name
x509_extensions = v3_req

[req_distinguished_name]
C = US
ST = Security
L = Cybersecurity
O = CyPhish
OU = Awareness
CN = $TARGET_HOST

[v3_req]
subjectAltName = @alt_names
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment

[alt_names]
IP.1 = $TARGET_HOST
IP.2 = 127.0.0.1
DNS.1 = localhost
EOF
else
cat > "$CONFIG_FILE" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = req_distinguished_name
x509_extensions = v3_req

[req_distinguished_name]
C = US
ST = Security
L = Cybersecurity
O = CyPhish
OU = Awareness
CN = $TARGET_HOST

[v3_req]
subjectAltName = @alt_names
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment

[alt_names]
DNS.1 = $TARGET_HOST
DNS.2 = localhost
IP.1 = 127.0.0.1
EOF
fi

openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout "$SSL_DIR/nginx-selfsigned.key" \
  -out "$SSL_DIR/nginx-selfsigned.crt" \
  -config "$CONFIG_FILE"

rm -f "$CONFIG_FILE"

echo ""
echo "✅ SSL Certificate successfully created:"
echo "   Key:  $SSL_DIR/nginx-selfsigned.key"
echo "   Cert: $SSL_DIR/nginx-selfsigned.crt"
echo "=============================================="
