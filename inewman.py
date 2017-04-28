#VERSION: 0.9.0

try:
    import sys
    if sys.version[0]!="3":
        print("Python 3 is required for this program to run. try 'python3 main.py', and if that fails,")
    import requests
    import re
    import json
    import pickle
    import time
    import datetime
    import dateparser
    import logging
    import getpass
    from chromote import Chromote
except ModuleNotFoundError as e :
    missing_module = str(e)[17:-1]
    print("The program cannot run because the \"{x}\" module is missing from your computer.\nTo fix this, press windows + r and type 'pip install {x}', then press enter\nAfter this, restart the program\n\n".format(x=missing_module))
    raise SystemExit

LOG_FILENAME = 'dump.log'
logging.basicConfig(filename=LOG_FILENAME, level=logging.DEBUG)

global own_userid
global credidentials

evasion_header = {
    "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36",
    "x-requested-with":"XMLHttpRequest",
}

def printRaw(string):
    print(string,end="",flush=True)
    return

def confirm(string):
    response = ""
    acceptable_responses={
        "yes":True,
        "y":True,
        "no":False,
        "n":False,
    }
    while response not in acceptable_responses:
        response=input(string)
    return acceptable_responses[response]

class Cell():
    def __init__(self):
        self.lines = list()
    def append(self,string,num_newlines=2):
        strings = string.split("\n")
        for i in strings:
            self.lines.append(i)
        for i in range(num_newlines):
            self.lines.append(False)
        return self
    def getline(self,line):
        return self.lines[line]
    def edit(self,line,newtext):
        self.lines[line]=newtext
    def clear(self):
        self.lines = list()
    def addToLine(self,line,text):
        self.edit(line,self.getline(line)+text)
    def render(self, width):
        # print("rendering with width of "+str(width))
        out_str = []
        for index in range(len(self.lines)):
            string = self.lines[index]
            if string is False:
                out_str.append(" "*width)
                continue
            tmp = string
            while len(tmp) is not 0:
                out_str.append(tmp[0:width])
                while len(out_str[-1]) is not width:
                    out_str[-1]+=" "
                tmp=tmp[width:None]

        # print(out_str)
        return out_str

class Table():
    def __init__(self, width, height):
        self.key = (#this is easier than using an ascii table
            "║",
            "╔","╦","╗",
            "╠","╬","╣",
            "╚","╩","╝",
            "═",
        )
        self.width = width
        self.height = height
        self.cells = list()
        for i in range(width):
            self.cells.append(list())
            for j in range(height):
                self.cells[i].append(list())
                self.cells[i][j]=Cell()
    def render(self, max_width):
        cell_width = int((max_width-1)/self.width)-1
        printRaw((self.key[1]+(self.key[10]*cell_width+self.key[2])*self.width)[0:-1]+self.key[3])
        for horz_row in range(self.height):
            print("")
            vert_length = 0
            print_buffer=[]
            for col in range(self.width):
                print_buffer.append(self.cells[col][horz_row].render(cell_width))
                if len(print_buffer[-1]) > vert_length:
                    vert_length=len(print_buffer[-1])
            # print(print_buffer)
            for row in range(vert_length):
                printRaw(self.key[0])
                for h in range(self.width):
                    try:
                        printRaw(print_buffer[h][row])
                    except IndexError:
                        printRaw(" "*cell_width)
                    printRaw(self.key[0])
                print("")
            printRaw((self.key[4]+(self.key[10]*cell_width+self.key[5])*self.width)[0:-1]+self.key[6])
        printRaw("\r")
        printRaw((self.key[7]+(self.key[10]*cell_width+self.key[8])*self.width)[0:-1]+self.key[9])
        printRaw("\n")

class Calendar(Table):
    def __init__(self, height):
        super(Calendar, self).__init__(5,height+1)
        self.cells[0][0].append("Monday",num_newlines = 0)
        self.cells[1][0].append("Tuesday",num_newlines = 0)
        self.cells[2][0].append("Wednesday",num_newlines = 0)
        self.cells[3][0].append("Thursday",num_newlines = 0)
        self.cells[4][0].append("Friday",num_newlines = 0)

digits = [0,1,2,3,4,5,6,7,8,9,"0","1","2","3","4","5","6","7","8","9"]

class ProgressBar(object):
    def __init__(self, length):
        self.length = length
        print("╔═══╦"+"═"*self.length+"╗\n",end="")
        self.set(0)
        self.closed=False

    def set(self, pos):
        print("\r║"+str(int(pos*100)).zfill(2)+"%║"+'█'*int(1+self.length*pos)+"░"*(self.length-int(1+self.length*pos))+"║  ", end='',flush=True)
    def close(self):
        if not self.closed:
            self.set(0.99)
            self.closed = True
            print("\n╚═══╩"+"═"*self.length+"╝")

def safeRequest(method,params,use_json=True):
    try:
        response = method(**params)
        if not use_json:
            return response
    except:
        print("Check your internet connection")
        raise SystemExit
    if use_json:
        try:
            response_json = json.loads(response.text)
        except KeyError:#replace this
            print("Response was not JSON.")
            raise SystemExit
        return response_json

def make_db():#the db is a dict with student keys containing an array of class strings
    database = {}
    progress_bar_width=30
    interval = int(len(list_of_pk)/30)
    print("Building Database...\n\n")
    progress_bar = ProgressBar(30)
    def input_roster(roster):
        for student in range(len(roster)):
            try:
                student_id = int(roster[student]["Id"])
                if roster[student]["teacherType"] is None: #to exclude teachers. otherwise, it would say Mr Causey has a test.
                    if student_id not in database:
                        database[student_id]=[class_id]
                    else:
                        database[student_id].append(class_id)
            except Exception as e:
                progress_bar.close()
                print("\nBUILD FAILED, aborting program\n")
                raise SystemExit
    try:
        for index in range(len(list_of_pk)):
            progress_bar.set(index/len(list_of_pk))
            class_id = list_of_pk[index]
            for i in range(-1,2):#unfortunately, our schools website has two ids for each class and they are next to each other
                roster = getRoster(class_id+i)
                if type(roster) == dict:
                    continue
                input_roster(roster)
    except KeyboardInterrupt:
        progress_bar.close()
        if not confirm("Would you like to save the potentially incomlete database? (y/n)\n>>> "):
            return
    progress_bar.close()
    file_to_save_to = open("database.pkl","wb")
    pickle.dump(database,file_to_save_to)
    file_to_save_to.close()

def signIn():
    global cookie_jar
    global own_userid
    cookie_jar = {}
    login_response = safeRequest(requests.post,{
        "url":"https://newmanschool.myschoolapp.com/api/SignIn",
        "headers":evasion_header,
        "data":{
            "From":"",
            "Username":credidentials["user"],
            "Password":credidentials["password"],
            "remember":True,
            "InterfaceSource":"WebApp"
        }
    },use_json=False)
    login_response_json = login_response.json()
    if not login_response_json["LoginSuccessful"]:
        print("Login was unsuccessful. (check your username and password)")
        raise SystemExit
    try:
        login_headers = login_response.headers
        login_cookie_str = login_headers["Set-Cookie"]
        login_cookie_regex = re.finditer(r"(?:^|(?:, ))((?:\$|[A-Z]|[a-z])+?)=(.+?);",login_cookie_str)#a regular expression. this is used here because its more strict
        for i in login_cookie_regex:
            # print("got cookie: "+i.group(1))
            cookie_jar[i.group(1)]=i.group(2)
    except:
        print("The response from the server was odd")
        print(login_cookie_str)
        return {"cookies":None,"success":False}
    user_id = login_response_json["CurrentUserForExpired"]
    own_userid = str(user_id)
    print("logged in")
    return {"response":login_response_json,"cookies":cookie_jar,"user_id":user_id,"success":True}

def request_classes():
    return safeRequest(requests.get,{
        "url":"https://newmanschool.myschoolapp.com/api/datadirect/ParentStudentUserAcademicGroupsGet/",
        "params":{
            "userId":own_userid,
            "schoolYearLabel":"2016 - 2017",
            "memberLevel":"3",
            "persona":"2",
            "durationList":"68374"
        },
        "cookies":cookie_jar,
        "headers":evasion_header
    })

def getAssignments(classid,start, end):
    return safeRequest(requests.get,{
        "url":"https://newmanschool.myschoolapp.com/api/assignment/forsection/"+str(classid),
        "headers":evasion_header,
        "cookies":cookie_jar,
        "params":{
            "format":"json",
            "personaId":"2",
            "startDate":start,
            "endDate":end,
        }
    },)

def load_db():
    temp = open("database.pkl","rb")
    result = pickle.load(temp)
    temp.close()
    return result

def getMoreCookies():
    cookie_jar["dtLatC"]="1"
    cookie_jar["dtCookie"]="4$F73E7D25A34D83F53BE6C538C22924FA|RUM+Default+Application|1|BBK12E1+-+onMessage|0"
    temp = requests.post(
        url="https://newmanschool.myschoolapp.com/podium/default.aspx",
        params={"t":"244"},
        headers=evasion_header,
        cookies=cookie_jar,
        files = {"":""}
    )
    temp_headers = temp.headers
    temp_cookie_str = temp_headers["Set-Cookie"]
    temp_cookie_regex = re.finditer(r" ?(.+?)=(.+?);.+?(?:,|$)",temp_cookie_str)#a regular expression.
    for i in temp_cookie_regex:
        # print("got cookie: "+str(i.group(1)))
        cookie_jar[i.group(1)]=i.group(2)

def make_pk():
    input("\n\nOne of the core databases is missing.\nGoogle chrome is required to build it.\nClose any chrome windows you have open and then hit windows + r and type\n\n'chrome.exe --remote-debugging-port=9222'\n\nIf that does not work, download google chrome and try entering that again.\nwhen you have one chrome window open, press enter.\n\n>>> ")
    print("Building DB")
    try:
        chrome = Chromote()# connect to chrome. this is done because inewman has one of the stupidest
    except (ConnectionError,requests.exceptions.ConnectionError):
        print("Couln't connect to chrome. Ending program...")
        raise SystemExit
    tab = "bad"
    for i in range(3):
        try:
            tab = chrome.tabs[0]
            break;
        except KeyError:
            pass #try again
    if tab == "bad":
        print("Chrome timed out.")
        raise SystemExit
    print("connected to chrome, loggin in.\nWaiting for 3 seconds for login to finish")
    tab.set_url("https://newmanschool.myschoolapp.com/app/#login")
    tab.evaluate("$('body').ready(()=>{e=p3.module('login');p3.Data.CurrLoginInfo = new e.Ms.CurrLoginInfo();p3.Data.CurrLoginInfo.set({ Username: \'" +credidentials["user"]+ "\', Pwd: \'"+credidentials["password"]+"\', Rem: true });e.Us.LoginAttempt(p3.Layout.Containers);})")
    #that was all on one line because i needed to format it with username and password
    time.sleep(3)
    print("Sent job to chrome")
    tab.set_url("https://newmanschool.myschoolapp.com/podium/default.aspx?t=244")
    tab.evaluate("""
    //this is a javascript comment.  my bread and butter
    var pages = {"done":false};
    var getPageNumber =(page)=> {
      pages[page]={"ready":false}
      $("body").html("<h1>Getting Page "+page+"</h1>")
      var this_page = pages[page]
      var q_str = ""
      if (page==1){
        q_str = "gt"
      } else {
        q_str = "pg_"+page
      }
      var tab = $("#L_ctl08gtdd");//find the dropdown
      tab.val("1"); //Select academics
      console.log(q_str)
      ShowAjaxStatus();
      WebForm_DoCallback('L$ctl08',q_str,(arg)=>{
        this_page.ready = true;
        this_page.contents = arg.match(/pk=(\d+)/g)
        current_page++
        if (this_page.contents === null){
          pages["done"]=true;
          $("body").html("<h1>Done.</h1>")
        } else {
          for (var i = 0; i < this_page.contents.length; i++) {
            this_page.contents[i]=this_page.contents[i].match(/\d+/)[0]
          }
          setTimeout(()=>{
            getPageNumber(current_page);
          },10)
        }
      },null,null,true);
    }
    current_page = 1;
    $("body").ready(()=>{
      $("#L_ctl08gtdd").val("1")
      ShowAjaxStatus();
      WebForm_DoCallback('L$ctl08','gt',(e)=>{
        GetCallbackData(e)
        getPageNumber(1)
      },null,null,true);
    })
    """)
    # note that i use some python style grammar even if it is unconventional in normal js to inprove readability
    # so now we just need to be that annoying kid in the backseat who constantly asks
    # "are we there yet? are we there yet?" because chromote doesn't do callbacks.
    # We need to get the value of a dictionary (object in js)
    global list_of_pk
    list_of_pk = [];
    print("Waiting on chrome to finish",end="",flush=True)
    while True:
        print(".",end="",flush=True)
        time.sleep(0.2)
        tab_result_str = tab.evaluate("JSON.stringify(pages)")
        tab_result_obj = json.loads(tab_result_str)["result"]["result"]["value"]
        the_object = json.loads(tab_result_obj)
        if the_object["done"]:
            for i in the_object:
                page = the_object[i]
                if type(page) is dict:
                    if page["ready"] and page["contents"] is not None:
                        for j in range(len(page["contents"])):
                            list_of_pk.append(int(page["contents"][j]))
            break;
    print("Done! ({}) ({})".format(len(list_of_pk),len(set(list_of_pk))))
    pkfile = open("list_of_pk.pkl","wb")
    pickle.dump(list(set(list_of_pk)),pkfile)
    pkfile.close()
    return list(set(list_of_pk))

def load_pk():
    temp = open("list_of_pk.pkl","rb")
    result = pickle.load(temp)
    temp.close()
    return result

def stringify_date(date):
    return str(int(date.month)).zfill(2)+"/"+str(int(date.day)).zfill(2)+"/"+str(int(date.year)).zfill(4)

def get_info(classid):
    request = requests.get(
        url = "https://newmanschool.myschoolapp.com/api/datadirect/SectionInfoView/",
        params = {
            "format":"json",
            "sectionId":classid,
            "associationId":"1",
        },
        headers = evasion_header,
        cookies = cookie_jar,
    )
    return json.loads(request.text)[0]
    # BLACKBAUD HQ: y'know, in case two classes have the same id, we ought to return the class results in an array when sombody querrys for a single id.

def getRoster(classid):
    return safeRequest(requests.get,{
        "url":"https://newmanschool.myschoolapp.com/api/datadirect/sectionrosterget/"+str(classid),
        "headers":evasion_header,
        "params":{
            "format":"json"
        },
        "cookies":cookie_jar
    })

def printClasses(classes):
    for i in range(len(classes)):
        print(str(i)+":\t"+str(classes[i]["sectionidentifier"]))
    response = ""
    while response not in range(len(own_classes)):
        try:
            response = int(input("Select a class to schedule a test for:\n>>> "))
        except ValueError:
            print("\nPlease type the number in front of the class")
    return response

def getUser():
    credidentials["user"] = input("\nPlease enter your username:\n>>> ")
    return credidentials["user"]
def getPWD():
    pwd = getpass.getpass("\nType your password here (The letters are invisible for security reasons):")
    credidentials["password"]=pwd
    print(">>> "+"*"*len(pwd))
    return pwd

def get_local_user_info():#the person using the program and their info.
    global credidentials
    credidentials = dict()
    local_info_file=dict()
    try:
        local_info_file["r"] = open("credidentials.pkl","rb")
        pkl_file = pickle.load(local_info_file["r"])
        if "user" in pkl_file:
            if confirm("Are you {user}? (y/n)\n>>> ".format(**pkl_file)):
                if "password" in pkl_file:
                    if confirm("Do you want to use your stored password '{}'? (y/n)\n>>> ".format("*"*len(pkl_file["password"]))):
                        credidentials={"user":pkl_file["user"],"password":pkl_file["password"]}
                        return
                pwd = getPWD()
                if confirm("Do you want to save your password?\n>>> "):
                    local_info_file["r"].close()
                    local_info_file["w"]=open("credidentials.pkl","wb")
                    pickle.dump({
                        "user":pkl_file["user"],
                        "password":pwd
                    },local_info_file["w"])
                    local_info_file["w"].close()
                credidentials={"user":pkl_file["user"],"password":pwd}
                return
        raise FileNotFoundError
    except (FileNotFoundError,EOFError,):
        local_info_file["w"] = open("credidentials.pkl","wb")
        user=getUser()
        pwd=getPWD()
        if confirm("Do you want to save your password?\n>>> "):
            pickle.dump({
                "user":user,
                "password":pwd
            },local_info_file["w"])
        elif confirm("Do you want to save your username?\n>>> "):
            pickle.dump({
                "user":user
            },local_info_file["w"])
        local_info_file["w"].close()

    #file does exist
        #file has username
            #prompt to use username
                #file has password
                    #use it
                #file does not have password
                    #prompt user 4 pwd
try: #in case all else fails, make a log
    print("Loading...")
    global screen_size
    try:
        prefs = open("config.pkl","rb")
        screen_size = pickle.load(prefs)["screen_size"]
    except FileNotFoundError: #this has the user determine the screen size by printing a bunch of $ and then going to the beginning of the line and printing a bunch of spaces.
        screen_size=30
        print("\n |"*100)
        print(" V\n")
        print("It appears this is the first itme you have used the program.\nBefore it can run, it must determine your approximate screen size:")
        print("Please maximize this window before continuing for the best results.\n")
        while not confirm("Are there a bunch of dollar signs? (type yes or no)\n>>>"):
            screen_size*=2
            printRaw("\n"*100+"$"*int(screen_size)+"\r"+" "*int(screen_size)+"\r")
        printRaw("\n"*100+"$"*int(screen_size)+"\r"+" "*int(screen_size)+"\r")
        while confirm("Are there a bunch of dollar signs?\n>>>"):
            screen_size*=0.9
            printRaw("\n"*100+"$"*int(screen_size)+"\r"+" "*int(screen_size)+"\r")
        screen_size = int(screen_size)
        print("\n\n\nYour screen is about {} letters wide:".format(screen_size))
        print("\nEnd of your screen:  "+"="*(screen_size-22)+">")
        print("\n\n")
        prefs = open("config.pkl","wb")
        pickle.dump({"screen_size":screen_size},prefs)
        prefs.close()
    get_local_user_info()
    signIn()
    getMoreCookies()
    own_classes = request_classes()
    chosen_class = own_classes[printClasses(own_classes)]
    chosen_class["roster"]=getRoster(chosen_class["sectionid"])
    try:
        load_pk()
    except FileNotFoundError:
        make_pk()
        make_db() #db is dependent on pk.
    global list_of_pk
    list_of_pk = load_pk()

    try:
        load_db()#tester
    except FileNotFoundError:
        make_db()#make if fail
    finally:
        global database
        database = load_db()#should work

    conflicting_classes = set() #no duplicates
    for student in chosen_class["roster"]:
        student_id = int(student["Id"])
        if student["teacherType"] is None: #to exclude teachers. otherwise, it would say Mr Causey has a test.
            conflicting_classes = conflicting_classes.union(database[student_id])
        # print("student "+student["name"]+" found in the selected class. they have "+str(len(database[student_id]))+" classes")
        # print(len(conflicting_classes))
    date_chosen = [];

    while True:
        try:
            test_date=dateparser.parse(input("\nPlease enter a potential test date around the time you want to schedule it.\nYou can type numerical dates or certain phrases (eg: 'next week')\n>>> "))
            if test_date is None:
                print("\nI dont understand that date.")
                continue
            if confirm("\nPlease confirm the following date (y/n): {1}/{2}/{0}\n>>> ".format(*test_date.timetuple())):
                date_chosen = test_date.timetuple()[0:3]
                break
            else:
                continue
            break;
        except ValueError:
            pass

    dt = datetime.date(*date_chosen)
    start_date = dt - datetime.timedelta(days=dt.weekday())
    end_date = start_date + datetime.timedelta(days=6)

    print("\n\nGenerating report of tests / major assignments as of from "+stringify_date(start_date)+" to "+stringify_date(end_date)+" for the class \""+chosen_class["sectionidentifier"]+"\"")
    visual = Calendar(1)
    for index in range(5):
        visual.cells[index][0].addToLine(0,"  ({1}/{2}/{0})".format(*(start_date + datetime.timedelta(days=index)).timetuple()))
    bar = ProgressBar(20)
    assignments = list()
    temp_index = 0;
    for class_id in conflicting_classes:
        bar.set(temp_index/len(conflicting_classes))
        temp_index+=1
        response = getAssignments(class_id,start=stringify_date(start_date),end=stringify_date(end_date))
        if type(response) != dict:
            assignments.extend(response)
    bar.close()
    bar = ProgressBar(20)
    major_assignments = list()
    temp_index = 0
    for assignment in assignments:
        temp_index+=1
        bar.set(temp_index/len(assignments))
        if assignment["Major"] or re.match(r"(?:(?:\sT|test)(?:\s|\.|$))|(?:(?:\sQ|quiz)(?:\s|\.|$))|(?:(?:\sE|exam)(?:\s|\.|$))|(?:(?:\sM|major)(?:\s|\.|$))",assignment["AssignmentType"]):
            major_assignments.append(assignment)
    bar.close()
    bar = ProgressBar(20)
    if len(major_assignments) is 0:#if no assignments
        bar.close()
        print("Hmm... there don't seem to be any major assignments for this date range.\nThis could mean the program has gone horribly wrong, so please verify on inewman")
        raise SystemExit
    for index in range(len(major_assignments)):
        bar.set(index/len(major_assignments))
        assignment = major_assignments[index]
        assignment_date = datetime.datetime.strptime(assignment["DateDue"][0:-9],"%m/%d/%Y").date()
        if assignment_date < start_date or assignment_date > end_date:
            continue
        affected_students = [];
        for student in chosen_class["roster"]: #the current class
            if student["teacherType"] is None: #This line excludes teacher's names from poping up as students
                student_id = int(student["Id"])
                if assignment["SectionId"] in database[student_id] or assignment["SectionId"]+1 in database[student_id] or assignment["SectionId"]-1 in database[student_id]:
                    affected_students.append(student["nickName"])
        cal_snippet = "{} students \n({})\nhave a \n\"{}\"\nin\n{}".format(
            len(affected_students),
            str(affected_students[0:3])[1:-1].replace("\'","")+"...", #remove scary quotes
            assignment["AssignmentDescription"][0:20]+"...",
            get_info(assignment["SectionId"])["GroupName"]
        )
        if assignment["Major"]:
            cal_snippet+=" (MAJOR)"
        visual.cells[assignment_date.weekday()][1].append(cal_snippet)
    bar.close()
    visual.render(screen_size)
except SystemExit:
    raise SystemExit
except KeyboardInterrupt:
    print("If you are trying to copy something, please hit the enter key. due to backwards-compatability issues, microsoft ctrl+c will stop the program")
except (KeyboardInterrupt,Exception) as e:
    try:
        logging.exception('Got exception on main handler')
        print("An unexpected error occoured ("+str(type(e))[8:-2]+"). A log has been created. Please email the file dump.log to beauvandenburgh19@newmanschool.org and try to describe what happened.")
    except Exception:
        print("An unexpected error occoured.")
    finally:
        raise SystemExit
