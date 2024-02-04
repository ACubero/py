# Import package
import wikipedia
import re
import os
import shutil
import sys
import webbrowser
from geopy.geocoders import Nominatim
import time
import math

# Specify the title of the Wikipedia page
wikipedia.set_lang("es")
pathsrc = "c:/tmp/"
country = "españa"
#country = input("Indique el país: ")
#ciudad = input("Indique la ciudad: ")
ciudad = "barcelona"
termino = input("Indique el lugar: ")
terminoorig = termino
#parametros = len(sys.argv)
#if parametros > 1:
#    ciudad = sys.argv[1]
#else:
#    print("No ha indicado una ciudad")
#    exit()

#if parametros > 2:
#    termino = sys.argv[2]
#else:
#    print("No ha indicado un lugar")
#    exit()
    
termino = termino+" "+ciudad
mipagina = termino+" "+ciudad
filename = termino.replace(' ','-')
filename = filename.replace('-'+ciudad,'')
pathdest = "E:/Youtube/"+country+"/"+ciudad+"/"+filename+"/"
filename = country+"-"+ciudad+"-"+filename

isExist = os.path.exists(pathdest)
if not isExist:
   os.makedirs(pathdest)
   print("Se ha creado la carpeta > "+pathdest)
 
print("Buscando en Wikipedia el termino: "+termino)
wiki = wikipedia.page(termino)
url = wiki.url

# Extract the plain text content of the page
text = wiki.content

#text = re.sub(r'==.*?==+', '', text)
i = 1
while i < 100:
    s1 = "["
    s2 = str(i)
    s3 = "]"
    caracteres = "".join([s1,s2,s3])
    text = text.replace(caracteres,'')
    i = i +1
#text = text.replace('\n', '')

print("Reemplanzando carácteres...")
text = text.replace('[cita requerida]','')
text = text.replace('/km²',' por kilómetro cuadrado')
text = text.replace('km²','kilómetro cuadrado')
text = text.replace('m²','metros cuadrados')
text = text.replace('XXI','21')
text = text.replace('XX','20')
text = text.replace('XIX','19')
text = text.replace('XVIII','18')
text = text.replace('XVII','17')
text = text.replace('XVI','16')
text = text.replace('XV','15')
text = text.replace('XIV','14')
text = text.replace('XIII','13')
text = text.replace('XII','12')
#text = text.replace('XI','11')
#text = text.replace('X','décimo')
text = text.replace('IX','noveno')
text = text.replace('VIII','octavo')
text = text.replace('VII','septimo')
#text = text.replace('VI','sexto')
#text = text.replace('V','quinto')
text = text.replace('IV','cuarto')
text = text.replace('III','tercero')
text = text.replace('II','segundo')
text = text.replace(' I ',' primero ')
text = text.replace(' I.',' primero.')
text = text.replace('(I)','(primero)')
text = text.replace('=','')
text = text.replace(' 000','000')
text = text.replace('. ','.\n')
text = text.replace('\t','')
text = text.replace('\n\n','\n')

# Creamos el fichero TXT
ext = ".txt"
filewithpathTXT = "".join([pathsrc,filename+"-TXT",ext])
print("Creando el fichero >> "+filewithpathTXT)
file = open(filewithpathTXT, "w",encoding="utf-8")
file.write(text)
file.close()
print("Fichero "+filewithpathTXT+" creado")

# Copiamos el fichero
filewithpathTXTdest = "".join([pathdest,filename+"-TXT",ext])
print("Moviendo fichero >> "+filewithpathTXT+" a "+filewithpathTXTdest)
shutil.move(filewithpathTXT, filewithpathTXTdest)

## Formateamos el HTML
text = text.replace('\n','</p>\n&nbsp;<br>\n<p>')
text = "<html>\n<head>\n</head>\n<body>\n<p>&nbsp;\n"+text
text = text + "</p>\n<br>\n"
text = text + "</body>\n</html>\n<p>&nbsp;</p><br>"

# Creamos el fichero HTML
ext = ".html"
filewithpathHTML = "".join([pathsrc,filename+"-HTML",ext])
print("Creando el fichero >> "+filewithpathHTML)
file = open(filewithpathHTML, "w",encoding="utf-8")
file.write(text)
file.close()
print("Fichero "+filewithpathHTML+" creado")

filewithpathHTMLdest = "".join([pathdest,filename+"-HTML",ext])
print("Moviendo fichero >> "+filewithpathHTML+" a "+filewithpathHTMLdest)
shutil.move(filewithpathHTML, filewithpathHTMLdest)

# Abrir la URL
# Ruta Chrome PC SOBREMESA
webbrowser.register('chrome',None,webbrowser.BackgroundBrowser("C:/Program Files/Google/Chrome/Application/chrome.exe"))
# Ruta Chrome Portátil
# webbrowser.register('chrome',None,webbrowser.BackgroundBrowser("C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"))
webbrowser.get('chrome').open(url)

# Creamos el fichero URL
## Crear un objeto Nominatim
geo = Nominatim(user_agent="MyApp")

lugar = terminoorig+","+ciudad
loc = geo.geocode(lugar)
try:
    print("Coordenadas: "+loc.latitude,loc.longitude)
    coordenadas = str(loc.latitude)+","+str(loc.longitude)
except:
    print("Coordenadas no localizadas")    
    coordenadas = ""

ext = ".txt"
filewithpathURL = "".join([pathsrc,filename+'-URL',ext])
print("Creando el fichero >> "+filewithpathURL) 
file = open(filewithpathURL, "w",encoding="utf-8")
file.write(coordenadas+","+url+",")
file.close()
print("Fichero "+filewithpathURL +" creado")

# Copiamos el fichero
filewithpathURLdest = "".join([pathdest,filename+'-URL',ext])
print("Moviendo fichero >> "+filewithpathURL +" a "+filewithpathURLdest)
shutil.move(filewithpathURL,filewithpathURLdest)


# 2nd option
#shutil.copy(src, dst)  # dst can be a folder; use shutil.copy2() to preserve timestamp