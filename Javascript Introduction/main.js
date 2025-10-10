const readline = require('node:readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("Welcome Drake");
console.log("Please enter the age of the person: ");

rl.question('What is your age? ', (age) => {

    if (age < 18) {
        console.log("You are a child");
    } else {
        console.log("You are an adult");
    }
    rl.close();
});