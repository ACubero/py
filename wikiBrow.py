import webbrowser
url = 'https://repcamp.kriter.net'
webbrowser.register('chrome',None,webbrowser.BackgroundBrowser("C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"))
webbrowser.get('chrome').open(url)