import Events from '../../common/Events.js';
import {parent, endparent, add, remove, HTextInput, HNumberInput, HCheckBoxInput, HSelect, HSelectWithOptions, newElem, newButton, newImage, newOption} from '../../common/H.js'
import {
	ProjectSprite, ProjectSound, ProjectBackground, ProjectPath, ProjectScript, ProjectObject, ProjectRoom, ProjectFont, ProjectTimeline,
	ProjectEvent, ProjectAction, ProjectActionArg
} from '../../common/Project.js';
import HResourceSelect from '../HResourceSelect.js';
import HTabControl from '../HTabControl.js';
import HTMLWindow from '../HTMLWindow.js';

import HTMLWindowAction from './HTMLWindowAction.js';
import HTMLWindowCode from './HTMLWindowCode.js';

export default class HTMLWindowObject extends HTMLWindow {

	static actionArgResourceTypes = {
		'sprite': ProjectSprite,
		'sound': ProjectSound,
		'background': ProjectBackground,
		'path': ProjectPath,
		'script': ProjectScript,
		'object': ProjectObject,
		'room': ProjectRoom,
		'font': ProjectFont,
		'timeline': ProjectTimeline,
	};

	constructor(...args) {
		super(...args);
	}
	makeClient(object) {

		this.htmlTitle.textContent = 'Edit Object '+object.name;
		this.htmlActionWindows = [];

		// make a copy of the events and actions inside
		this.paramEvents = object.events.map(event => {
			var newevent = new ProjectEvent(event.type, event.subtype);
			newevent.actions = event.actions.map(action => {
				var newaction = new ProjectAction();
				newaction.typeLibrary = action.typeLibrary;
				newaction.typeId = action.typeId;
				newaction.typeKind = action.typeKind;
				newaction.typeExecution = action.typeExecution;
				newaction.typeExecutionFunction = action.typeExecutionFunction;
				newaction.typeExecutionCode = action.typeExecutionCode;
				newaction.typeIsQuestion = action.typeIsQuestion;

				newaction.args = action.args.map(x => ({kind: x.kind, value: x.value}));

				newaction.appliesTo = action.appliesTo;
				newaction.relative = action.relative;
				newaction.not = action.not;

				return newaction;
			})
			return newevent;
		})
		// you know, fuck javascript

		this.selectEventsOptions = {}; //<option>s inside event <select>
		this.selectActionsOptions = {}; //<option>s inside action <select>

		parent(this.htmlClient)
			parent( add( newElem('grid-resource resource-object', 'div') ) )

				parent( add( newElem('properties-area', 'div') ) ) // Main area

					var inputName = add( new HTextInput('Name:', object.name) )

					this.selectSprite = add( new HResourceSelect(this.editor, 'Sprite:', ProjectSprite) )
					this.selectSprite.setValue(object.sprite_index);

					var inputVisible = add( new HCheckBoxInput('Visible', object.visible) )
					var inputSolid = add( new HCheckBoxInput('Solid', object.solid) )
					var inputDepth = add( new HNumberInput('Depth:', object.depth, 1) )
					var inputPersistent = add( new HCheckBoxInput('Persistent', object.persistent) )

					endparent()

				parent( add( newElem(null, 'div') ) ) // Events area

					// Event select

					this.selectEvents = add( new HSelect('Events:', 'events') )
					this.selectEvents.select.html.size = 2;

					this.selectEvents.setOnChange(() => {
						this.updateSelectActions();
						this.updateActionsMenu();
					})

					// Event type select

					this.selectEventType = add( new HSelectWithOptions('Event type:', Events.listEventTypes) )

					this.selectEventType.setOnChange(() => {
						this.updateDivEventSubtype();
					})

					// Event subtype div

					this.selectCollisionObject = null;
					this.divEventSubtype = add( newElem(null, 'div') );

					// Add event button
					this.buttonEventAdd = add( newButton(null, 'Add Event', () => {

						var eventType = this.selectEventType.getValue();
						var eventSubtype = 0;

						if (this.subtypeValueFunction) {
							eventSubtype = this.subtypeValueFunction();
						}

						// Don't continue if there's an event with the exact same type and subtype
						if (this.paramEvents.find(x => x.type == eventType && x.subtype == eventSubtype))
							return;

						var event = new ProjectEvent();
						event.type = eventType;
						event.subtype = eventSubtype;
						this.paramEvents.push(event);

						this.sortEvents();

						this.updateSelectEvents();
						this.selectEvents.setValue(event.getNameId());
						this.updateEventsMenu();
						this.updateSelectActions();
						this.updateActionsMenu();

					}) )

					// Delete event button
					this.buttonEventDelete = add( newButton(null, 'Delete', () => {

						var index = this.paramEvents.findIndex(event => this.selectEvents.getValue() == event.getNameId());
						if (index < 0) return;

						if (this.paramEvents[index].actions.length > 0) 
						if (!confirm("Are you sure you want to remove the event with all its actions?"))
							return;

						// Close action windows related to event
						this.paramEvents[index].actions.forEach(action => {
							this.deleteActionWindow(action);
						})

						this.paramEvents.splice(index, 1);

						this.updateSelectEvents();
						this.updateEventsMenu();
						this.updateSelectActions();
						this.updateActionsMenu();

					}) )

					// Change event button

					this.buttonEventChange = add( newButton(null, 'Change', () => {

						var event = this.getSelectedEvent();
						if (!event) return;

						var eventType = this.selectEventType.getValue();
						var eventSubtype = 0;

						if (this.subtypeValueFunction) {
							eventSubtype = this.subtypeValueFunction();
						}

						// Don't continue if there's an event with the exact same type and subtype
						if (this.paramEvents.find(x => x.type == eventType && x.subtype == eventSubtype))
							return;

						event.type = eventType;
						event.subtype = eventSubtype;

						this.sortEvents();

						this.updateSelectEvents();
						this.selectEvents.setValue(event.getNameId());
						// this.updateEventsMenu();
						// this.updateSelectActions();
						// this.updateActionsMenu();

					}) )

					endparent();

				parent( add( newElem(null, 'div') ) ) // Actions area

					// // Actions

					this.selectActions = add( new HSelect('Actions:', 'actions') )
					this.selectActions.select.html.size = 2;

					this.selectActions.setOnChange(() => {
						this.updateActionsMenu();
					})

					this.buttonActionEdit = add( newButton(null, 'Edit action', () => {
						var event = this.getSelectedEvent();
						if (!event) return;

						var actionIndex = this.selectActions.getSelectedIndex();
						if (actionIndex < 0) return;
						
						var action = event.actions[actionIndex];
						if (!action) return;

						this.openActionWindow(action);
					}) )

					this.buttonActionDelete = add( newButton(null, 'Delete action', () => {
						var event = this.getSelectedEvent();
						if (!event) return;

						var actionIndex = this.selectActions.getSelectedIndex();
						if (actionIndex < 0) return;

						var action = event.actions[actionIndex];
						if (!action) return;

						this.deleteActionWindow(action);

						event.actions.splice(actionIndex, 1);

						this.updateSelectActions();
						this.updateActionsMenu();

					}) )

					this.buttonActionUp = add( newButton(null, '▲', () => {
						var event = this.getSelectedEvent();
						if (!event) return;

						var actionIndex = this.selectActions.getSelectedIndex();
						if (actionIndex < 0 || actionIndex == 0) return;

						event.actions.splice(actionIndex-1, 0, event.actions.splice(actionIndex, 1)[0]);

						this.updateSelectActions();
						this.selectActions.setSelectedIndex(actionIndex-1);
						this.updateActionsMenu();
					}) )

					this.buttonActionDown = add( newButton(null, '▼', () => {
						var event = this.getSelectedEvent();
						if (!event) return;

						var actionIndex = this.selectActions.getSelectedIndex();
						if (actionIndex < 0 || actionIndex == event.actions.length-1) return;

						event.actions.splice(actionIndex+1, 0, event.actions.splice(actionIndex, 1)[0]);

						this.updateSelectActions();
						this.selectActions.setSelectedIndex(actionIndex+1);
						this.updateActionsMenu();
					}) )

					endparent();

				parent( add( newElem(null, 'div') ) ) // Libraries area

					this.librariesTabControl = add( new HTabControl() )

					this.editor.libraries.forEach(library => {
						
						parent( this.librariesTabControl.addTab(library.name, (library.name == this.editor.preferences.defaultActionLibraryTab)) )

							var nextClass = null;

							parent( add( newElem('grid-action-types', 'div') ) )

								library.items.forEach(actionType => {

									if (actionType.kind == "label") {
										add( newElem('label', 'div', actionType.name) );

									} else if (actionType.kind == "separator") {
										nextClass = 'new-row';

									} else {
										
										// TODO add images to the buttons
										var actionTypeButton = add( newButton('action-type', null, () => {

											var event = this.getSelectedEvent();
											if (!event) {
												alert("You need to select or add an event before you can add actions.");
												return;
											}

											var action = new ProjectAction();
											action.typeLibrary = library.name;
											action.typeId = actionType.id;
											action.typeKind = actionType.kind;
											action.typeExecution = actionType.execution;
											action.typeExecutionFunction = actionType.executionFunction;
											action.typeExecutionCode = actionType.executionCode;
											action.typeIsQuestion = actionType.isQuestion;

											action.appliesTo = -1;
											action.relative = false;
											action.not = false;

											if (actionType.kind == 'normal' && actionType.interfaceKind == 'normal') {
												// If kind and interface are normal, arguments come from the action type itself
												action.args = actionType.args.map(arg => new ProjectActionArg(arg.kind, arg.default));
											} else {
												// Otherwise, the arguments come from a predefined list 
												action.args = this.getActionTypeInfo()
													.find(x => x.kind == actionType.kind && x.interfaceKind == actionType.interfaceKind)
													.args.map(arg => new ProjectActionArg(arg.kind, arg.default));
											}

											this.openActionWindow(action);

											event.actions.push(action);

											this.updateSelectActions();
											this.selectActions.setSelectedIndex(event.actions.length-1)
											this.updateActionsMenu();

										}) )

										if (nextClass) {
											actionTypeButton.classList.add(nextClass);
											nextClass = null;
										}

										actionTypeButton.title = actionType.description;

										if (actionType.image) {
											parent(actionTypeButton)
												add( newImage(null, actionType.image) )
												endparent()
										} else {
											actionTypeButton.textContent = actionType.description;
										}

									}

								})

								endparent()

							endparent()

					})

					endparent();

				endparent();

			// Add initial events
			this.sortEvents();
			this.updateSelectEvents();
			this.selectEvents.setSelectedIndex(0);
			this.updateEventsMenu();

			// Add initial subtypes
			this.updateDivEventSubtype();

			// Select first event
			this.updateSelectActions();
			this.updateActionsMenu();

			this.makeApplyOkButtons(
				() => {
					this.editor.changeResourceName(object, inputName.getValue());
					this.editor.changeObjectSprite(object, this.selectSprite.getValue());
					object.visible = inputVisible.getChecked();
					object.solid = inputSolid.getChecked();
					object.depth = parseInt(inputDepth.getValue());
					object.persistent = inputPersistent.getChecked();
					this.htmlActionWindows.forEach(w => {
						w.apply();
					})

					object.events = this.paramEvents;
					// changes here
				},
				() => {
					this.close();
				}
			);
			endparent();

		this.listeners = this.editor.dispatcher.listen({
			changeResourceName: i => {
				this.updateSelectActions();
			},
		})
	}

	sortEvents() {
		this.paramEvents.sort((a, b) => {

			var aTypeId = Events.listEventTypes.find(x => x.value == a.type).id;
			var bTypeId = Events.listEventTypes.find(x => x.value == b.type).id;

			var compareTypeId = aTypeId - bTypeId;
			if (compareTypeId != 0) return compareTypeId;

			var aSubtypeId = a.subtype;
			var bSubtypeId = b.subtype;
			
			var compareSubtypeId = aSubtypeId - bSubtypeId;
			return compareSubtypeId;

		})
	}

	updateSelectEvents() {

		var index = this.selectEvents.getSelectedIndex();
		this.selectEvents.removeOptions();
		this.selectEventsOptions = {};

		parent( this.selectEvents.select );
			this.paramEvents.forEach(event => {
				this.selectEventsOptions[event.getNameId()] = add( newOption(null, event.getNameId(),
					Events.getEventName(event, this.editor.project)) )
			})
			endparent();

		this.selectEvents.setSelectedIndex(Math.min(index, this.paramEvents.length-1));

	}

	updateEventsMenu() {
		if (this.selectEvents.getSelectedIndex() < 0) {
			this.buttonEventChange.disabled = true;
			this.buttonEventDelete.disabled = true;
		} else {
			this.buttonEventChange.disabled = false;
			this.buttonEventDelete.disabled = false;
		}

	}

	updateDivEventSubtype() {

		if (this.selectCollisionObject) {
			remove(this.selectCollisionObject)
			this.selectCollisionObject = null;
		}

		this.divEventSubtype.textContent = '';
		var eventType = this.selectEventType.getValue();

		parent(this.divEventSubtype);

			this.subtypeValueFunction = null;

			if (eventType == 'step') {
				let subtypeElement = add( new HSelectWithOptions('Step:', Events.listStepSubtypes))
				this.subtypeValueFunction = () => subtypeElement.getValue();
			} else

			if (eventType == 'alarm') {
				let subtypeElement = add( new HNumberInput('Alarm:', 0, 1, 0, 11) )
				this.subtypeValueFunction = () => (parseInt(subtypeElement.getValue()));
			} else

			if (eventType == 'keyboard' || eventType == 'keypress' || eventType == 'keyrelease') {
				let subtypeElement = add( new HNumberInput('Key:', 0, 1, 0) )
				this.subtypeValueFunction = () => (parseInt(subtypeElement.getValue()));
			} else

			if (eventType == 'mouse') {
				let subtypeElement = add( new HSelectWithOptions('Mouse:', Events.listMouseSubtypes))
				this.subtypeValueFunction = () => (parseInt(subtypeElement.getValue()));
			} else

			if (eventType == 'collision') {
				this.selectCollisionObject = add( new HResourceSelect(this.editor, 'Object:', ProjectObject, true) )
				this.subtypeValueFunction = () => (parseInt(this.selectCollisionObject.getValue()));
			} else

			if (eventType == 'other') {
				let subtypeElement = add( new HSelectWithOptions('Other:', Events.listOtherSubtypes))
				this.subtypeValueFunction = () => (parseInt(subtypeElement.getValue()));
			}

			endparent()
		
	}

	updateSelectActions() {

		var index = this.selectActions.getSelectedIndex();
		this.selectActions.removeOptions();
		this.selectActionsOptions = {};

		var event = this.getSelectedEvent();

		if (event) {
			parent(this.selectActions.select);
				event.actions.forEach((action, i) => {

					var actionType = this.editor.getActionType(action);
					var listText = this.getActionListText(action, actionType);
					var hintText = this.getActionHintText(action, actionType);
					
					this.selectActionsOptions[i] = add( newOption(
						(listText.bold ? 'bold ' : '') + (listText.italic ? 'italic ' : ''),
						null, (this.editor.preferences.hintTextInAction ? hintText.text : listText.text)
					) )
					this.selectActionsOptions[i].title = hintText.text;

				})
				endparent()

			this.selectActions.setSelectedIndex(Math.min(index, event.actions.length-1));
		}

		this.updateActionsMenu();

	}

	updateActionsMenu() {
		var event = this.getSelectedEvent();
		
		if (this.selectActions.getSelectedIndex() < 0) {
			this.buttonActionEdit.disabled = true;
			this.buttonActionDelete.disabled = true;
			this.buttonActionUp.disabled = true;
			this.buttonActionDown.disabled = true;
		} else {
			this.buttonActionEdit.disabled = false;
			this.buttonActionDelete.disabled = false;
			this.buttonActionUp.disabled = (this.selectActions.getSelectedIndex() == 0);
			this.buttonActionDown.disabled = (this.selectActions.getSelectedIndex() == event.actions.length-1);
		}

	}

	getSelectedEvent() {
		return this.paramEvents.find(event => this.selectEvents.getValue() == event.getNameId());
	}

	getActionTypeInfo() {
		return [
			{kind: 'normal', interfaceKind: 'none', args: []},
			{kind: 'normal', interfaceKind: 'normal', htmlclass: HTMLWindowAction},
			{kind: 'normal', interfaceKind: 'arrows', htmlclass: HTMLWindowAction, args: [
				{name: 'Directions:', kind: 'string', default: "000000000"},
				{name: 'Speed:', kind: 'expression', default: "0"},
			]},
			{kind: 'normal', interfaceKind: 'code', htmlclass: HTMLWindowCode, args: [
				{kind: 'string', default: ""},
			]},
			{kind: 'normal', interfaceKind: 'text', htmlclass: HTMLWindowCode, args: [
				{kind: 'string', default: ""},
			]},
			{kind: 'repeat', htmlclass: HTMLWindowAction, hasApplyTo: false, args: [
				{name: 'times:', kind: 'expression', default: "1"},
			]},
			{kind: 'variable', htmlclass: HTMLWindowAction, hasApplyTo: true, hasRelative: true, args: [
				{name: 'variable:', kind: 'string', default: ""},
				{name: 'value:', kind: 'expression', default: "0"},
			]},
			{kind: 'code', htmlclass: HTMLWindowCode, hasApplyTo: true, args: [
				{kind: 'string', default: ""},
			]},
			{kind: 'begin', args: []},
			{kind: 'end', args: []},
			{kind: 'else', args: []},
			{kind: 'exit', args: []},
		];
	}

	getActionListText(action, actionType) {
		return this.parseActionListOrHintText(actionType.listText, action, actionType);
	}

	getActionHintText(action, actionType) {
		return this.parseActionListOrHintText(actionType.hintText, action, actionType);
	}

	parseActionListOrHintText(textArray, action, actionType) {

		var result = {
			bold: false,
			italic: false,
		};

		result.text = textArray.reduce((previous, part) => {
			if (typeof part == 'string') return previous + part;
			switch (part.type) {
				case 'a': {
					let actionArg = action.args[part.number];

					if (['expression', 'string', 'both', 'color'].includes(actionArg.kind)) {
						return previous + actionArg.value.toString();

					} else if ('boolean' == actionArg.kind) {
						return previous + (actionArg.value ? 'true' : 'false');

					} else if ('menu' == actionArg.kind) {
						return previous + actionType.args[part.number].menu[actionArg.value];

					} else {
						let resourceType = this.constructor.actionArgResourceTypes[actionArg.kind];
						if (!resourceType) throw new Error('Impossible action arg kind '+actionArg.kind);
						let resource = this.editor.project.resources[resourceType.getClassName()].find(x => x.id == actionArg.value);
						return previous + (resource ? resource.name : '<undefined>');
					}
				}
				case 'r':
					return previous + (action.relative ? 'relative ' : '')
				case 'n':
					return previous + (action.not ? 'not ' : '')
				case 'w': {
					if (action.appliesTo == -1) return '';
					if (action.appliesTo == -2) return 'for the other object: ';
					let resource = this.editor.project.resources.ProjectObject.find(x => x.id == action.appliesTo);
					return previous + 'for object ' + (resource ? resource.name : '<undefined>') + ': ';
				}

				case 'i':
					result.italic = true;
					break;
				case 'b':
					result.bold = true;
					break;
			}
			return previous;
		}, '')

		return result;
	}

	openActionWindow(action) {

		var actionType = this.editor.getActionType(action.typeLibrary, action.typeId);

		var actionTypeInfo = this.getActionTypeInfo();
		var actionTypeInfoItem = actionTypeInfo.find(x => x.kind == actionType.kind && x.interfaceKind == actionType.interfaceKind);

		if (actionTypeInfoItem.htmlclass) {
			var w = this.editor.windowsArea.open(actionTypeInfoItem.htmlclass, action, action, this);
			if (w) {
				this.htmlActionWindows.push(w);
			}
		}
		
	}

	deleteActionWindow(id) {
		var index = this.htmlActionWindows.findIndex(x => x.id == id);
		if (index >= 0) {
			this.htmlActionWindows[index].close();
			this.htmlActionWindows.splice(index, 1);
		}
	}

	close() {
		super.close();
		this.htmlActionWindows.forEach(w => {
			w.close();
		})
		this.htmlActionWindows = [];
	}

	remove() {
		super.remove();
		remove(this.selectSprite)
		if (this.selectCollisionObject) {
			remove(this.selectCollisionObject)
		}
		this.editor.dispatcher.stopListening(this.listeners);
	}
}