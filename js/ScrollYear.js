export class YearScroll {
    constructor(containerSelector, {
        startYear = 2006,
        endYear = 2023,
        onYearChange = null
    } = {}) {
        this.containerSelector = containerSelector;
        this.startYear = startYear;
        this.endYear = endYear;
        this.onYearChange = onYearChange;
        this.years = d3.range(startYear, endYear + 1);
        this.currentYear = startYear;
        this.width = 800;
        this.height = 140;
        this.margin = { left: 60, right: 80, top: 30, bottom: 30 };
    }

    init() {
        const self = this;
        const trackY = this.height / 2;

        this.svg = d3.select(this.containerSelector)
            .append("svg")
            .attr("viewBox", `0 0 ${this.width} ${this.height}`)
            .attr("class", "year-slider");

        this.xScale = d3.scaleLinear()
            .domain([this.startYear, this.endYear])
            .range([this.margin.left, this.width - this.margin.right]);

        this.svg.append("rect")
            .attr("x", this.margin.left-25)
            .attr("y", trackY - 25)
            .attr("width", this.width - this.margin.left - this.margin.right+50)
            .attr("height", 50)
            .attr("rx", 12)
            .attr("fill", "#2f2f2f")
            .attr("stroke", "#555")
            .attr("stroke-width", 2);

        this.svg.append("line")
            .attr("x1", this.margin.left-5 )
            .attr("x2", this.width - this.margin.right+5)
            .attr("y1", trackY)
            .attr("y2", trackY)
            .attr("stroke", "#dcdcdc")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "10,10")
            .attr("stroke-linecap", "round");

        this.yearLabels = this.svg.selectAll(".year-label")
            .data(this.years)
            .enter()
            .append("text")
            .attr("class", "year-label")
            .attr("x", d => this.xScale(d))
            .attr("y", trackY - 35)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("fill", d => d === this.currentYear ? "#ffeb3b" : "#ccc")
            .attr("font-weight", d => d === this.currentYear ? "bold" : "normal")
            .text(d => d);

        const carWidth = 36;
        const carHeight = 20;
        this.car = this.svg.append("rect")
            .attr("x", this.xScale(this.currentYear) - carWidth / 2)
            .attr("y", trackY - carHeight / 2)
            .attr("width", carWidth)
            .attr("height", carHeight)
            .attr("rx", 4)
            .attr("fill", "#ff4757")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .style("cursor", "grab")
            .style("filter", "drop-shadow(0 0 4px rgba(255,255,255,0.5))");

        const dragBehavior = d3.drag()
            .on("start", function () { d3.select(this).style("cursor", "grabbing"); })
            .on("drag", function (event) { self._onDrag(event); })
            .on("end", function () { d3.select(this).style("cursor", "grab"); self._onDragEnd(); });

        this.car.call(dragBehavior);
    }

    _updateYearLabels() {
        this.yearLabels
            .attr("fill", d => d === this.currentYear ? "#ffeb3b" : "#ccc")
            .attr("font-weight", d => d === this.currentYear ? "bold" : "normal");
    }

    _onDrag(event) {
        let x = Math.max(this.margin.left, Math.min(this.width - this.margin.right, event.x));
        this.car.attr("x", x - 18);

        const newYear = Math.round(this.xScale.invert(x));
        if (newYear !== this.currentYear) {
            this.currentYear = newYear;
            this._updateYearLabels();
        }
    }

    _onDragEnd() {
        const snappedX = this.xScale(this.currentYear);
        this.car.transition().duration(200).ease(d3.easeBackOut)
            .attr("x", snappedX - 18);
        this._updateYearLabels();
        if (this.onYearChange) this.onYearChange(this.currentYear);
    }
}
