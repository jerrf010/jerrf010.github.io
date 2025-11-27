let x = Number(prompt());
let y = Number(prompt());

if (x > 0 && y > 0) {
	console.log("Quadrant 1");
} else if (x < 0 && y > 0) {
	console.log("Quadrant 2");
} else if (x < 0 && y < 0) {
	console.log("Quadrant 3");
} else {
	console.log("Quadrant 4");
}
