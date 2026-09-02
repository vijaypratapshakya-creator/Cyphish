@echo off
REM CyPhish - Self-Signed SSL Certificate Generator for Windows
setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set ROOT_DIR=%SCRIPT_DIR%..
set SSL_DIR=%ROOT_DIR%\ssl
set TARGET_HOST=%1
if "%TARGET_HOST%"=="" set TARGET_HOST=192.168.88.11

if not exist "%SSL_DIR%" mkdir "%SSL_DIR%"

echo ==============================================
echo Generating SSL Certificate for CyPhish
echo Target Host / IP: %TARGET_HOST%
echo Output Directory: %SSL_DIR%
echo ==============================================

set CONFIG_FILE=%SSL_DIR%\openssl-san.cnf

(
echo [req]
echo default_bits = 2048
echo prompt = no
echo default_md = sha256
echo distinguished_name = req_distinguished_name
echo x509_extensions = v3_req
echo.
echo [req_distinguished_name]
echo C = US
echo ST = Security
echo L = Cybersecurity
echo O = CyPhish
echo OU = Awareness
echo CN = %TARGET_HOST%
echo.
echo [v3_req]
echo subjectAltName = @alt_names
echo basicConstraints = CA:FALSE
echo keyUsage = nonRepudiation, digitalSignature, keyEncipherment
echo.
echo [alt_names]
echo IP.1 = %TARGET_HOST%
echo IP.2 = 127.0.0.1
echo DNS.1 = localhost
) > "%CONFIG_FILE%"

openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout "%SSL_DIR%\nginx-selfsigned.key" -out "%SSL_DIR%\nginx-selfsigned.crt" -config "%CONFIG_FILE%"

if exist "%CONFIG_FILE%" del "%CONFIG_FILE%"

echo.
echo SSL Certificate created:
echo Key:  %SSL_DIR%\nginx-selfsigned.key
echo Cert: %SSL_DIR%\nginx-selfsigned.crt
echo ==============================================
