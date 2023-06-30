// module.exports.getDate = function() {

//     const currentDate = new Date();
//     const options = {
//         weekday: "long",
//         day: "numeric",
//         month: "long",
//         // year: "numeric"
//     }
//     return currentDate.toLocaleDateString("en-US", options);
// }

// OR

// Arrow Function
exports.getDate = () => {
    const currentDate = new Date();
    const options = {
        weekday: "long",
        day: "numeric",
        month: "long",
    }
    return currentDate.toLocaleDateString("en-US", options);
}


// Another Function
exports.getDay = function() {
    const currentDate = new Date();
    const options = {
        weekday: "long",
    }
    return currentDate.toLocaleDateString("en-US", options);
}

// Another Function
exports.getYear = function() {
    const currentDate = new Date();
    const options = {
        month: "long",
        year: "numeric"
    }
    return currentDate.toLocaleDateString("en-US", options);
}
