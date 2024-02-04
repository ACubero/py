# Import package
import wikipedia
import re
import os

# Specify the title of the Wikipedia page
wikipedia.set_lang("es")
termino = "Parlamento de Budapest";
mipagina = "Parlamento de Budapest"
wiki = wikipedia.page(termino)
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

text = text.replace('[cita requerida]','')
text = text.replace('/km²',' por kilómetro cuadrado')
text = text.replace('km²','kilómetro cuadrado')
text = text.replace('m²','metros cuadrados')
text = text.replace('=','')

#print(textformateado)
s1 = "c:/tmp/"
s2 = ".txt"
nombrefichero = "".join([s1,termino,s2])
file = open(nombrefichero, "w",encoding="utf-8")
file.write(text)
file.close()

text = text.replace('\n','</p>\n<br>\n<p>')
text = "<html>\n<head>\n</head>\n<body>\n<p>\n"+text
text = text + "</p>\n<br>\n"
text = text + "</body>\n</html>\n"
s1 = "c:/tmp/"
s2 = ".html"
nombrefichero = "".join([s1,termino,s2])
file = open(nombrefichero, "w",encoding="utf-8")
file.write(text)
file.close()
