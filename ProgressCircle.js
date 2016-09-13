(function (window, document, undefined) {

    /**
     * Find the absolute position of an element
     */
    var absPos = function (element, screen) {
        var offsetLeft, offsetTop;
        offsetLeft = offsetTop = 0;
        if (element.offsetParent) {
            do {
                offsetLeft += element.offsetLeft;
                offsetTop += element.offsetTop;
            } while (element = screen ? element.offset : element.offsetParent);
        }
        return [offsetLeft, offsetTop];
    };

    /**
     * @constructor Progress Circle class
     * @param params.canvas Canvas on which the circles will be drawn.
     * @param params.minRadius Inner radius of the innermost circle, in px.
     * @param params.arcWidth Width of each circle(to be more accurate, ring).
     * @param params.gapWidth Space between each circle.
     * @param params.centerX X coordinate of the center of circles.
     * @param params.centerY Y coordinate of the center of circles.
     * @param params.infoLineBaseAngle Base angle of the info line.
     * @param params.infoLineAngleInterval Angles between the info lines.
     */
    var ProgressCircle = function (params) {
        this.canvas = params.canvas;
        this.minRadius = params.minRadius || 15;
        this.arcWidth = params.arcWidth || 5;
        this.gapWidth = params.gapWidth || 3;
        this.centerX = params.centerX || this.canvas.width / 2;
        this.centerY = params.centerY || this.canvas.height / 2;
        this.infoLineLength = params.infoLineLength || 60;
        this.horizLineLength = params.horizLineLength || 10;
        this.infoLineAngleInterval = params.infoLineAngleInterval || Math.PI / 8;
        this.infoLineBaseAngle = params.infoLineBaseAngle || Math.PI / 6;
        this.diffLeft = params.diffLeft || 235;
        this.diffTop = params.diffTop || 555;
        this.screen = params.screen;

        this.context = this.canvas.getContext('2d');

        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.circles = [];
        this.runningCount = 0;
    };

    ProgressCircle.prototype = {
        constructor: ProgressCircle,

        /**
         * @method Adds an progress monitor entry.
         * @param params.fillColor Color to fill in the circle.
         * @param params.outlineColor Color to outline the circle.
         * @param params.progressListener Callback function to fetch the progress.
         * @param params.infoListener Callback function to fetch the info.
         * @returns this
         */
        addEntry: function (params) {
            this.circles.push(new Circle({
                canvas: this.canvas,
                context: this.context,
                centerX: this.centerX,
                centerY: this.centerY,
                innerRadius: this.minRadius + this.circles.length *
                (this.gapWidth + this.arcWidth),
                arcWidth: this.arcWidth,
                infoLineLength: this.infoLineLength,
                horizLineLength: this.horizLineLength,
                diffLeft: this.diffLeft,
                diffTop: this.diffTop,
                screen: this.screen,

                id: this.circles.length,
                fillColor: params.fillColor,
                outlineColor: params.outlineColor,
                progressListener: params.progressListener,
                infoListener: params.infoListener,
                infoLineAngle: this.infoLineBaseAngle +
                this.circles.length * this.infoLineAngleInterval,
            }));

            return this;
        },

        /**
         * @method Starts the monitor and updates with the given interval.
         * @param interval Interval between updates, in millisecond.
         * @returns this
         */
        start: function (interval) {
            var self = this;
            this.timer = setInterval(function () {
                self._update();
            }, interval || 33);

            return this;
        },

        /**
         * @method Manually update all circles
         */
        update: function (value) {
            this._update(value);
        },

        /**
         * @method Stop the animation.
         */
        stop: function () {
            clearTimeout(this.timer);
        },

        /**
         * @private
         * @method Call update on each circle and redraw them.
         * @param value Value to be passed to circle update method (in case of manual update)
         * @returns this
         */
        _update: function (value) {
            this._clear();
            this.circles.forEach(function (circle, idx, array) {
                circle.update(value);
            });

            return this;
        },

        /**
         * @private
         * @method Clear the canvas.
         * @returns this
         */
        _clear: function () {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

            return this;
        },

    };

    /**
     * @private
     * @class Individual progress circle.
     * @param params.canvas Canvas on which the circle will be drawn.
     * @param params.context Context of the canvas.
     * @param params.innerRadius Inner radius of the circle, in px.
     * @param params.arcWidth Width of each arc(circle).
     * @param params.gapWidth Distance between each arc.
     * @param params.centerX X coordinate of the center of circles.
     * @param params.centerY Y coordinate of the center of circles.
     * @param params.fillColor Color to fill in the circle.
     * @param params.outlineColor Color to outline the circle.
     * @param params.progressListener Callback function to fetch the progress.
     * @param params.infoListener Callback function to fetch the info.
     * @param params.infoLineAngle Angle of info line.
     */
    var Circle = function (params) {
        this.id = params.id;
        this.canvas = params.canvas;
        this.context = params.context;
        this.centerX = params.centerX;
        this.centerY = params.centerY;
        this.arcWidth = params.arcWidth;
        this.innerRadius = params.innerRadius || 0;
        this.fillColor = params.fillColor || '#fff';
        this.outlineColor = params.outlineColor || this.fillColor;
        this.progressListener = params.progressListener;
        this.infoLineLength = params.infoLineLength || 250;
        this.horizLineLength = params.horizLineLength || 50;
        this.infoListener = params.infoListener;
        this.infoLineAngle = params.infoLineAngle;
        this.diffLeft = params.diffLeft || 235;
        this.diffTop = params.diffTop || 555;
        this.screen = params.screen;

        this.outerRadius = this.innerRadius + this.arcWidth;

        // If the info listener is not registered, then don't calculate
        // the related coordinates
        if (!this.infoListener) return;

        // calculate the info-line turning points
        var angle = this.infoLineAngle,
            arcDistance = (this.innerRadius + this.outerRadius) / 2,

            sinA = Math.sin(angle),
            cosA = Math.cos(angle);

        this.infoLineMidX = this.centerX + sinA * this.infoLineLength;
        this.infoLineMidY = this.centerY - cosA * this.infoLineLength;

        this.infoLineEndX = this.infoLineMidX +
        (sinA < 0 ? -this.horizLineLength : this.horizLineLength);
        this.infoLineEndY = this.infoLineMidY
    };

    Circle.prototype = {
        constructor: Circle,

        update: function (value) {
            this.progress = value || this.progressListener();
            this._draw();

            if (this.infoListener) {
                this.info = this.infoListener();
                this._drawInfo();
            }
        },

        /**
         * @private
         * @method Draw the circle on the canvas.
         * @returns this
         */
        _draw: function () {
            var ctx = this.context,

                ANGLE_OFFSET = -Math.PI / 2,

                startAngle = 0 + ANGLE_OFFSET,
                endAngle = startAngle + this.progress * Math.PI * 2,
                backgroundEndAngle = 3.141,

                x = this.centerX,
                y = this.centerY,

                innerRadius = this.innerRadius,
                outerRadius = this.outerRadius;

            ctx.fillStyle = '#f5f5f5';
            ctx.strokeStyle = '#f5f5f5';

            ctx.beginPath();
            ctx.arc(x, y, innerRadius, startAngle, backgroundEndAngle, false);
            ctx.arc(x, y, outerRadius, backgroundEndAngle, startAngle, true);
            ctx.closePath();
            ctx.stroke();
            ctx.fill();

            ctx.fillStyle = this.fillColor;
            ctx.strokeStyle = this.outlineColor;

            ctx.beginPath();
            ctx.arc(x, y, innerRadius, startAngle, endAngle, false);
            ctx.arc(x, y, outerRadius, endAngle, startAngle, true);
            ctx.closePath();
            ctx.stroke();
            ctx.fill();

            return this;
        },

        /**
         * @private
         * @method Draw the info lines and info text.
         * @returns this
         */
        _drawInfo: function () {
            var ctx = this.context,
                x = this.centerX,
                y = this.centerY;
				
            ctx.save();
            ctx.translate(x, y - (this.innerRadius + this.outerRadius) / 2);
            ctx.font = "bold 10px Helvetica";
            ctx.textAlign = "end";
            ctx.fillText(this.info, -10, 5);
            ctx.restore();

            return this;
        },

        /**
         * @private
         * @method Helper function to draw the segments
         * @param pointList An array of points in the form of [x, y].
         * @param close Whether to connect the first and last point.
         */
        _drawSegments: function (pointList, close) {
            var ctx = this.context;

            ctx.beginPath();
            ctx.moveTo(pointList[0][0], pointList[0][1]);
            for (var i = 1; i < pointList.length; ++i) {
                ctx.lineTo(pointList[i][0], pointList[i][1]);
            }

            if (close) {
                ctx.closePath();
            }
            ctx.stroke();
        }
    };

    window.ProgressCircle = ProgressCircle;

})(window, document);
