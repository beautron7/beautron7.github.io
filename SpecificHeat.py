#specific heat calculator
print("What is the unknown?")
print("0: Specific heat of object (joules / (grams*Celcius))")
print("1: Temp Change of object")
print("2: Mass of object")
print("3: total energy used")
selection = int(input("What option do you want"));
parameters = list()
if selection is not 0:
    parameters[0]=input("What is the Specific heat of object (j / (g*C))")
if selection is not 1:
    parameters[1]=input("What is the Temp Change of object")
if selection is not 2:
    parameters[2]=input("What is the Mass of object")
if selection is not 3:
    parameters[3]=input("What is the total energy used")
if selection is 0:
    answer = str(parameters[3]/(parameters[2]*parameters[1]))
    print("The Specific heat of object is "+answer+" (j / (g*C))")
if selection is 1:
    answer = str(parameters[3]/(parameters[2]*parameters[0]))
    print("The Temp Change of object is "+answer+"degrees celcius")
if selection is 2:
    answer = str(parameters[3]/(parameters[1]*parameters[0]))
    print("The Mass of object is "+answer+" grams")
if selection is 3:
    answer = str(parameters[0]*parameters[1]*parameters[2])
    print("The total energy used is "+answer+" joules")
