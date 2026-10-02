import os

bind = os.getenv("GUNICORN_BIND", "127.0.0.1:8000")
workers = int(os.getenv("WEB_CONCURRENCY", "8"))
worker_class = "sync"
timeout = 60
graceful_timeout = 30
keepalive = 5
max_requests = 1500
max_requests_jitter = 150
worker_tmp_dir = os.getenv("GUNICORN_WORKER_TMP_DIR", "/dev/shm")
forwarded_allow_ips = os.getenv("GUNICORN_FORWARDER_ALLOW_IPS", "127.0.0.1")
accesslog = "-"
errorlog = "-"
capture_output = True
access_log_format = '%(h)s "%(m)s %(U)s" %(s)s %(L)s'
