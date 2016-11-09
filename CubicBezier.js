var bimsync = bimsync || {};
bimsync.fabric = bimsync.fabric || {};

function BSPoint(name, x, y) { //TODO rename + namespace
    this.name = name;
    this.x = x;
    this.y = y;

    this.toString = function() {
        return x + " " + y;
    }
    this.clone = function() {
        return new BSPoint(this.name, this.x, this.y);
    }
};

bimsync.fabric.CubicBezier = function(canvas, curveData) {
    curveData = curveData || {};
    curveData.points = curveData.points || {};
    this.start = curveData.points['start'] || new BSPoint('start', 50, 100);
    this.end = curveData.points['end'] || new BSPoint('end', 200, 100);
    this.c1 = curveData.points['c1'] || new BSPoint('c1', 100, 50);
    this.c2 = curveData.points['c2'] || new BSPoint('c2', 150, 150);

    this.name = 'bezier';
    this.id = '';
    this.canvas = canvas;

    var options = {
        selectable: true,
        fill: '',
        stroke: 'blue',
        strokeWidth: 4,
        padding: 10,
        originX: 'center',
        originY: 'center'
    }
    if (curveData.pathOptions) {
        $.extend(options, curveData.pathOptions);
    }
    var self = this;
    this.curve = new fabric.Path(this.getPoints(), options);
    this.curve.getBezier = function() {
        return self;
    }
    this.curve.name = 'bezier-curve';
    this.curve.hasControls = false;
    this.curve.userOptions = curveData.pathOptions;
//    this.curve.lockRotation = true;
//    this.curve.lockScalingX = true;
//    this.curve.lockScalingY = true;
    
    var controlOpt = {
        selectable: false,
        stroke: 'blue',
        strokeDashArray: [5, 5],
        fill: '',
        opacity: 0,
        originX: 'center',
        originY: 'center'
    };
    if (curveData.controlOptions) {
        $.extend(controlOpt, curveData.controlOptions);
    }

    this.controlCurve = new fabric.Path( this.getControlPoints(), controlOpt);
    this.controlCurve.name = 'control-curve';
    this.controlCurve.lockRotation = true;
    this.controlCurve.lockScalingX = true;
    this.controlCurve.lockScalingY = true;

    this.dragHandles = this.createDragHandles(curveData.handleOptions);

    this.previousPositions = {};
    this.updatePreviousPositions();
};

bimsync.fabric.CubicBezier.prototype = {
    addToCanvas: function() {
        if (this.addedToCanvas) {
            return false;
        }
        this.addedToCanvas = true;
        this.canvas.add(this.controlCurve);
        this.canvas.add(this.curve);
        var self = this;
        $.each(this.dragHandles, function() {
            self.canvas.add(this);
        });
        this.canvas.renderAll();
        return true;
    },
    removeFromCanvas: function() {
        if (!this.addedToCanvas) {
            return false;
        }
        this.addedToCanvas = false;
        this.canvas.remove(this.curve);
        this.canvas.remove(this.controlCurve);
        var self = this;
        $.each(this.dragHandles, function() {
            self.canvas.remove(this);
        });
        return true;
    },
    getBezier: function() {
        return this;
    },
    getCurve: function() {
        return this.curve;
    },
    getControlCurve: function() {
        return this.controlCurve;
    },
    createDragHandles: function(handleOptions) {
        return {
            'start' : this.createDragHandle(this.start, handleOptions),
            'end' : this.createDragHandle(this.end, handleOptions),
            'c1' : this.createDragHandle(this.c1, handleOptions),
            'c2' : this.createDragHandle(this.c2, handleOptions),
        }
    },
    createDragHandle: function(point, handleOptions) {
        var options = {
                left: point.x,
                top: point.y,
                strokeWidth: 3,
                radius: 8,
                fill: 'white',
                stroke: '#676767',
                opacity: 0,
                originX: 'center',
                originY: 'center'
        };
        if (handleOptions && handleOptions[point.name]) {
            options.left = handleOptions[point.name].left || point.x;
            options.top = handleOptions[point.name].top || point.y;
        }
        var handle = new fabric.Circle(options);
        handle.lockRotation = true;
        handle.lockScalingX = true;
        handle.lockScalingY = true;
        handle.hasControls = false;
        handle.hasBorders = false;
        handle.name = 'drag-handle-' + point.name;
        var self = this;
        handle.getBezier = function() {
            return self;
        }
        return handle;
    },
    getDragHandle: function(type) {
        return this.dragHandles[type];
    },
    showDragControls: function() {
        // console.log('SHOW drag controls');
        this.setDragHandlesOpacity(1);
        this.controlCurve.setOpacity(0.7);
    },
    hideDragControls: function(immidiate) {
        // console.log('HIDE drag controls');
        if (immidiate) {
            this.setDragHandlesOpacity(0);
            this.controlCurve.setOpacity(0);
        } else {
            this.getDragHandle('start').animate('opacity', 0, { duration: 200 });
            this.getDragHandle('end').animate('opacity', 0, { duration: 200 });
            this.getDragHandle('c1').animate('opacity', 0, { duration: 200 });
            this.getDragHandle('c2').animate('opacity', 0, { duration: 200 });
            this.controlCurve.animate('opacity', 0, { duration: 200 });
        }
        //Animation will cause this to not be redrawn before next renderAll
        // -> controls will not disappear on first click outside curve
        // Todo fix in another way
    },
    setDragHandlesOpacity: function(opacity){
        this.getDragHandle('start').setOpacity(opacity);
        this.getDragHandle('end').setOpacity(opacity);
        this.getDragHandle('c1').setOpacity(opacity);
        this.getDragHandle('c2').setOpacity(opacity);
    },
    updateBezier: function(activeObject) {
        if (!activeObject.name) {
            return;
        }
        if (activeObject.name == 'drag-handle-start') {
            var offsetLeft = activeObject.left - this.previousPositions['dragHandles']['start'].left;
            var offsetTop = activeObject.top - this.previousPositions['dragHandles']['start'].top;
            this.curve.path[0][1] += offsetLeft;
            this.curve.path[0][2] += offsetTop;
            this.controlCurve.path[0][1] += offsetLeft;
            this.controlCurve.path[0][2] += offsetTop;
            this.curve.setCoords();
            this.controlCurve.setCoords();
        } else if (activeObject.name == 'drag-handle-end') {
            var offsetLeft = activeObject.left - this.previousPositions['dragHandles']['end'].left;
            var offsetTop = activeObject.top - this.previousPositions['dragHandles']['end'].top;
            this.curve.path[1][5] += offsetLeft;
            this.curve.path[1][6] += offsetTop;
            this.controlCurve.path[3][1] += offsetLeft;
            this.controlCurve.path[3][2] += offsetTop;
        } else if (activeObject.name == 'drag-handle-c1') {
            var offsetLeft = activeObject.left - this.previousPositions['dragHandles']['c1'].left;
            var offsetTop = activeObject.top - this.previousPositions['dragHandles']['c1'].top;
            this.curve.path[1][1] += offsetLeft;
            this.curve.path[1][2] += offsetTop;
            this.controlCurve.path[1][1] += offsetLeft;
            this.controlCurve.path[1][2] += offsetTop;
        } else if (activeObject.name == 'drag-handle-c2') {
            var offsetLeft = activeObject.left - this.previousPositions['dragHandles']['c2'].left;
            var offsetTop = activeObject.top - this.previousPositions['dragHandles']['c2'].top;
            this.curve.path[1][3] += offsetLeft;
            this.curve.path[1][4] += offsetTop;
            this.controlCurve.path[2][1] += offsetLeft;
            this.controlCurve.path[2][2] += offsetTop;
        } else if (activeObject.name == 'bezier-curve') {
            var offsetLeft = this.curve.left - this.previousPositions['curve'].left;
            var offsetTop = this.curve.top - this.previousPositions['curve'].top;
            this.controlCurve.set('left', this.controlCurve.left + offsetLeft);
            this.controlCurve.set('top', this.controlCurve.top + offsetTop);
            this.updateDragHandleOffset(offsetLeft, offsetTop);
        }
        this.updatePreviousPositions();
    },
    updateBoundingBox: function() {
        var pathOffset = this.curve.pathOffset;
        var top = this.curve.top;
        var left = this.curve.left;

        this.curve.pathOffset = null;
        this.curve._setPositionDimensions({});

        var newTop = this.curve.top;
        var newLeft = this.curve.left;
        var newPathOffset = this.curve.pathOffset;

        var pathOffsetX = pathOffset.x - newPathOffset.x;
        var pathOffsetY = pathOffset.y - newPathOffset.y;

        this.curve.top = top - pathOffsetY;
        this.curve.left = left - pathOffsetX;

        this.curve.setCoords();
        this.updatePreviousPositions();
        this.canvas.renderAll();
        this.canvas.calcOffset();
    },
    updatePreviousPositions: function() {
        this.previousPositions = {
            'start': new BSPoint('start', this.curve.path[0][1], this.curve.path[0][2]), 
            'end': new BSPoint('end', this.curve.path[1][5], this.curve.path[1][6]),
            'c1': new BSPoint('c1', this.curve.path[1][1], this.curve.path[1][2]),
            'c2': new BSPoint('c2', this.curve.path[1][3], this.curve.path[1][4]),
            'curve': {'left' : this.curve.left, 'top' : this.curve.top},
            'controlCurve': {'left' : this.controlCurve.left, 'top' : this.controlCurve.top},
            'dragHandles': {
                'start' : {'left' : this.getDragHandle('start').left, 'top' : this.getDragHandle('start').top},
                'end' : {'left' :this.getDragHandle('end').left, 'top' : this.getDragHandle('end').top},
                'c1' : {'left' :this.getDragHandle('c1').left, 'top' : this.getDragHandle('c1').top},
                'c2' : {'left' :this.getDragHandle('c2').left, 'top' : this.getDragHandle('c2').top}
            }
        };
    },
    updateDragHandleOffset: function(offsetLeft, offsetTop) {
        this.getDragHandle('start').set('left', this.previousPositions['dragHandles']['start'].left + offsetLeft);
        this.getDragHandle('start').set('top', this.previousPositions['dragHandles']['start'].top + offsetTop);
        this.getDragHandle('end').set('left', this.previousPositions['dragHandles']['end'].left + offsetLeft);
        this.getDragHandle('end').set('top', this.previousPositions['dragHandles']['end'].top + offsetTop);
        this.getDragHandle('c1').set('left', this.previousPositions['dragHandles']['c1'].left + offsetLeft);
        this.getDragHandle('c1').set('top', this.previousPositions['dragHandles']['c1'].top + offsetTop);
        this.getDragHandle('c2').set('left', this.previousPositions['dragHandles']['c2'].left + offsetLeft);
        this.getDragHandle('c2').set('top', this.previousPositions['dragHandles']['c2'].top + offsetTop);
    },
    getPoints : function(){
        var str  = "M"+this.start.toString();
                str += " C" + this.c1.toString();
                str += " " + this.c2.toString();
                str += " " + this.end.toString();

        return str
    },

    getControlPoints : function(){
        var str  = "M"+this.start.toString();
                str += "L"+this.c1.toString();
                str += "L"+this.c2.toString();
                str += "L"+this.end.toString();

        return str
    },
    getCurveData: function() {
        var start = new BSPoint('start', this.curve.path[0][1], this.curve.path[0][2]);
        var end = new BSPoint('end', this.curve.path[1][5], this.curve.path[1][6]);
        var c1 = new BSPoint('c1',this.curve.path[1][1], this.curve.path[1][2]);
        var c2 = new BSPoint('c2',this.curve.path[1][3], this.curve.path[1][4]);
        var options = $.extend({}, this.curve.userOptions, { 'left': this.curve.left, 'top': this.curve.top});
        return {
            'points': {
                'start': start,
                'end': end,
                'c1': c1,
                'c2': c2
            },
            'pathOptions': options,
            'controlOptions': { 'left': this.controlCurve.left, 'top': this.controlCurve.top, pathOffset: this.controlCurve.pathOffset},
            'handleOptions': {
                'start': { 'left': this.getDragHandle('start').left, 'top': this.getDragHandle('start').top},
                'end': { 'left': this.getDragHandle('end').left, 'top': this.getDragHandle('end').top},
                'c1': { 'left': this.getDragHandle('c1').left, 'top': this.getDragHandle('c1').top},
                'c2': { 'left': this.getDragHandle('c2').left, 'top': this.getDragHandle('c2').top},
            }
        };
        
    },
    getClone: function(offset) {
        var data = this.getCurveData();
        if (offset && offset.left) {
            data.points.start.left += offset.left;
            data.points.end.left += offset.left;
            data.points.c1.left += offset.left;
            data.points.c2.left += offset.left;
            data.pathOptions.left += offset.left;
            data.controlOptions.left += offset.left;
            data.handleOptions.start.left += offset.left;
            data.handleOptions.end.left += offset.left;
            data.handleOptions.c1.left += offset.left;
            data.handleOptions.c2.left += offset.left;
        }
        if (offset && offset.top) {
            data.points.start.top += offset.top;
            data.points.end.top += offset.top;
            data.points.c1.top += offset.top;
            data.points.c2.top += offset.top;
            data.pathOptions.top += offset.top;
            data.controlOptions.top += offset.top;
            data.handleOptions.start.top += offset.top;
            data.handleOptions.end.top += offset.top;
            data.handleOptions.c1.top += offset.top;
            data.handleOptions.c2.top += offset.top;
        }
        return new bimsync.fabric.CubicBezier(this.canvas, data);
    }


}
