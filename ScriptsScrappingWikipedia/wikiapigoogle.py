import requests

# Insertar su clave de API de Google Maps aquí
api_key = 'AIzaSyBOHBpCDfrtkSHS0Abz_rkfvo9y9TheBhw'

# Dirección de la ciudad que desea buscar
city = 'Casa Municipal, praga'

# Hacer una solicitud a la API de Google Maps
url = f'https://maps.googleapis.com/maps/api/geocode/json?address={city}&key={api_key}'
response = requests.get(url)

# Verificar que la respuesta JSON tenga al menos un resultado
if len(response.json()['results']) > 0:
    # Obtener la información de la ubicación de la respuesta JSON
    location_info = response.json()['results'][0]['geometry']['location']
    latitude = location_info['lat']
    longitude = location_info['lng']
    
    # Imprimir las coordenadas de la ciudad
    print(f'Las coordenadas de {city} son: ({latitude}, {longitude})')
    print(f'La URL es = https://maps.google.com/maps?z=12&t=m&q=loc:{latitude},{longitude}')
else:
    print(f'No se pudo encontrar la ubicación de {city}.')
