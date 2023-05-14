export default class GameCollision {
	constructor(game) {
		this.game = game;
	}

	static pointOnRectangle(point, rect) {
		return (
			point.x >= rect.x1
			&& point.x < rect.x2
			&& point.y >= rect.y1
			&& point.y < rect.y2
		);
	}

	static rectangleOnRectangle(a, b) {
		return (
			a.x1 <= b.x2
			&& b.x1 <= a.x2
			&& a.y1 <= b.y2
			&& b.y1 <= a.y2
		);
	}

	static rectangleOnRectangleIntersection(a, b) {
		return {
			x1: Math.max(a.x1, b.x1),
			y1: Math.max(a.y1, b.y1),
			x2: Math.min(a.x2, b.x2),
			y2: Math.min(a.y2, b.y2),
		};
	}

	static normalizeRectangle(rect) {
		if (rect.x1 > rect.x2) {
			[rect.x1, rect.x2] = [rect.x2, rect.x1];
		}
		if (rect.y1 > rect.y2) {
			[rect.y1, rect.y2] = [rect.y2, rect.y1];
		}
		return rect;
	}

	static closestDistanceBetweenRectangles(rectA, rectB) {
		// Which sides the rectB are on, relative to rectA, only if COMPLETELY on that side.
		const l = (rectB.x2 < rectA.x1);
		const r = (rectB.x1 > rectA.x2);
		const t = (rectB.y2 < rectA.y1);
		const b = (rectB.y1 > rectA.y2);

		// If one those sides, distances between rects the direction and axis of that side.
		const lDist = rectA.x1 - rectB.x2;
		const rDist = rectB.x1 - rectA.x2;
		const tDist = rectA.y1 - rectB.y2;
		const bDist = rectB.y1 - rectA.y2;

		// If in corner quadrants.
		if (t && l) return Math.hypot(lDist, tDist);
		if (t && r) return Math.hypot(rDist, tDist);
		if (b && l) return Math.hypot(lDist, bDist);
		if (b && r) return Math.hypot(rDist, bDist);

		// If in side quadrants. (only works after checking corners)
		if (l) return lDist;
		if (r) return rDist;
		if (t) return tDist;
		if (b) return bDist;

		// If overlapping.
		return 0;
	}

	// Check if two instances are colliding.
	instanceOnInstance(aInstance, bInstance, aX, aY, bX, bY) {
		// Don't allow collision with self
		if (aInstance == bInstance) return false;

		if (aInstance.getMaskImage() == null || bInstance.getMaskImage() == null) return false;

		// TODO collision masks
		// spriteA.boundingBox == 'fullimage';
		// spriteA.shape = 'rectangle' || 'precise';

		const aRect = aInstance.getBoundingBox(aX, aY);
		const bRect = bInstance.getBoundingBox(bX, bY);

		if (!GameCollision.rectangleOnRectangle(aRect, bRect)) {
			return false;
		}

		const iRect = GameCollision.rectangleOnRectangleIntersection(aRect, bRect);

		const aImage = aInstance.getMaskImage();
		const aImageRect = {x1: 0, x2: aImage.width, y1: 0, y2: aImage.height};
		const aCol = this.game.loadedProject.collisionMasks.get(aImage);

		const bImage = bInstance.getMaskImage();
		const bImageRect = {x1: 0, x2: bImage.width, y1: 0, y2: bImage.height};
		const bCol = this.game.loadedProject.collisionMasks.get(bImage);

		// TODO possibly optimize this?
		for (let x = Math.floor(iRect.x1); x < iRect.x2; ++x)
		for (let y = Math.floor(iRect.y1); y < iRect.y2; ++y) {
			const aPoint = aInstance.roomPointToInstanceImagePoint({x, y}, aX, aY);

			if (!GameCollision.pointOnRectangle(aPoint, aImageRect)) {
				continue;
			}
			if (!(aCol[aPoint.x][aPoint.y] === true)) {
				continue;
			}

			const bPoint = bInstance.roomPointToInstanceImagePoint({x, y}, bX, bY);

			if (!GameCollision.pointOnRectangle(bPoint, bImageRect)) {
				continue;
			}
			if (!(bCol[bPoint.x][bPoint.y] === true)) {
				continue;
			}

			return true;
		}

		return false;
	}

	// Check if an instance is colliding with any of otherInstances.
	instanceOnInstances(instance, otherInstances, x, y, solidOnly=false) {
		return (this.getFirstInstanceOnInstance(instance, otherInstances, x, y, solidOnly) != null);
	}

	// Return the first instance that is colliding with colInstance.
	getFirstInstanceOnInstance(colInstance, instances, x, y, solidOnly=false) {
		for (const instance of instances) {
			if (!instance.exists) continue;
			if (solidOnly && !instance.solid) continue;

			if (this.instanceOnInstance(colInstance, instance, x, y)) {
				return instance;
			}
		}
		return null;
	}

	// Check if instance is colliding with point.
	instanceOnPoint(instance, point, precise=true) {
		const instanceImage = instance.getMaskImage();

		if (instanceImage == null) return false;

		if (!precise) {
			return GameCollision.pointOnRectangle(point, instance.getBoundingBox());
		}

		const imagePoint = instance.roomPointToInstanceImagePoint(point);

		if (!GameCollision.pointOnRectangle(imagePoint, {x1: 0, x2: instanceImage.width, y1: 0, y2: instanceImage.height})) {
			return false;
		}

		const col = this.game.loadedProject.collisionMasks.get(instanceImage);
		return col[imagePoint.x][imagePoint.y] === true;
	}

	// Check if any of instances is colliding with point.
	instancesOnPoint(instances, point) {
		return (this.getFirstInstanceOnPoint(instances, point) != null);
	}

	// Return the first instance that is colliding with point.
	getFirstInstanceOnPoint(instances, point, precise=true) {
		for (const instance of instances) {
			if (!instance.exists) continue;
			if (this.instanceOnPoint(instance, point, precise)) {
				return instance;
			}
		}
		return null;
	}

	// Return all the instances that are colliding with point.
	getAllInstancesOnPoint(instances, point) {
		return instances.filter(instance => {
			if (!instance.exists) return false;
			return this.instanceOnPoint(instance, point);
		});
	}

	// Check if instance is colliding with rectangle
	instanceOnRectangle(instance, rectangle, precise=true) {
		if (instance.getMaskImage() == null) return false;

		const aRect = instance.getBoundingBox();

		const impreciseCol = GameCollision.rectangleOnRectangle(aRect, rectangle);

		// If imprecise check fails, then collision will never happen.
		if (!impreciseCol) {
			return false;
		}
		// If imprecise check succeeds, and we don't want to check precisely, then collision happened.
		if (!precise) {
			return true;
		}

		const iRect = GameCollision.rectangleOnRectangleIntersection(aRect, rectangle);

		const aImage = instance.getMaskImage();
		const aImageRect = {x1: 0, x2: aImage.width, y1: 0, y2: aImage.height};
		const aCol = this.game.loadedProject.collisionMasks.get(aImage);

		// TODO possibly optimize this?
		for (let x = Math.floor(iRect.x1); x < iRect.x2; ++x)
		for (let y = Math.floor(iRect.y1); y < iRect.y2; ++y) {
			const aPoint = instance.roomPointToInstanceImagePoint({x, y});

			if (!GameCollision.pointOnRectangle(aPoint, aImageRect)) {
				continue;
			}
			if (!(aCol[aPoint.x][aPoint.y] === true)) {
				continue;
			}

			return true;
		}

		return false;
	}

	// Return the first instance that is colliding with rectangle.
	getFirstInstanceOnRectangle(instances, rectangle, precise=true) {
		for (const instance of instances) {
			if (!instance.exists) continue;
			if (this.instanceOnRectangle(instance, rectangle, precise)) {
				return instance;
			}
		}
		return null;
	}

	// Changes direction of instance if it will collide with an instance in the next instance position update.
	moveBounce(instance, adv, solidOnly=false) {
		if (adv) {
			const x = instance.x + instance.hSpeed;
			const y = instance.y + instance.vSpeed;
			const dir = instance.direction;
			const dirRad = dir * (Math.PI / 180);

			const col = this.instanceOnInstances(instance, this.game.instances, x, y, solidOnly);
			if (!col) return;

			const dirStep = 10;

			let positiveCollisionDirRad = dirRad;
			let negativeCollisionDirRad = dirRad;

			// positive angles
			for (let cDir = dir; cDir < dir + 180; cDir += dirStep) {
				const cDirRad = cDir * (Math.PI / 180);
				const cX = instance.x + Math.cos(cDirRad) * instance.speed;
				const cY = instance.y + -Math.sin(cDirRad) * instance.speed;

				const col = this.instanceOnInstances(instance, this.game.instances, cX, cY, solidOnly);
				if (!col) {
					positiveCollisionDirRad = cDirRad;
					break;
				}
			}

			// negative angles
			for (let cDir = dir; cDir > dir - 180; cDir -= dirStep) {
				const cDirRad = cDir * (Math.PI / 180);
				const cX = instance.x + Math.cos(cDirRad) * instance.speed;
				const cY = instance.y + -Math.sin(cDirRad) * instance.speed;

				const col = this.instanceOnInstances(instance, this.game.instances, cX, cY, solidOnly);
				if (!col) {
					negativeCollisionDirRad = cDirRad;
					break;
				}
			}

			const normalDirRad = (negativeCollisionDirRad + positiveCollisionDirRad) / 2;

			const vectorX = Math.sin(dirRad);
			const vectorY = Math.cos(dirRad);
			const normalX = Math.sin(normalDirRad);
			const normalY = Math.cos(normalDirRad);

			// Reflect vector by normal
			const dotProduct = vectorX * normalX + vectorY * normalY;

			const reflectedDirRad = Math.atan2(
				vectorX - (2 * dotProduct * normalX),
				vectorY - (2 * dotProduct * normalY),
			);

			const reflectedDir = reflectedDirRad * (180/Math.PI);

			instance.setDirectionAndSpeed(reflectedDir, instance.speed);
		} else {
			const x = instance.x + instance.hSpeed;
			const y = instance.y + instance.vSpeed;

			const col = this.instanceOnInstances(instance, this.game.instances, x, y, solidOnly);
			if (!col) return;

			const hCol = this.instanceOnInstances(instance, this.game.instances, x, null, solidOnly);
			const vCol = this.instanceOnInstances(instance, this.game.instances, null, y, solidOnly);

			if (hCol) {
				instance.setHspeedAndVspeed(-instance.hSpeed, instance.vSpeed);
			}
			if (vCol) {
				instance.setHspeedAndVspeed(instance.hSpeed, -instance.vSpeed);
			}
			if (!hCol && !vCol) {
				instance.setHspeedAndVspeed(-instance.hSpeed, -instance.vSpeed);
			}
		}
	}

	moveContact(instance, dir, maxDist, solidOnly=false) {
		maxDist = (maxDist >= 0) ? maxDist : 1000;

		let x = instance.x;
		let y = instance.y;

		const col = this.instanceOnInstances(instance, this.game.instances, x, y, solidOnly);
		if (col) {
			return;
		}

		const dirRad = dir * (Math.PI / 180);
		const dirRadCos = Math.cos(dirRad);
		const dirRadSin = -Math.sin(dirRad);

		let xPrev = x;
		let yPrev = y;

		for (let dist=1; dist<maxDist; ++dist) {
			x += dirRadCos; // * 1
			y += dirRadSin; // * 1

			const col = this.instanceOnInstances(instance, this.game.instances, x, y, solidOnly);
			if (col) {
				break;
			}

			xPrev = x;
			yPrev = y;
		}

		instance.x = xPrev;
		instance.y = yPrev;
	}

	moveOutside(instance, dir, maxDist, solidOnly=false) {
		maxDist = (maxDist >= 0) ? maxDist : 1000;

		let x = instance.x;
		let y = instance.y;

		const col = this.instanceOnInstances(instance, this.game.instances, x, y, solidOnly);
		if (!col) {
			return;
		}

		const dirRad = dir * (Math.PI / 180);
		const dirRadCos = Math.cos(dirRad);
		const dirRadSin = -Math.sin(dirRad);

		for (let dist=1; dist<maxDist; ++dist) {
			x += dirRadCos; // * 1
			y += dirRadSin; // * 1

			const col = this.instanceOnInstances(instance, this.game.instances, x, y, solidOnly);
			if (!col) {
				break;
			}
		}

		instance.x = x;
		instance.y = y;
	}
}