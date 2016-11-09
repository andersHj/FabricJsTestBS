!function($) {
    var FabricTest = function() {
        this.init();
    };

    FabricTest.prototype.init = function() {
        var self = this;
        self.fillColor = "rgba(0, 0, 255, 0.85)";
        fabric.Object.prototype.set({
////            transparentCorners: false,
           cornerColor: '#5e65ff',
            // cornerStrokeColor: '#2626ff',
            borderScaleFactor: 2
        });
        self.removedObjects = [];

        self.canvas = new fabric.Canvas('canvas');
        self.canvas.freeDrawingBrush.color = self.fillColor;
        self.canvas.freeDrawingBrush.width = 5;
        self.canvas.on({
            'object:selected': function(e) { self.onObjectSelected(e, self); },
            'object:moving': self.onObjectMoving,
            'object:modified': function(e) { self.onObjectModified(e, self); },
            'before:selection:cleared': self.onBeforeSelectionCleared
        });
        $('.add-curve').click(function() {
          self.canvasAddBezier(null, self);
        });
        $('.add-line').click(function() {
          self.canvasAddLine(null, self);
        });
        //delete selected object(s) by clicking the delete key
        $(document).keyup(function(event) {
            event.preventDefault();
            if (event.keyCode == 46) { // del
                self.canvasRemoveSelected(self);
            } else if (event.keyCode == 71) { // g
                self.canvasGroupObjects(self);
            } else if (event.keyCode == 85) { // u
                self.canvasUngroupObjects(self);
            } else if (event.keyCode == 68) { // d
                self.canvasToggleDrawMode(event);
            } else if (event.keyCode == 67) { // c
                self.canvasCopySelected(self);
            } else if (event.keyCode == 90) { // z
                self.undoRemoveObject(self);
            }
            return false;
        });

        self.canvas.on({
            'touch:longpress' : function() {
                self.canvasGroupOrUngroupObjects(self);
            }
        });
        $(self.container).find('.add-curve').click(function(event) {self.canvasAddBezier(event, self);});
        $(self.container).find('.add-line').click(function(event) {self.canvasAddLine(event, self);});
        drawGrid(self.canvas);
        self.canvasAddBezier(null, self);

    };

    function drawGrid(canvas) {
        var gridsize = 50,
            cellWidth = 50;
        for (var x = 1; x < (canvas.width / gridsize); x++) { 
          canvas.add(new fabric.Line([cellWidth * x, 0, cellWidth * x, 600], { stroke: "#cccccc", strokeWidth: 1, selectable: false }));
          canvas.add(new fabric.Line([0, cellWidth * x, 600, cellWidth * x], { stroke: "#cccccc", strokeWidth: 1, selectable: false })); 
        }
    }

    FabricTest.prototype.onObjectSelected = function(e, self) {
        var activeObject = e.target;
        if (self.previousSelected && isBezierObject(self.previousSelected.name)) {
            if (activeObject == self.previousSelected) {
                console.log("ye");
            }
        }
        self.previousSelected = activeObject;
        if (isBezierObject(activeObject.name)) {
            activeObject.getBezier().showDragControls();
            // console.log("select", e.target.name);
        }
    };

    FabricTest.prototype.onObjectMoving = function(e) {
        var activeObject = e.target;
        if (isBezierObject(activeObject.name)) {
            activeObject.getBezier().updateBezier(activeObject);
            if ('bezier-curve' == activeObject.name) {
              activeObject.getBezier().hideDragControls(true);
            }
        }
        // console.log("mov", e.target.name);
    };
    FabricTest.prototype.onBeforeSelectionCleared = function(e) {
        var activeObject = e.target;
        if (activeObject && isBezierObject(activeObject.name)) {
            activeObject.getBezier().hideDragControls();
            console.log("select clear", e.target.name);
        }
    };
    FabricTest.prototype.onObjectModified = function(e, self) {
        var activeObject = e.target;
        if (isBezierObject(activeObject.name)) {
            if (activeObject.name == 'bezier-curve') {
                // Deselect curve so that it is possible to move control point on first click
                self.canvas.deactivateAllWithDispatch();
                // Select one of the control points instead so that set color ++ will still work.
                var handleId = self.canvas.getObjects().indexOf(activeObject.getBezier().getDragHandle('start'));
                if (handleId) {
                    self.canvas.setActiveObject(self.canvas.item(handleId));
                }
            } else {
                activeObject.getBezier().updateBoundingBox();
            }
            activeObject.getBezier().showDragControls();
        }
        console.log("modified", e.target.name);
    };

    function isBezierObject(objectName) {
        if (!objectName) {
            return false;
        }
        return objectName == "bezier-curve" ||
            objectName == "drag-handle-start" ||
            objectName == "drag-handle-end" ||
            objectName == "drag-handle-c1" ||
            objectName == "drag-handle-c2" ||
            objectName == "control-curve";
    };

    
    FabricTest.prototype.canvasGroupOrUngroupObjects = function(self) {
        var activeGroup = self.canvas.getActiveGroup();
        if (!activeGroup) {
            this.canvasUngroupObjects(self);
        } else {
            self.canvasGroupObjects(self);
        }
    };

    FabricTest.prototype.canvasGroupObjects = function(self) {
        var activeGroup = self.canvas.getActiveGroup();
        if (!activeGroup) {
            return;
        }
        var objectsInGroup = activeGroup.getObjects();

        activeGroup.clone(function(newGroup) {
            self.canvas.discardActiveGroup();
            objectsInGroup.forEach(function(object) {
                self.canvas.remove(object);
            });
            self.canvas.add(newGroup);
        });
    };

    FabricTest.prototype.canvasUngroupObjects = function(self) {
        var activeObject = self.canvas.getActiveObject();
        if (activeObject && activeObject.type == "group") {
            var items = activeObject._objects;
            activeObject._restoreObjectsState();
            self.canvas.remove(activeObject);
            for (var i = 0; i < items.length; i++) {
                self.canvas.add(items[i]);
                self.canvas.item(self.canvas.size() - 1).hasControls = true;
            }
            self.canvas.renderAll();
        }
    };

    FabricTest.prototype.canvasCopySelected = function(self) {
        var activeObject = self.canvas.getActiveObject();
        var activeGroup = self.canvas.getActiveGroup();
        if (!activeObject && !activeGroup) {
            return;
        }
        if (activeGroup) {
            return; // Not supported yet
            var items = activeGroup._objects;
            var groupOffset = {top : activeGroup.top, left: activeGroup.left };
            for (var i = 0; i < items.length; i++) {
                var cloneObject = self.getClonedObject(items[i], groupOffset);
                self.canvas.add(cloneObject);
            }
        } else if (activeObject && activeObject.type == "group") {
            return; // not supported yet
        } else {
            var newObject = self.getClonedObject(activeObject);
            if (!newObject) {
                return;
            }
            if ('bezier' == newObject.name) {
                newObject.addToCanvas();
            } else {
                self.canvas.add(newObject);
            }
        }
        self.canvas.renderAll();
    };
    FabricTest.prototype.getClonedObject = function(object, groupOffset) {
        if (object && object.type == "group") {
            return;
        }
        if (isBezierObject(object.name)) {
            return object.getBezier().getClone({left: 50, top: 50});
        }
        var newObject = fabric.util.object.clone(object);
        var top = newObject.top + 20;
        var left = newObject.left + 20;
        if (groupOffset) {
            top += groupOffset.top;
            left += groupOffset.left;
        }
        newObject.set("top", top);
        newObject.set("left", left);
        return newObject;
    };

    FabricTest.prototype.canvasSetColor = function(color, self) {
        self.canvas.freeDrawingBrush.color = color;
        self.fillColor = color;
        var activeObject = self.canvas.getActiveObject();
        var activeGroup = self.canvas.getActiveGroup();
        if (activeGroup) {
          var objectsInGroup = activeGroup.getObjects();
          objectsInGroup.forEach(function(object) {
            setObjectColor(object, color);
          });
        } else if (activeObject) {
            setObjectColor(activeObject, color);
        }
        self.canvas.renderAll();

        function setObjectColor(object, color) {
            var objectType = object.get('type');
            if (isBezierObject(object.name)) {
                object.getBezier().getCurve().set('stroke', color);
            } else if (objectType == 'text') {
                var bgColor = new fabric.Color(color);
                var fontColor = self.getFontColor(bgColor);
                object.set("textBackgroundColor", color);
                object.set("fill", fontColor);
            } else if (objectType == 'line' || 
                    objectType == 'path') { // free draw
                object.set("stroke", color);
            } else {
                object.set("fill", color); //svg objects
            }
        }
    };

    FabricTest.prototype.canvasToggleDrawMode = function(event, on) {
        if (event) {
            event.preventDefault();
        }
        var self = this;
        self.canvas.isDrawingMode = (typeof on !== "undefined") ? on : !self.canvas.isDrawingMode;
        if (self.canvas.isDrawingMode) {
            $('.markup-draw').addClass('active');
        } else {
            $('.markup-draw').removeClass('active');
        }
    };

    FabricTest.prototype.canvasAddSvg = function(src, scale, self) {
        self.canvasToggleDrawMode(null, false);
        fabric.loadSVGFromURL(src, function(image, options) {
            var shape = fabric.util.groupSVGElements(image, options);
            if (shape.isSameColor && shape.isSameColor() || !shape.paths) {
              shape.setFill(self.fillColor);
            } else if (shape.paths) {
              for (var i = 0; i < shape.paths.length; i++) {
                shape.paths[i].setFill(self.fillColor);
              }
            }
            self.addObjectToCanvas(shape, scale);
        });
    };

    FabricTest.prototype.canvasAddBezier = function(event, self) {
        if (event) {
          event.preventDefault();
        }
//        var bezier = new bimsync.fabric.CubicBezier(self.canvas, { stroke: self.fillColor });
        var bezier = new bimsync.fabric.CubicBezier(self.canvas, { pathOptions : { stroke: 'blue'} });
        bezier.addToCanvas();
    };

    FabricTest.prototype.canvasAddLine = function(event, self) {
        if (event) {
          event.preventDefault();
        }
        var line = new fabric.Line([0, 0, 150, 0], {
            stroke: self.fillColor,
            strokeWidth: 4,
            padding: 10
        });
        line.setControlsVisibility({
            tl: false,
            tr: false,
            bl: false,
            br: false
        });
        self.addObjectToCanvas(line, 1);
    };

    FabricTest.prototype.canvasAddRectangle = function(event, self) {
        event.preventDefault();
        self.canvasAddSvg('/img/rect.svg', 0.6, self);
    };
    
    FabricTest.prototype.canvasAddOval = function(event, self) {
        event.preventDefault();
        self.canvasAddSvg('/img/oval.svg', 0.6, self);
    };
    
    FabricTest.prototype.canvasAddCloud = function(event, self) {
        event.preventDefault();
        self.canvasAddSvg('/img/cloud.svg', 0.6, self);
    };

    FabricTest.prototype.canvasAddArrow = function(event, self) {
        event.preventDefault();
        self.canvasAddSvg('/img/arrow.svg', 0.5, self);
    };
    
    FabricTest.prototype.getFontColor = function(bgColor) {
        try {
            return ColorUtils.getContrastColor(bgColor._source[0], bgColor._source[1], bgColor._source[2], bgColor._source[3]);
        } catch (e) {
            return "#000";
        }
    };

    FabricTest.prototype.canvasAddText = function(text, self) {
        if (text) {
            var bgColor = new fabric.Color(self.fillColor);
            var fontColor = self.getFontColor(bgColor);

            text = " " + text +" ";
            var textSample = new fabric.Text(text, {
                fontFamily: 'helvetica',
                fontSize: 18,
                fill: fontColor,
                originX: 'left',
                hasRotatingPoint: true,
                centerTransform: true,
                lockUniScaling: true,
                textBackgroundColor: self.fillColor
            });
            textSample.set(self.getObjectDefaultPosition(textSample));
            self.canvas.add(textSample);
        }
    };
    
    FabricTest.prototype.addObjectToCanvas = function(object, scale) {
        object.scale(scale).setCoords();
        object.set(this.getObjectDefaultPosition(object));
        this.canvas.add(object);
    };

    FabricTest.prototype.getObjectDefaultPosition = function(object) {
        var top = (this.canvas.height / 2) - (object.height * object.scaleY) / 2;
        var left = (this.canvas.width / 2) - (object.width * object.scaleX) / 2;
        return { 'top': top, 'left': left };
    };
    
    FabricTest.prototype.canvasRemoveSelected = function(self) {
        var activeObject = self.canvas.getActiveObject();
        var activeGroup = self.canvas.getActiveGroup();
        if (activeGroup) {
          var objectsInGroup = activeGroup.getObjects();
          self.canvas.discardActiveGroup();
          objectsInGroup.forEach(function(object) {
            self.removeObject(self, object);
            // self.canvas.remove(object);
            // self.removedObjects.push(object);
          });
        } else if (activeObject) {
          self.removeObject(self, activeObject);
        }
    };
    FabricTest.prototype.removeObject = function(self, object) {
        if (isBezierObject(object.name)) {
            var removed = object.getBezier().removeFromCanvas();
            if (removed) {
                self.removedObjects.push(object.getBezier());
            }
        } else {
            self.canvas.remove(object);
            self.removedObjects.push(object);
        }
    }

    FabricTest.prototype.undoRemoveObject = function(self) {
        if (!self.removedObjects.length) {
            return;
        }
        var object = self.removedObjects.pop();
        if ('bezier' == object.name) {
            object.getBezier().addToCanvas();
        } else {
            self.canvas.add(object);
        }
        
    };
    
    FabricTest.prototype.exportAsPng = function(callback, withBackground) {
        if (typeof callback == 'function' && callback && this.canvas && this.canvas.getObjects().length) {
            this.canvas.deactivateAllWithDispatch();
            var scaleFactorX = this.options.originalWidth / this.canvas.width;
            var scaleFactorY = this.options.originalHeight / this.canvas.height;
            this.scaleCanvas(scaleFactorX, scaleFactorY, withBackground);
            var exportWithBackground;
            if (withBackground) {
                exportWithBackground = this.canvas.toDataURL('png');
            }
            this.canvas.backgroundImage = 0;
            //Hack to get correct size in all browsers, canvas size and exported image size is not equal in all browsers
            var self = this;
            var tmpMarkup = this.canvas.toDataURL('png');
            var image = new Image();
            image.addEventListener('load', function() {
                var newScaleX = self.options.originalWidth / image.width;
                var newScaleY = self.options.originalHeight / image.height;
                self.scaleCanvas(newScaleX, newScaleY);
                var markup = self.canvas.toDataURL('png');
                callback.call(self.$element[0], markup, exportWithBackground, jQuery.extend(true, {}, self.canvas.getObjects()));
                self.destroyCanvas();
            });
            image.src = tmpMarkup;
        } else {
            callback.call(this.$element[0], null);
        }
    };

    FabricTest.prototype.scaleCanvas = function(scaleFactorX, scaleFactorY, scaleBackground) {
        var self = this;
        this.canvas.setHeight(this.canvas.getHeight() * scaleFactorY);
        this.canvas.setWidth(this.canvas.getWidth() * scaleFactorX);
        
        var objects = this.canvas.getObjects();
        for (var i in objects) {
            self.scaleObject(objects[i], scaleFactorX, scaleFactorY);
        }
        if (scaleBackground) {
            this.canvas.backgroundImage.width = this.canvas.backgroundImage.width * scaleFactorX;
            this.canvas.backgroundImage.height = this.canvas.backgroundImage.height * scaleFactorY;
        }
        
        this.canvas.renderAll();
    };
    
    FabricTest.prototype.scaleObject = function(object, scaleFactorX, scaleFactorY) {
        var scaleX = object.scaleX;
        var scaleY = object.scaleY;
        var left = object.left;
        var top = object.top;
        
        var tempScaleX = scaleX * scaleFactorX;
        var tempScaleY = scaleY * scaleFactorY;
        var tempLeft = left * scaleFactorX;
        var tempTop = top * scaleFactorY;
        
        object.scaleX = tempScaleX;
        object.scaleY = tempScaleY;
        object.left = tempLeft;
        object.top = tempTop;
        
        object.setCoords();
    }

    FabricTest.prototype.destroyCanvas = function() {
        var parent = this.$element.parent();
        try {
            this.canvas.clear();
        } catch(e) {
        }
        
        $(parent).find('.markup-container').remove();
        this.$element.remove();
    };

    FabricTest.prototype.calculateOffset = function() {
        this.canvas.calcOffset();
    };

    $.fn.fabricTest = function(option, parameter) {
        var args = Array.prototype.slice.call(arguments);
        return this.each(function() {
            var $this = $(this);
            var options = typeof option == 'object' && option;
            var data = $this.data('fabricTest');
            if (!(typeof data == 'object' && data)) $this.data('fabricTest', (data = new FabricTest(this, options, args[1])));
            if (option == 'destroy') data.destroyCanvas();
            else if (option == 'export') data.exportAsPng(args[1], args[2]);
            else if (option == 'setSrc') data.setSrc(parameter);
            else if (option == 'calculateOffset') data.calculateOffset();
        });
    };

    $.fn.fabricTest.defaults = {};

    $.fn.fabricTest.Constructor = FabricTest;

    $(function() {
      $('#canvas').fabricTest();
    });
}(window.jQuery);
