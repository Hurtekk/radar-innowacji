import signal
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent
children = []
subprocess.run([sys.executable, str(root / 'radar.py'), 'init'], check=True)


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
                child.wait(timeout=1)
                raise RuntimeError('Proces zakończył się przedwcześnie')
            except subprocess.TimeoutExpired:
                pass
finally:
    for child in children:
        child.terminate()
    for child in children:
        child.wait()
