let date = Number(prompt("What is the date? "));
let month = Number(prompt("What is the month? "));

if (month == 2 && date == 18) {
    console.log("Special Day");
} else if (month > 2) {
    console.log("After");
} else if (month < 2) {
    console.log("Before")
} else {
    if (date < 18) {
        console.log("Before");
    } else {
        console.log("After")
    }
}