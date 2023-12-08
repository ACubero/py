import webbrowser
import time
import datetime
i=1
hoy = datetime.date.today()
dia = hoy.weekday()

for i in range(0,6):
    if dia == 0: #lunes
        texto = "cuántas veces aparece el número "+str(i)+" en el número pi"
    if dia == 1: #martes
        texto = "cuántos milímetros hay en "+str(i)+" metro"
    if dia == 2: #miércoles
        texto = "cuántos segundos hay en "+str(i)+" hora"
    if dia == 3: #jueves
        texto = "cuántos centilítros hay en "+str(i)+" litro"
    if dia == 4: #viernes
        texto = "cuál es la raíz cuadrada del número "+str(i)
    if dia == 5: #sábado
        texto = "cuál es el resultado de multiplicar "+str(i)+" x "+str(i)
    if dia == 6: #domingo
        texto = "cuál es el resultado de dividir "+str(i)+" entre "+str(i)
    url = "https://www.bing.com/search?q="+texto
    webbrowser.get("windows-default").open(url)
    time.sleep(10)