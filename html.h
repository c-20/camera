#define LOG printf

void iconheader() {
  LOG("Content-Type: image/x-icon\r\n");
  LOG("Cache-Control: private, no-cache, no-store, must-revalidate\r\n");
  LOG("\r\n");
}
