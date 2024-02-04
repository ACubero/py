import os

#country = input("Pais: ")

#if country == "":
#    print("No ha indicado un pais")
#    exit()

#city = input("Ciudad: ")
#if city == "":
#    print("No ha indicado una ciudad")
#    exit()
i = 1
while i < 100:  
    place = input("Lugar: ")
    if place == "":
        print("No ha indicado una lugar")
        exit()
    
    country = "austria"
    city = "praga"
    #place = "catedral-notre-dame"
    path = "E:/Youtube/"+country+"/"+city+"/"+place
    print(path)
    files = os.listdir(path)
    print(files)
    filenamedest = country+"-"+city+"-"+place

    for index, file in enumerate(files):
        split_tup = os.path.splitext(file)
        file_name = split_tup[0]
        file_extension = split_tup[1]
        if file_extension == ".jpg" or file_extension == ".jpge":
            
            #print (split_tup)
            #print(path+filenamedest+file_extension)

            filedest = os.path.join(path,filenamedest+file_extension)
            print("Destino > "+filedest)
            isExist = os.path.isfile(filedest)
            if isExist:
                print("Fichero existe > "+filedest)
                filedest = os.path.join(path,filenamedest+"-"+str(index)+file_extension)
                print("Nuevo fichero > "+filedest)

            # Renombrar    
            os.rename(os.path.join(path, file), filedest)
    i +=1
    