#if 0
name=$1
openssl x509 -in $name -text
return
#endif


// openssl req -x509 -sha256 -new -nodes -key rootCAKey.pem -days 3650 -out selfsigned.pem
