export class ScrollClock {
    constructor(svgSelector, maskTextSelector, time, timeBuckets, globals) {
        this.svgSelector = svgSelector;
        this.maskTextSelector = maskTextSelector;
        this.time = time;
        this.timeBuckets = timeBuckets;
        this.currentTimeIndex = globals.currentTimeIndex;
        this.updateGradient = globals.updateGradient;
        this.updateTimeDisplay = globals.updateTimeDisplay;
        this.updateVisualization = globals.updateVisualization;
        this.increaseTime30Min = globals.increaseTime30Min;
        this.decreaseTime30Min = globals.decreaseTime30Min;
        this.timeToMinutes = globals.timeToMinutes;
        this.getGradientByHour = globals.getGradientByHour;
        this.formatTime = globals.formatTime;
    }

    init() {
        let accumulatedDelta = 0;

        d3.select(this.svgSelector).on("wheel", (event) => {
            event.preventDefault();
            accumulatedDelta += event.deltaY;
            const step = 30;

            if (accumulatedDelta < -step) {
                this.forward();
                accumulatedDelta = 0;
            } else if (accumulatedDelta > step) {
                this.backward();
                accumulatedDelta = 0;
            }

            const newColors = this.getGradientByHour(this.time);
            this.updateGradient(newColors);
            this.updateTimeDisplay();
            this.updateVisualization();

            d3.select(this.maskTextSelector).text(this.formatTime(this.time));
        });
    }

    forward() {
        this.increaseTime30Min(this.time);

        const currentMinutes = this.time.getHours() * 60 + this.time.getMinutes();
        let newIndex = this.currentTimeIndex;

        for (let i = this.currentTimeIndex + 1; i < this.timeBuckets.length; i++) {
            const bucketMinutes = this.timeToMinutes(this.timeBuckets[i]);
            if (bucketMinutes >= currentMinutes) {
                newIndex = i;
                break;
            }
        }

        if (newIndex !== this.currentTimeIndex && newIndex < this.timeBuckets.length) {
            this.currentTimeIndex = newIndex;
        }
    }

    backward() {
        this.decreaseTime30Min(this.time);

        const currentMinutes = this.time.getHours() * 60 + this.time.getMinutes();
        let newIndex = this.currentTimeIndex;

        for (let i = this.currentTimeIndex - 1; i >= 0; i--) {
            const bucketMinutes = this.timeToMinutes(this.timeBuckets[i]);
            if (bucketMinutes <= currentMinutes) {
                newIndex = i;
                break;
            }
        }

        if (newIndex !== this.currentTimeIndex && newIndex >= 0) {
            this.currentTimeIndex = newIndex;
        }
    }
}