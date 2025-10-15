const body = d3.select("body");

const gradients = {
    morning: ["#FFF7C0", "#FFE8A0", "#ffce85", "#FFF3E0"],
    afternoon: ["#87CEFA", "#ADD8E6", "#e8d87e", "#E0FFFF"],
    evening: ["#e0b92b", "#8342bd", "#531994", "#4b1e7a"],
    night: ["#26267e", "#080870", "#151591", "#1a1a2a"]
};

let currentColors = gradients.evening;

function getGradientByHour(hour) {
    if(hour >= 6 && hour < 12) return gradients.morning;
    else if(hour >= 12 && hour < 17) return gradients.afternoon;
    else if(hour >= 17 && hour < 20) return gradients.evening;
    else return gradients.night;
}

const timeInput = document.getElementById("timeInput");
updateGradient(getGradientByHour(parseInt(timeInput.value.split(":")[0])));

animateGradientShift();

d3.select("#timeInput").on("input", function() {
    const hour = parseInt(this.value.split(":")[0]);
    const newColors = getGradientByHour(hour);
    updateGradient(newColors);
});

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