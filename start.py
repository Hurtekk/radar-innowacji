import signal
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent
children = []
if sys.version_info < (3, 10):
    raise SystemExit('Radar wymaga Pythona 3.10 lub nowszego.')
initialization = subprocess.run([sys.executable, str(root / 'radar.py'), 'init'])
if initialization.returncode:
    raise SystemExit(initialization.returncode)


def stop(*_):
    for child in children:
        child.terminate()
    for child in children:
        child.wait()
    sys.exit(0)


signal.signal(signal.SIGINT, stop)
signal.signal(signal.SIGTERM, stop)
try:
    for command in ('worker', 'serve'):
        children.append(subprocess.Popen([sys.executable, '-u', str(root / 'radar.py'), command]+sys.argv[1:]))
    while True:
        for child in children:
            try:
                code = child.wait(timeout=1)
                print('Proces Radaru zakończył się. Przyczyna jest wypisana powyżej.', file=sys.stderr)
                raise SystemExit(code or 1)
            except subprocess.TimeoutExpired:
                pass
finally:
    for child in children:
        child.terminate()
    for child in children:
        child.wait()
