#if 0
keyfile=key-kgo.key
keybits=1024
keyreq=openssl\ genrsa\ -out
pemfile=key-kgo.pem
pemdays=-days\ 365
pemtype=-new\ -x509
pemkey=-key\ $keyfile
pemreq=openssl\ req\ $pemdays\ -out
$keyreq $keyfile $keybits
$pemreq $pemfile $pemtype $pemkey
ls -l --color=yes $keyfile $pemfile
echo '#define keyfile "key-kgo.key"'
echo '#define pemfile "key-kgo.pem"'
return
#endif

#define keyfilename "key-kgo.key"
#define pemfilename "key-kgo.pem"

static long getfilesize(const char *filename) {
  FILE *fp = fopen(filename, "rb");
  if (!fp) { return 0; }
  long size;
  if (   (0 != fseek(fp, 0, SEEK_END))
      || (-1 == (size = ftell(fp)))   ) {
    size = 0; // -1 size becomes 0 size
  }
  fclose(fp);
  return size;
}

static char *loadfile(const char *filename) {
  long size = getfilesize(filename);
  if (0 == size) { return NULL; }
  FILE *fp = fopen(filename, "rb");
  if (!fp)       { return NULL; }
  char *buffer = (char *)malloc(size + 1);
  if (!buffer) { fclose(fp); return NULL; }
  buffer[size] = '\0';
  if (size != (long)fread(buffer, 1, size, fp)) {
    free(buffer);
    buffer = NULL;
  }
  fclose(fp);
  return buffer;
}
