#specificHeat2.py
#by Beau VanDenburgh
#float converts
while True:
    try:
        print("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n") #clears screen
        print("what is the unknown?")
        print("1: Mass of substance1")
        print("2: Starting temp of substance1")
        print("3: Specific heat of substance1")
        print("4: Final temp of substance1 and 2")
        selection = int(input("Make a selection: "))

        A,B,C,D,E,F,G = 0,1,2,3,4,5,6

        if selection is not 1:
            A=float(input("What is the mass of subsance1? "))
        if selection is not 2:
            B=float(input("What is the starting temp of subsance1? "))
        if selection is not 3:
            C=float(input("What is the specific heat of subsance1? "))
        D=float(input("What is the mass of subsance2? "))
        E=float(input("What is the starting temp of subsance2? "))
        F=float(input("What is the specific heat of subsance2? "))
        if selection is not 4:
            G=float(input("What is the final temp of both? "))

        print(A);
        print(B);
        print(C);
        print(D);
        print(E);
        print(F);
        print(G);
        print((C*A*B-D*F*E))
        print((C*A-D*F))
        if selection is 1:
            answer = str(-1*(D*F*(G-E))/(C*(G-B)))
            print("The mass of substance1 is: "+answer)
        if selection is 2:
            answer = str(G-(D*F*(G+E))/(C*A))
            print("The starting temp of substance1 is: "+answer)
        if selection is 3:
            answer = str((D*F*(G-E))/(A*(G-B)))
            print("the specific heat of substance1 is: "+answer)
        if selection is 4:
            answer = str((C*A*B+D*F*E)/(C*A+D*F))
            print("the final temp of both substances is: "+answer)
        input("Press enter twice to restart")
        input("")
    except:
        input("ERROR! press enter twice to restart")
        input("")
