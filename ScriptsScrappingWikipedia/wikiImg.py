from PIL import Image

path = 'C:/compartit/WINDOWS/Castillo-buda/'
name = 'KRCAPTURA561'
ext = '.png'
nameimg = path+name+ext
#image = Image.open(nameimg)

#xwidth = 200
#xheight = 200
#new_image = image.thumbnail((width,height))
#namenewfile = pathimg+nameimg+"-"+str(width)+"x"+str(height)+extimg
#
#new_image.save(namenewfile)

def resize_by_percentage(image, outfile, percentage):    
    with Image.open (image) as im:        
        width, height = im.size        
        resized_dimensions = (int(width * percentage), int(height * percentage))
        print (resized_dimensions)        
        resized = im.resize(resized_dimensions)        
        print (outfile)        
        resized.save(outfile)
        
namenewfile = path+"Mini-"+name+ext
resize_by_percentage(nameimg,namenewfile, 0.5)