from __future__ import annotations

import json
import tempfile
import threading
import unittest
from http.client import HTTPConnection

from agent.tonypi_agent.server import Agent, AgentHttpServer


class AgentHttpServerTests(unittest.TestCase):
    def test_health_and_authenticated_call(self):
        with tempfile.TemporaryDirectory() as directory:
            server = AgentHttpServer(("127.0.0.1", 0), Agent(directory, token="secret"))
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                host, port = server.server_address
                connection = HTTPConnection(host, port, timeout=3)
                connection.request("GET", "/api/health")
                health = json.loads(connection.getresponse().read())
                self.assertTrue(health["ok"])

                body = json.dumps({"method": "ping", "params": {}, "token": "secret"})
                connection.request("POST", "/api/call", body, {"Content-Type": "application/json"})
                response = json.loads(connection.getresponse().read())
                self.assertTrue(response["ok"])
                self.assertEqual(response["result"]["agent"], "tonypi-action-editor")
                connection.close()
            finally:
                server.shutdown()
                server.server_close()


if __name__ == "__main__":
    unittest.main()
