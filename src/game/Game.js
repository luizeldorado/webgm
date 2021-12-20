import Dispatcher from '../common/Dispatcher.js'

import {EngineException, CompilationException, FatalErrorException, NonFatalErrorException, ExitException} from '../common/Exceptions.js';

import {Project} from '../common/Project.js';

import VariableHolder from '../common/VariableHolder.js';
import Events from '../common/Events.js';

import GML from './GML.js';
import ActionsParser from './ActionsParser.js';
import BuiltInLocals from './BuiltInLocals.js';
import BuiltInGlobals from './BuiltInGlobals.js';
import BuiltInConstants from './BuiltInConstants.js';

import {collision2Rectangles} from '../common/tools.js';

export class Game {

	constructor (project, canvas, input) {
		this.project = project;
		this.canvas = canvas;
		this.input = input;

		this.dispatcher = new Dispatcher();

		this.ctx = null;

		this.keyDownHandler = null;
		this.keyUpHandler = null;

		this.key = {};
		this.keyPressed = {};
		this.keyReleased = {};

		this.globalVars = null;
		this.constants = null;

		this.instances = [];
		this.shouldDestroyInstances = [];

		this.fps = 0;
		this.fpsFrameCount = 0;

		this.drawColor = 0;
		this.drawAlpha = 1;
		this.drawFont = -1;
		this.drawHAlign = 0;
		this.drawVAlign = 0;

		this.gml = null;
		this.preparedCodes = new Map();

		this.room = null;

		this.timeout = null;
		this.fpsTimeout = null;

		this.mapEvents = null;

	}

	start() {

		try {
			this.startCanvas();
			this.startInput();
			this.startEngine();

			this.loadProject()
			.then(() => {
				this.loadFirstRoom();
				this.startMainLoop();
			})
			.catch(e => {this.catch(e)});
		} catch (e) {
			this.catch(e);
		}
		
	}

	end() {
		// canvas
		this.canvas.classList.remove("no-cursor");

		// input
		this.input.removeEventListener('keydown', this.keyDownHandler)
		this.input.removeEventListener('keyup', this.keyUpHandler)

		// main loop
		this.endMainLoop();
	}

	startCanvas() {
		this.ctx = this.canvas.getContext('2d');
		this.ctx.imageSmoothingEnabled = false;

		if (!this.project.globalGameSettings.displayCursor) {
			this.canvas.classList.add("no-cursor");
		}
	}

	startInput() {
		this.keyDownHandler = (e) => {
			this.key[e.which] = true;
			this.keyPressed[e.which] = true;
			e.preventDefault();
		}
		this.input.addEventListener('keydown', this.keyDownHandler);

		this.keyUpHandler = (e) => {
			this.key[e.which] = false;
			this.keyReleased[e.which] = true;
			e.preventDefault();
		}
		this.input.addEventListener('keyup', this.keyUpHandler);

		// TODO mouse
	}

	startEngine() {
		this.globalVars = new VariableHolder(this, BuiltInGlobals)
		this.constants = BuiltInConstants.getList();

		// TODO Add user defined constants

		// Add resource names as constants
		Project.getTypes().forEach(type => {
			this.project.resources[type.getClassName()].forEach(x => {this.constants[x.name] = x.id});
		});

	}

	loadProject() {
		var promises = [
			this.loadSprites(),
			this.loadBackgrounds(), // TODO
			this.loadSounds(), // TODO
		];

		this.loadGML();

		return Promise.all(promises);
	}

	loadSprites() {
		var promises = [];
		this.project.resources.ProjectSprite.forEach(sprite => {
			sprite.images.forEach((image, imageNumber) => {
				promises.push(image.promise
					.catch(e => {
						throw new EngineException("Could not load image " + imageNumber.toString() + " in sprite " + sprite.name);
					}));
			})
		})
		return Promise.all(promises);
	}

	loadBackgrounds() {} // TODO
	loadSounds() {} // TODO

	loadGML() {
		this.gml = new GML(this);

		this.loadGMLScripts();
		this.loadGMLTimelines(); // TODO
		this.loadGMLObjects();
	}

	loadGMLScripts() {
		this.project.resources.ProjectScript.every(script => {
			return this.prepareGML(script.code, script, matchResult => {
				this.throwCompilationErrorInScript(script, matchResult.message);
			});
		})
	}

	loadGMLTimelines() {} // TODO

	loadGMLObjects() {
		this.project.resources.ProjectObject.every(object => {
			return object.events.every(event => {
				return event.actions.every((action, actionNumber) => {

					if (action.typeKind == 'code') {
						
						return this.prepareGML(action.args[0].value, action, matchResult => {
							this.throwErrorInObject(object, event, actionNumber,
								`COMPILATION ERROR in code action:\n` + matchResult.message, true);
							console.log(matchResult);
						});

					} else if (action.typeKind == 'normal' && action.typeExecution == 'code') {

						return this.prepareGML(action.args[0].value, action, matchResult => {
							this.throwErrorInObject(object, event, actionNumber,
								`COMPILATION ERROR in code action:\n` + matchResult.message
								+ `\n(this was inside the action type in a library)`, true);
						});

					}
					return true;
				})
			})
		})
	}

	prepareGML(gml, mapKey, failureFunction) {
		var preparedCode = this.gml.prepare(gml);

		if (preparedCode.succeeded()) {
			this.preparedCodes.set(mapKey, preparedCode);
			return true;
		} else {
			failureFunction(preparedCode);
			return false;
		}
	}

	///// START ERROR THROWING

	throwCompilationErrorInScript(script, message) {
		// TODO put all info in the exception itself, then show error on catch
		// TODO make the message more like the one from GM

		this.showErrorBox(`\n___________________________________________\n`
			+ `COMPILATION ERROR in Script: ` + script.name + `\n\n` + message + `\n`);

		throw new CompilationException();
	}

	throwErrorInObject(object, event, actionNumber, message, isFatal=false) {
		// TODO put all info in the exception itself, then show error on catch

		this.showErrorBox(`\n___________________________________________\n`
			+ (isFatal ? "FATAL " : "") + `ERROR in\n`
			+ `action number ` + actionNumber.toString() + `\n`
			+ `of ` + Events.getEventName(event) + ` Event\n`
			+ `for object ` + object.name + `:\n\n` + message + `\n`);

		if (isFatal) {
			throw new FatalErrorException();
		} else {
			throw new NonFatalErrorException();
		}
	}

	throwErrorInCurrent(message, isFatal=false) {
		var object = this.getResourceById(this.currentInstance.object_index);
		this.throwErrorInObject(object.name, this.currentEvent, this.currentActionNumber, message, isFatal);
	}

	throwErrorInGMLNode(message, node, isFatal=false) {

		console.log(node);

		var index = node.source.startIdx;
		var lines = node.source.sourceString.split('\n');
		var totalLength = 0;

		for (var i = 0; i < lines.length; ++i) {
			var lineLength = lines[i].length + 1;
			totalLength += lineLength;
			if (totalLength >= index) {

				var lineNumber = i + 1;
				var gmlLine = lines[i];
				var position = (index - (totalLength - lineLength)) + 1;
				var arrowString = " ".repeat(position-1) + "^";

				break;
			}
		}

		this.throwErrorInCurrent(`Error in code at line ` + lineNumber + `:\n`
			+ gmlLine + `\n` + arrowString + `\n`
			+ `at position ` + position + `: ` + message + `\n`, isFatal);

	}

	showErrorBox(message) {
		this.endMainLoop();
		alert(message);
		this.startMainLoop();
	}


	///// END ERROR THROWING

	loadFirstRoom() {
		this.room = this.project.resources.ProjectRoom[0];
		this.loadRoom(this.room);
	}

	loadRoom(room) {

		//Empty room
		//TODO: keep persistent objects
		//TODO: save current room if it's persistent
		this.instances = [];

		this.canvas.width = room.width;
		this.canvas.height = room.height;

		this.globalVars.setForce('room_width', room.width);
		this.globalVars.setForce('room_height', room.height);
		this.globalVars.setForce('room_speed', room.speed);

		room.instances.forEach(roomInstance => {
			this.instanceCreate(roomInstance.x, roomInstance.y, roomInstance.object_index);
		})

	}

	instanceCreate (x, y, object) {
		var instance = new Instance(x, y, object, this);
		this.instances.push(instance);

		var obj = this.getResourceById('ProjectObject', instance.object_index) /////////////////////////////////////////

		// TODO: This seems too simple, please compilicate it
		var create = obj.events.find((x) => x.type == 'create');
		if (create) {
			this.doEvent(create, instance); /////////////////////////////////////////
		}

		// TODO set id?
		return instance.vars.get('id');
	}

	getResourceById(type, id) {
		return this.project.resources[type].find(x => x.id == id);
	}

	//

	doEvent(event, instance, other=null) {
		this.currentEvent = event;
		this.currentInstance = instance;
		this.currentOther = other || instance;

		var parsedActions = new ActionsParser(event.actions).parse();

		return parsedActions.every(treeAction => {
			try {
				this.doTreeAction(treeAction);
			} catch (e) {
				if (e instanceof ExitException) {
					return false;
				} else {
					throw e;
				}
			}
			return true;
		})

	}

	doTreeAction(treeAction) {

		if (treeAction.appliesTo != undefined) {
			var applyToInstances = this.getApplyToInstances(treeAction.appliesTo);
		}

		switch (treeAction.type) {
			case 'executeFunction':
			case 'executeCode':

				{
					let result = true;
					applyToInstances.forEach(applyToInstance => {

						var args = treeAction.args.map(x => this.parseActionArg(x));

						var currentResult;
						if (treeAction.type == 'executeFunction') {
							currentResult = this.gml.builtInFunction(treeAction.function, args, applyToInstance, treeAction.relative);
						} else {
							// TODO send arguments and argument_relative
							currentResult = this.gml.execute(this.preparedCodes.get(treeAction.action), applyToInstance);
						}

						if (typeof currentResult !== "number" || currentResult < 0.5) {
							result = false;
						}

					});

					return result;
				}

			case 'if':
				{
					let result = this.doTreeAction(treeAction.condition);
					if (result) {
						this.doTreeAction(treeAction.ifTrue);
					} else {
						this.doTreeAction(treeAction.ifFalse);
					}
					break;
				}

			case 'block':
				treeAction.actions.forEach(blockTreeAction => {
					this.doTreeAction(blockTreeAction);
				});
				break;

			case 'exit':
				throw new ExitException();

			case 'repeat':
				var times = this.parseActionArg(treeAction.times);
				for (var i=0; i<times; i++) {
					this.doTreeAction(treeAction.treeAction);
				}
				break;

			case 'variable': // TODO
				break;

			case 'code':
				applyToInstances.forEach(applyToInstance => {
					this.gml.execute(this.preparedCodes.get(treeAction.action), applyToInstance);
				});
				break;
		}
	}

	getApplyToInstances(appliesTo) {
		// -1 = self, -2 = other, 0>= = object index
		switch (appliesTo) {
			case -1:
				return [this.currentInstance];
			case -2:
				return [this.currentOther];
			default:
				return this.instances.filter(x => x.object_index == appliesTo);
		}
	}

	parseActionArg(arg) {
		if (arg.kind == 'both') {
			if (arg.value[0] != `'` && arg.value[0] != `"`) {
				return arg.value;
			}
		}
		if (arg.kind == 'both' || arg.kind == 'expression') {
			return this.gml.executeStringExpression(arg.value, this.currentInstance);
		}
		return arg.value;
	}

	//

	startMainLoop() {
		if (this.timeout == null) {
			this.timeout = setTimeout(() => this.mainLoop(), 0);
		}

		if (this.fpsTimeout == null) {
			this.fpsTimeout = setInterval(() => this.updateFps(), 1000);
		}
	}

	endMainLoop() {
		clearTimeout(this.timeout);
		this.timeout = null;

		clearInterval(this.fpsTimeout);
		this.fpsTimeout = null;
	}

	mainLoop() {

		var timeoutStepStart = performance.now() / 1000;
		++this.fpsFrameCount;

		/*
			Begin step events 
			Alarm events 
			Keyboard, Key press, and Key release events 
			Mouse events 
			Normal step events 
			(now all instances are set to their new positions) 
			Collision events 
			End step events 
			Draw events // LIE!!!!!!!!1111111
		*/

				// Get all events
		this.mapEvents = this.getMapOfEvents();

		// Draw
		this.drawViews();

		// Do some stuff
		this.globalVars.setForce('fps', this.fps);

		// Begin step
		this.getEventsOfTypeAndSubtype('step', 'begin').every(({event, instance}) => {
			return this.doEvent(event, instance); /////////////////
		});

		// Alarm
		this.getEventsOfType('alarm').every(([subtype, list]) => {
			return list.every(({event, instance}) => {

				// Update alarm (decrease by one) here, before running event
				// Alarm stays 0 until next alarm check, where it becomes -1 forever

				if (instance.vars.get('alarm', [subtype]) >= 0) {
					instance.vars.setAdd('alarm', -1, [subtype]);
				}

				if (instance.vars.get('alarm', [subtype]) == 0) {
					return this.doEvent(event, instance); //////////////////
				}

			});
		});

		// Keyboard
		this.getEventsOfType('keyboard').every(([subtype, list]) => {
			return list.every(({event, instance}) => {
				if (this.key[subtype]) {
					return this.doEvent(event, instance);
				}
			});
		});

		this.getEventsOfType('keypress').every(([subtype, list]) => {
			return list.every(({event, instance}) => {
				if (this.keyPressed[subtype]) {
					return this.doEvent(event, instance);
				}
			});
		});

		this.getEventsOfType('keyrelease').every(([subtype, list]) => {
			return list.every(({event, instance}) => {
				if (this.keyReleased[subtype]) {
					return this.doEvent(event, instance);
				}
			});
		});

		// Mouse
		// TODO

		// Step
		this.getEventsOfTypeAndSubtype('step', 'normal').every(({event, instance}) => {
			return this.doEvent(event, instance);
		});

		// Update instance variables and positions

		this.instances.forEach(instance => {

			instance.vars.set('xprevious', instance.vars.get('x'));
			instance.vars.set('yprevious', instance.vars.get('y'));

			instance.vars.setAdd('x', instance.vars.get('hspeed'));
			instance.vars.setAdd('y', instance.vars.get('vspeed'));

			instance.vars.setAdd('speed', - instance.vars.get('friction'));

			// gravity
			instance.vars.setAdd('hspeed', Math.cos(instance.vars.get('gravity_direction')) * instance.vars.get('gravity'));
			instance.vars.setAdd('vspeed', Math.sin(instance.vars.get('gravity_direction')) * instance.vars.get('gravity'));

			// TODO paths??

		});

		// Collisions
		this.getEventsOfType('collision').every(([subtype, list]) => {
			return list.every(({event, instance}) => {
				var others = this.instances.filter(x => x.object_index == subtype);
				others.every(other => {
					if (this.checkCollision(instance, other)) {
						this.doEvent(event, instance, other);
					}
				})
			});
		});

		// End step
		this.getEventsOfTypeAndSubtype('step', 'end').every(({event, instance}) => {
			return this.doEvent(event, instance);
		});

		// Reset keyboard states
		this.keyPressed = {};
		this.keyReleased = {};

		// Delete instances
		this.shouldDestroyInstances.forEach(x => {
			this.instanceDestroy(x);
		})
		this.shouldDestroyInstances = [];

		// Run main loop again, after a frame of time has passed.
		// This means the game will slow down if a loop takes too much time.

		var timeoutStepEnd = performance.now() / 1000;
		var timeoutStepTime = timeoutStepEnd - timeoutStepStart;
		var timeoutStepMinTime = 1 / this.globalVars.get('room_speed');
		var timeoutWaitTime = Math.max(0, timeoutStepMinTime - timeoutStepTime);

		this.timeout = setTimeout(() => this.mainLoop(), timeoutWaitTime * 1000);

		// var timeoutTotalStepTime = timeoutStepTime + timeoutWaitTime;
		// console.log("------");
		// console.log("StepTime", timeoutStepTime);
		// console.log("StepMinTime", timeoutStepMinTime);
		// console.log("WaitTime", timeoutWaitTime);
		// console.log("TotalStepTime", timeoutTotalStepTime);
		// console.log(1/timeoutTotalStepTime, "fps");
	}

	updateFps() {
		this.fps = this.fpsFrameCount;
		this.fpsFrameCount = 0;
	}

	getMapOfEvents() {
		var map = new Map();

		this.instances.forEach(instance => {
			var object = this.getResourceById('ProjectObject', instance.object_index);

			object.events.forEach(event => {

				var subtypes = map.get(event.type);
				if (subtypes == undefined) {
					subtypes = new Map();
					map.set(event.type, subtypes);
				}

				var eventInstancePairs = subtypes.get(event.subtype);
				if (eventInstancePairs == undefined) {
					eventInstancePairs = [];
					subtypes.set(event.subtype, eventInstancePairs);
				}

				eventInstancePairs.push({event: event, instance: instance});

			})
		})

		return map;
	}

	drawViews() {
		// Currently there are no views. But the following should happen for every view.

		// Draw background color
		this.ctx.fillStyle = this.room.backgroundColor;
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		// this.ctx.fillStyle = "black";

		// TODO Draw background images
		// TODO Draw tiles

		// Draw instances

		var instances_by_depth = [...this.instances].sort(
			(a, b) => a.vars.get('depth') - b.vars.get('depth')
		);

		instances_by_depth.forEach(instance => {
			var object = this.getResourceById('ProjectObject', instance.object_index);

			// Only draw if visible
			if (instance.vars.get('visible')) {
				var drawEvent = object.events.find(x => x.type == 'draw');

				if (drawEvent) {
					this.doEvent(drawEvent, instance); ////////////////////
				} else {
					// No draw event, draw sprite if it has one.
					var index = instance.vars.get('sprite_index');
					if (index >= 0) {
						var sprite = this.getResourceById('ProjectSprite', index);
						if (sprite) {
							var image = sprite.images[instance.vars.get('image_index')];
							if (image) {
								this.ctx.save();
								this.ctx.translate(-sprite.originx, -sprite.originy);
								this.ctx.drawImage(image.image, instance.vars.get('x'), instance.vars.get('y'));
								this.ctx.restore();
							} else {
								// no image index
							}
						} else {
							// no sprite indexs
						}
					}
				}
			}

		});
	}

	getEventsOfTypeAndSubtype(type, subtype) {
		var subtypes = this.mapEvents.get(type);
		if (!subtypes) return [];
		var list = subtypes.get(subtype);
		if (!list) return [];
		return list;
	}

	getEventsOfType(type) {
		var subtypes = this.mapEvents.get(type);
		if (!subtypes) return [];
		return [...subtypes.entries()];
	}

	checkCollision(self, other) {

		// TODO masks

		var selfSprite = this.getResourceById('ProjectSprite', self.vars.get('sprite_index'));
		var selfImage = selfSprite.images[self.vars.get('image_index')];

		var otherSprite = this.getResourceById('ProjectSprite', other.vars.get('sprite_index'));
		var otherImage = otherSprite.images[other.vars.get('image_index')];

		// TODO collision masks, will assume rectangle now
		// selfSprite.boundingbox == 'fullimage';
		// selfSprite.shape = 'rectangle';

		var c = collision2Rectangles({
			x1: self.vars.get('x') - selfSprite.originx,
			y1: self.vars.get('y') - selfSprite.originy,
			x2: self.vars.get('x') - selfSprite.originx + selfImage.image.width,
			y2: self.vars.get('y') - selfSprite.originy + selfImage.image.height
		}, {
			x1: other.vars.get('x') - otherSprite.originx,
			y1: other.vars.get('y') - otherSprite.originy,
			x2: other.vars.get('x') - otherSprite.originx + otherImage.image.width,
			y2: other.vars.get('y') - otherSprite.originy + otherImage.image.height
		})

		return c;

	}

	instanceDestroy (instance) {
		var index = this.instances.findIndex(x => x == instance);
		this.instances.splice(index, 1);
	}

	catch(e) {
		if (e instanceof EngineException) {
			this.close(e);
		} else if (e instanceof CompilationException || e instanceof FatalErrorException) {
			this.close();
		} else {
			throw e;
		}
	}

	close(e) {
		console.log('Closing game.');
		this.end();

		this.dispatcher.speak('close', e);
	}

	gameEnd () {
		console.log('Stopping game.')
		this.end();

		this.dispatcher.speak('gameEnd');
	}

}

export class Instance {

	constructor (x, y, object_index, game) {

		this.object_index = object_index;
		this.game = game;

		this.vars = new VariableHolder(this, BuiltInLocals);

		// Id
		this.vars.setForce('id', 100001);
		
		// Inherited from object
		var obj = game.getResourceById('ProjectObject', this.object_index);

		this.vars.setForce('object_index', obj.id);
		this.vars.setForce('sprite_index', obj.sprite_index);
		this.vars.setForce('visible', obj.visible);
		this.vars.setForce('solid', obj.solid);
		this.vars.setForce('depth', obj.depth);
		this.vars.setForce('persistent', obj.persistent);
		this.vars.setForce('parent', obj.parent);
		this.vars.setForce('mask', obj.mask);

		// Set by constructor
		this.vars.setForce('x', x);
		this.vars.setForce('y', y);

		//
		this.vars.setForce('xprevious', x);
		this.vars.setForce('yprevious', y);
		this.vars.setForce('xstart', x);
		this.vars.setForce('ystart', y);

	}

}