import requests
from bs4 import BeautifulSoup
import pandas as pd
from time import sleep

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0',
    'Accept-Language': 'en-US, en;q=0.5'
}

category = "Linternas"
search_query = 'linterna'.replace(' ', '+')
base_url = 'https://www.amazon.es/s?k={0}'.format(search_query)
print(base_url)
items = []
for i in range(1, 3):
    print('Processing {0}...'.format(base_url + '&page={0}'.format(i)))
    response = requests.get(base_url + '&page={0}'.format(i), headers=headers)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    results = soup.find_all('div', {'class': 's-result-item', 'data-component-type': 's-search-result'})
#
    for result in results:
        product_name = result.h2.text

        try:
            imagen = result.img.attrs['srcset']
            imagen = imagen.replace(' 1x','')
            imagen = imagen.replace(' 1.5x','')
            imagen = imagen.replace(' 2x','')
            imagen = imagen.replace(' 2.5x','')
            imagen = imagen.replace(' 3x','')
            fin = imagen.index(',')
            imagen = imagen[0:fin]
        except AttributeError:
            continue

        try:
            rating = result.find('i', {'class': 'a-icon'}).text
            rating_count = result.find('span', {'class': 'a-size-base','class':'s-underline-text'}).text 
            
        except AttributeError:
            continue

        #try:
            #descripcion = result.find('span', {'class': 'a-truncate-full','class':'a-offscreen'}).text
            #description1 = result.find_all('div', {'class':'a-spacing-small','class':'s-padding-left-small','class':'s-padding-right-small','class': 'a-section'})[0].text
             #  
            #descripcion = result.find('span',{'data-a-word-break':'normal'})
            #print(descripcion)
        #except AttributeError:
        #    print(AttributeError)
        #    continue

        try:
            price1 = result.find('span', {'class': 'a-price-whole'}).text
            price1 = price1.replace('.','')
            price1 = price1.replace(',','.')
            price = price1
            product_url = 'https://amazon.es' + result.h2.a['href']+'&tag=alexcuar02-21&language=es_ES&ref_=as_li_ss_tl'

            if not 'Redirect.html' in product_url:
                items.append([product_name, price, rating, rating_count,  product_url, imagen,category])
        except AttributeError:
            print(AttributeError)
            continue
    sleep(1.5)
    
df = pd.DataFrame(items, columns=['Name', 'Price', 'Rating', 'Rating count','Product url','Image','Category'])
df.to_csv('{0}.csv'.format(search_query), index=False)
