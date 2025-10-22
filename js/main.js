import { ScrollClock } from './scrollClock.js';

// Global variables
let globalData = [];
let timeBuckets = [];
let currentTimeIndex = 0;
let svg, width, height;

// Setting initial time
let time = new Date();
time.setHours(18, 30, 0, 0);

// Color scheme for injuries
const injuryColors = {
    "Major": "#FFB6C1",
    "Minor": "#98FB98",
    "Fatal": "#aaa1e6",
    "None": "#87CEEB"
};

// Gradient backgrounds for different times of day
const gradients = {
    morning: ["#FFF7C0", "#ea5525", "#ffe88a", "#ff7858"],
    afternoon: ["#87CEFA", "#ADD8E6", "#e8d87e", "#E0FFFF"],
    evening: ["#e0b92b", "#8342bd", "#531994", "#4b1e7a"],
    night: ["#26267e", "#080870", "#151591", "#1a1a2a"]
};

let currentColors = gradients.evening;
const body = d3.select("body");

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Load data
    d3.csv("data/dataset.csv").then(function(data) {
        globalData = data;
        console.log("CSV data loaded:", globalData.length, "records");

        // Extract and sort time buckets
        timeBuckets = [...new Set(globalData.map(d => d['Time of Collision BUCKET']))]
            .filter(t => t && t.trim() !== '')
            .sort((a, b) => {
                return timeToMinutes(a) - timeToMinutes(b);
            });

        console.log("Time buckets:", timeBuckets);

        // find initial time index based on starting time
        currentTimeIndex = findClosestTimeIndex(time);

        // initialize components
        initTimeSlider();
        initVisualization();
        animateGradientShift();
        updateTimeDisplay();
        updateVisualization();


        // Set up event listeners
        setupEventListeners();

    }).catch(function(error) {
        console.error("Error loading the CSV file:", error);
        document.getElementById('loadingMessage').innerHTML =
            '<div class="error-message">Error loading dataset.csv. Please check if the file exists in the data folder.</div>';
    }); //error checking
});

function setupEventListeners() {
    document.getElementById('vehicleFilter').addEventListener('change', function() {
        updateVisualization();
    });
}


// convert time string to minutes for sorting
function timeToMinutes(timeStr) {
    if (!timeStr) return 0;

    const [timePart, period] = timeStr.split(' ');
    const [hours, minutes, seconds] = timePart.split(':').map(Number);

    let totalMinutes = hours % 12 * 60 + (minutes || 0);
    if (period === 'PM') totalMinutes += 12 * 60;
    return totalMinutes;
}

// find the closest time bucket index for a given time
function findClosestTimeIndex(targetTime) {
    const targetMinutes = targetTime.getHours() * 60 + targetTime.getMinutes();
    let closestIndex = 0;
    let minDifference = Infinity;

    timeBuckets.forEach((bucket, index) => {
        const bucketMinutes = timeToMinutes(bucket);
        const difference = Math.abs(bucketMinutes - targetMinutes);

        if (difference < minDifference) {
            minDifference = difference;
            closestIndex = index;
        }
    });

    return closestIndex;
}

// time manipulation functions
function increaseTime30Min(givenTime) {
    givenTime.setMinutes(givenTime.getMinutes() + 30);
}

function decreaseTime30Min(givenTime) {
    givenTime.setMinutes(givenTime.getMinutes() - 30);
}

// format as 12-hour time with AM/PM
function formatTime(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;

    return hours + ':' + minutes + ' ' + ampm;
}

// Get time period based on hour
function getTimePeriod(hours) {
    if (hours >= 6 && hours < 12) return "Morning";
    else if (hours >= 12 && hours < 17) return "Afternoon";
    else if (hours >= 17 && hours < 20) return "Evening";
    else return "Night";
}

// Get gradient by hour
function getGradientByHour(date) {
    if(date.getHours() >= 6 && date.getHours() < 12) return gradients.morning;
    else if(date.getHours() >= 12 && date.getHours() < 17) return gradients.afternoon;
    else if(date.getHours() >= 17 && date.getHours() < 20) return gradients.evening;
    else return gradients.night;
}

// Update time display
function updateTimeDisplay() {
    d3.select("#currentTimeDisplay").text(formatTime(time));
    d3.select("#timePeriodDisplay").text(getTimePeriod(time.getHours()));

    // update accident count for current time bucket
    const currentBucket = timeBuckets[currentTimeIndex];
    const accidentCount = globalData.filter(d => d['Time of Collision BUCKET'] === currentBucket).length;
    d3.select("#accidentCount").text(accidentCount);
}

// initialize gradient animation
function animateGradientShift() {
    let position = 0;
    function step() {
        position = (position + 0.2) % 100;
        body.style("background-position", `${position}% 50%`);
        requestAnimationFrame(step);
    }
    step();
}

// update gradient with smooth transition
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

// initialize the time slider
function initTimeSlider() {
    let svg = d3.select("#timeSlider").append("svg")
        .attr("viewBox", "0 0 300 300");

    svg.append("g");

    const mask = svg.append("defs")
        .append("mask")
        .attr("id", "text-cutout-mask");

    mask.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("fill", "white");

    mask.append("text")
        .attr("x", 125)
        .attr("y", 150)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("class", "timeText")
        .attr("fill", "black")
        .text(formatTime(time));

    svg.append("circle")
        .attr("cx", 0)
        .attr("cy", 150)
        .attr("r", 150)
        .attr("fill", "rgba(255,255,255,0.8)")
        .attr("mask", "url(#text-cutout-mask)");

    const scrollClock = new ScrollClock(
        "#timeSlider",
        "#text-cutout-mask text",
        time,
        timeBuckets,
        {
            currentTimeIndex,
            updateGradient,
            updateTimeDisplay,
            updateVisualization,
            increaseTime30Min,
            decreaseTime30Min,
            timeToMinutes,
            getGradientByHour,
            formatTime
        }
    );

    scrollClock.init();
}


// get top vehicle types and roads for a specific injury type
function getTopVehicleAndRoad(data, injuryType) {
    const filteredData = data.filter(d => d.Injury === injuryType);

    // count vehicle types
    const vehicleCounts = d3.rollup(
        filteredData,
        v => v.length,
        d => d['Vehicle Type'] || 'Unknown'
    );

    // Count road classes
    const roadCounts = d3.rollup(
        filteredData,
        v => v.length,
        d => d['ROAD_CLASS'] || 'Unknown'
    );

    // Get top vehicle type
    let topVehicle = 'Unknown';
    let topVehicleCount = 0;
    vehicleCounts.forEach((count, vehicle) => {
        if (count > topVehicleCount && vehicle && vehicle.trim() !== '' && vehicle !== 'Unknown') {
            topVehicleCount = count;
            topVehicle = vehicle;
        }
    });

    // Get top road class
    let topRoad = 'Unknown';
    let topRoadCount = 0;
    roadCounts.forEach((count, road) => {
        if (count > topRoadCount && road && road.trim() !== '' && road !== 'Unknown') {
            topRoadCount = count;
            topRoad = road;
        }
    });

    return {
        topVehicle: topVehicle,
        topVehicleCount: topVehicleCount,
        topRoad: topRoad,
        topRoadCount: topRoadCount,
        totalInjuries: filteredData.length
    };
}

// initialize visualization
function initVisualization() {
    const container = d3.select("#vizContainer");
    container.html("");

    width = Math.min(900, window.innerWidth - 50);
    height = 400;

    // Create SVG
    svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);
}

// update visualization based on current time and vehicle filter
function updateVisualization() {
    if (!globalData.length) return;

    const currentTimeBucket = timeBuckets[currentTimeIndex];
    const selectedVehicle = document.getElementById('vehicleFilter').value;

    // Filter data for current time bucket
    let filteredData = globalData.filter(d =>
        d['Time of Collision BUCKET'] === currentTimeBucket
    );

    // Apply vehicle filter if not "All"
    if (selectedVehicle !== 'All') {
        filteredData = filteredData.filter(d =>
            d['Vehicle Type'] && d['Vehicle Type'].includes(selectedVehicle)
        );
    }

    // Filter data for injuries and remove empty injury values
    let filteredInjury = filteredData.filter(d =>
        d.Injury && d.Injury.trim() !== ''
    );

    // count injuries by type from the filtered data
    const injuryCounts = d3.rollup(
        filteredInjury,
        v => v.length,
        d => d.Injury
    );

    // Define injury categories
    const categories = ['Major', 'Minor', 'Fatal', 'None'];
    const circleData = categories.map(cat => {
        const vehicleRoadInfo = getTopVehicleAndRoad(filteredData, cat);

        // Divide the value by 6205 to for averaging across the years
        const originalValue = injuryCounts.get(cat) || 0;
        const scaledValue = originalValue / 6205;

        return {
            type: cat,
            value: scaledValue,
            originalValue: originalValue,
            color: injuryColors[cat],
            topVehicle: vehicleRoadInfo.topVehicle,
            topVehicleCount: vehicleRoadInfo.topVehicleCount,
            topRoad: vehicleRoadInfo.topRoad,
            topRoadCount: vehicleRoadInfo.topRoadCount,
            totalInjuries: vehicleRoadInfo.totalInjuries
        };
    }).filter(d => d.originalValue > 0);

    // clear previous visualization
    svg.selectAll("*").remove();

    if (circleData.length === 0) {
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .style("fill", "white")
            .style("font-size", "16px")
            .text("No injury data for this time period and vehicle type");
        return;
    }

    // Calculate total for percentages (using original values)
    const totalOriginal = circleData.reduce((sum, d) => sum + d.originalValue, 0);

    const maxValue = d3.max(circleData, d => d.value) || 1;

    const radiusScale = d3.scalePow()
        .exponent(1.3)
        .domain([0, maxValue])
        .range([35, 80]);

    const sortedCircles = [...circleData].sort((a, b) => b.value - a.value);

    const circlePositions = [];
    const verticalCenter = height / 2;

    const maxRadius = 120; // Reduced from 90
    const horizontalSpacing = maxRadius * 1.5; // Reduced spacing
    const verticalSpacing = maxRadius * 1.3;

    const circlesPerRow = Math.min(sortedCircles.length, Math.floor(width / horizontalSpacing));

    sortedCircles.forEach((circle, index) => {
        const row = Math.floor(index / circlesPerRow);
        const col = index % circlesPerRow;

        const x = (col * horizontalSpacing) + maxRadius + 30; // Reduced padding
        const y = verticalCenter + (row * verticalSpacing) - ((Math.ceil(sortedCircles.length / circlesPerRow) - 1) * verticalSpacing / 2);

        circlePositions.push({
            ...circle,
            x: x,
            y: y,
            radius: radiusScale(circle.value)
        });
    });

    const circles = svg.selectAll(".injury-circle")
        .data(circlePositions)
        .enter()
        .append("g")
        .attr("class", "injury-circle")
        .attr("transform", d => `translate(${d.x}, ${d.y})`);

    circles.append("circle")
        .attr("r", d => d.radius)
        .attr("fill", d => d.color)
        .attr("class", d => `circle-${d.type.toLowerCase()}`)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .style("filter", "drop-shadow(0 1px 3px rgba(0,0,0,0.2))") // Lighter shadow
        .on("mouseover", function(event, d) {
            // Show enhanced tooltip with vehicle and road information
            const tooltip = document.getElementById('tooltip');
            const percentage = ((d.originalValue / totalOriginal) * 100).toFixed(1);
            const scaledPercentage = (d.value * 100).toFixed(2);

            let tooltipContent = `
            <strong>${d.type} Injury</strong><br>
            Actual Count: ${d.originalValue} (${percentage}% of current time)<br>
            Scaled Value: ${d.value.toFixed(4)} (${scaledPercentage}%)<br><br>
        `;

            // Add vehicle information if available
            if (d.topVehicle && d.topVehicle !== 'Unknown' && d.topVehicleCount > 0) {
                const vehiclePercentage = ((d.topVehicleCount / d.originalValue) * 100).toFixed(1);
                tooltipContent += `
                <strong>Most Common Vehicle:</strong><br>
                ${d.topVehicle}<br>
                ${d.topVehicleCount} accidents (${vehiclePercentage}%)<br><br>
            `;
            }

            if (d.topRoad && d.topRoad !== 'Unknown' && d.topRoadCount > 0) {
                const roadPercentage = ((d.topRoadCount / d.originalValue) * 100).toFixed(1);
                tooltipContent += `
                <strong>Most Common Road:</strong><br>
                ${d.topRoad}<br>
                ${d.topRoadCount} accidents (${roadPercentage}%)
            `;
            }

            tooltip.innerHTML = tooltipContent;
            tooltip.classList.add('show');

            const hoverRadius = d.radius * 1.1;

            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", hoverRadius)
                .attr("stroke-width", 2)
                .style("filter", "brightness(1.15) drop-shadow(0 3px 6px rgba(255,255,255,0.3))");
        })
        .on("mousemove", function(event) {
            const tooltip = document.getElementById('tooltip');
            tooltip.style.left = (event.pageX + 15) + 'px';
            tooltip.style.top = (event.pageY - 50) + 'px';
        })
        .on("mouseout", function(event, d) {
            document.getElementById('tooltip').classList.remove('show');

            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", d.radius)
                .attr("stroke-width", 1.5)
                .style("filter", "drop-shadow(0 1px 3px rgba(0,0,0,0.2))");
        });

    circles.append("text")
        .attr("class", "circle-label circle-count")
        .attr("y", -10)
        .style("fill", "#333")
        .style("font-weight", "bold")
        .style("font-size", "12px")
        .style("text-anchor", "middle")
        .style("pointer-events", "none")
        .text(d => d.value.toFixed(4));

    circles.append("text")
        .attr("class", "circle-label circle-type")
        .attr("y", 6)
        .style("fill", "#333")
        .style("font-size", "11px")
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("pointer-events", "none")
        .text(d => d.type);

    circles.append("text")
        .attr("class", "circle-label circle-percentage")
        .attr("y", 22)
        .style("fill", "#333")
        .style("font-size", "9px")
        .style("text-anchor", "middle")
        .style("pointer-events", "none")
        .text(d => `${(d.value * 100).toFixed(2)}%`);

    let totalText = `Total Actual: ${totalOriginal}`;
    if (selectedVehicle !== 'All') {
        totalText += ` (${selectedVehicle} only)`;
    }

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("class", "total-display")
        .style("fill", "white")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text(totalText);
}