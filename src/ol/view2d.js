// FIXME getView3D has not return type
// FIXME remove getExtent?

goog.provide('ol.View2D');
goog.provide('ol.View2DProperty');

goog.require('goog.vec.Mat3');
goog.require('goog.vec.Quaternion');
goog.require('goog.vec.Vec3');
goog.require('ol.Constraints');
goog.require('ol.Coordinate');
goog.require('ol.Extent');
goog.require('ol.IView2D');
goog.require('ol.IView3D');
goog.require('ol.Projection');
goog.require('ol.ResolutionConstraint');
goog.require('ol.RotationConstraint');
goog.require('ol.Size');
goog.require('ol.View');
goog.require('ol.View3D');
goog.require('ol.animation');
goog.require('ol.easing');
goog.require('ol.ellipsoid.WGS84');
goog.require('ol.projection');
goog.require('ol.vec.Mat3');


/**
 * @enum {string}
 */
ol.View2DProperty = {
  CENTER: 'center',
  PROJECTION: 'projection',
  RESOLUTION: 'resolution',
  ROTATION: 'rotation'
};



/**
 * @constructor
 * @implements {ol.IView2D}
 * @implements {ol.IView3D}
 * @extends {ol.View}
 * @param {ol.View2DOptions=} opt_view2DOptions View2D options.
 */
ol.View2D = function(opt_view2DOptions) {
  goog.base(this);
  var view2DOptions = opt_view2DOptions || {};

  /**
   * @type {Object.<string, *>}
   */
  var values = {};
  values[ol.View2DProperty.CENTER] = goog.isDef(view2DOptions.center) ?
      view2DOptions.center : null;
  values[ol.View2DProperty.PROJECTION] = ol.projection.createProjection(
      view2DOptions.projection, 'EPSG:3857');
  if (goog.isDef(view2DOptions.resolution)) {
    values[ol.View2DProperty.RESOLUTION] = view2DOptions.resolution;
  } else if (goog.isDef(view2DOptions.zoom)) {
    var projectionExtent = values[ol.View2DProperty.PROJECTION].getExtent();
    var size = Math.max(
        projectionExtent.maxX - projectionExtent.minX,
        projectionExtent.maxY - projectionExtent.minY);
    values[ol.View2DProperty.RESOLUTION] =
        size / (ol.DEFAULT_TILE_SIZE * Math.pow(2, view2DOptions.zoom));
  }
  values[ol.View2DProperty.ROTATION] = view2DOptions.rotation;
  this.setValues(values);

  /**
   * @private
   * @type {ol.Constraints}
   */
  this.constraints_ = ol.View2D.createConstraints_(view2DOptions);
  if (goog.isDef(view2DOptions.view3D)) {
    this._view3D = view2DOptions.view3D;
  }

};
goog.inherits(ol.View2D, ol.View);


/**
 * @inheritDoc
 */
ol.View2D.prototype.getCenter = function() {
  return /** @type {ol.Coordinate|undefined} */ (
      this.get(ol.View2DProperty.CENTER));
};
goog.exportProperty(
    ol.View2D.prototype,
    'getCenter',
    ol.View2D.prototype.getCenter);


/**
 * @param {ol.Size} size Box pixel size.
 * @return {ol.Extent} Extent.
 */
ol.View2D.prototype.getExtent = function(size) {
  goog.asserts.assert(this.isDef());
  var center = this.getCenter();
  var resolution = this.getResolution();
  var minX = center.x - resolution * size.width / 2;
  var minY = center.y - resolution * size.height / 2;
  var maxX = center.x + resolution * size.width / 2;
  var maxY = center.y + resolution * size.height / 2;
  return new ol.Extent(minX, minY, maxX, maxY);
};


/**
 * @inheritDoc
 */
ol.View2D.prototype.getProjection = function() {
  return /** @type {ol.Projection|undefined} */ (
      this.get(ol.View2DProperty.PROJECTION));
};
goog.exportProperty(
    ol.View2D.prototype,
    'getProjection',
    ol.View2D.prototype.getProjection);


/**
 * @inheritDoc
 */
ol.View2D.prototype.getResolution = function() {
  return /** @type {number|undefined} */ (
      this.get(ol.View2DProperty.RESOLUTION));
};
goog.exportProperty(
    ol.View2D.prototype,
    'getResolution',
    ol.View2D.prototype.getResolution);


/**
 * @param {ol.Extent} extent Extent.
 * @param {ol.Size} size Box pixel size.
 * @return {number} Resolution.
 */
ol.View2D.prototype.getResolutionForExtent = function(extent, size) {
  var xResolution = (extent.maxX - extent.minX) / size.width;
  var yResolution = (extent.maxY - extent.minY) / size.height;
  return Math.max(xResolution, yResolution);
};


/**
 * @return {number} Map rotation.
 */
ol.View2D.prototype.getRotation = function() {
  return /** @type {number|undefined} */ (
      this.get(ol.View2DProperty.ROTATION)) || 0;
};
goog.exportProperty(
    ol.View2D.prototype,
    'getRotation',
    ol.View2D.prototype.getRotation);


/**
 * @inheritDoc
 */
ol.View2D.prototype.getView2D = function() {
  return this;
};


/**
 * @inheritDoc
 */
ol.View2D.prototype.getView2DState = function() {
  goog.asserts.assert(this.isDef());
  var center = /** @type {ol.Coordinate} */ (this.getCenter());
  var projection = /** @type {ol.Projection} */ (this.getProjection());
  var resolution = /** @type {number} */ (this.getResolution());
  var rotation = /** @type {number} */ (this.getRotation());
  return {
    center: new ol.Coordinate(center.x, center.y),
    projection: projection,
    resolution: resolution,
    rotation: rotation
  };
};


/**
 * @return {ol.View3D} Is defined.
 */
ol.View2D.prototype.getView3D = function() {
  return this.createView3D_();
};


/**
 * @param {ol.Extent} extent Extent.
 * @param {ol.Size} size Box pixel size.
 */
ol.View2D.prototype.fitExtent = function(extent, size) {
  this.setCenter(extent.getCenter());
  var resolution = this.getResolutionForExtent(extent, size);
  resolution = this.constraints_.resolution(resolution, 0, 0);
  this.setResolution(resolution);
};


/**
 * @return {boolean} Is defined.
 */
ol.View2D.prototype.isDef = function() {
  return goog.isDefAndNotNull(this.getCenter()) &&
      goog.isDef(this.getResolution());
};


/**
 * @param {ol.Coordinate|undefined} center Center.
 */
ol.View2D.prototype.setCenter = function(center) {
  this.set(ol.View2DProperty.CENTER, center);
};
goog.exportProperty(
    ol.View2D.prototype,
    'setCenter',
    ol.View2D.prototype.setCenter);


/**
 * @param {ol.Projection|undefined} projection Projection.
 */
ol.View2D.prototype.setProjection = function(projection) {
  this.set(ol.View2DProperty.PROJECTION, projection);
};
goog.exportProperty(
    ol.View2D.prototype,
    'setProjection',
    ol.View2D.prototype.setProjection);


/**
 * @param {number|undefined} resolution Resolution.
 */
ol.View2D.prototype.setResolution = function(resolution) {
  this.set(ol.View2DProperty.RESOLUTION, resolution);
};
goog.exportProperty(
    ol.View2D.prototype,
    'setResolution',
    ol.View2D.prototype.setResolution);


/**
 * @param {number|undefined} rotation Rotation.
 */
ol.View2D.prototype.setRotation = function(rotation) {
  this.set(ol.View2DProperty.ROTATION, rotation);
};
goog.exportProperty(
    ol.View2D.prototype,
    'setRotation',
    ol.View2D.prototype.setRotation);


/**
 * @param {ol.Map} map Map.
 * @param {ol.Coordinate} delta Delta.
 * @param {number=} opt_duration Duration.
 */
ol.View2D.prototype.pan = function(map, delta, opt_duration) {
  var currentCenter = this.getCenter();
  if (goog.isDef(currentCenter)) {
    if (goog.isDef(opt_duration)) {
      map.requestRenderFrame();
      map.addPreRenderFunction(ol.animation.pan({
        source: currentCenter,
        duration: opt_duration,
        easing: ol.easing.linear
      }));
    }
    this.setCenter(new ol.Coordinate(
        currentCenter.x + delta.x, currentCenter.y + delta.y));
  }
};


/**
 * @param {ol.Map} map Map.
 * @param {number|undefined} rotation Rotation.
 * @param {ol.Coordinate=} opt_anchor Anchor coordinate.
 * @param {number=} opt_duration Duration.
 */
ol.View2D.prototype.rotate =
    function(map, rotation, opt_anchor, opt_duration) {
  rotation = this.constraints_.rotation(rotation, 0);
  this.rotateWithoutConstraints(map, rotation, opt_anchor, opt_duration);
};


/**
 * @param {ol.Map} map Map.
 * @param {number|undefined} rotation Rotation.
 * @param {ol.Coordinate=} opt_anchor Anchor coordinate.
 * @param {number=} opt_duration Duration.
 */
ol.View2D.prototype.rotateWithoutConstraints =
    function(map, rotation, opt_anchor, opt_duration) {
  if (goog.isDefAndNotNull(rotation)) {
    var currentRotation = this.getRotation();
    var currentCenter = this.getCenter();
    if (goog.isDef(currentRotation) && goog.isDef(currentCenter) &&
        goog.isDef(opt_duration)) {
      map.requestRenderFrame();
      map.addPreRenderFunction(ol.animation.rotate({
        rotation: currentRotation,
        duration: opt_duration,
        easing: ol.easing.easeOut
      }));
      if (goog.isDef(opt_anchor)) {
        map.addPreRenderFunction(ol.animation.pan({
          source: currentCenter,
          duration: opt_duration,
          easing: ol.easing.easeOut
        }));
      }
    }
    if (goog.isDefAndNotNull(opt_anchor)) {
      var anchor = opt_anchor;
      var oldCenter = /** @type {!ol.Coordinate} */ (this.getCenter());
      var center = new ol.Coordinate(
          oldCenter.x - anchor.x,
          oldCenter.y - anchor.y);
      center.rotate(rotation - this.getRotation());
      center.x += anchor.x;
      center.y += anchor.y;
      map.withFrozenRendering(function() {
        this.setCenter(center);
        this.setRotation(rotation);
      }, this);
    } else {
      this.setRotation(rotation);
    }
  }
};


/**
 * @param {ol.Map} map Map.
 * @param {number|undefined} resolution Resolution to go to.
 * @param {ol.Coordinate=} opt_anchor Anchor coordinate.
 * @param {number=} opt_duration Duration.
 * @param {number=} opt_direction Zooming direction; > 0 indicates
 *     zooming out, in which case the constraints system will select
 *     the largest nearest resolution; < 0 indicates zooming in, in
 *     which case the constraints system will select the smallest
 *     nearest resolution; == 0 indicates that the zooming direction
 *     is unknown/not relevant, in which case the constraints system
 *     will select the nearest resolution. If not defined 0 is
 *     assumed.
 */
ol.View2D.prototype.zoom =
    function(map, resolution, opt_anchor, opt_duration, opt_direction) {
  var direction = opt_direction || 0;
  resolution = this.constraints_.resolution(resolution, 0, direction);
  this.zoomWithoutConstraints(map, resolution, opt_anchor, opt_duration);
};


/**
 * @param {ol.Map} map Map.
 * @param {number} delta Delta from previous zoom level.
 * @param {ol.Coordinate=} opt_anchor Anchor coordinate.
 * @param {number=} opt_duration Duration.
 */
ol.View2D.prototype.zoomByDelta =
    function(map, delta, opt_anchor, opt_duration) {
  var currentResolution = this.getResolution();
  var resolution = this.constraints_.resolution(currentResolution, delta, 0);
  this.zoomWithoutConstraints(map, resolution, opt_anchor, opt_duration);
};


/**
 * @param {ol.Map} map Map.
 * @param {number|undefined} resolution Resolution to go to.
 * @param {ol.Coordinate=} opt_anchor Anchor coordinate.
 * @param {number=} opt_duration Duration.
 */
ol.View2D.prototype.zoomWithoutConstraints =
    function(map, resolution, opt_anchor, opt_duration) {
  if (goog.isDefAndNotNull(resolution)) {
    var currentResolution = this.getResolution();
    var currentCenter = this.getCenter();
    if (goog.isDef(currentResolution) && goog.isDef(currentCenter) &&
        goog.isDef(opt_duration)) {
      map.requestRenderFrame();
      map.addPreRenderFunction(ol.animation.zoom({
        resolution: currentResolution,
        duration: opt_duration,
        easing: ol.easing.easeOut
      }));
      if (goog.isDef(opt_anchor)) {
        map.addPreRenderFunction(ol.animation.pan({
          source: currentCenter,
          duration: opt_duration,
          easing: ol.easing.easeOut
        }));
      }
    }
    if (goog.isDefAndNotNull(opt_anchor)) {
      var anchor = opt_anchor;
      var oldCenter = /** @type {!ol.Coordinate} */ (this.getCenter());
      var oldResolution = this.getResolution();
      var x = anchor.x - resolution * (anchor.x - oldCenter.x) / oldResolution;
      var y = anchor.y - resolution * (anchor.y - oldCenter.y) / oldResolution;
      var center = new ol.Coordinate(x, y);
      map.withFrozenRendering(function() {
        this.setCenter(center);
        this.setResolution(resolution);
      }, this);
    } else {
      this.setResolution(resolution);
    }
  }
};


/**
 * @private
 * @return {ol.View3D} Constraints.
 */
ol.View2D.prototype.createView3D_ = function() {
  var center = /** @type {ol.Coordinate} */ (this.getCenter());
  var projection = /** @type {ol.Projection} */ (this.getProjection());
  var resolution = /** @type {number} */ (this.getResolution());
  var newCenter = ol.projection.transform(center, projection,
      ol.projection.get('EPSG:3857'));
  newCenter.z = resolution * ol.DEFAULT_TILE_SIZE;

  //unproject
  var cartographic = projection.unproject(ol.ellipsoid.WGS84, newCenter);

  //cartographicToCartesian
  //TODO cartographic should be it's own type and not use ol.Coordinate.
  //TODO can we pass goog.vec.Vec3 around?
  var cartesian = ol.ellipsoid.WGS84.cartographicToCartesian(
      cartographic.x,
      cartographic.y,
      cartographic.z);
  var result = goog.vec.Vec3.createNumber();
  goog.vec.Vec3.setFromValues(result, cartesian.x, cartesian.y, cartesian.z);
  //camera stuff
  var unitZ = goog.vec.Vec3.createNumber();
  goog.vec.Vec3.setFromValues(unitZ, 0.0, 0.0, 1.0);

  var d = goog.vec.Vec3.createNumber();
  var r = goog.vec.Vec3.createNumber();
  var u = goog.vec.Vec3.createNumber();
  goog.vec.Vec3.negate(result, d);
  goog.vec.Vec3.normalize(d, d);
  goog.vec.Vec3.cross(d, unitZ, r);
  goog.vec.Vec3.cross(r, d, u);
  var angle = /** @type {number} */ (this.getRotation());

  var quat = goog.vec.Quaternion.createNumber();
  var rotation = goog.vec.Mat3.createNumber();
  goog.vec.Quaternion.fromAngleAxis(angle, d, quat);
  ol.vec.Mat3.fromQuaternion(quat, rotation);
  goog.vec.Mat3.multVec3(rotation, u, u);
  goog.vec.Vec3.cross(d, u, r);

  center = new ol.Coordinate(result[0], result[1], result[2]);
  var direction = new ol.Coordinate(d[0], d[1], d[2]);
  var right = new ol.Coordinate(r[0], r[1], r[2]);
  var up = new ol.Coordinate(u[0], u[1], u[2]);

  return new ol.View3D({
    center: center,
    projection: ol.projection.get('EPSG:3857'),
    resolution: resolution,
    direction: direction,
    right: right,
    up: up
  });
};


/**
 * @private
 * @param {ol.View2DOptions} view2DOptions View2D options.
 * @return {ol.Constraints} Constraints.
 */
ol.View2D.createConstraints_ = function(view2DOptions) {
  var resolutionConstraint;
  if (goog.isDef(view2DOptions.resolutions)) {
    resolutionConstraint = ol.ResolutionConstraint.createSnapToResolutions(
        view2DOptions.resolutions);
  } else {
    var maxResolution, numZoomLevels, zoomFactor;
    if (goog.isDef(view2DOptions.maxResolution) &&
        goog.isDef(view2DOptions.numZoomLevels) &&
        goog.isDef(view2DOptions.zoomFactor)) {
      maxResolution = view2DOptions.maxResolution;
      numZoomLevels = view2DOptions.numZoomLevels;
      zoomFactor = view2DOptions.zoomFactor;
    } else {
      var projectionExtent = ol.projection.createProjection(
          view2DOptions.projection, 'EPSG:3857').getExtent();
      maxResolution = Math.max(
          projectionExtent.maxX - projectionExtent.minX,
          projectionExtent.maxY - projectionExtent.minY) / ol.DEFAULT_TILE_SIZE;
      numZoomLevels = 29;
      zoomFactor = 2;
    }
    resolutionConstraint = ol.ResolutionConstraint.createSnapToPower(
        zoomFactor, maxResolution, numZoomLevels - 1);
  }
  // FIXME rotation constraint is not configurable at the moment
  var rotationConstraint = ol.RotationConstraint.createSnapToZero();
  return new ol.Constraints(resolutionConstraint, rotationConstraint);
};


/**
 * @return {ol.Coordinate|undefined} 3D map direction.
 */
ol.View2D.prototype.getDirection = function() {
};


/**
 * @return {ol.Coordinate|undefined} 3D map right.
 */
ol.View2D.prototype.getRight = function() {
};


/**
 * @return {ol.Coordinate|undefined} 3D map up.
 */
ol.View2D.prototype.getUp = function() {
};
