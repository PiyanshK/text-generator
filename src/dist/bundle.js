(function () {
  function r(e, n, t) {
    function o(i, f) {
      if (!n[i]) {
        if (!e[i]) {
          var c = "function" == typeof require && require;
          if (!f && c) return c(i, !0);
          if (u) return u(i, !0);
          var a = new Error("Cannot find module '" + i + "'");
          throw ((a.code = "MODULE_NOT_FOUND"), a);
        }
        var p = (n[i] = { exports: {} });
        e[i][0].call(
          p.exports,
          function (r) {
            var n = e[i][1][r];
            return o(n || r);
          },
          p,
          p.exports,
          r,
          e,
          n,
          t
        );
      }
      return n[i].exports;
    }
    for (
      var u = "function" == typeof require && require, i = 0;
      i < t.length;
      i++
    )
      o(t[i]);
    return o;
  }
  return r;
})()(
  {
    1: [
      function (require, module, exports) {
        /*
         * anime.js v3.2.1
         * (c) 2020 Julian Garnier
         * Released under the MIT license
         * animejs.com
         */

        "use strict";

        // Defaults

        var defaultInstanceSettings = {
          update: null,
          begin: null,
          loopBegin: null,
          changeBegin: null,
          change: null,
          changeComplete: null,
          loopComplete: null,
          complete: null,
          loop: 1,
          direction: "normal",
          autoplay: true,
          timelineOffset: 0,
        };

        var defaultTweenSettings = {
          duration: 1000,
          delay: 0,
          endDelay: 0,
          easing: "easeOutElastic(1, .5)",
          round: 0,
        };

        var validTransforms = [
          "translateX",
          "translateY",
          "translateZ",
          "rotate",
          "rotateX",
          "rotateY",
          "rotateZ",
          "scale",
          "scaleX",
          "scaleY",
          "scaleZ",
          "skew",
          "skewX",
          "skewY",
          "perspective",
          "matrix",
          "matrix3d",
        ];

        // Caching

        var cache = {
          CSS: {},
          springs: {},
        };

        // Utils

        function minMax(val, min, max) {
          return Math.min(Math.max(val, min), max);
        }

        function stringContains(str, text) {
          return str.indexOf(text) > -1;
        }

        function applyArguments(func, args) {
          return func.apply(null, args);
        }

        var is = {
          arr: function (a) {
            return Array.isArray(a);
          },
          obj: function (a) {
            return stringContains(Object.prototype.toString.call(a), "Object");
          },
          pth: function (a) {
            return is.obj(a) && a.hasOwnProperty("totalLength");
          },
          svg: function (a) {
            return a instanceof SVGElement;
          },
          inp: function (a) {
            return a instanceof HTMLInputElement;
          },
          dom: function (a) {
            return a.nodeType || is.svg(a);
          },
          str: function (a) {
            return typeof a === "string";
          },
          fnc: function (a) {
            return typeof a === "function";
          },
          und: function (a) {
            return typeof a === "undefined";
          },
          nil: function (a) {
            return is.und(a) || a === null;
          },
          hex: function (a) {
            return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(a);
          },
          rgb: function (a) {
            return /^rgb/.test(a);
          },
          hsl: function (a) {
            return /^hsl/.test(a);
          },
          col: function (a) {
            return is.hex(a) || is.rgb(a) || is.hsl(a);
          },
          key: function (a) {
            return (
              !defaultInstanceSettings.hasOwnProperty(a) &&
              !defaultTweenSettings.hasOwnProperty(a) &&
              a !== "targets" &&
              a !== "keyframes"
            );
          },
        };

        // Easings

        function parseEasingParameters(string) {
          var match = /\(([^)]+)\)/.exec(string);
          return match
            ? match[1].split(",").map(function (p) {
                return parseFloat(p);
              })
            : [];
        }

        // Spring solver inspired by Webkit Copyright © 2016 Apple Inc. All rights reserved. https://webkit.org/demos/spring/spring.js

        function spring(string, duration) {
          var params = parseEasingParameters(string);
          var mass = minMax(is.und(params[0]) ? 1 : params[0], 0.1, 100);
          var stiffness = minMax(is.und(params[1]) ? 100 : params[1], 0.1, 100);
          var damping = minMax(is.und(params[2]) ? 10 : params[2], 0.1, 100);
          var velocity = minMax(is.und(params[3]) ? 0 : params[3], 0.1, 100);
          var w0 = Math.sqrt(stiffness / mass);
          var zeta = damping / (2 * Math.sqrt(stiffness * mass));
          var wd = zeta < 1 ? w0 * Math.sqrt(1 - zeta * zeta) : 0;
          var a = 1;
          var b = zeta < 1 ? (zeta * w0 + -velocity) / wd : -velocity + w0;

          function solver(t) {
            var progress = duration ? (duration * t) / 1000 : t;
            if (zeta < 1) {
              progress =
                Math.exp(-progress * zeta * w0) *
                (a * Math.cos(wd * progress) + b * Math.sin(wd * progress));
            } else {
              progress = (a + b * progress) * Math.exp(-progress * w0);
            }
            if (t === 0 || t === 1) {
              return t;
            }
            return 1 - progress;
          }

          function getDuration() {
            var cached = cache.springs[string];
            if (cached) {
              return cached;
            }
            var frame = 1 / 6;
            var elapsed = 0;
            var rest = 0;
            while (true) {
              elapsed += frame;
              if (solver(elapsed) === 1) {
                rest++;
                if (rest >= 16) {
                  break;
                }
              } else {
                rest = 0;
              }
            }
            var duration = elapsed * frame * 1000;
            cache.springs[string] = duration;
            return duration;
          }

          return duration ? solver : getDuration;
        }

        // Basic steps easing implementation https://developer.mozilla.org/fr/docs/Web/CSS/transition-timing-function

        function steps(steps) {
          if (steps === void 0) steps = 10;

          return function (t) {
            return Math.ceil(minMax(t, 0.000001, 1) * steps) * (1 / steps);
          };
        }

        // BezierEasing https://github.com/gre/bezier-easing

        var bezier = (function () {
          var kSplineTableSize = 11;
          var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

          function A(aA1, aA2) {
            return 1.0 - 3.0 * aA2 + 3.0 * aA1;
          }
          function B(aA1, aA2) {
            return 3.0 * aA2 - 6.0 * aA1;
          }
          function C(aA1) {
            return 3.0 * aA1;
          }

          function calcBezier(aT, aA1, aA2) {
            return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT;
          }
          function getSlope(aT, aA1, aA2) {
            return (
              3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1)
            );
          }

          function binarySubdivide(aX, aA, aB, mX1, mX2) {
            var currentX,
              currentT,
              i = 0;
            do {
              currentT = aA + (aB - aA) / 2.0;
              currentX = calcBezier(currentT, mX1, mX2) - aX;
              if (currentX > 0.0) {
                aB = currentT;
              } else {
                aA = currentT;
              }
            } while (Math.abs(currentX) > 0.0000001 && ++i < 10);
            return currentT;
          }

          function newtonRaphsonIterate(aX, aGuessT, mX1, mX2) {
            for (var i = 0; i < 4; ++i) {
              var currentSlope = getSlope(aGuessT, mX1, mX2);
              if (currentSlope === 0.0) {
                return aGuessT;
              }
              var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
              aGuessT -= currentX / currentSlope;
            }
            return aGuessT;
          }

          function bezier(mX1, mY1, mX2, mY2) {
            if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) {
              return;
            }
            var sampleValues = new Float32Array(kSplineTableSize);

            if (mX1 !== mY1 || mX2 !== mY2) {
              for (var i = 0; i < kSplineTableSize; ++i) {
                sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
              }
            }

            function getTForX(aX) {
              var intervalStart = 0;
              var currentSample = 1;
              var lastSample = kSplineTableSize - 1;

              for (
                ;
                currentSample !== lastSample &&
                sampleValues[currentSample] <= aX;
                ++currentSample
              ) {
                intervalStart += kSampleStepSize;
              }

              --currentSample;

              var dist =
                (aX - sampleValues[currentSample]) /
                (sampleValues[currentSample + 1] - sampleValues[currentSample]);
              var guessForT = intervalStart + dist * kSampleStepSize;
              var initialSlope = getSlope(guessForT, mX1, mX2);

              if (initialSlope >= 0.001) {
                return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
              } else if (initialSlope === 0.0) {
                return guessForT;
              } else {
                return binarySubdivide(
                  aX,
                  intervalStart,
                  intervalStart + kSampleStepSize,
                  mX1,
                  mX2
                );
              }
            }

            return function (x) {
              if (mX1 === mY1 && mX2 === mY2) {
                return x;
              }
              if (x === 0 || x === 1) {
                return x;
              }
              return calcBezier(getTForX(x), mY1, mY2);
            };
          }

          return bezier;
        })();

        var penner = (function () {
          // Based on jQuery UI's implemenation of easing equations from Robert Penner (http://www.robertpenner.com/easing)

          var eases = {
            linear: function () {
              return function (t) {
                return t;
              };
            },
          };

          var functionEasings = {
            Sine: function () {
              return function (t) {
                return 1 - Math.cos((t * Math.PI) / 2);
              };
            },
            Circ: function () {
              return function (t) {
                return 1 - Math.sqrt(1 - t * t);
              };
            },
            Back: function () {
              return function (t) {
                return t * t * (3 * t - 2);
              };
            },
            Bounce: function () {
              return function (t) {
                var pow2,
                  b = 4;
                while (t < ((pow2 = Math.pow(2, --b)) - 1) / 11) {}
                return (
                  1 / Math.pow(4, 3 - b) -
                  7.5625 * Math.pow((pow2 * 3 - 2) / 22 - t, 2)
                );
              };
            },
            Elastic: function (amplitude, period) {
              if (amplitude === void 0) amplitude = 1;
              if (period === void 0) period = 0.5;

              var a = minMax(amplitude, 1, 10);
              var p = minMax(period, 0.1, 2);
              return function (t) {
                return t === 0 || t === 1
                  ? t
                  : -a *
                      Math.pow(2, 10 * (t - 1)) *
                      Math.sin(
                        ((t - 1 - (p / (Math.PI * 2)) * Math.asin(1 / a)) *
                          (Math.PI * 2)) /
                          p
                      );
              };
            },
          };

          var baseEasings = ["Quad", "Cubic", "Quart", "Quint", "Expo"];

          baseEasings.forEach(function (name, i) {
            functionEasings[name] = function () {
              return function (t) {
                return Math.pow(t, i + 2);
              };
            };
          });

          Object.keys(functionEasings).forEach(function (name) {
            var easeIn = functionEasings[name];
            eases["easeIn" + name] = easeIn;
            eases["easeOut" + name] = function (a, b) {
              return function (t) {
                return 1 - easeIn(a, b)(1 - t);
              };
            };
            eases["easeInOut" + name] = function (a, b) {
              return function (t) {
                return t < 0.5
                  ? easeIn(a, b)(t * 2) / 2
                  : 1 - easeIn(a, b)(t * -2 + 2) / 2;
              };
            };
            eases["easeOutIn" + name] = function (a, b) {
              return function (t) {
                return t < 0.5
                  ? (1 - easeIn(a, b)(1 - t * 2)) / 2
                  : (easeIn(a, b)(t * 2 - 1) + 1) / 2;
              };
            };
          });

          return eases;
        })();

        function parseEasings(easing, duration) {
          if (is.fnc(easing)) {
            return easing;
          }
          var name = easing.split("(")[0];
          var ease = penner[name];
          var args = parseEasingParameters(easing);
          switch (name) {
            case "spring":
              return spring(easing, duration);
            case "cubicBezier":
              return applyArguments(bezier, args);
            case "steps":
              return applyArguments(steps, args);
            default:
              return applyArguments(ease, args);
          }
        }

        // Strings

        function selectString(str) {
          try {
            var nodes = document.querySelectorAll(str);
            return nodes;
          } catch (e) {
            return;
          }
        }

        // Arrays

        function filterArray(arr, callback) {
          var len = arr.length;
          var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
          var result = [];
          for (var i = 0; i < len; i++) {
            if (i in arr) {
              var val = arr[i];
              if (callback.call(thisArg, val, i, arr)) {
                result.push(val);
              }
            }
          }
          return result;
        }

        function flattenArray(arr) {
          return arr.reduce(function (a, b) {
            return a.concat(is.arr(b) ? flattenArray(b) : b);
          }, []);
        }

        function toArray(o) {
          if (is.arr(o)) {
            return o;
          }
          if (is.str(o)) {
            o = selectString(o) || o;
          }
          if (o instanceof NodeList || o instanceof HTMLCollection) {
            return [].slice.call(o);
          }
          return [o];
        }

        function arrayContains(arr, val) {
          return arr.some(function (a) {
            return a === val;
          });
        }

        // Objects

        function cloneObject(o) {
          var clone = {};
          for (var p in o) {
            clone[p] = o[p];
          }
          return clone;
        }

        function replaceObjectProps(o1, o2) {
          var o = cloneObject(o1);
          for (var p in o1) {
            o[p] = o2.hasOwnProperty(p) ? o2[p] : o1[p];
          }
          return o;
        }

        function mergeObjects(o1, o2) {
          var o = cloneObject(o1);
          for (var p in o2) {
            o[p] = is.und(o1[p]) ? o2[p] : o1[p];
          }
          return o;
        }

        // Colors

        function rgbToRgba(rgbValue) {
          var rgb = /rgb\((\d+,\s*[\d]+,\s*[\d]+)\)/g.exec(rgbValue);
          return rgb ? "rgba(" + rgb[1] + ",1)" : rgbValue;
        }

        function hexToRgba(hexValue) {
          var rgx = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
          var hex = hexValue.replace(rgx, function (m, r, g, b) {
            return r + r + g + g + b + b;
          });
          var rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          var r = parseInt(rgb[1], 16);
          var g = parseInt(rgb[2], 16);
          var b = parseInt(rgb[3], 16);
          return "rgba(" + r + "," + g + "," + b + ",1)";
        }

        function hslToRgba(hslValue) {
          var hsl =
            /hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/g.exec(hslValue) ||
            /hsla\((\d+),\s*([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)\)/g.exec(
              hslValue
            );
          var h = parseInt(hsl[1], 10) / 360;
          var s = parseInt(hsl[2], 10) / 100;
          var l = parseInt(hsl[3], 10) / 100;
          var a = hsl[4] || 1;
          function hue2rgb(p, q, t) {
            if (t < 0) {
              t += 1;
            }
            if (t > 1) {
              t -= 1;
            }
            if (t < 1 / 6) {
              return p + (q - p) * 6 * t;
            }
            if (t < 1 / 2) {
              return q;
            }
            if (t < 2 / 3) {
              return p + (q - p) * (2 / 3 - t) * 6;
            }
            return p;
          }
          var r, g, b;
          if (s == 0) {
            r = g = b = l;
          } else {
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
          }
          return (
            "rgba(" + r * 255 + "," + g * 255 + "," + b * 255 + "," + a + ")"
          );
        }

        function colorToRgb(val) {
          if (is.rgb(val)) {
            return rgbToRgba(val);
          }
          if (is.hex(val)) {
            return hexToRgba(val);
          }
          if (is.hsl(val)) {
            return hslToRgba(val);
          }
        }

        // Units

        function getUnit(val) {
          var split =
            /[+-]?\d*\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(%|px|pt|em|rem|in|cm|mm|ex|ch|pc|vw|vh|vmin|vmax|deg|rad|turn)?$/.exec(
              val
            );
          if (split) {
            return split[1];
          }
        }

        function getTransformUnit(propName) {
          if (
            stringContains(propName, "translate") ||
            propName === "perspective"
          ) {
            return "px";
          }
          if (
            stringContains(propName, "rotate") ||
            stringContains(propName, "skew")
          ) {
            return "deg";
          }
        }

        // Values

        function getFunctionValue(val, animatable) {
          if (!is.fnc(val)) {
            return val;
          }
          return val(animatable.target, animatable.id, animatable.total);
        }

        function getAttribute(el, prop) {
          return el.getAttribute(prop);
        }

        function convertPxToUnit(el, value, unit) {
          var valueUnit = getUnit(value);
          if (arrayContains([unit, "deg", "rad", "turn"], valueUnit)) {
            return value;
          }
          var cached = cache.CSS[value + unit];
          if (!is.und(cached)) {
            return cached;
          }
          var baseline = 100;
          var tempEl = document.createElement(el.tagName);
          var parentEl =
            el.parentNode && el.parentNode !== document
              ? el.parentNode
              : document.body;
          parentEl.appendChild(tempEl);
          tempEl.style.position = "absolute";
          tempEl.style.width = baseline + unit;
          var factor = baseline / tempEl.offsetWidth;
          parentEl.removeChild(tempEl);
          var convertedUnit = factor * parseFloat(value);
          cache.CSS[value + unit] = convertedUnit;
          return convertedUnit;
        }

        function getCSSValue(el, prop, unit) {
          if (prop in el.style) {
            var uppercasePropName = prop
              .replace(/([a-z])([A-Z])/g, "$1-$2")
              .toLowerCase();
            var value =
              el.style[prop] ||
              getComputedStyle(el).getPropertyValue(uppercasePropName) ||
              "0";
            return unit ? convertPxToUnit(el, value, unit) : value;
          }
        }

        function getAnimationType(el, prop) {
          if (
            is.dom(el) &&
            !is.inp(el) &&
            (!is.nil(getAttribute(el, prop)) || (is.svg(el) && el[prop]))
          ) {
            return "attribute";
          }
          if (is.dom(el) && arrayContains(validTransforms, prop)) {
            return "transform";
          }
          if (is.dom(el) && prop !== "transform" && getCSSValue(el, prop)) {
            return "css";
          }
          if (el[prop] != null) {
            return "object";
          }
        }

        function getElementTransforms(el) {
          if (!is.dom(el)) {
            return;
          }
          var str = el.style.transform || "";
          var reg = /(\w+)\(([^)]*)\)/g;
          var transforms = new Map();
          var m;
          while ((m = reg.exec(str))) {
            transforms.set(m[1], m[2]);
          }
          return transforms;
        }

        function getTransformValue(el, propName, animatable, unit) {
          var defaultVal = stringContains(propName, "scale")
            ? 1
            : 0 + getTransformUnit(propName);
          var value = getElementTransforms(el).get(propName) || defaultVal;
          if (animatable) {
            animatable.transforms.list.set(propName, value);
            animatable.transforms["last"] = propName;
          }
          return unit ? convertPxToUnit(el, value, unit) : value;
        }

        function getOriginalTargetValue(target, propName, unit, animatable) {
          switch (getAnimationType(target, propName)) {
            case "transform":
              return getTransformValue(target, propName, animatable, unit);
            case "css":
              return getCSSValue(target, propName, unit);
            case "attribute":
              return getAttribute(target, propName);
            default:
              return target[propName] || 0;
          }
        }

        function getRelativeValue(to, from) {
          var operator = /^(\*=|\+=|-=)/.exec(to);
          if (!operator) {
            return to;
          }
          var u = getUnit(to) || 0;
          var x = parseFloat(from);
          var y = parseFloat(to.replace(operator[0], ""));
          switch (operator[0][0]) {
            case "+":
              return x + y + u;
            case "-":
              return x - y + u;
            case "*":
              return x * y + u;
          }
        }

        function validateValue(val, unit) {
          if (is.col(val)) {
            return colorToRgb(val);
          }
          if (/\s/g.test(val)) {
            return val;
          }
          var originalUnit = getUnit(val);
          var unitLess = originalUnit
            ? val.substr(0, val.length - originalUnit.length)
            : val;
          if (unit) {
            return unitLess + unit;
          }
          return unitLess;
        }

        // getTotalLength() equivalent for circle, rect, polyline, polygon and line shapes
        // adapted from https://gist.github.com/SebLambla/3e0550c496c236709744

        function getDistance(p1, p2) {
          return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        }

        function getCircleLength(el) {
          return Math.PI * 2 * getAttribute(el, "r");
        }

        function getRectLength(el) {
          return getAttribute(el, "width") * 2 + getAttribute(el, "height") * 2;
        }

        function getLineLength(el) {
          return getDistance(
            { x: getAttribute(el, "x1"), y: getAttribute(el, "y1") },
            { x: getAttribute(el, "x2"), y: getAttribute(el, "y2") }
          );
        }

        function getPolylineLength(el) {
          var points = el.points;
          var totalLength = 0;
          var previousPos;
          for (var i = 0; i < points.numberOfItems; i++) {
            var currentPos = points.getItem(i);
            if (i > 0) {
              totalLength += getDistance(previousPos, currentPos);
            }
            previousPos = currentPos;
          }
          return totalLength;
        }

        function getPolygonLength(el) {
          var points = el.points;
          return (
            getPolylineLength(el) +
            getDistance(
              points.getItem(points.numberOfItems - 1),
              points.getItem(0)
            )
          );
        }

        // Path animation

        function getTotalLength(el) {
          if (el.getTotalLength) {
            return el.getTotalLength();
          }
          switch (el.tagName.toLowerCase()) {
            case "circle":
              return getCircleLength(el);
            case "rect":
              return getRectLength(el);
            case "line":
              return getLineLength(el);
            case "polyline":
              return getPolylineLength(el);
            case "polygon":
              return getPolygonLength(el);
          }
        }

        function setDashoffset(el) {
          var pathLength = getTotalLength(el);
          el.setAttribute("stroke-dasharray", pathLength);
          return pathLength;
        }

        // Motion path

        function getParentSvgEl(el) {
          var parentEl = el.parentNode;
          while (is.svg(parentEl)) {
            if (!is.svg(parentEl.parentNode)) {
              break;
            }
            parentEl = parentEl.parentNode;
          }
          return parentEl;
        }

        function getParentSvg(pathEl, svgData) {
          var svg = svgData || {};
          var parentSvgEl = svg.el || getParentSvgEl(pathEl);
          var rect = parentSvgEl.getBoundingClientRect();
          var viewBoxAttr = getAttribute(parentSvgEl, "viewBox");
          var width = rect.width;
          var height = rect.height;
          var viewBox =
            svg.viewBox ||
            (viewBoxAttr ? viewBoxAttr.split(" ") : [0, 0, width, height]);
          return {
            el: parentSvgEl,
            viewBox: viewBox,
            x: viewBox[0] / 1,
            y: viewBox[1] / 1,
            w: width,
            h: height,
            vW: viewBox[2],
            vH: viewBox[3],
          };
        }

        function getPath(path, percent) {
          var pathEl = is.str(path) ? selectString(path)[0] : path;
          var p = percent || 100;
          return function (property) {
            return {
              property: property,
              el: pathEl,
              svg: getParentSvg(pathEl),
              totalLength: getTotalLength(pathEl) * (p / 100),
            };
          };
        }

        function getPathProgress(path, progress, isPathTargetInsideSVG) {
          function point(offset) {
            if (offset === void 0) offset = 0;

            var l = progress + offset >= 1 ? progress + offset : 0;
            return path.el.getPointAtLength(l);
          }
          var svg = getParentSvg(path.el, path.svg);
          var p = point();
          var p0 = point(-1);
          var p1 = point(+1);
          var scaleX = isPathTargetInsideSVG ? 1 : svg.w / svg.vW;
          var scaleY = isPathTargetInsideSVG ? 1 : svg.h / svg.vH;
          switch (path.property) {
            case "x":
              return (p.x - svg.x) * scaleX;
            case "y":
              return (p.y - svg.y) * scaleY;
            case "angle":
              return (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI;
          }
        }

        // Decompose value

        function decomposeValue(val, unit) {
          // const rgx = /-?\d*\.?\d+/g; // handles basic numbers
          // const rgx = /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g; // handles exponents notation
          var rgx = /[+-]?\d*\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g; // handles exponents notation
          var value =
            validateValue(is.pth(val) ? val.totalLength : val, unit) + "";
          return {
            original: value,
            numbers: value.match(rgx) ? value.match(rgx).map(Number) : [0],
            strings: is.str(val) || unit ? value.split(rgx) : [],
          };
        }

        // Animatables

        function parseTargets(targets) {
          var targetsArray = targets
            ? flattenArray(
                is.arr(targets) ? targets.map(toArray) : toArray(targets)
              )
            : [];
          return filterArray(targetsArray, function (item, pos, self) {
            return self.indexOf(item) === pos;
          });
        }

        function getAnimatables(targets) {
          var parsed = parseTargets(targets);
          return parsed.map(function (t, i) {
            return {
              target: t,
              id: i,
              total: parsed.length,
              transforms: { list: getElementTransforms(t) },
            };
          });
        }

        // Properties

        function normalizePropertyTweens(prop, tweenSettings) {
          var settings = cloneObject(tweenSettings);
          // Override duration if easing is a spring
          if (/^spring/.test(settings.easing)) {
            settings.duration = spring(settings.easing);
          }
          if (is.arr(prop)) {
            var l = prop.length;
            var isFromTo = l === 2 && !is.obj(prop[0]);
            if (!isFromTo) {
              // Duration divided by the number of tweens
              if (!is.fnc(tweenSettings.duration)) {
                settings.duration = tweenSettings.duration / l;
              }
            } else {
              // Transform [from, to] values shorthand to a valid tween value
              prop = { value: prop };
            }
          }
          var propArray = is.arr(prop) ? prop : [prop];
          return propArray
            .map(function (v, i) {
              var obj = is.obj(v) && !is.pth(v) ? v : { value: v };
              // Default delay value should only be applied to the first tween
              if (is.und(obj.delay)) {
                obj.delay = !i ? tweenSettings.delay : 0;
              }
              // Default endDelay value should only be applied to the last tween
              if (is.und(obj.endDelay)) {
                obj.endDelay =
                  i === propArray.length - 1 ? tweenSettings.endDelay : 0;
              }
              return obj;
            })
            .map(function (k) {
              return mergeObjects(k, settings);
            });
        }

        function flattenKeyframes(keyframes) {
          var propertyNames = filterArray(
            flattenArray(
              keyframes.map(function (key) {
                return Object.keys(key);
              })
            ),
            function (p) {
              return is.key(p);
            }
          ).reduce(function (a, b) {
            if (a.indexOf(b) < 0) {
              a.push(b);
            }
            return a;
          }, []);
          var properties = {};
          var loop = function (i) {
            var propName = propertyNames[i];
            properties[propName] = keyframes.map(function (key) {
              var newKey = {};
              for (var p in key) {
                if (is.key(p)) {
                  if (p == propName) {
                    newKey.value = key[p];
                  }
                } else {
                  newKey[p] = key[p];
                }
              }
              return newKey;
            });
          };

          for (var i = 0; i < propertyNames.length; i++) loop(i);
          return properties;
        }

        function getProperties(tweenSettings, params) {
          var properties = [];
          var keyframes = params.keyframes;
          if (keyframes) {
            params = mergeObjects(flattenKeyframes(keyframes), params);
          }
          for (var p in params) {
            if (is.key(p)) {
              properties.push({
                name: p,
                tweens: normalizePropertyTweens(params[p], tweenSettings),
              });
            }
          }
          return properties;
        }

        // Tweens

        function normalizeTweenValues(tween, animatable) {
          var t = {};
          for (var p in tween) {
            var value = getFunctionValue(tween[p], animatable);
            if (is.arr(value)) {
              value = value.map(function (v) {
                return getFunctionValue(v, animatable);
              });
              if (value.length === 1) {
                value = value[0];
              }
            }
            t[p] = value;
          }
          t.duration = parseFloat(t.duration);
          t.delay = parseFloat(t.delay);
          return t;
        }

        function normalizeTweens(prop, animatable) {
          var previousTween;
          return prop.tweens.map(function (t) {
            var tween = normalizeTweenValues(t, animatable);
            var tweenValue = tween.value;
            var to = is.arr(tweenValue) ? tweenValue[1] : tweenValue;
            var toUnit = getUnit(to);
            var originalValue = getOriginalTargetValue(
              animatable.target,
              prop.name,
              toUnit,
              animatable
            );
            var previousValue = previousTween
              ? previousTween.to.original
              : originalValue;
            var from = is.arr(tweenValue) ? tweenValue[0] : previousValue;
            var fromUnit = getUnit(from) || getUnit(originalValue);
            var unit = toUnit || fromUnit;
            if (is.und(to)) {
              to = previousValue;
            }
            tween.from = decomposeValue(from, unit);
            tween.to = decomposeValue(getRelativeValue(to, from), unit);
            tween.start = previousTween ? previousTween.end : 0;
            tween.end =
              tween.start + tween.delay + tween.duration + tween.endDelay;
            tween.easing = parseEasings(tween.easing, tween.duration);
            tween.isPath = is.pth(tweenValue);
            tween.isPathTargetInsideSVG =
              tween.isPath && is.svg(animatable.target);
            tween.isColor = is.col(tween.from.original);
            if (tween.isColor) {
              tween.round = 1;
            }
            previousTween = tween;
            return tween;
          });
        }

        // Tween progress

        var setProgressValue = {
          css: function (t, p, v) {
            return (t.style[p] = v);
          },
          attribute: function (t, p, v) {
            return t.setAttribute(p, v);
          },
          object: function (t, p, v) {
            return (t[p] = v);
          },
          transform: function (t, p, v, transforms, manual) {
            transforms.list.set(p, v);
            if (p === transforms.last || manual) {
              var str = "";
              transforms.list.forEach(function (value, prop) {
                str += prop + "(" + value + ") ";
              });
              t.style.transform = str;
            }
          },
        };

        // Set Value helper

        function setTargetsValue(targets, properties) {
          var animatables = getAnimatables(targets);
          animatables.forEach(function (animatable) {
            for (var property in properties) {
              var value = getFunctionValue(properties[property], animatable);
              var target = animatable.target;
              var valueUnit = getUnit(value);
              var originalValue = getOriginalTargetValue(
                target,
                property,
                valueUnit,
                animatable
              );
              var unit = valueUnit || getUnit(originalValue);
              var to = getRelativeValue(
                validateValue(value, unit),
                originalValue
              );
              var animType = getAnimationType(target, property);
              setProgressValue[animType](
                target,
                property,
                to,
                animatable.transforms,
                true
              );
            }
          });
        }

        // Animations

        function createAnimation(animatable, prop) {
          var animType = getAnimationType(animatable.target, prop.name);
          if (animType) {
            var tweens = normalizeTweens(prop, animatable);
            var lastTween = tweens[tweens.length - 1];
            return {
              type: animType,
              property: prop.name,
              animatable: animatable,
              tweens: tweens,
              duration: lastTween.end,
              delay: tweens[0].delay,
              endDelay: lastTween.endDelay,
            };
          }
        }

        function getAnimations(animatables, properties) {
          return filterArray(
            flattenArray(
              animatables.map(function (animatable) {
                return properties.map(function (prop) {
                  return createAnimation(animatable, prop);
                });
              })
            ),
            function (a) {
              return !is.und(a);
            }
          );
        }

        // Create Instance

        function getInstanceTimings(animations, tweenSettings) {
          var animLength = animations.length;
          var getTlOffset = function (anim) {
            return anim.timelineOffset ? anim.timelineOffset : 0;
          };
          var timings = {};
          timings.duration = animLength
            ? Math.max.apply(
                Math,
                animations.map(function (anim) {
                  return getTlOffset(anim) + anim.duration;
                })
              )
            : tweenSettings.duration;
          timings.delay = animLength
            ? Math.min.apply(
                Math,
                animations.map(function (anim) {
                  return getTlOffset(anim) + anim.delay;
                })
              )
            : tweenSettings.delay;
          timings.endDelay = animLength
            ? timings.duration -
              Math.max.apply(
                Math,
                animations.map(function (anim) {
                  return getTlOffset(anim) + anim.duration - anim.endDelay;
                })
              )
            : tweenSettings.endDelay;
          return timings;
        }

        var instanceID = 0;

        function createNewInstance(params) {
          var instanceSettings = replaceObjectProps(
            defaultInstanceSettings,
            params
          );
          var tweenSettings = replaceObjectProps(defaultTweenSettings, params);
          var properties = getProperties(tweenSettings, params);
          var animatables = getAnimatables(params.targets);
          var animations = getAnimations(animatables, properties);
          var timings = getInstanceTimings(animations, tweenSettings);
          var id = instanceID;
          instanceID++;
          return mergeObjects(instanceSettings, {
            id: id,
            children: [],
            animatables: animatables,
            animations: animations,
            duration: timings.duration,
            delay: timings.delay,
            endDelay: timings.endDelay,
          });
        }

        // Core

        var activeInstances = [];

        var engine = (function () {
          var raf;

          function play() {
            if (
              !raf &&
              (!isDocumentHidden() || !anime.suspendWhenDocumentHidden) &&
              activeInstances.length > 0
            ) {
              raf = requestAnimationFrame(step);
            }
          }
          function step(t) {
            // memo on algorithm issue:
            // dangerous iteration over mutable `activeInstances`
            // (that collection may be updated from within callbacks of `tick`-ed animation instances)
            var activeInstancesLength = activeInstances.length;
            var i = 0;
            while (i < activeInstancesLength) {
              var activeInstance = activeInstances[i];
              if (!activeInstance.paused) {
                activeInstance.tick(t);
                i++;
              } else {
                activeInstances.splice(i, 1);
                activeInstancesLength--;
              }
            }
            raf = i > 0 ? requestAnimationFrame(step) : undefined;
          }

          function handleVisibilityChange() {
            if (!anime.suspendWhenDocumentHidden) {
              return;
            }

            if (isDocumentHidden()) {
              // suspend ticks
              raf = cancelAnimationFrame(raf);
            } else {
              // is back to active tab
              // first adjust animations to consider the time that ticks were suspended
              activeInstances.forEach(function (instance) {
                return instance._onDocumentVisibility();
              });
              engine();
            }
          }
          if (typeof document !== "undefined") {
            document.addEventListener(
              "visibilitychange",
              handleVisibilityChange
            );
          }

          return play;
        })();

        function isDocumentHidden() {
          return !!document && document.hidden;
        }

        // Public Instance

        function anime(params) {
          if (params === void 0) params = {};

          var startTime = 0,
            lastTime = 0,
            now = 0;
          var children,
            childrenLength = 0;
          var resolve = null;

          function makePromise(instance) {
            var promise =
              window.Promise &&
              new Promise(function (_resolve) {
                return (resolve = _resolve);
              });
            instance.finished = promise;
            return promise;
          }

          var instance = createNewInstance(params);
          var promise = makePromise(instance);

          function toggleInstanceDirection() {
            var direction = instance.direction;
            if (direction !== "alternate") {
              instance.direction =
                direction !== "normal" ? "normal" : "reverse";
            }
            instance.reversed = !instance.reversed;
            children.forEach(function (child) {
              return (child.reversed = instance.reversed);
            });
          }

          function adjustTime(time) {
            return instance.reversed ? instance.duration - time : time;
          }

          function resetTime() {
            startTime = 0;
            lastTime = adjustTime(instance.currentTime) * (1 / anime.speed);
          }

          function seekChild(time, child) {
            if (child) {
              child.seek(time - child.timelineOffset);
            }
          }

          function syncInstanceChildren(time) {
            if (!instance.reversePlayback) {
              for (var i = 0; i < childrenLength; i++) {
                seekChild(time, children[i]);
              }
            } else {
              for (var i$1 = childrenLength; i$1--; ) {
                seekChild(time, children[i$1]);
              }
            }
          }

          function setAnimationsProgress(insTime) {
            var i = 0;
            var animations = instance.animations;
            var animationsLength = animations.length;
            while (i < animationsLength) {
              var anim = animations[i];
              var animatable = anim.animatable;
              var tweens = anim.tweens;
              var tweenLength = tweens.length - 1;
              var tween = tweens[tweenLength];
              // Only check for keyframes if there is more than one tween
              if (tweenLength) {
                tween =
                  filterArray(tweens, function (t) {
                    return insTime < t.end;
                  })[0] || tween;
              }
              var elapsed =
                minMax(insTime - tween.start - tween.delay, 0, tween.duration) /
                tween.duration;
              var eased = isNaN(elapsed) ? 1 : tween.easing(elapsed);
              var strings = tween.to.strings;
              var round = tween.round;
              var numbers = [];
              var toNumbersLength = tween.to.numbers.length;
              var progress = void 0;
              for (var n = 0; n < toNumbersLength; n++) {
                var value = void 0;
                var toNumber = tween.to.numbers[n];
                var fromNumber = tween.from.numbers[n] || 0;
                if (!tween.isPath) {
                  value = fromNumber + eased * (toNumber - fromNumber);
                } else {
                  value = getPathProgress(
                    tween.value,
                    eased * toNumber,
                    tween.isPathTargetInsideSVG
                  );
                }
                if (round) {
                  if (!(tween.isColor && n > 2)) {
                    value = Math.round(value * round) / round;
                  }
                }
                numbers.push(value);
              }
              // Manual Array.reduce for better performances
              var stringsLength = strings.length;
              if (!stringsLength) {
                progress = numbers[0];
              } else {
                progress = strings[0];
                for (var s = 0; s < stringsLength; s++) {
                  var a = strings[s];
                  var b = strings[s + 1];
                  var n$1 = numbers[s];
                  if (!isNaN(n$1)) {
                    if (!b) {
                      progress += n$1 + " ";
                    } else {
                      progress += n$1 + b;
                    }
                  }
                }
              }
              setProgressValue[anim.type](
                animatable.target,
                anim.property,
                progress,
                animatable.transforms
              );
              anim.currentValue = progress;
              i++;
            }
          }

          function setCallback(cb) {
            if (instance[cb] && !instance.passThrough) {
              instance[cb](instance);
            }
          }

          function countIteration() {
            if (instance.remaining && instance.remaining !== true) {
              instance.remaining--;
            }
          }

          function setInstanceProgress(engineTime) {
            var insDuration = instance.duration;
            var insDelay = instance.delay;
            var insEndDelay = insDuration - instance.endDelay;
            var insTime = adjustTime(engineTime);
            instance.progress = minMax((insTime / insDuration) * 100, 0, 100);
            instance.reversePlayback = insTime < instance.currentTime;
            if (children) {
              syncInstanceChildren(insTime);
            }
            if (!instance.began && instance.currentTime > 0) {
              instance.began = true;
              setCallback("begin");
            }
            if (!instance.loopBegan && instance.currentTime > 0) {
              instance.loopBegan = true;
              setCallback("loopBegin");
            }
            if (insTime <= insDelay && instance.currentTime !== 0) {
              setAnimationsProgress(0);
            }
            if (
              (insTime >= insEndDelay &&
                instance.currentTime !== insDuration) ||
              !insDuration
            ) {
              setAnimationsProgress(insDuration);
            }
            if (insTime > insDelay && insTime < insEndDelay) {
              if (!instance.changeBegan) {
                instance.changeBegan = true;
                instance.changeCompleted = false;
                setCallback("changeBegin");
              }
              setCallback("change");
              setAnimationsProgress(insTime);
            } else {
              if (instance.changeBegan) {
                instance.changeCompleted = true;
                instance.changeBegan = false;
                setCallback("changeComplete");
              }
            }
            instance.currentTime = minMax(insTime, 0, insDuration);
            if (instance.began) {
              setCallback("update");
            }
            if (engineTime >= insDuration) {
              lastTime = 0;
              countIteration();
              if (!instance.remaining) {
                instance.paused = true;
                if (!instance.completed) {
                  instance.completed = true;
                  setCallback("loopComplete");
                  setCallback("complete");
                  if (!instance.passThrough && "Promise" in window) {
                    resolve();
                    promise = makePromise(instance);
                  }
                }
              } else {
                startTime = now;
                setCallback("loopComplete");
                instance.loopBegan = false;
                if (instance.direction === "alternate") {
                  toggleInstanceDirection();
                }
              }
            }
          }

          instance.reset = function () {
            var direction = instance.direction;
            instance.passThrough = false;
            instance.currentTime = 0;
            instance.progress = 0;
            instance.paused = true;
            instance.began = false;
            instance.loopBegan = false;
            instance.changeBegan = false;
            instance.completed = false;
            instance.changeCompleted = false;
            instance.reversePlayback = false;
            instance.reversed = direction === "reverse";
            instance.remaining = instance.loop;
            children = instance.children;
            childrenLength = children.length;
            for (var i = childrenLength; i--; ) {
              instance.children[i].reset();
            }
            if (
              (instance.reversed && instance.loop !== true) ||
              (direction === "alternate" && instance.loop === 1)
            ) {
              instance.remaining++;
            }
            setAnimationsProgress(instance.reversed ? instance.duration : 0);
          };

          // internal method (for engine) to adjust animation timings before restoring engine ticks (rAF)
          instance._onDocumentVisibility = resetTime;

          // Set Value helper

          instance.set = function (targets, properties) {
            setTargetsValue(targets, properties);
            return instance;
          };

          instance.tick = function (t) {
            now = t;
            if (!startTime) {
              startTime = now;
            }
            setInstanceProgress((now + (lastTime - startTime)) * anime.speed);
          };

          instance.seek = function (time) {
            setInstanceProgress(adjustTime(time));
          };

          instance.pause = function () {
            instance.paused = true;
            resetTime();
          };

          instance.play = function () {
            if (!instance.paused) {
              return;
            }
            if (instance.completed) {
              instance.reset();
            }
            instance.paused = false;
            activeInstances.push(instance);
            resetTime();
            engine();
          };

          instance.reverse = function () {
            toggleInstanceDirection();
            instance.completed = instance.reversed ? false : true;
            resetTime();
          };

          instance.restart = function () {
            instance.reset();
            instance.play();
          };

          instance.remove = function (targets) {
            var targetsArray = parseTargets(targets);
            removeTargetsFromInstance(targetsArray, instance);
          };

          instance.reset();

          if (instance.autoplay) {
            instance.play();
          }

          return instance;
        }

        // Remove targets from animation

        function removeTargetsFromAnimations(targetsArray, animations) {
          for (var a = animations.length; a--; ) {
            if (arrayContains(targetsArray, animations[a].animatable.target)) {
              animations.splice(a, 1);
            }
          }
        }

        function removeTargetsFromInstance(targetsArray, instance) {
          var animations = instance.animations;
          var children = instance.children;
          removeTargetsFromAnimations(targetsArray, animations);
          for (var c = children.length; c--; ) {
            var child = children[c];
            var childAnimations = child.animations;
            removeTargetsFromAnimations(targetsArray, childAnimations);
            if (!childAnimations.length && !child.children.length) {
              children.splice(c, 1);
            }
          }
          if (!animations.length && !children.length) {
            instance.pause();
          }
        }

        function removeTargetsFromActiveInstances(targets) {
          var targetsArray = parseTargets(targets);
          for (var i = activeInstances.length; i--; ) {
            var instance = activeInstances[i];
            removeTargetsFromInstance(targetsArray, instance);
          }
        }

        // Stagger helpers

        function stagger(val, params) {
          if (params === void 0) params = {};

          var direction = params.direction || "normal";
          var easing = params.easing ? parseEasings(params.easing) : null;
          var grid = params.grid;
          var axis = params.axis;
          var fromIndex = params.from || 0;
          var fromFirst = fromIndex === "first";
          var fromCenter = fromIndex === "center";
          var fromLast = fromIndex === "last";
          var isRange = is.arr(val);
          var val1 = isRange ? parseFloat(val[0]) : parseFloat(val);
          var val2 = isRange ? parseFloat(val[1]) : 0;
          var unit = getUnit(isRange ? val[1] : val) || 0;
          var start = params.start || 0 + (isRange ? val1 : 0);
          var values = [];
          var maxValue = 0;
          return function (el, i, t) {
            if (fromFirst) {
              fromIndex = 0;
            }
            if (fromCenter) {
              fromIndex = (t - 1) / 2;
            }
            if (fromLast) {
              fromIndex = t - 1;
            }
            if (!values.length) {
              for (var index = 0; index < t; index++) {
                if (!grid) {
                  values.push(Math.abs(fromIndex - index));
                } else {
                  var fromX = !fromCenter
                    ? fromIndex % grid[0]
                    : (grid[0] - 1) / 2;
                  var fromY = !fromCenter
                    ? Math.floor(fromIndex / grid[0])
                    : (grid[1] - 1) / 2;
                  var toX = index % grid[0];
                  var toY = Math.floor(index / grid[0]);
                  var distanceX = fromX - toX;
                  var distanceY = fromY - toY;
                  var value = Math.sqrt(
                    distanceX * distanceX + distanceY * distanceY
                  );
                  if (axis === "x") {
                    value = -distanceX;
                  }
                  if (axis === "y") {
                    value = -distanceY;
                  }
                  values.push(value);
                }
                maxValue = Math.max.apply(Math, values);
              }
              if (easing) {
                values = values.map(function (val) {
                  return easing(val / maxValue) * maxValue;
                });
              }
              if (direction === "reverse") {
                values = values.map(function (val) {
                  return axis
                    ? val < 0
                      ? val * -1
                      : -val
                    : Math.abs(maxValue - val);
                });
              }
            }
            var spacing = isRange ? (val2 - val1) / maxValue : val1;
            return start + spacing * (Math.round(values[i] * 100) / 100) + unit;
          };
        }

        // Timeline

        function timeline(params) {
          if (params === void 0) params = {};

          var tl = anime(params);
          tl.duration = 0;
          tl.add = function (instanceParams, timelineOffset) {
            var tlIndex = activeInstances.indexOf(tl);
            var children = tl.children;
            if (tlIndex > -1) {
              activeInstances.splice(tlIndex, 1);
            }
            function passThrough(ins) {
              ins.passThrough = true;
            }
            for (var i = 0; i < children.length; i++) {
              passThrough(children[i]);
            }
            var insParams = mergeObjects(
              instanceParams,
              replaceObjectProps(defaultTweenSettings, params)
            );
            insParams.targets = insParams.targets || params.targets;
            var tlDuration = tl.duration;
            insParams.autoplay = false;
            insParams.direction = tl.direction;
            insParams.timelineOffset = is.und(timelineOffset)
              ? tlDuration
              : getRelativeValue(timelineOffset, tlDuration);
            passThrough(tl);
            tl.seek(insParams.timelineOffset);
            var ins = anime(insParams);
            passThrough(ins);
            children.push(ins);
            var timings = getInstanceTimings(children, params);
            tl.delay = timings.delay;
            tl.endDelay = timings.endDelay;
            tl.duration = timings.duration;
            tl.seek(0);
            tl.reset();
            if (tl.autoplay) {
              tl.play();
            }
            return tl;
          };
          return tl;
        }

        anime.version = "3.2.1";
        anime.speed = 1;
        // TODO:#review: naming, documentation
        anime.suspendWhenDocumentHidden = true;
        anime.running = activeInstances;
        anime.remove = removeTargetsFromActiveInstances;
        anime.get = getOriginalTargetValue;
        anime.set = setTargetsValue;
        anime.convertPx = convertPxToUnit;
        anime.path = getPath;
        anime.setDashoffset = setDashoffset;
        anime.stagger = stagger;
        anime.timeline = timeline;
        anime.easing = parseEasings;
        anime.penner = penner;
        anime.random = function (min, max) {
          return Math.floor(Math.random() * (max - min + 1)) + min;
        };

        module.exports = anime;
      },
      {},
    ],
    2: [
      function (require, module, exports) {
        // txtgen@2.2.8, by @ndaidong - built on Sun, 08 Nov 2020 08:54:01 GMT - published under MIT license
        !(function (e, n) {
          "object" == typeof exports && "undefined" != typeof module
            ? n(exports)
            : "function" == typeof define && define.amd
            ? define(["exports"], n)
            : n(
                ((e =
                  "undefined" != typeof globalThis
                    ? globalThis
                    : e || self).txtgen = {})
              );
        })(this, function (e) {
          const n = new Date().getTimezoneOffset(),
            t =
              ((() => {
                const e = Math.abs(n / 60);
                ["GMT", n < 0 ? "+" : "-", String(e).padStart(4, "0")].join("");
              })(),
              (e = []) => [...new Set(e)]);
          var a = [
              "alligator",
              "ant",
              "bear",
              "bee",
              "bird",
              "camel",
              "cat",
              "cheetah",
              "chicken",
              "chimpanzee",
              "cow",
              "crocodile",
              "deer",
              "dog",
              "dolphin",
              "duck",
              "eagle",
              "elephant",
              "fish",
              "fly",
              "fox",
              "frog",
              "giraffe",
              "goat",
              "goldfish",
              "hamster",
              "hippopotamus",
              "horse",
              "kangaroo",
              "kitten",
              "lion",
              "lobster",
              "monkey",
              "octopus",
              "owl",
              "panda",
              "pig",
              "puppy",
              "rabbit",
              "rat",
              "scorpion",
              "seal",
              "shark",
              "sheep",
              "snail",
              "snake",
              "spider",
              "squirrel",
              "tiger",
              "turtle",
              "wolf",
              "zebra",
              "apple",
              "apricot",
              "banana",
              "blackberry",
              "blueberry",
              "cherry",
              "cranberry",
              "currant",
              "fig",
              "grape",
              "grapefruit",
              "grapes",
              "kiwi",
              "kumquat",
              "lemon",
              "lime",
              "melon",
              "nectarine",
              "orange",
              "peach",
              "pear",
              "persimmon",
              "pineapple",
              "plum",
              "pomegranate",
              "prune",
              "raspberry",
              "strawberry",
              "tangerine",
              "watermelon",
            ],
            i = [
              "adaptable",
              "adventurous",
              "affable",
              "affectionate",
              "agreeable",
              "alert",
              "alluring",
              "ambitious",
              "ambitious",
              "amiable",
              "amicable",
              "amused",
              "amusing",
              "boundless",
              "brave",
              "brave",
              "bright",
              "bright",
              "broad-minded",
              "calm",
              "calm",
              "capable",
              "careful",
              "charming",
              "charming",
              "cheerful",
              "coherent",
              "comfortable",
              "communicative",
              "compassionate",
              "confident",
              "conscientious",
              "considerate",
              "convivial",
              "cooperative",
              "courageous",
              "courageous",
              "courteous",
              "creative",
              "credible",
              "cultured",
              "dashing",
              "dazzling",
              "debonair",
              "decisive",
              "decisive",
              "decorous",
              "delightful",
              "detailed",
              "determined",
              "determined",
              "diligent",
              "diligent",
              "diplomatic",
              "discreet",
              "discreet",
              "dynamic",
              "dynamic",
              "eager",
              "easygoing",
              "efficient",
              "elated",
              "eminent",
              "emotional",
              "enchanting",
              "encouraging",
              "endurable",
              "energetic",
              "energetic",
              "entertaining",
              "enthusiastic",
              "enthusiastic",
              "excellent",
              "excited",
              "exclusive",
              "exuberant",
              "exuberant",
              "fabulous",
              "fair",
              "fair-minded",
              "faithful",
              "faithful",
              "fantastic",
              "fearless",
              "fearless",
              "fine",
              "forceful",
              "frank",
              "frank",
              "friendly",
              "friendly",
              "funny",
              "funny",
              "generous",
              "generous",
              "gentle",
              "gentle",
              "glorious",
              "good",
              "good",
              "gregarious",
              "happy",
              "hard-working",
              "harmonious",
              "helpful",
              "helpful",
              "hilarious",
              "honest",
              "honorable",
              "humorous",
              "imaginative",
              "impartial",
              "impartial",
              "independent",
              "industrious",
              "instinctive",
              "intellectual",
              "intelligent",
              "intuitive",
              "inventive",
              "jolly",
              "joyous",
              "kind",
              "kind",
              "kind-hearted",
              "knowledgeable",
              "level",
              "likeable",
              "lively",
              "lovely",
              "loving",
              "loving",
              "loyal",
              "lucky",
              "mature",
              "modern",
              "modest",
              "neat",
              "nice",
              "nice",
              "obedient",
              "optimistic",
              "painstaking",
              "passionate",
              "patient",
              "peaceful",
              "perfect",
              "persistent",
              "philosophical",
              "pioneering",
              "placid",
              "placid",
              "plausible",
              "pleasant",
              "plucky",
              "plucky",
              "polite",
              "powerful",
              "practical",
              "pro-active",
              "productive",
              "protective",
              "proud",
              "punctual",
              "quick-witted",
              "quiet",
              "quiet",
              "rational",
              "receptive",
              "reflective",
              "reliable",
              "relieved",
              "reserved",
              "resolute",
              "resourceful",
              "responsible",
              "rhetorical",
              "righteous",
              "romantic",
              "romantic",
              "sedate",
              "seemly",
              "selective",
              "self-assured",
              "self-confident",
              "self-disciplined",
              "sensible",
              "sensitive",
              "sensitive",
              "shrewd",
              "shy",
              "silly",
              "sincere",
              "sincere",
              "skillful",
              "smiling",
              "sociable",
              "splendid",
              "steadfast",
              "stimulating",
              "straightforward",
              "successful",
              "succinct",
              "sympathetic",
              "talented",
              "thoughtful",
              "thoughtful",
              "thrifty",
              "tidy",
              "tough",
              "tough",
              "trustworthy",
              "unassuming",
              "unbiased",
              "understanding",
              "unusual",
              "upbeat",
              "versatile",
              "vigorous",
              "vivacious",
              "warm",
              "warmhearted",
              "willing",
              "willing",
              "wise",
              "witty",
              "witty",
              "wonderful",
            ],
            o = ["a", "e", "i", "o", "u", "y"],
            s = [
              "the {{noun}} is {{a_noun}}",
              "{{a_noun}} is {{an_adjective}} {{noun}}",
              "the first {{adjective}} {{noun}} is, in its own way, {{a_noun}}",
              "their {{noun}} was, in this moment, {{an_adjective}} {{noun}}",
              "{{a_noun}} is {{a_noun}} from the right perspective",
              "the literature would have us believe that {{an_adjective}} {{noun}} is not but {{a_noun}}",
              "{{an_adjective}} {{noun}} is {{a_noun}} of the mind",
              "the {{adjective}} {{noun}} reveals itself as {{an_adjective}} {{noun}} to those who look",
              "authors often misinterpret the {{noun}} as {{an_adjective}} {{noun}}, when in actuality it feels more like {{an_adjective}} {{noun}}",
              "we can assume that any instance of {{a_noun}} can be construed as {{an_adjective}} {{noun}}",
              "they were lost without the {{adjective}} {{noun}} that composed their {{noun}}",
              "the {{adjective}} {{noun}} comes from {{an_adjective}} {{noun}}",
              "{{a_noun}} can hardly be considered {{an_adjective}} {{noun}} without also being {{a_noun}}",
              "few can name {{an_adjective}} {{noun}} that isn't {{an_adjective}} {{noun}}",
              "some posit the {{adjective}} {{noun}} to be less than {{adjective}}",
              "{{a_noun}} of the {{noun}} is assumed to be {{an_adjective}} {{noun}}",
              "{{a_noun}} sees {{a_noun}} as {{an_adjective}} {{noun}}",
              "the {{noun}} of {{a_noun}} becomes {{an_adjective}} {{noun}}",
              "{{a_noun}} is {{a_noun}}'s {{noun}}",
              "{{a_noun}} is the {{noun}} of {{a_noun}}",
              "{{an_adjective}} {{noun}}'s {{noun}} comes with it the thought that the {{adjective}} {{noun}} is {{a_noun}}",
              "{{nouns}} are {{adjective}} {{nouns}}",
              "{{adjective}} {{nouns}} show us how {{nouns}} can be {{nouns}}",
              "before {{nouns}}, {{nouns}} were only {{nouns}}",
              "those {{nouns}} are nothing more than {{nouns}}",
              "some {{adjective}} {{nouns}} are thought of simply as {{nouns}}",
              "one cannot separate {{nouns}} from {{adjective}} {{nouns}}",
              "the {{nouns}} could be said to resemble {{adjective}} {{nouns}}",
              "{{an_adjective}} {{noun}} without {{nouns}} is truly a {{noun}} of {{adjective}} {{nouns}}",
            ],
            r = [
              "to be more specific, ",
              "in recent years, ",
              "however, ",
              "by the way",
              "of course, ",
              "some assert that ",
              "if this was somewhat unclear, ",
              "unfortunately, that is wrong; on the contrary, ",
              "it's very tricky, if not impossible, ",
              "this could be, or perhaps ",
              "this is not to discredit the idea that ",
              "we know that ",
              "it's an undeniable fact, really; ",
              "framed in a different way, ",
              "what we don't know for sure is whether or not ",
              "as far as we can estimate, ",
              "as far as he is concerned, ",
              "the zeitgeist contends that ",
              "though we assume the latter, ",
              "far from the truth, ",
              "extending this logic, ",
              "nowhere is it disputed that ",
              "in modern times ",
              "in ancient times ",
              "recent controversy aside, ",
              "washing and polishing the car,",
              "having been a gymnast, ",
              "after a long day at school and work, ",
              "waking to the buzz of the alarm clock, ",
              "draped neatly on a hanger, ",
              "shouting with happiness, ",
            ];
          let u;
          const l = (e) => {
            u = e;
          };
          l(Math.random);
          const c = () => u(),
            d = (e, n) => {
              const t = e,
                a = n - e + 1;
              return Math.floor(c() * a) + t;
            },
            h = (e) => {
              let n;
              for (; !n; ) n = e[d(0, e.length - 1)];
              return n;
            },
            g = (e) => {
              let n = "a";
              return e.match(/^(a|e|i|o)/) && (n = "an"), `${n} ${e}`;
            },
            p = ["noun", "a_noun", "nouns", "adjective", "an_adjective"],
            f = {
              noun: () => h(a),
              a_noun: () => g(h(a)),
              nouns: () => {
                return (e = h(a)).endsWith("s")
                  ? e
                  : (e.match(/(ss|ish|ch|x|us)$/)
                      ? (e += "e")
                      : e.endsWith("y") &&
                        !o.includes(e.charAt(e.length - 2)) &&
                        ((e = e.slice(0, e.length - 1)), (e += "ie")),
                    e + "s");
                var e;
              },
              adjective: () => h(i),
              an_adjective: () => g(h(i)),
            },
            m = () =>
              ((e) => {
                let n = e;
                const t = e.match(/\{\{(.+?)\}\}/g);
                if (t && t.length)
                  for (let e = 0; e < t.length; e++) {
                    const a = t[e]
                      .replace("{{", "")
                      .replace("}}", "")
                      .replace(/^[\s\xa0]+|[\s\xa0]+$/g, "")
                      .replace(/\r?\n|\r/g, " ")
                      .replace(/\s\s+|\r/g, " ");
                    let i;
                    p.includes(a) && (i = f[a]()), (n = n.replace(t[e], i));
                  }
                return n;
              })(h(s)),
            v = () => {
              let e = (c() < 0.33 ? h(r) : "") + m();
              return (
                (e = e.charAt(0).toUpperCase() + e.slice(1)),
                (e += (() => {
                  const e = ".......!?!?;...".split("");
                  return h(e);
                })()),
                e
              );
            },
            b = (e = 0) => {
              e || (e = d(3, 10));
              const n = Math.min(e, 15),
                t = [];
              for (; t.length < n; ) {
                const e = v();
                t.push(e);
              }
              return t.join(" ");
            };
          (e.addAdjectives = (e = []) => {
            const n = i.concat(e);
            return (i = t(n)).length;
          }),
            (e.addNouns = (e = []) => {
              const n = a.concat(e);
              return (a = t(n)).length;
            }),
            (e.addTemplates = (e = []) => {
              const n = s.concat(e);
              return (s = t(n)).length;
            }),
            (e.article = (e = 0) => {
              e || (e = d(3, 10));
              const n = Math.min(e, 15),
                t = [];
              for (; t.length < n; ) {
                const e = b();
                t.push(e);
              }
              return t.join("\n\n");
            }),
            (e.getAdjectives = () => [...i]),
            (e.getNouns = () => [...a]),
            (e.getTemplates = () => [...s]),
            (e.paragraph = b),
            (e.sentence = v),
            (e.setAdjectives = (e = []) => (i = t(e)).length),
            (e.setNouns = (e = []) => (a = t(e)).length),
            (e.setRandom = l),
            (e.setTemplates = (e = []) => (s = t(e)).length),
            Object.defineProperty(e, "__esModule", { value: !0 });
        });
      },
      {},
    ],
    3: [
      function (require, module, exports) {
        // Text Gen

        const text = document.getElementById("text");
        const txtgen = require("txtgen");
        const container = document.querySelector("container");

        document
          .getElementById("generateparagraph")
          .addEventListener("click", function () {
            var paragraph = txtgen.paragraph();
            text.innerHTML = paragraph;
          });

        document
          .getElementById("generatesentence")
          .addEventListener("click", function () {
            var sentence = txtgen.sentence();
            text.innerHTML = sentence;
          });

        document
          .getElementById("generatearticle")
          .addEventListener("click", function () {
            var article = txtgen.article();
            text.innerHTML = article;
          });

        // Animations

        const animate = require("animejs");
        let contact = document.getElementById("contact");
        let socialtitleone = document.getElementById("social-title-one");
        let socialtitletwo = document.getElementById("social-title-two");
        let socialtitlethree = document.getElementById("social-title-three");

        contact.onmousemove = function () {
          animate({
            targets: contact,
            background: "#171414",
            duration: 3000,
          });
          animate({
            opacity: "1",
            duration: 250,
            easing: "easeInOutQuad",
            targets: socialtitleone,
            color: "#fff",
            begin: function () {
              document.getElementById("social-title-one").style.display =
                "block";
            },
          });
          animate({
            opacity: "1",
            duration: 250,
            easing: "easeInOutQuad",
            targets: socialtitletwo,
            color: "#fff",
            begin: function () {
              document.getElementById("social-title-two").style.display =
                "block";
            },
          });
          animate({
            opacity: "1",
            duration: 250,
            easing: "easeInOutQuad",
            targets: socialtitlethree,
            color: "#fff",
            begin: function () {
              document.getElementById("social-title-three").style.display =
                "block";
            },
          });
        };
      },
      { animejs: 1, txtgen: 2 },
    ],
  },
  {},
  [3]
);
