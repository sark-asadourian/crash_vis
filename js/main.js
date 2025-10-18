// Global variables
let globalData = [];
let timeBuckets = [];
let currentTimeIndex = 0;
let isPlaying = false;
let svg, width, height;
let currentTime = 0; // Continuous time value (0-24 hours)

const timeColors = d3.scaleLinear()
    .domain([0, 6, 12, 18, 24])
    .range(["#000814", "#FF6B00", "#FFD700", "#FF6B00", "#000814"]);

const injuryColors = {
    "Major": "#FFB6C1",
    "Minor": "#98FB98",
    "Fatal": "#aaa1e6",
    "None": "#87CEEB"
};

document.addEventListener('DOMContentLoaded', function() {
    // Load data
    d3.csv("data/dataset.csv").then(function(data) {
        globalData = data;
        console.log("CSV data loaded:", data.length, "records");

        // Extract unique time buckets and sort them chronologically
        timeBuckets = sortTimeBuckets([...new Set(data.map(d => d['Time of Collision BUCKET']))]
            .filter(t => t)); // Remove empty values

        console.log("Sorted time buckets:", timeBuckets);

        initVisualization();

        setupEventListeners();

        updateTimeDisplay();

        updateContinuousTime();

        updateVisualization();

    }).catch(function(error) {
        console.error("Error loading the CSV file:", error);
        alert("Error loading data. Please check if dataset.csv is in the data folder.");
    });
});

// Sort time buckets chronologically from 12:00 AM to 11:30 PM
function sortTimeBuckets(timeBuckets) {
    return timeBuckets.sort((a, b) => {
        return timeBucketToContinuous(a) - timeBucketToContinuous(b);
    });
}

// Initialize SVG and visualization elements
function initVisualization() {
    const container = d3.select("#vizContainer");
    container.html(""); // Clear any existing content

    // Set dimensions
    width = Math.min(800, window.innerWidth - 40);
    height = 400;

    // Create SVG
    svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    // Create legend
    createLegend();
}

// Create legend for injury types
function createLegend() {
    const legendData = [
        { type: "Major", class: "legend-major" },
        { type: "Minor", class: "legend-minor" },
        { type: "Fatal", class: "legend-fatal" },
        { type: "None", class: "legend-none" }
    ];

    const legend = d3.select("#vizContainer")
        .append("div")
        .attr("class", "d-flex justify-content-center mt-3");

    const legendItems = legend.selectAll(".legend-item")
        .data(legendData)
        .enter()
        .append("div")
        .attr("class", "legend-item mx-3");

    legendItems.append("div")
        .attr("class", d => `legend-color ${d.class}`);

    legendItems.append("span")
        .text(d => d.type);
}

// Set up event listeners
function setupEventListeners() {
    // Cover page next button
    document.getElementById('nextBtn').addEventListener('click', function() {
        document.getElementById('cover').classList.add('d-none');
        document.getElementById('visualization').classList.remove('d-none');
        updateVisualization();
    });

    // Visualization navigation buttons
    document.getElementById('prevBtn').addEventListener('click', function() {
        if (currentTimeIndex > 0) {
            currentTimeIndex--;
            updateContinuousTime();
            updateVisualization();
            updateTimeDisplay();
            updateTimeSlider();
        }
    });

    document.getElementById('nextBtnViz').addEventListener('click', function() {
        if (currentTimeIndex < timeBuckets.length - 1) {
            currentTimeIndex++;
            updateContinuousTime();
            updateVisualization();
            updateTimeDisplay();
            updateTimeSlider();
        }
    });

    // Play/pause button
    document.getElementById('playBtn').addEventListener('click', function() {
        if (isPlaying) {
            pauseAnimation();
        } else {
            playAnimation();
        }
    });

    // Vehicle filter
    document.getElementById('vehicleFilter').addEventListener('change', function() {
        updateVisualization();
    });

    // Time slider
    document.getElementById('timeSlider').addEventListener('input', function() {
        currentTimeIndex = parseInt(this.value);
        updateContinuousTime();
        updateVisualization();
        updateTimeDisplay();
    });

    // Real-time continuous time control
    document.getElementById('continuousTimeSlider').addEventListener('input', function() {
        currentTime = parseFloat(this.value);
        currentTimeIndex = findClosestTimeBucketIndex(currentTime);
        updateVisualization();
        updateContinuousTimeDisplay();
        updateTimeDisplay();
    });
}

// Convert time bucket to continuous time (0-24 hours)
function timeBucketToContinuous(timeBucket) {
    if (!timeBucket) return 0;

    try {
        // Parse time buckets
        const timeParts = timeBucket.split(' ');
        let timeString = timeParts[0];
        const period = timeParts[1]?.toUpperCase();

        const timeComponents = timeString.split(':');
        let hours = parseInt(timeComponents[0]);
        let minutes = parseInt(timeComponents[1]) || 0;

        // Convert to 24-hour format
        if (period === 'PM' && hours !== 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }

        // Convert to decimal hours
        return hours + (minutes / 60);
    } catch (error) {
        console.error("Error parsing time bucket:", timeBucket, error);
        return 0;
    }
}

// Update continuous time based on current time bucket
function updateContinuousTime() {
    if (timeBuckets[currentTimeIndex]) {
        currentTime = timeBucketToContinuous(timeBuckets[currentTimeIndex]);
        document.getElementById('continuousTimeSlider').value = currentTime;
    }
}

// Find the closest time bucket index
function findClosestTimeBucketIndex(targetTime) {
    let closestIndex = 0;
    let minDifference = Infinity;

    timeBuckets.forEach((bucket, index) => {
        const bucketTime = timeBucketToContinuous(bucket);
        const difference = Math.abs(bucketTime - targetTime);

        if (difference < minDifference) {
            minDifference = difference;
            closestIndex = index;
        }
    });

    return closestIndex;
}

function updateVisualization() {
    if (!globalData.length) return;

    const selectedVehicle = document.getElementById('vehicleFilter').value;
    const currentTimeBucket = timeBuckets[currentTimeIndex];

    // Filter data for current time bucket
    let filteredData = globalData.filter(d => d['Time of Collision BUCKET'] === currentTimeBucket);

    // Apply vehicle filter
    if (selectedVehicle !== 'All') {
        filteredData = filteredData.filter(d =>
            d['Vehicle Type'] && d['Vehicle Type'].includes(selectedVehicle)
        );
    }

    // Count injuries by type (ignore empty injury values)
    const injuries = d3.rollup(
        filteredData,
        v => v.length,
        d => d.Injury
    );

    // Get road data for each injury type (ignore empty injury values)
    const roadData = d3.rollup(
        filteredData,
        v => {
            // Count accidents by road for this injury type
            const roadCounts = d3.rollup(v,
                arr => arr.length,
                d => d.ROAD_CLASS || 'Unknown'
            );

            // Find the road with maximum accidents
            let maxRoad = 'Unknown';
            let maxCount = 0;

            roadCounts.forEach((count, road) => {
                if (count > maxCount && road && road.trim() !== '') {
                    maxCount = count;
                    maxRoad = road;
                }
            });

            return {
                maxRoad: maxRoad,
                maxCount: maxCount,
                total: v.length
            };
        },
        d => d.Injury
    );

    // Define injury categories (only include actual injury types)
    const categories = ['Major', 'Minor', 'Fatal', 'None'];
    const circleData = categories.map(cat => {
        const injuryData = roadData.get(cat);
        return {
            type: cat,
            value: injuries.get(cat) || 0,
            maxRoad: injuryData ? injuryData.maxRoad : 'Unknown',
            maxRoadCount: injuryData ? injuryData.maxCount : 0
        };
    }).filter(d => d.value > 0); // Only show circles for injury types that have data

    // Calculate total (only from injury types with data)
    const total = circleData.reduce((sum, d) => sum + d.value, 0);

    // Set up scales with larger minimum gap
    const maxValue = d3.max(circleData, d => d.value) || 1;
    const radiusScale = d3.scaleSqrt()
        .domain([0, maxValue])
        .range([25, 70]);

    // Clear previous visualization
    svg.selectAll("*").remove();

    const backgroundColor = timeColors(currentTime);
    const textColor = getContrastColor(backgroundColor);

    // Add total count at the top (black and bold)
    svg.append("text")
        .attr("class", "total-count")
        .attr("x", width / 2)
        .attr("y", 50)
        .style("fill", "#000000") // Black color
        .style("font-size", "24px")
        .style("font-weight", "bold")
        .style("text-anchor", "middle")
        .text(`Total Accidents: ${total}`);

    const activeInjuryTypes = circleData;

    if (activeInjuryTypes.length === 0) {
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .style("fill", textColor)
            .style("font-size", "18px")
            .text("No accident data for this time period");
        return;
    }

    const centerY = height / 2 + 30; // Moved down to make space for total count

    // Calculate dynamic spacing based on circle sizes to prevent overlap
    const circleDataWithRadius = activeInjuryTypes.map(d => ({
        ...d,
        radius: radiusScale(d.value)
    }));

    // Calculate total width needed with proper spacing
    let totalWidthNeeded = 0;
    circleDataWithRadius.forEach((d, i) => {
        if (i > 0) {
            // Add gap between circles (at least 40px + radius of both circles)
            const prevRadius = circleDataWithRadius[i-1].radius;
            totalWidthNeeded += Math.max(prevRadius + d.radius + 40, 120);
        }
    });

    const startX = (width - totalWidthNeeded) / 2;

    // Position circles with dynamic spacing
    let currentX = startX;
    const circles = svg.selectAll(".injury-circle")
        .data(circleDataWithRadius)
        .enter()
        .append("g")
        .attr("class", "injury-circle")
        .attr("transform", (d, i) => {
            if (i > 0) {
                const prevRadius = circleDataWithRadius[i-1].radius;
                currentX += Math.max(prevRadius + d.radius + 40, 120);
            }
            const x = currentX + d.radius;
            return `translate(${x}, ${centerY})`;
        });

    // Draw circles with dynamic sizes
    circles.append("circle")
        .attr("r", d => d.radius)
        .attr("fill", d => injuryColors[d.type])
        .attr("stroke", "#fff")
        .attr("stroke-width", 3)
        .attr("opacity", 0.9)
        .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.3))")
        .on("mouseover", function(event, d) {

            // Show tooltip with road information
            const tooltip = document.getElementById('tooltip');
            const percentage = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;

            let tooltipContent = `
                <strong>${d.type} Injury</strong><br>
                Total Count: ${d.value}<br>
                Percentage: ${percentage}%
            `;

            // Add road information if available
            if (d.maxRoad && d.maxRoad !== 'Unknown' && d.maxRoadCount > 0) {
                const roadPercentage = ((d.maxRoadCount / d.value) * 100).toFixed(1);
                tooltipContent += `<br><br>
                <strong>Most Accidents On:</strong><br>
                ${d.maxRoad}<br>
                ${d.maxRoadCount} accidents (${roadPercentage}% of ${d.type})
                `;
            }

            tooltip.innerHTML = tooltipContent;
            tooltip.classList.add('show');

            // Highlight circle
            d3.select(this)
                .attr("stroke-width", 5)
                .style("filter", "drop-shadow(0 6px 12px rgba(0,0,0,0.4)) brightness(1.1)")
                .transition()
                .duration(200)
                .attr("r", d.radius * 1.05);
        })
        .on("mousemove", function(event) {
            const tooltip = document.getElementById('tooltip');
            tooltip.style.left = (event.pageX + 15) + 'px';
            tooltip.style.top = (event.pageY - 50) + 'px';
        })
        .on("mouseout", function(event, d) {
            // Hide tooltip
            document.getElementById('tooltip').classList.remove('show');

            // Reset circle
            d3.select(this)
                .attr("stroke-width", 3)
                .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.3))")
                .transition()
                .duration(200)
                .attr("r", d.radius);
        });

    // Update background color based on continuous time
    updateBackgroundColor();
}

// Text color based on background brightness
function getContrastColor(backgroundColor) {
    // Convert hex to RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// Format continuous time (0-24) to readable string
function formatContinuousTime(hours) {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;

    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
}

// Update background color based on continuous time
function updateBackgroundColor() {
    const color = timeColors(currentTime);

    document.body.style.transition = 'background-color 1s ease';
    document.getElementById('visualization').style.transition = 'background-color 1s ease';

    document.body.style.backgroundColor = color;
    document.getElementById('visualization').style.backgroundColor = color;

    // Update text colors in controls based on background
    const textColor = getContrastColor(color);
    document.querySelectorAll('#visualization .form-label, #visualization .text-center')
        .forEach(el => {
            el.style.color = textColor;
        });
}

// Update time display
function updateTimeDisplay() {
    const currentBucket = timeBuckets[currentTimeIndex];
    const continuousTime = timeBucketToContinuous(currentBucket);
    const formattedTime = formatContinuousTime(continuousTime);

    document.getElementById('timeDisplay').textContent =
        `Time Bucket: ${currentBucket}`;

    // Update time slider max value
    document.getElementById('timeSlider').max = timeBuckets.length - 1;
}

// Update continuous time display
function updateContinuousTimeDisplay() {
    document.getElementById('continuousTimeDisplay').textContent =
        `Continuous Time: ${formatContinuousTime(currentTime)}`;
}

// Update time slider
function updateTimeSlider() {
    document.getElementById('timeSlider').value = currentTimeIndex;
}

// Play animation through time continuously
function playAnimation() {
    isPlaying = true;
    document.getElementById('playBtn').textContent = 'Pause';
    document.getElementById('playBtn').classList.remove('btn-success');
    document.getElementById('playBtn').classList.add('btn-warning');

    const startTime = Date.now();
    const duration = 30000; // 30 seconds for 24 hours

    const animateTime = () => {
        if (!isPlaying) return;

        const elapsed = Date.now() - startTime;
        const progress = (elapsed % duration) / duration;

        // Update continuous time (0-24 hours)
        currentTime = progress * 24;

        // Update continuous time slider
        document.getElementById('continuousTimeSlider').value = currentTime;

        // Find closest time bucket
        currentTimeIndex = findClosestTimeBucketIndex(currentTime);

        // Update visualization
        updateVisualization();
        updateTimeDisplay();
        updateContinuousTimeDisplay();
        updateTimeSlider();

        if (isPlaying) {
            requestAnimationFrame(animateTime);
        }
    };

    animateTime();
}

// Pause animation
function pauseAnimation() {
    isPlaying = false;
    document.getElementById('playBtn').textContent = 'Play Continuous';
    document.getElementById('playBtn').classList.remove('btn-warning');
    document.getElementById('playBtn').classList.add('btn-success');
}

// Handle window resize
window.addEventListener('resize', function() {
    initVisualization();
    updateVisualization();
});