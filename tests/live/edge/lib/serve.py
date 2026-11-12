# The Edge checks' static server: `python -m http.server <port> --bind 127.0.0.1 --directory <dir>` (the same handler, so the same bytes,
# headers and MIME types) with two changes, both about connections, not content:
#  1. a listen backlog of 1024 instead of socketserver's 5. A page asks for ~60 css and js files at once; with 5, extra connections were
#     refused (net::ERR_CONNECTION_REFUSED) on a busy machine, and the shot showed a page without some css or without app.js.
#  2. HTTP/1.1 keep-alive instead of HTTP/1.0 (a new TCP connection per file). One full pass of the area map makes tens of thousands of
#     requests; each closed connection holds a local port for about 2 minutes (TIME_WAIT), and Windows has about 16,000, so a long run
#     ran out: net::ERR_ADDRESS_IN_USE, shots missing files, workers crashing. With keep-alive a page reuses a few connections.
# Found in the Tooling speedup round (2026-11-11); every round's Edge check used `python -m http.server`.
# usage: python serve.py <port> <dir>
import functools, http.server, sys
class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 1024
    daemon_threads = True
class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"   # files go out with Content-Length (the handler always sends it), so the connection can stay open
    def log_message(self, *a): pass
port, d = int(sys.argv[1]), sys.argv[2]
Server(("127.0.0.1", port), functools.partial(Handler, directory=d)).serve_forever()
