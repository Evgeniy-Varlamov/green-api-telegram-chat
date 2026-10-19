# Mock GREEN-API для E2E: очередь уведомлений, long polling, статистика.
import json, re, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

lock = threading.Condition()
queue, sent, reads = [], [], []
stats = {'inflight': 0, 'maxInflight': 0, 'receiveCalls': 0, 'receipt': 0}

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _send(self, body, status=200):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,DELETE,PUT')
        self.send_header('Access-Control-Allow-Headers', 'content-type')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        try: self.wfile.write(data)
        except BrokenPipeError: pass
    def _body(self):
        n = int(self.headers.get('Content-Length') or 0)
        return json.loads(self.rfile.read(n) or b'null')
    def do_OPTIONS(self): self._send({})
    def route(self):
        if self.path == '/_push':
            with lock:
                stats['receipt'] += 1
                queue.append({'receiptId': stats['receipt'], 'body': self._body()})
                lock.notify_all()
            return self._send({'ok': True})
        if self.path == '/_stats':
            with lock: return self._send({**stats, 'queue': len(queue), 'sent': sent, 'reads': reads})
        m = re.match(r'/waInstance\d+/(\w+)/([^/?]+)', self.path)
        if not m: return self._send({}, 404)
        method, token = m.groups()
        if token == 'bad': return self._send({}, 401)
        if method == 'getStateInstance': return self._send({'stateInstance': 'authorized'})
        if method == 'getSettings': return self._send({'webhookUrl': '', 'incomingWebhook': 'yes'})
        if method == 'readChat':
            reads.append(self._body()['chatId']); return self._send({'setRead': True})
        if method == 'checkAccount':
            phone = str(self._body()['phoneNumber'])
            if phone == '79990000000': return self._send({'exist': False, 'chatId': ''})
            return self._send({'exist': True, 'chatId': 'c' + phone, 'username': '@user' + phone[-2:]})
        if method == 'sendMessage':
            body = self._body(); sent.append(body)
            return self._send({'idMessage': 'srv-%d' % len(sent)})
        if method == 'deleteNotification':
            rid = int(self.path.rstrip('/').split('/')[-1])
            with lock: queue[:] = [q for q in queue if q['receiptId'] != rid]
            return self._send({'result': True})
        if method == 'receiveNotification':
            with lock:
                stats['receiveCalls'] += 1
                stats['inflight'] += 1
                stats['maxInflight'] = max(stats['maxInflight'], stats['inflight'])
                end = time.time() + 20
                while not queue and time.time() < end: lock.wait(end - time.time())
                item = queue[0] if queue else None
                stats['inflight'] -= 1
            return self._send(item)
        return self._send({}, 404)
    do_GET = do_POST = do_DELETE = route

ThreadingHTTPServer(('127.0.0.1', 8766), H).serve_forever()
