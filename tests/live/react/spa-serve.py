# The React app's static server for the checks: lib/serve.py's server (1024-deep queue, keep-alive) serving app/dist, with Render's rewrite:
# a path that is no file in dist gets index.html (status 200), as the "/* -> /index.html" rewrite does on Render. A missing /assets/ file
# still gets 404, so a broken build shows as a failed request instead of a page.
# usage: python spa-serve.py <port> <dist dir>
import functools, http.server, os, sys
class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 1024
    daemon_threads = True
class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    def log_message(self, *a): pass
    def send_head(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path) and not self.path.startswith("/assets/"):
            self.path = "/index.html"
        return super().send_head()
port, d = int(sys.argv[1]), sys.argv[2]
Server(("127.0.0.1", port), functools.partial(Handler, directory=d)).serve_forever()
