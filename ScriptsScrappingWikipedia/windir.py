try:
    import win32api
except ImportError:
    windir = compat.getenv('SystemRoot', compat.getenv('WINDIR'))
else:
    windir = win32api.GetWindowsDirectory()
if not windir:
    raise SystemExit("Error: Can not determine your Windows directory")
print(windir)