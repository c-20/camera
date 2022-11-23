#if 0
src=run.cc
out=run
gcc=g++
libs="-lmicrohttpd -lcurl"
$gcc -o $out $src $libs
ls -l --color=yes $out
return
#endif

#include <stdio.h>
#include <stdlib.h>

#include <string.h> // required for strlen

#include <iostream>
#include <string>
#include <vector>
#include <map>

#include <sys/types.h>
#include <sys/select.h>
#include <sys/socket.h>
#include <microhttpd.h>

using namespace std;

//#define Rcommand  "./R"
//#define PORT      4379

//#define RUNBUFFERLEN  16
//static char RUNBUFFER[RUNBUFFERLEN]; // fails on long directories !
static string runbuffer = "";
static string runpath = "";

#include "runport.h"

static bool SETRUNBUFFER(string cmd, string run) {
  runbuffer += cmd;
  int ebstix = runbuffer.length() - 1;
  if (runbuffer.at(ebstix) == '.' &&
      (ebstix == 0 || runbuffer.at(ebstix - 1) == '/')) {
    // it's important to note that a cmd ending in /. can be concatenated
    // with the run command ./dash to create /../dash, thereby allowing
    // a command in the parent directory to be run. this is unsafe!
    // but then maybe extracting the path for local context is too.
    return false;
  } else if (runbuffer.at(ebstix) == '/') {
    // cmd string ends with a /
    cout << "running a directory was presumed impossible\n";
  } else {
    // find path component end
    bool hasspacesincmdname = false;
    bool hasspacesincmdpath = false; // currently not checked !!
    int pcestix = ebstix;
    while (pcestix >= 0 && runbuffer.at(pcestix) != '/') {
      // first iteration should be true (not /) as per earlier condition
      if (runbuffer.at(pcestix) == ' ') { hasspacesincmdname = true; }
      pcestix--;
    }
    if (pcestix < 0) {
      cout << "no path component found; it is required\n";
      // todo: check $PATH to identify? use which ? (if no spaces)
      return false;
    } else if (runbuffer.at(pcestix) != '/') {
      cout << "this condition should not be true; expected a /\n";
      return false;
    } else {
      runpath = runbuffer.substr(0, pcestix);
//      cout << "RUNPATH: " << runpath << "\n";
      // todo: expect ./ prefix if only local commands are allowed?
      runbuffer = runpath.append("/" + run);
//      cout << "RUNBUFFER: " << runbuffer << "\n";
      return true;
    }
  }
  return false; // failed to fail to fail
}
/*
static bool ADDRUNPARAM(string param) {
  if (runpath.length()) {
    runpath = runpath.append(" " + param);
    return true;
  } else {
    cout << "cannot add param without a command\n";
    // todo: make sure command isn't all spaces? check for validity?
    return false;
  }
}
*/ // run params are added later with each instantiation
//#define CHECKCOMMAND "./isrunning"
// ^ using internal function call but external programs should be considered

#include "isrunning.h.cc"
static bool checkcommand() {
  return isrunning();
}
//#define checkcommand isrunning

#define FAILPAGEHTML  \
  "<html><head><title>fail</title></head>" \
    "<body>failed.</body></html>";

#define RT  return       // RETURNTOCALLINGFUNCTION
#define SI  int          // INTEGER (SIGNED)
#define ST  static
#define VD  void
#define VP  void *       // VOIDPOINTER
#define VPP void **      // VOIDPOINTERPOINTER
#define CH  char
#define CS  CH *
#define CCS const CH * // CONSTCHARSTRING
#define SIZEP size_t *   // SIZEPOINTER
#define DEMON struct MHD_Daemon *     // THE DAEMON
#define DATAP struct MHD_Connection * // THE CONNECTION
#define RESPP struct MHD_Response *   // THE RESPONSE
#define RESUP enum MHD_Result         // THE RESULT
#define LOG printf       // LOGMESSAGE
#define IF if            // CONDITION


RESUP geturlargs(VP cls, MHD_ValueKind kind, CCS key, CCS value) {
//  vector<pair<string, string>> *urlargs = static_cast<vector<pair<string, string>> *>(cls);
  map<string, string> *urlargs = static_cast<map<string, string> *>(cls);
  if (!value) { // this indicates no = ... maybe more than one?
    SI fileindex = 1;
    string filekey = ":file";
    string newkey = filekey + to_string(fileindex);
    while (urlargs->find(newkey) != urlargs->end())
      { newkey = filekey + to_string(++fileindex); }
    (*urlargs)[newkey] = key;
  } else if (urlargs->find(key) == urlargs->end()) {
    (*urlargs)[key] = value;
  } else {
    (*urlargs)[key] = "";
  }
  RT MHD_YES;
}

SI geturlgetargs(DATAP connection, MHD_KeyValueIterator iterator, VP itercls) {
  enum MHD_ValueKind kind = MHD_GET_ARGUMENT_KIND;
  SI ret = MHD_get_connection_values(connection, kind, iterator, itercls);
  RT (ret >= 0) ? 1 : 0; // true on success, false on fail
}

string commandresult(string cmd) {
  string response = "";
//  cmd.append(" 2>&1");
  const char *cmdstr = cmd.c_str();
//  cout << "CMDSTR: " << cmdstr << "\n";
  FILE *stream = popen(cmdstr, "r");
  if (!stream) { RT "commandresult fail\n"; }
  while (1) { // !feof(stream)) {
    SI fchint = fgetc(stream);
    if (fchint == EOF) { break; } // shouldn't happen .. actually ..
    CH fch = (char)fchint;
    response += fch;
  }
  pclose(stream);
  return response; // returning a local string variable seems to be ok ...?
}

RESUP sendfail(DATAP connection) {
  CS failpage = (CS)FAILPAGEHTML;
  RESPP response = MHD_create_response_from_buffer(strlen(failpage), failpage, MHD_RESPMEM_PERSISTENT);
  if (!response) { RT MHD_NO; } // cannot create response
  RESUP retval = MHD_queue_response(connection, MHD_HTTP_OK, response);
  MHD_destroy_response(response);
  RT retval;
}

RESUP answercall(VP cls, DATAP connection, CCS url, CCS method, CCS version, CCS data, SIZEP datasize, VPP concls) {
// todo: check if method is GET or POST
// 
//  CS page = (CS)malloc(100);

//  static int aptr;
//  if (&aptr != *concls) {
//    *ptr = &concls;
//    cout << "CONCLSEXIT\n";
//    return MHD_YES;
//  } // ignore followup requests ......? seems it'll first reply blank
// ^ something to prevent broken connections? set *ptr = NULL; when done
  // required $0 (argv[0]) so have to build in main
  string cmd = "" + runbuffer; //RUNBUFFER; //RUNCOMMAND;
//  cout << "CMD: " << cmd << "\n";
  map<string, string> getmap;
//  cout << "TEST A\n";
  if (!geturlgetargs(connection, geturlargs, &getmap))
    { RT sendfail(connection); }
//  cout << "TEST B\n";
  map<string, string>::iterator getit = getmap.begin();
  while (getit != getmap.end()) {
    string key = getit->first;
    string value = getit->second;
    if (key.at(0) == ':') {
//      cmd = cmd + " [" + value + "]";
    // consider unicode keys ?
    } else { // key-value pairs are for parameters
      cout << "PARAM: " << key << ": " << value << "\n";
    }
    getit++;
  }
  // check url first?
  cmd = cmd + " " + url;
  string src = commandresult(cmd); // ./");
//  cout << "RESULTPAGE: " << src << "\n";
  cout << "[" << method << " " << url << "]";
  cout << "+[" << *datasize << "]";
  cout << " -> " << cmd;
  cout << " returned " << src.length() << " bytes.\n";
//  map <string, string, noordering> headers;
  vector<pair<string, string>> headers;
  string linedelim = "\r\n";
  string pairdelim = ": ";
  size_t pos = 0;
  string token;
  while ((pos = src.find(linedelim)) != string::npos) {
    token = src.substr(0, pos);
    size_t splitpos = token.find(pairdelim);
    if (splitpos != string::npos) {
      string tokenname = token.substr(0, splitpos);
      string tokenvalue = token.substr(tokenname.length() + pairdelim.length());
      headers.push_back(make_pair(tokenname, tokenvalue));
    } else if (token.length() == 0) {
      //cout << "BLANKHEADERLINE\n";
      break; // end of header in case binary contains \r\n in data !
    } else {
      cout << "INVALIDTOKENORrnINFILE\n";
      break;
    }
    src.erase(0, pos + linedelim.length());
  }
//  cout << "PAGE: " << src << "\n";

  CCS srcpage = src.c_str();
  SI srcpagelen = src.length();
//  cout << "SRCPAGE: " << srcpage << "\n";
//  SI pagelen = strlen(srcpage);
//  cout << "SRCPAGELEN: " << srcpagelen << "\n";
  VP page = (VP)srcpage;
  enum MHD_ResponseMemoryMode memmode = MHD_RESPMEM_MUST_COPY;
  RESPP response = MHD_create_response_from_buffer(srcpagelen, page, memmode);

  vector<pair<string, string>>::iterator rh = headers.begin();
  while (rh != headers.end()) {
    cout << "HEADER: " << rh->first << " = " << rh->second << "\n";
    MHD_add_response_header(response, rh->first.c_str(), rh->second.c_str());
    rh++;
  }
//  MHD_add_response_header(response, "Content-Type",  "text/html; charset=utf-8");
//  MHD_add_response_header(response, "Cache-Control", "max-age=0, must-revalidate");
  RESUP retval = MHD_queue_response(connection, MHD_HTTP_OK, response);
  MHD_destroy_response(response);
//  free(page);
  RT retval;
}

#include "key-gen.h"
#define KEYFILENAME  keyfilename
#define PEMFILENAME  pemfilename
#define KEYCERT      MHD_OPTION_HTTPS_MEM_KEY, keyfile
#define PEMCERT      MHD_OPTION_HTTPS_MEM_CERT, pemfile
#define RUNSECURELY  KEYCERT, PEMCERT
#define POLLSECURELY MHD_USE_INTERNAL_POLLING_THREAD | MHD_USE_SSL


SI main(SI argc, CS *argv) {
  if (checkcommand()) {
    cout << "apparently the daemon is already running\n";
    RT 1; // error code #1
  }
  CS keyfile = loadfile(KEYFILENAME);
  if (!keyfile) { cout << "keyfile error\n"; RT 3; }
  CS pemfile = loadfile(PEMFILENAME);
  if (!pemfile) { cout << "pemfile error\n"; RT 4; }
  string dollarzero(argv[0]);
//  if (!SETRUNBUFFER(strinargv[0], RUNCOMMAND)) {
  if (!SETRUNBUFFER(dollarzero, RUNCOMMAND)) {
    cout << "failed to build cmd path\n";
//    RT sendfail(connection);
    RT 2; // error code #2
  } else if (!runpath.length()) {
    cout << "run path was expected... check using /which/ command?\n";
    RT 2;
  }
//  if (!ADDRUNPARAM(
  DEMON daemon = MHD_start_daemon(POLLSECURELY,
    RUNPORT, NULL, NULL, &answercall, NULL,
    RUNSECURELY, MHD_OPTION_END);
  IF (!daemon) {
    LOG("daemon fail!\n");
    free(keyfile);
    free(pemfile);
    RT 1;
  }
  cout << "SECURED BY: " KEYFILENAME ", " PEMFILENAME "\n";
  cout << "DAEMON BUFFER: " << runbuffer << " UNTIL KEYPRESS\n";
#define RUNKGOFILE "run.kgo"
  FILE *kgo = fopen(RUNKGOFILE, "w");
  if (!kgo) {
    cout << "RUNKGOFILE " RUNKGOFILE " write failed\n";
  } else {
    cout << "delete " RUNKGOFILE " to stop\n";
    while (1) {
      FILE *test = fopen("run.kgo", "r");
      if (!test) { break; }
      fclose(test);
      usleep(200000);
    }
  }
  //getchar();
  cout << "daemon stopped\n";
  MHD_stop_daemon(daemon);
  free(keyfile);
  free(pemfile);
  RT 0;
}
