#if 0
. isrunning.gcc
return
#endif

// . isrunning.h.cc to make ./isrunning external program, or
// #include "isrunning.h.cc" to include isrunning() function call

#include <iostream>

#include <curl/curl.h>

using namespace std;

#include "runport.h"

static const char *isrunningcheckurl = (const char *)ISRUNNINGCHECKURL;
static char curlerror[CURL_ERROR_SIZE];
static string curlbuffer;

static int curlwrite(char *data, size_t size, size_t nmemb, string *wdata) {
  if (wdata == NULL) { return 0; }
  wdata->append(data, size * nmemb);
  return size * nmemb;
}

static bool curltryinit(CURL *&conn) {
  if (conn == NULL) {
    cout << "curl init fail\n";
//    exit(EXIT_FAILURE);
    return false;
  } else { return true; }
}

static bool curltryopt(CURLcode code) {
  if (code != CURLE_OK) {
    cout << "curl opt fail\n";
    // note error message is probably in curlerror
//    exit(EXIT_FAILURE);
    return false;
  } else { return true; }
}

static bool curlinit(CURL *&conn, const char *url) {
  if (!curltryinit(conn = curl_easy_init()))
    { return false; }
  if (!curltryopt(curl_easy_setopt(conn, CURLOPT_ERRORBUFFER, curlerror)))
    { return false; }
  if (!curltryopt(curl_easy_setopt(conn, CURLOPT_URL, url)))
    { return false; }
  if (!curltryopt(curl_easy_setopt(conn, CURLOPT_FOLLOWLOCATION, 1L)))
    { return false; }
  if (!curltryopt(curl_easy_setopt(conn, CURLOPT_WRITEFUNCTION, curlwrite)))
    { return false; }
  if (!curltryopt(curl_easy_setopt(conn, CURLOPT_WRITEDATA, &curlbuffer)))
    { return false; }
  return true;
}

static bool curldo(CURL *&conn) {
  if (!conn) { return false; } // expected earlier fail~!
  CURLcode code = curl_easy_perform(conn);
  curl_easy_cleanup(conn);
  if (code != CURLE_OK) {
    if (code == 7) {
       // expected failure = connection refused
    } else {
      cout << "curl do fail: " << code << "\n";
    }
//    exit(EXIT_FAILURE);
    return false;
  } else { return true; }
}


#ifdef ISRUNNINGMAIN

int main(int argc, char **argv) {
  CURL *conn = NULL;
  curl_global_init(CURL_GLOBAL_DEFAULT);
  if (curlinit(conn, isrunningcheckurl)) {
    if (curldo(conn)) {
      cout << ISRUNNINGYES "\n";
    } else {
      cout << ISRUNNINGNO "\n";
    }
  } else {
    cout << "CURLFAIL\n";
  }
  return 0;
}

#endif

static bool isrunning() {
  CURL *conn = NULL;
  curl_global_init(CURL_GLOBAL_DEFAULT);
  if (curlinit(conn, isrunningcheckurl)) {
    if (curldo(conn)) {
      return true;
    } else {
      return false;
    }
  } else {
    cout << "CURLFAIL\n";
    return false;
  }
}
