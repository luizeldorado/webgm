import BuiltInLocals from "./BuiltInLocals.js";
import VariableHolder from "./VariableHolder.js";

export default class Instance {
	constructor(id, x, y, objectIndex, game) {
		// Arguments
		this.id = id;
		this.x = x;
		this.y = y;
		this.objectIndex = objectIndex;
		this.game = game;

		this.object = this.game.project.getResourceById("ProjectObject", this.objectIndex);

		// Inherited from object
		this.spriteIndex = this.object.sprite_index;
		this.visible = this.object.visible;
		this.solid = this.object.solid;
		this.depth = this.object.depth;
		this.persistent = this.object.persistent;
		this.maskIndex = this.object.mask_index;

		// Internal
		this.exists = true;
		this.vars = new VariableHolder(this, BuiltInLocals);
		this.sprite = this.game.project.getResourceById("ProjectSprite", this.spriteIndex);
		this.mask = this.game.project.getResourceById("ProjectSprite", this.maskIndex);

		this.mouseIn = false;
		this.mouseInChanged = null;

		// Variables
		this.xPrevious = x;
		this.yPrevious = y;
		this.xStart = x;
		this.yStart = y;

		this.hSpeed = 0;
		this.vSpeed = 0;
		this.direction = 0;
		this.speed = 0;
		this.friction = 0;

		this.gravity = 0;
		this.gravityDirection = 270;

		this.path = null;
		this.pathPosition = 0;
		this.pathPreviousPosition = 0;
		this.pathSpeed = 0;
		this.pathOrientation = 0;
		this.pathScale = 1;
		this.pathEndAction = 0;
		this.pathStartPosition = {x: 0, y: 0};

		this.alarms = [];

		this.timeline = null;
		this.timelineIndex = -1;
		this.timelinePosition = 0;
		this.timelineSpeed = 1;
		this.timelineRunning = false;
		this.timelineLoop = false;

		this.imageIndex = 0;
		this.imageSpeed = 1;
		this.imageXScale = 1;
		this.imageYScale = 1;
		this.imageAngle = 0;
		this.imageAlpha = 1;
		this.imageBlend = "#ffffff";
	}

	getImage() {
		return this.sprite?.images[Math.floor(Math.floor(this.imageIndex) % this.sprite.images.length)];
	}

	getImageIndex() {
		if (this.sprite == null || this.sprite.images.length == 0) return null;
		return Math.floor(Math.floor(this.imageIndex) % this.sprite.images.length);
	}

	getMask() {
		return this.mask ?? this.sprite;
	}

	getMaskImage() {
		const mask = this.mask ?? this.sprite;
		return mask?.images[Math.floor(Math.floor(this.imageIndex) % mask.images.length)];
	}

	instanceImagePointToRoomPoint(point, instanceX, instanceY) {
		instanceX ??= this.x;
		instanceY ??= this.y;

		let {x, y} = point;

		[x, y] = [x - this.getMask().originx, y - this.getMask().originy];

		[x, y] = [x * this.imageXScale, y * this.imageYScale];

		const a = this.imageAngle * Math.PI/180;
		const cos = Math.cos(a);
		const sin = -Math.sin(a);
		[x, y] = [cos*x - sin*y, sin*x + cos*y];

		[x, y] = [x + instanceX, y + instanceY];

		return {x, y};
	}

	roomPointToInstanceImagePoint(point, instanceX, instanceY) {
		instanceX ??= this.x;
		instanceY ??= this.y;

		let {x, y} = point;

		[x, y] = [x - instanceX, y - instanceY];

		const a = -this.imageAngle * Math.PI/180;
		const cos = Math.cos(a);
		const sin = -Math.sin(a);
		[x, y] = [cos*x - sin*y, sin*x + cos*y];

		[x, y] = [x / this.imageXScale, y / this.imageYScale];

		[x, y] = [x + this.getMask().originx, y + this.getMask().originy];

		[x, y] = [Math.floor(x), Math.floor(y)];

		return {x, y};
	}

	getBoundingBox(instanceX, instanceY) {
		instanceX ??= this.x;
		instanceY ??= this.y;

		const mask = this.getMask();
		const image = this.getMaskImage();
		if (!image) return {x1: instanceX, y1: instanceY, x2: instanceX, y2: instanceY};

		// TODO optimize this lol
		const points = [
			this.instanceImagePointToRoomPoint({x: mask.bbLeft, y: mask.bbTop}, instanceX, instanceY),
			this.instanceImagePointToRoomPoint({x: mask.bbRight, y: mask.bbTop}, instanceX, instanceY),
			this.instanceImagePointToRoomPoint({x: mask.bbLeft, y: mask.bbBottom}, instanceX, instanceY),
			this.instanceImagePointToRoomPoint({x: mask.bbRight, y: mask.bbBottom}, instanceX, instanceY),
		];

		const xs = points.map(point => point.x);
		const ys = points.map(point => point.y);

		const x1 = Math.min(...xs);
		const y1 = Math.min(...ys);
		const x2 = Math.max(...xs);
		const y2 = Math.max(...ys);

		return {x1, y1, x2, y2};
	}

	setHspeedAndVspeed(hspeed, vspeed) {
		this.hSpeed = hspeed;
		this.vSpeed = vspeed;

		this.speed = Math.hypot(hspeed, vspeed);
		this.direction = Math.atan2(-vspeed, hspeed) * (180 / Math.PI);
	}

	setDirectionAndSpeed(direction, speed) {
		this.direction = ((direction % 360) + 360) % 360; // mod
		this.speed = speed;

		const directionRadians = direction * (Math.PI / 180);
		this.hSpeed = Math.cos(directionRadians) * speed;
		this.vSpeed = -Math.sin(directionRadians) * speed;
	}

	async changeObject(objectIndex, performEvents) {
		const object = this.game.project.getResourceById("ProjectObject", objectIndex);
		if (!object) {
			throw this.game.makeError({text: `Asking to change into non-existing object: ${objectIndex}`});
		}

		if (performEvents) {
			await this.game.events.runEventOfInstance("destroy", null, this);
		}

		this.objectIndex = objectIndex;
		this.object = object;

		this.spriteIndex = this.object.sprite_index;
		this.visible = this.object.visible;
		this.solid = this.object.solid;
		this.depth = this.object.depth;
		this.persistent = this.object.persistent;
		this.maskIndex = this.object.mask_index;

		this.sprite = this.game.project.getResourceById("ProjectSprite", this.spriteIndex);
		this.mask = this.game.project.getResourceById("ProjectSprite", this.maskIndex);

		if (performEvents) {
			await this.game.events.runEventOfInstance("create", null, this);
		}
	}
}