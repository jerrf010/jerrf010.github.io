const x = Number(prompt("Enter x: "));
const y = Number(prompt("Enter y: "));

if (x > 0 && y > 0) {
	console.log("Quadrant 1");
} else if (x < 0 && y > 0) {
	console.log("Quadrant 2");
} else if (x < 0 && y < 0) {
	console.log("Quadrant 3");
} else {
	console.log("Quadrant 4");
}
