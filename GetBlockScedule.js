function TimeStamp(H,M){
	this.H=Math.floor(H);
	this.M=Math.floor(M);
	(this.fix = function(){
		if(this.H>=24){
			this.H%=24;
		}
		if(this.M>=60){
			this.H+=Math.floor(this.M/60);
			this.M%=60;
		}
	})();
	this.excelformat = function(){
		return this.H+":"+this.M+":00"
	}
};var csvstr = "";
// begin user editable part
var manualTimes = [new TimeStamp(7,30),new TimeStamp(7,45),new TimeStamp(8,00)];//what times to add to the begining?
var startingperiodtime = new TimeStamp(08,15); //when does counting start
var numofperiods=10; //how many periods? 10 gets you to 3:45
var time_incriments = [15,15,15,3]; //what should the block pattern be?
var weeks = 2; //how many weeks should this last?
var skips=[7,10,11,27]; //for some periods (lunch, advisory) it may be nessesary to skip over an incriment. 7,10,11,27 gets it right for 15*3 + 3 min periods
// end user editable parts

var collums = 1;
var incrimentXtimes = numofperiods*time_incriments.length;
for (var i = 0; i < weeks; i++) {
	csvstr+=",Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday";
	collums+=7;
}
csvstr+="<br>"
collums+=7;
var currentskip = 0;
var timestamps=[];
for (var i = 0; i < manualTimes.length; i++) {
	csvstr+=manualTimes[i].excelformat()
	for (var j = 0; j < collums; j++) {
		csvstr+=",";
	}
	csvstr+="<br>";
}
for (var i = 0; i < incrimentXtimes; i++) {
	if(i==skips[currentskip]){
		currentskip++;
		continue;
	}
	startingperiodtime.M+=time_incriments[i%time_incriments.length];
	startingperiodtime.fix();
	csvstr+=startingperiodtime.excelformat();
	for (var j = 0; j < collums; j++) {
		csvstr+=",";
	}
	csvstr+="<br>";
}
setTimeout(()=>{
	window.location.href = "data:text/html,<p>"+csvstr+"</p>"
},100)
