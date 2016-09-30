var tileSize = 25;
var runners = [];
var towers = [];
var newRunnerType = "generic";
var newTowerTypeJSON = 0;
var disable_warnings = false;
var allow_cheats = false;
var flash_money = 0;
var spawn_quanity = 1;
var spawn_quanity_accel = 0.003;
var health_factor = 1;
var health_factor_accel = 0.001;
var tower_JSON;
var buy_menu;
var mouse_was_down = false;
var touched_for_frames = 0;
var touch_in_progress = false;
var pew_sound;
var lives = 200;
var flash_lives = 0;

var Grid = {
	money: 1000000000000000, //changed in setup anyways, high number to allow for lots of towers in setup
	damageMap: [], /*
	damageMap is a variable which helps match the location of runners to how they die
	quite simply, it is 2d array of arrays. the X and Y dimensions are the X and y of the grid,
	and the third demension is just an array of towers which can target that location. when a
	tower is made, it checks to see what tiles it collides with on the grid, and if
	it can shoot a tile*, it will add it's val in the array to the damageMap on that tiles x and y value
	therefore, a runner can check the damageMap for the tile it is on, and get a list of
	towers that could shoot at it. then the runner checks to see if it is within range of those towers
	, sees if they have shot anything before and what their target limit is, and then changes it's healh.
	this prevents runners from checking each and every tower, and tower's from checking each and every runner,
	saving valuable prossessor time

	* if a tile collides with minrange, it will not be fired at. this is sacraficed due to library limitations.
	*/
	routeHopsToEnd: [], /*
	this variable (RHTE) is confusing.
	its a 2d array [gridx][gridy] which has a bunch of
	values stating the distance from that tile to a despawn.
	to pathfind, the runners will go to lower numbers,
	and to generate, despawns are asigned 0, all ajacent
	unpopulated tiles are asigned one, then the ones ajacent
	to 1 are asined 2, etc. this is a cheap way to do grid pathfinding IMO

	OK IT HAS A BAD NAME. BUT IF YOU CANT COME UP WITH A BETTER ONE, DONT JUDGE ME
	at least i didnt name it potato
	*/
	spawns: [], //self explanitory
	despawns: [], //self explanitory
	borders: {//the borders of the grid
		Xcoord: 800, //what are the physical borders (because p5 is dumb and global vars cant use width) :(
		Ycoord: 600,
	},
	addSpawn: function(gridX, gridY) { //adds a spawn without using new spawn(); to prevent erroneous code.
		Grid.spawns[Grid.spawns.length] = {
			x: floor(gridX),
			y: floor(gridY),
			Xcoord: floor(gridX) * tileSize,
			Ycoord: floor(gridY) * tileSize
		}
	},
	addDespawn: function(gridX, gridY) { //see above
		Grid.despawns[Grid.despawns.length] = {
			x: floor(gridX),
			y: floor(gridY),
			Xcoord: floor(gridX) * tileSize,
			Ycoord: floor(gridY) * tileSize
		}
	},
	visualizeDamageMap: function(){ //see note on damageMap variable
		push()
		for(var i = 0; i < Grid.borders.x;i++){
			for(var j = 0; j < Grid.borders.y;j++){
				fill(0,0,0,Grid.damageMap[i][j].length*30)
				rect(tileSize*i,tileSize*j,tileSize,tileSize);
			}
		}
		pop()
	},
	showFps: function() { //shows the fps
		push();
		fill(128,128,255);
		textAlign(LEFT);
		text("FPS: "+round(frameRate()),(Grid.borders.x+1)*tileSize,height-3);
		pop();
	},
	getRandomSpawnCoords: function() { //returns a fake vector where the x/y is the gridx/y of a spawn pt
		var random_spawn_number = floor(random(0,Grid.spawns.length));
		return createVector(Grid.spawns[random_spawn_number].x, Grid.spawns[random_spawn_number].y)
	},
	visualizeSpawns: function() { //shows spawns as green
		push();
		fill(0, 256, 0);
		for (var i = 0; i < Grid.spawns.length; i++) {
			rect(Grid.spawns[i].Xcoord, Grid.spawns[i].Ycoord, tileSize, tileSize);
		}
		pop();
	},
	visualizeDespawns: function() { //shows despawns as red
		push();
		fill(256, 0, 0);
		for (var i = 0; i < Grid.despawns.length; i++) {
			rect(Grid.despawns[i].Xcoord, Grid.despawns[i].Ycoord, tileSize, tileSize);
		}
		pop();
	},
	renderAllRunners: function() { //shows runners as the little dots
		for (var i = 0; i < runners.length; i++) {
			runners[i].render();
		}
	},
	renderAllTowers: function() { //shows towers as blue
		for (var i = 0; i < towers.length; i++) {
			towers[i].render();
		}
	},
	displayMoney: function(){ //shows the money in the top right corner
		textAlign(RIGHT);
		push();
		fill(255,255,255);
		stroke(0,0,0);
		if(flash_money>0){
			if(floor(frameCount/8)%2==0){
				fill(255,0,0);
			}
		}
		rect(Grid.borders.Xcoord,0,Grid.borders.Xcoord,15)
		noStroke();
		fill(0,0,255);
		if(flash_money>0){
			if(floor(frameCount/8)%2==0){
				fill(255);
			}
			flash_money--;
		}
		text("Money: "+Grid.money,width,12);
		pop();
	},
	drawGrid: function() { //draws a grid
		stroke(0);
		for (var i = 0; i < Grid.borders.Xcoord; i += tileSize) {
			line(i, 0, i, Grid.borders.Ycoord);
		}
		for (var i = 0; i < Grid.borders.Ycoord; i += tileSize) {
			line(0, i, Grid.borders.Xcoord, i);
		}
	},
	generateRoute: function(arrayToMod) {//generates a 2d array with each value being the distance to a despawn
		// when working, the npc's will try and move to a lower numbered tile. 2048 is so high it *should* never be lower
		if (!(arrayToMod instanceof Array)) {
			arrayToMod = [];
		}
		for (var i = 0; i <= this.borders.x; i++) {
			if (!(arrayToMod[i] instanceof Array)) {
				arrayToMod[i] = [];
			}
			for (var j = 0; j <= this.borders.y; j++) {
				arrayToMod[i][j] = 2048;
			}
		}
		for (var i = 0; i < towers.length; i++) {
			arrayToMod[towers[i].gridX][towers[i].gridY] = 2049; //if a tile is trapped, it would be 2048. to prevent wall climbing, 2049 is used just in case an npc is on tile 2048.
		}
		var modTheseValues = [];
		var i = 0;
		var k = 0;
		for (var DSvar = 0; DSvar < this.despawns.length; DSvar++) { //despawns are most desireable, ergo number 0.
				arrayToMod[this.despawns[DSvar].x][this.despawns[DSvar].y] = 0;
				modTheseValues[DSvar]=[];
				modTheseValues[DSvar][0] = this.despawns[DSvar].x;
				modTheseValues[DSvar][1] = this.despawns[DSvar].y;
		}
		for (var k = 0; k < this.borders.x * this.borders.y; k++) { //k is the value of hops
			var newValuesToMod = [];
			for(var q = 0; q < modTheseValues.length; q++){ //q is the array value of modTheseValues
				i=modTheseValues[q][0];
				j=modTheseValues[q][1];
				if (i !== 0) { //left
					if (arrayToMod[i - 1][j] === 2048) {
						arrayToMod[i - 1][j] = k + 1;
						newValuesToMod[newValuesToMod.length] = [];
						newValuesToMod[newValuesToMod.length-1][0]=i-1;
						newValuesToMod[newValuesToMod.length-1][1]=j;
					}
				}
				if (i !== this.borders.x) { //right
					if (arrayToMod[i + 1][j] === 2048) {
						arrayToMod[i + 1][j] = k + 1;
						newValuesToMod[newValuesToMod.length] = [];
						newValuesToMod[newValuesToMod.length-1][0]=i+1;
						newValuesToMod[newValuesToMod.length-1][1]=j;
					}
				}
				if (j !== 0) { //up
					if (arrayToMod[i][j - 1] === 2048) {
						arrayToMod[i][j - 1] = k + 1;
						newValuesToMod[newValuesToMod.length] = [];
						newValuesToMod[newValuesToMod.length-1][0]=i;
						newValuesToMod[newValuesToMod.length-1][1]=j-1;
					}
				}
				if (j !== this.borders.y) { //down
					if (arrayToMod[i][j + 1] === 2048) {
						arrayToMod[i][j + 1] = k + 1;
						newValuesToMod[newValuesToMod.length] = [];
						newValuesToMod[newValuesToMod.length-1][0]=i;
						newValuesToMod[newValuesToMod.length-1][1]=j+1;
					}
				}
			}
			modTheseValues.length = 0; //is allowable in strict JS
			arrayCopy(newValuesToMod,modTheseValues);
		}

			/*for (var i = 0; i <= this.borders.x; i++) {
				for (var j = 0; j <= this.borders.y; j++) {
					if (arrayToMod[i][j] == k) {
						if (i !== 0) { //left
							if (arrayToMod[i - 1][j] === 2048) {
								arrayToMod[i - 1][j] = k + 1;
							}
						}
						if (i !== this.borders.x) { //right
							if (arrayToMod[i + 1][j] === 2048) {
								arrayToMod[i + 1][j] = k + 1;
							}
						}
						if (j !== 0) { //up
							if (arrayToMod[i][j - 1] === 2048) {
								arrayToMod[i][j - 1] = k + 1;
							}
						}
						if (j !== this.borders.y) { //down
							if (arrayToMod[i][j + 1] === 2048) {
								arrayToMod[i][j + 1] = k + 1;
							}
						}
					}
				}
			} */
		return arrayToMod;
	},
	initialize: function() {//makes 1d arrays 2d.
		this.borders.x = floor(this.borders.Xcoord / tileSize) - 1;
		this.borders.y = floor(this.borders.Ycoord / tileSize) - 1;
		for (var i = 0; i <= this.borders.x; i++) {
			Grid.routeHopsToEnd[i] = [];
			Grid.damageMap[i] = [];
			for (var j = 0; j <= this.borders.y; j++){
				Grid.damageMap[i][j]=[];
			}
		}
	},
	visualizeHops: function() {//used to debug pathfinding
		push();
		colorMode(HSB, 256);
		for (var i = 0; i < Grid.borders.x + 1; i++) {
			for (var j = 0; j < Grid.borders.y + 1; j++) {
				fill(this.routeHopsToEnd[i][j] * 20 % 255)
				rect(i * tileSize + tileSize / 4, j * tileSize + tileSize / 4, tileSize / 2, tileSize / 2);
			}
		}
		pop();
	},
	verifyRoute: function(array_to_verify) {//used to check to see if the route generated by generateRoute leads to spawns (hint: it does unless you intentionaly block it)
		var is_valid_route = true;
		for (var i = 0; i < this.spawns.length; i++) {
			if (array_to_verify[this.spawns[i].x][this.spawns[i].y] >= 2048) { //basically, if the distance is over 2048, its not vaid, so return false
				is_valid_route = false
			}
		}
		return is_valid_route
	},
	render_buy_menu: function(){
		push()
		var buy_mouseX = convertCanvasBuy(mouseX,mouseY).x;
		var buy_mouseY = convertCanvasBuy(mouseX,mouseY).y;
		buy_menu.rectMode(CORNER);
		buy_menu.strokeWeight(0.25*3);
		buy_menu.background(200,255,255);
		buy_menu.textSize(4*3);
		var n;
		for(n = 0; n < tower_JSON.types.length; n++)
		{
			if(collidePointRect(buy_mouseX*3,buy_mouseY*3,2*3,(n*20+9)*3,46*3,15*3)){
				buy_menu.fill(255,255,20);
				if((mouseIsPressed)||(touchIsDown)){
					newTowerTypeJSON = n;
				}
			} else {
				buy_menu.fill(255)
			}
			buy_menu.rect(2*3,(n*20+9)*3,46*3,15*3);
			buy_menu.fill(0);
			buy_menu.text(tower_JSON.types[n].friendly_name,4*3,3*(n*20+14));
			buy_menu.text("Cost: "+tower_JSON.types[n].cost,4*3,3*(n*20+21));
			if (newTowerTypeJSON==n){
				buy_menu.fill(0,0,255);
				buy_menu.text("Selected",30*3,(n*20+21)*3);
			}
		}
		var remove_tower = false;
		if(towers.length > 0){
			if(collidePointRect(buy_mouseX*3,buy_mouseY*3,2*3,3*(n*20+9),3*46,3*15)){
				buy_menu.fill(255,255,20);
				if(
					((mouseIsPressed)||(touchIsDown))&&(!mouse_was_down)
				){
					Grid.money+=towers[towers.length-1].cost;
					remove_tower = true;
					mouse_was_down = true;
				} else if ((!(mouseIsPressed))&&(!(touchIsDown))) {
					mouse_was_down = false;
				}
			} else {
				buy_menu.fill(255);
			}
			buy_menu.rect(2*3,3*(n*20+9),3*(46),3*(15));
			buy_menu.fill(0);
			buy_menu.text("Undo last tower",4*3,3*(n*20+14));
			buy_menu.text("Sell for: "+towers[towers.length-1].cost,3*4,(n*20+21)*3);
			if(remove_tower){
				for(var i = 0; i < Grid.borders.x; i++){
					for(var j = 0; j < Grid.borders.y; j++){
						if(Grid.damageMap[i][j][Grid.damageMap[i][j].length-1]==towers.length-1){
							Grid.damageMap[i][j] = Grid.damageMap[i][j].slice(0,-1);
						}
					}
				}
				towers = towers.slice(0,-1);
			}
		}
		buy_menu.ellipse(mouseX-800,mouseY,3);
		imageMode(CORNERS);
		image(buy_menu,800,0,width,height);
		pop()
	}
};
function convertCanvasBuy(canvasX,canvasY){ //converts points from different coord systems
	return createVector((canvasX-800)/3,canvasY/3)
}
function convertBuyCanvas(buyX,buyY){ //converts points from canvas to graphics
	return createVector(buyX*3+800,buyY*3)
}
function changeTileSize(new_tile_size){//buggy, used to change tile size mid - game.
	if(!(disable_warnings)){
		console.log("It appears that you have called the function changeTileSize. This function is not completley functional and may cause glitches. if you wish to proceed, set disable_warnings to true, and procede with caution.");
		return false;
	}
	var oldTileSize = tileSize;
	tileSize=new_tile_size;
	for(var i = 0; i < Grid.despawns.length; i++){
			Grid.despawns[i].Xcoord=Grid.despawns[i].x*tileSize;
			Grid.despawns[i].Ycoord=Grid.despawns[i].y*tileSize;
	}
	for(var i = 0; i < Grid.spawns.length; i++){
			Grid.spawns[i].Xcoord=Grid.spawns[i].x*tileSize;
			Grid.spawns[i].Ycoord=Grid.spawns[i].y*tileSize;
	} //speed still broken, still leaving in for now...
	Grid.borders.Ycoord *= tileSize/oldTileSize;
	Grid.borders.Xcoord *= tileSize/oldTileSize;
}
function renderAll() { //to keep draw clean, all rendering functions are kept here.
	strokeWeight(1);
	background(250);
	// Grid.visualizeHops(); //pathfinding
	Grid.renderAllTowers();
	Grid.visualizeSpawns();
	Grid.visualizeDespawns();
	Grid.renderAllRunners();
	// Grid.visualizeDamageMap(); //damageMap
	Grid.drawGrid();
	visualizeNewTower();
	Grid.render_buy_menu();
	Grid.displayMoney();
	Grid.showFps();
	showLives();
}
function showLives(){
	fill(255);
	if(flash_lives>0){
		if(floor(frameCount/8)%2==0){
			fill(255,0,0);
		}
		flash_lives--;
	}
	text("Lives Left: "+lives,width,height-3);
}
function keyPressed() {
	if (keyCode == 32) {
		addRunner(newRunnerType);
	}
	if (keyCode === 80) {
		newRunnerType = prompt("newRunnerType=");
	}
	console.log("key "+keyCode+" pressed");
}
function runner(construct_type) { //obj constructor for all runners
	var tempGridVector = Grid.getRandomSpawnCoords();
	this.identity; //value in array
	this.max_health = 100;
	this.health = this.max_health;
	this.raw_sustain_hit = function(attack_dmg){
		this.health-=attack_dmg
		if(this.health<=0){
			killRunner(this.identity);
		}
	}
	this.gridX = tempGridVector.x;
	this.gridY = tempGridVector.y;
	this.gridXoff = tileSize/2;
	this.gridYoff = tileSize/2;
	this.friendly_name = construct_type; //friendly name
	this.speed = 1;
	this.render = function() {
		push();
		fill(lerpColor(color(255,0,0),color(0,255,0),this.health/this.max_health));
		stroke(0);
		rectMode(CENTER);
		rect(floor(this.gridX * tileSize + this.gridXoff), floor(this.gridY * tileSize + this.gridYoff),floor(tileSize / 4),floor(tileSize / 4));
		pop();
	};
	this.pointing_at;
	this.update = function(){
		if(Grid.routeHopsToEnd[this.gridX][this.gridY]===2048)
		{
			killRunner(this.identity);
		}
		if(this.gridXoff===0 || this.gridXoff==tileSize || this.gridYoff==0 || this.gridYoff==tileSize)
		{ //if at correct border + next cell , then change to next cell else nothing, regradless re-evalute
			if(this.gridXoff===0){
				this.set_pointing_at();
				if(this.pointing_at==1){this.gridX -= 1; this.gridXoff=tileSize-this.speed;} else {this.gridXoff=this.speed;}
			} else

			if(this.gridXoff==tileSize){
				this.set_pointing_at();
				if(this.pointing_at===0){this.gridX += 1; this.gridXoff=this.speed;} else {this.gridXoff=tileSize-this.speed;}
			} else

			if(this.gridYoff===0){
				this.set_pointing_at();
				if(this.pointing_at==3){this.gridY -= 1; this.gridYoff=tileSize-this.speed;} else {this.gridYoff=this.speed;}
			} else

			if(this.gridYoff==tileSize){
				this.set_pointing_at();
				if(this.pointing_at==2){this.gridY += 1; this.gridYoff=this.speed;} else {this.gridYoff=tileSize-this.speed;}
			}
			this.set_pointing_at();
		}	//if not at border, keep heading there
    if(this.pointing_at === 0){this.gridXoff+=this.speed}
		else if(this.pointing_at == 1){this.gridXoff-=this.speed}
		else if(this.pointing_at == 2){this.gridYoff+=this.speed}
		else if(this.pointing_at == 3){this.gridYoff-=this.speed}
		if(this.gridXoff<this.speed)         {this.gridXoff=0;}
		if(this.gridXoff>tileSize-this.speed){this.gridXoff=tileSize;}
		if(this.gridYoff<this.speed)         {this.gridYoff=0;}
		if(this.gridYoff>tileSize-this.speed){this.gridYoff=tileSize;}
		//ok, so now we have moved. now is the fun part. we check to see if we are in a damage zone and if so, we check to see what type
		for(var i = 0; i < Grid.damageMap[this.gridX][this.gridY].length; i++)
		{
			var n = Grid.damageMap[this.gridX][this.gridY][i]; //damageMap stores numbers which refrence which towers' attack can reach the tiles. we set n to be what tower we are refrencing for
			//shorter code
			if(frameCount%towers[Grid.damageMap[this.gridX][this.gridY][i]].attack.cooldown==0) //is the tower NOT on a cooldown?
			{
				if((towers[Grid.damageMap[this.gridX][this.gridY][i]].attack.counter<towers[Grid.damageMap[this.gridX][this.gridY][i]].attack.target_limit)||(towers[Grid.damageMap[this.gridX][this.gridY][i]].attack.target_limit==0)) //has it already attacked for this turn beyond its limit? (0 means infinite)
				{
					if(collideRectCircle(this.gridX*tileSize+this.gridXoff-tileSize/16,this.gridY*tileSize+this.gridYoff-tileSize/16,tileSize/8,tileSize/8,towers[Grid.damageMap[this.gridX][this.gridY][i]].gridX*tileSize+tileSize/2,towers[Grid.damageMap[this.gridX][this.gridY][i]].gridY*tileSize+tileSize/2,towers[Grid.damageMap[this.gridX][this.gridY][i]].attack.outer_radius*2)){
					//does the runner collide with the tower's damage zone?
						towers[Grid.damageMap[this.gridX][this.gridY][i]].attack.counter++; //add to the tower's attackCounter
						towers[Grid.damageMap[this.gridX][this.gridY][i]].visualize(this.gridX*tileSize+this.gridXoff,this.gridY*tileSize+this.gridYoff,true);// do the lazer!
						this.raw_sustain_hit(towers[Grid.damageMap[this.gridX][this.gridY][i]].attack.damage); //autochecks and will kill if < 0 health
						// pew_sound.play();
					}
				}
			} else {
				if((towers[Grid.damageMap[this.gridX][this.gridY][i]].attack.counter<towers[Grid.damageMap[this.gridX][this.gridY][i]].attack.target_limit)||(towers[Grid.damageMap[this.gridX][this.gridY][i]].attack.target_limit==0)) //has it already attacked for this turn beyond its limit? (0 means infinite)
				{
					if(collideRectCircle(this.gridX*tileSize+this.gridXoff-tileSize/16,this.gridY*tileSize+this.gridYoff-tileSize/16,tileSize/8,tileSize/8,towers[Grid.damageMap[this.gridX][this.gridY][i]].gridX*tileSize+tileSize/2,towers[Grid.damageMap[this.gridX][this.gridY][i]].gridY*tileSize+tileSize/2,towers[Grid.damageMap[this.gridX][this.gridY][i]].attack.outer_radius*2)){
					//does the runner collide with the tower's damage zone?
						towers[Grid.damageMap[this.gridX][this.gridY][i]].attack.counter++;
						towers[Grid.damageMap[this.gridX][this.gridY][i]].visualize(this.gridX*tileSize+this.gridXoff,this.gridY*tileSize+this.gridYoff,false);
					}
				}
			}
			// console.log("frame:"+frameCount+" tower:"+n+" attacked so far:"+towers[n].attack.counter);
		}

	}
	this.set_pointing_at = function() {
		var arr = [];
		if(this.gridX<Grid.borders.x){
			arr.push(Grid.routeHopsToEnd[this.gridX + 1][this.gridY]); //0 = Right
		} else {arr.push(2048);}
		if (this.gridX>=1){
			arr.push(Grid.routeHopsToEnd[this.gridX - 1][this.gridY]); //1 = left
		} else {arr.push(2048);}
		if(this.gridY<Grid.borders.y){
			arr.push(Grid.routeHopsToEnd[this.gridX][this.gridY+1]); //2 = down
		} else {arr.push(2048);}
		if(this.gridY>=1){
			arr.push(Grid.routeHopsToEnd[this.gridX][this.gridY-1]); //3 = up
		} else {arr.push(2048);}
		this.pointing_at = arr.indexOf(min(arr));
		if(Grid.routeHopsToEnd[this.gridX][this.gridY]===0){lives--;flash_lives=40;killRunner(this.identity);}
	}
}
function killRunner(runner_id){ //deletes a runner from runners[]. aka the runner has died.
	runners.splice(runner_id,1);
	for(var i = 0; i < runners.length; i++){
		runners[i].identity=i;
	}
}
function tower(gridX, gridY, num_type) {//obj constructor for all towers
	this.gridX = gridX;
	this.gridY = gridY;
	this.render = function() {
		fill(0, 0, 255);
		rect(this.gridX * tileSize, this.gridY * tileSize, tileSize, tileSize);
		this.attack.counter = 0;
		noFill();
		stroke(255,0,0);
	};
	this.friendly_name = tower_JSON.types[num_type].friendly_name;
	this.attack =
	{
			cooldown: tower_JSON.types[num_type].attack.cooldown,
			damage: tower_JSON.types[num_type].attack.damage,
			inner_radius: tower_JSON.types[num_type].attack.inner_radius,
			outer_radius: tower_JSON.types[num_type].attack.outer_radius,
			target_limit: tower_JSON.types[num_type].attack.target_limit,
			counter: 0
	}
	this.cost = tower_JSON.types[num_type].cost;
	this.attack.dps = this.attack.damage/this.attack.cooldown/15
	this.visualize = function(runner_x,runner_y,attack){
		push();
		fill(255,0,0,255);
		stroke(255,0,0,255);
		strokeWeight(1);
		if(attack){rect(floor(this.gridX*tileSize+tileSize/4),floor(this.gridY*tileSize+tileSize/4),floor(tileSize/2),floor(tileSize/2));}
		line(runner_x,runner_y,this.gridX*tileSize+tileSize/2,this.gridY*tileSize+tileSize/2);
		pop();
	}
}
function addTower(gridX, gridY, num_type) {//proper way to add a tower
	var foo = gridX;
	var bar = gridY;
	var tower_cost = tower_JSON.types[num_type].cost;
	if ((gridX > Grid.borders.x) || (gridX < 0) || (gridY > Grid.borders.y) || (gridY < 0)) {
		return false; //is it a point on the grid
	}
	if(Grid.money < tower_cost){
		flash_money = 50;
		return false;
	}
	var is_ok_to_place = false;
	for(var i = 0; i < towers.length; i++){
		if((towers[i].gridX==foo)&&(towers[i].gridY==bar)){ //is there already a tower on that coord?
			return false;
		}
	}
	towers[towers.length] = new tower(gridX, gridY, num_type);
	var hypothetical_route;
	if (Grid.verifyRoute(Grid.generateRoute(hypothetical_route))) {
		// Grid.routeHopsToEnd = hypothetical_route.slice(0);
		Grid.generateRoute(Grid.routeHopsToEnd);
		is_ok_to_place = true;
	} else {
		towers = towers.slice(0, -1); //if not valid, then set the value of the array to itself but without the last element
		return false;
	}
	var tower_x = towers[towers.length-1].gridX
	var tower_y = towers[towers.length-1].gridY
	//ok now use p5collide2d to add this tower's id to DamageMap
	for(var i = 0; i < Grid.borders.x;i++){
		for(var j = 0; j < Grid.borders.y;j++){
			if(!(/*collide tile with inner rad?*/collideRectCircle(tileSize*i,tileSize*j,tileSize,tileSize,towers[towers.length-1].gridX*tileSize+tileSize/2,towers[towers.length-1].gridY*tileSize+tileSize/2,towers[towers.length-1].attack.inner_radius*2))){
				if(collideRectCircle(tileSize*i,tileSize*j,tileSize,tileSize,towers[towers.length-1].gridX*tileSize+tileSize/2,towers[towers.length-1].gridY*tileSize+tileSize/2,towers[towers.length-1].attack.outer_radius*2)){
					Grid.damageMap[i][j][Grid.damageMap[i][j].length]=towers.length-1;
				}
			}
		}
	}
  //basically, damageMap [x coord of where tower can shoot][y coord of where tower can shoot][used in case of multi towers] = the place in the array that the tower is in
	Grid.money -= tower_cost;
	return true;
}
function addRunner(typeofrunner) {//proper way to add a runner
	var run_length = runners.length-1;
	runners[runners.length] = new runner(typeofrunner);
	runners[runners.length-1].identity = runners.length-1;
	runners[runners.length-1].birthday = frameCount;
	runners[runners.length-1].set_pointing_at();
	if(typeofrunner==="generic"){
		runners[runners.length-1].speed = 2;
		runners[runners.length-1].max_health = 100 * health_factor;
		runners[runners.length-1].health = 100 * health_factor;
	}
	if(typeofrunner==="heavy"){
		runners[runners.length-1].speed = 1;
		runners[runners.length-1].max_health = 200;
		runners[runners.length-1].health = 200;
	}
	if(typeofrunner==="scout"){
		runners[runners.length-1].speed = 4;
		runners[runners.length-1].max_health = 35 * health_factor;
		runners[runners.length-1].health = 35 * health_factor;
	}
}
function updateRunners(){//to keep draw clean
	for(var i = 0; i < runners.length; i++){
		runners[i].update();
	}
}
function kill_stuck_runners(seconds_old){//brokenish; occasionally, runners would try and go to the edge and stay there. I had anothername but it sounds wrong.
	for(var i = 0; i < runners.length; i++){
		if(frameCount - runners[i].birthday > seconds_old * 60){
			killRunner(i);
		}
	}
	for(var i = 0; i < runners.length; i++){
		if(frameCount - runners[i].birthday > seconds_old * 60){
			killRunner(i);
		}
	}
}
function mouseClicked() {//p5
	addTower(floor(mouseX / tileSize), floor(mouseY / tileSize), newTowerTypeJSON);
}
function preload(){
	tower_JSON = loadJSON("/TowerDefence/tower_properties.json");
	pew_sound = loadSound('/TowerDefence/PEW.ogg');
}
function setup() {//p5
	createCanvas(950, 600);
	Grid.initialize();
	pixelDensity(3)
	buy_menu = createGraphics(150*3,height*3);
	frameRate(15);
	for(var o = 0; o < 4; o++){
			Grid.addSpawn(0, o);
			Grid.addSpawn(1, o);
			Grid.addSpawn(2, o);
			Grid.addSpawn(3, o);
			Grid.addDespawn(0, Grid.borders.y-o);
			Grid.addDespawn(1, Grid.borders.y-o);
			Grid.addDespawn(2, Grid.borders.y-o);
			Grid.addDespawn(3, Grid.borders.y-o);
	}
	Grid.money = 10000;
	Grid.generateRoute(Grid.routeHopsToEnd);
}
function spawn_runners(){
	if(frameCount%30==0){
		for(var i = 0; i < floor(spawn_quanity); i++){
			addRunner(newRunnerType);
		}
		return true;
	}
	spawn_quanity+=spawn_quanity_accel;
	return false;
}
function visualizeNewTower(){
	push();
	noFill();
	ellipse(floor(mouseX/tileSize)*tileSize+tileSize/2,floor(mouseY/tileSize)*tileSize+tileSize/2,tower_JSON.types[newTowerTypeJSON].attack.outer_radius*2);
	ellipse(floor(mouseX/tileSize)*tileSize+tileSize/2,floor(mouseY/tileSize)*tileSize+tileSize/2,tower_JSON.types[newTowerTypeJSON].attack.inner_radius*2);
	stroke(0,0,255);
	strokeWeight(3)
	rect(floor(mouseX/tileSize)*tileSize,floor(mouseY/tileSize)*tileSize,tileSize,tileSize);
	pop();
}
function draw() {//p5
	renderAll();
	updateRunners();
	spawn_runners();
	if(mouseIsPressed){
		mouseClicked();
	}
	if(touch_in_progress){
		touched_for_frames++;
	}
	health_factor = health_factor + health_factor_accel;
	health_factor_accel += 0.00001;
}
function touchStarted(){
	touch_in_progress = true;
}
function touchEnded(){
	touch_in_progress = false;
	if(touched_for_frames<3){
		mouseClicked();
	}
}
function anti_cheat(run){//breaks the game. not in use right now
	if(run){
		Grid = false; //deletes the grid
		remove(); //removes the sketch
		top = (function(){while(true){}})(); //hangs the tab, as a punishment to those who cheat
	}
}
