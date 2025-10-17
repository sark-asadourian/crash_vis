// Set time for scroll wheel, gradient calculation, and visualization
let time = new Date();
time.setHours(0, 0, 0, 0); // Start at midnight

// Function to increase time by 30 minutes
function increaseTime30Min(givenTime) {
    givenTime.setMinutes(givenTime.getMinutes() + 30);
}

// Function to decrease time by 30 minutes
function decreaseTime30Min(givenTime) {
    givenTime.setMinutes(givenTime.getMinutes() - 30);
}

// Format as 12-hour time with AM/PM for displaying
function formatTime(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    minutes = minutes < 10 ? '0' + minutes : minutes;

    return hours + ':' + minutes + ' ' + ampm;
}

const body = d3.select("body");

const gradients = {
    morning: ["#FFF7C0", "#ea5525", "#ffe88a", "#ff7858"],
    afternoon: ["#87CEFA", "#ADD8E6", "#e8d87e", "#E0FFFF"],
    evening: ["#e0b92b", "#8342bd", "#531994", "#4b1e7a"],
    night: ["#26267e", "#080870", "#151591", "#1a1a2a"]
};

let currentColors = gradients.evening;

// work time time
function getGradientByHour(date) {
    if(date.getHours() >= 6 && date.getHours() < 12) return gradients.morning;
    else if(date.getHours() >= 12 && date.getHours() < 17) return gradients.afternoon;
    else if(date.getHours() >= 17 && date.getHours() < 20) return gradients.evening;
    else return gradients.night;
}

updateGradient(time);

animateGradientShift();

function animateGradientShift() {
    let position = 0;
    function step() {
        position = (position + 0.2) % 100;
        body.style("background-position", `${position}% 50%`);
        requestAnimationFrame(step);
    }
    step();
}

function updateGradient(newColors) {
    const interpolate = currentColors.map((c, i) => d3.interpolateRgb(c, newColors[i]));
    let t = 0;
    const step = () => {
        t += 0.02;
        if(t > 1) t = 1;
        const interpolated = interpolate.map(f => f(t));
        body.style("background", `linear-gradient(120deg, ${interpolated.join(", ")})`)
            .style("background-size", "400% 400%");
        if(t < 1) requestAnimationFrame(step);
        else currentColors = newColors;
    };
    step();
}

// Slider design

let svg = d3.select("#timeSlider").append("svg")
    .attr("viewBox", "0 0 300 300");

svg.append("g");

// Define a mask for the cutout effect
const mask = svg.append("defs")
    .append("mask")
    .attr("id", "text-cutout-mask");

mask.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("fill", "white");

// Add the text to the mask and fill it with black to create the cutout
mask.append("text")
    .attr("x", 125)
    .attr("y", 150)
    .attr("text-anchor", "end")
    .attr("dominant-baseline", "middle")
    .attr("class", "timeText")
    .attr("fill", "black") // Use black to "cut out" the text
    .text(formatTime(time));

// Add a circle to the SVG
svg.append("circle")
    .attr("cx", 0)    // x position (center)
    .attr("cy", 150)    // y position (center)
    .attr("r", 150)     // radius
    .attr("fill", "rgba(255,255,255,0.8)") // color
    .attr("mask", "url(#text-cutout-mask)"); // Apply the mask


let accumulatedDelta = 0;

d3.select("#timeSlider").on("wheel", function(event) {
    event.preventDefault();// Prevent page scroll
    accumulatedDelta += event.deltaY;
    const step = 30; // minutes per scroll
    if (accumulatedDelta< - step) {
        increaseTime30Min(time);
        accumulatedDelta = 0;
    } else if (accumulatedDelta > step) {
        decreaseTime30Min(time);
        accumulatedDelta = 0;
    }

    const newColors = getGradientByHour(time);
    updateGradient(newColors);

    mask.select("text").text(formatTime(time));
});