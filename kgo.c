#if 0
src=kgo.c
out=kgo
gcc -o $out $src
ls -l --color $out
return
#endif

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define IF          if
#define EF          else if
#define EL          else
#define WI          while
#define RT          return
#define BK          break
#define MSG(x)      printf("%s", x)
#define CHR(x)      printf("%c", x)
#define ERR(y, x)   { MSG(x); RT y; }
#define CS          char *
#define CH          char
#define IN          int
//#define PATHPREFIX  "../camera/"
#define PATHPREFIX  "./web-"

#include "html.h"

void sendheader(CS filename) {
  IN filenamelen = strlen(filename);
  CS extension = &filename[filenamelen];
  WI (--extension >= filename) {
    IF (*extension == '.') { BK; }
  }
  IF (*extension == '.') {
    IF (extension == filename) {
      // hidden file
    } EF (0 == strcasecmp(extension, ".ico")) {
      iconheader();
    } EL { } // unrecognised extension
  }

}

int main(int argc, char **argv) {
  IF (argc < 2)             ERR(1, "PARAM")
  CS filename = argv[1];
  IF (filename[0] != '/')   ERR(2, "PREFIX")
  filename = &filename[1];
  CS slashcheck = filename;
  WI (*slashcheck != '\0') {
    IF (*slashcheck == '/') ERR(3, "SLASHCHECK")
    slashcheck++; // ignore escape attempts (\/)
  }
  IN flen = strlen(filename); // if flen == 2, command mode ?
  IF (flen < 1)             ERR(4, "FILENAME")
  CS pathprefix = PATHPREFIX;
  IN pathlen = strlen(pathprefix) + flen;
  CS pathbuf = (CS)malloc(pathlen + 1);
  IF (!pathbuf)             ERR(5, "PATHNAME")
  snprintf(pathbuf, pathlen + 1, "%s%s", pathprefix, filename);
  FILE *f = fopen(pathbuf, "r");
  IF (!f)                   ERR(6, "OPENFAIL")
  sendheader(filename); // attach header
  WI (1) {
    IN inch = fgetc(f);
    IF (inch == EOF) BK;
    CH ch = (CH)inch;
    CHR(ch);
  }
  fclose(f);
  free(pathbuf);
  RT 0;
}
