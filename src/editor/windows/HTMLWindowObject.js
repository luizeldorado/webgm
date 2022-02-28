import Events from '../../common/Events.js';
import {$, parent, endparent, add, html, text, newElem, newButton, newTextBox, newNumberBox, newCheckBox, newSelect, newImage} from '../../common/H.js'
import {
	ProjectSprite, ProjectSound, ProjectBackground, ProjectPath, ProjectScript, ProjectObject, ProjectRoom, ProjectFont, ProjectTimeline,
	ProjectEvent, ProjectAction, ProjectActionArg
} from '../../common/Project.js';
import HTMLResourceSelect from '../HTMLResourceSelect.js';
import HTMLTabs from '../HTMLTabs.js';
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

				parent( add( newElem(null, 'div') ) ) // Main area

					var inputName = $( add( newTextBox(null, 'Name:', object.name) ), 'input');

					this.selectSprite = new HTMLResourceSelect(this.editor, 'Sprite:', ProjectSprite);
					this.selectSprite.setValue(object.sprite_index);

					var inputVisible = $( add( newCheckBox(null, 'Visible', object.visible) ), 'input');
					var inputSolid = $( add( newCheckBox(null, 'Solid', object.solid) ), 'input');
					var inputDepth = $( add( newNumberBox(null, 'Depth:', object.depth, 1) ), 'input');
					var inputPersistent = $( add( newCheckBox(null, 'Persistent', object.persistent) ), 'input');

					endparent()

				parent( add( newElem(null, 'div') ) ) // Events area

					// Event select

					this.selectEvents = $( add( newSelect('events', 'Events:') ), 'select');
					this.selectEvents.size = 2;

					this.selectEvents.onchange = () => {
						this.updateSelectActions();
						this.updateActionsMenu();
					}

					// Event type select

					this.selectEventType = $( add( newSelect(null, 'Event type:', Events.listEventTypes) ), 'select');

					this.selectEventType.onchange = () => {
						this.updateDivEventSubtype();
					}

					// Event subtype div

					this.selectCollisionObject = null;
					this.divEventSubtype = add( html('div') );

					// Add event button
					this.buttonEventAdd = add( newButton(null, 'Add Event', () => {

						var eventType = this.selectEventType.value;
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
						this.selectEvents.value = event.getNameId();
						this.updateEventsMenu();
						this.updateSelectActions();
						this.updateActionsMenu();

					}) )

					// Delete event button
					this.buttonEventDelete = add( newButton(null, 'Delete', () => {

						var index = this.paramEvents.findIndex(event => this.selectEvents.value == event.getNameId());
						if (index < 0) return;

						if (this.paramEvents[index].actions.length > 0) 
						if (!confirm("Are you sure you want to remove the event with all its actions?"))
							return;

						// Close action windows related to event
						this.paramEvents[index].actions.forEach(action => {
							var w = this.htmlActionWindows.find(x => x.id = action);
							if (w) {w.close();}
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

						var eventType = this.selectEventType.value;
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
						this.selectEvents.value = event.getNameId();
						// this.updateEventsMenu();
						// this.updateSelectActions();
						// this.updateActionsMenu();

					}) )

					endparent();

				parent( add( newElem(null, 'div') ) ) // Actions area

					// // Actions

					this.selectActions = $( add( newSelect('actions', 'Actions:') ), 'select');
					this.selectActions.size = 2;

					this.selectActions.onchange = () => {
						this.updateActionsMenu();
					}

					this.buttonActionEdit = add( newButton(null, 'Edit action', () => {
						var event = this.getSelectedEvent();
						if (!event) return;

						var actionIndex = this.selectActions.selectedIndex;
						if (actionIndex < 0) return;
						
						var action = event.actions[actionIndex];
						if (!action) return;

						this.openActionWindow(action);
					}) )

					this.buttonActionDelete = add( newButton(null, 'Delete action', () => {
						var event = this.getSelectedEvent();
						if (!event) return;

						var actionIndex = this.selectActions.selectedIndex;
						if (actionIndex < 0) return;

						var action = event.actions[actionIndex];
						if (!action) return;

						var w = this.htmlActionWindows.find(x => x.id == action);
						if (w) {w.close();}

						event.actions.splice(actionIndex, 1);

						this.updateSelectActions();
						this.updateActionsMenu();

					}) )

					this.buttonActionUp = add( newButton(null, '▲', () => {
						var event = this.getSelectedEvent();
						if (!event) return;

						var actionIndex = this.selectActions.selectedIndex;
						if (actionIndex < 0 || actionIndex == 0) return;

						event.actions.splice(actionIndex-1, 0, event.actions.splice(actionIndex, 1)[0]);

						this.updateSelectActions();
						this.selectActions.selectedIndex = actionIndex-1;
						this.updateActionsMenu();
					}) )

					this.buttonActionDown = add( newButton(null, '▼', () => {
						var event = this.paramEvents.find(event => this.selectEvents.value == event.getNameId());
						if (!event) return;

						var actionIndex = this.selectActions.selectedIndex;
						if (actionIndex < 0 || actionIndex == event.actions.length-1) return;

						event.actions.splice(actionIndex+1, 0, event.actions.splice(actionIndex, 1)[0]);

						this.updateSelectActions();
						this.selectActions.selectedIndex = actionIndex+1;
						this.updateActionsMenu();
					}) )

					endparent();

				parent( add( newElem(null, 'div') ) ) // Libraries area

					this.tabs = new HTMLTabs();

					this.editor.libraries.forEach(library => {
						
						parent( this.tabs.addTab(library.name, (library.name == this.editor.preferences.defaultActionLibraryTab)) )

							library.items.forEach(actionType => {

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
									this.selectActions.selectedIndex = event.actions.length-1;
									this.updateActionsMenu();

								}) )

								actionTypeButton.title = actionType.description;

								parent(actionTypeButton)
									if (actionType.image) {
										add( newImage(null, actionType.image) )
									} else {
										add( text(actionType.description) )
									}
									endparent()

							})

							endparent()

					})

					endparent();

				endparent();

			// Add initial events
			this.sortEvents();
			this.updateSelectEvents();
			this.selectEvents.selectedIndex = 0;
			this.updateEventsMenu();

			// Add initial subtypes
			this.updateDivEventSubtype();

			// Select first event
			this.updateSelectActions();
			this.updateActionsMenu();

			this.makeApplyOkButtons(
				() => {
					this.editor.changeResourceName(object, inputName.value);
					this.editor.changeObjectSprite(object, this.selectSprite.getValue());
					object.visible = inputVisible.checked;
					object.solid = inputSolid.checked;
					object.depth = parseInt(inputDepth.value);
					object.persistent = inputPersistent.checked;
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

		// TODO: add dispatcher to update action list when resource name changes
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

		var index = this.selectEvents.selectedIndex;
		this.selectEvents.textContent = '';
		this.selectEventsOptions = {};

		parent( this.selectEvents );
			this.paramEvents.forEach(event => {
				this.selectEventsOptions[event.getNameId()] = add( html('option',
					{value: event.getNameId()}, null, Events.getEventName(event, this.editor.project)) )
			})
			endparent();

		this.selectEvents.selectedIndex = Math.min(index, this.paramEvents.length-1);

	}

	updateEventsMenu() {
		if (this.selectEvents.selectedIndex < 0) {
			this.buttonEventChange.disabled = true;
			this.buttonEventDelete.disabled = true;
		} else {
			this.buttonEventChange.disabled = false;
			this.buttonEventDelete.disabled = false;
		}

	}

	updateDivEventSubtype() {

		if (this.selectCollisionObject) {
			this.selectCollisionObject.remove();
			this.selectCollisionObject = null;
		}

		this.divEventSubtype.textContent = '';
		var eventType = this.selectEventType.value;

		parent(this.divEventSubtype);

			this.subtypeValueFunction = null;

			if (eventType == 'step') {
				let subtypeElement = $( add( newSelect(null, 'Step:', Events.listStepSubtypes)), 'select');
				this.subtypeValueFunction = () => subtypeElement.value;
			} else

			if (eventType == 'alarm') {
				let subtypeElement = $( add( newNumberBox(null, 'Alarm:', 0, 1, 0, 11) ), 'input');
				this.subtypeValueFunction = () => (parseInt(subtypeElement.value));
			} else

			if (eventType == 'keyboard' || eventType == 'keypress' || eventType == 'keyrelease') {
				let subtypeElement = $( add( newNumberBox(null, 'Key:', 0, 1, 0) ), 'input');
				this.subtypeValueFunction = () => (parseInt(subtypeElement.value));
			} else

			if (eventType == 'mouse') {
				let subtypeElement = $( add( newSelect(null, 'Mouse:', Events.listMouseSubtypes)), 'select');
				this.subtypeValueFunction = () => (parseInt(subtypeElement.value));
			} else

			if (eventType == 'collision') {
				this.selectCollisionObject = new HTMLResourceSelect(this.editor, 'Object:', ProjectObject, true);
				let subtypeElement = this.selectCollisionObject.select;
				this.subtypeValueFunction = () => (parseInt(subtypeElement.value));
			} else

			if (eventType == 'other') {
				let subtypeElement = $( add( newSelect(null, 'Other:', Events.listOtherSubtypes)), 'select');
				this.subtypeValueFunction = () => (parseInt(subtypeElement.value));
			}

			endparent()
		
	}

	updateSelectActions() {

		var index = this.selectActions.selectedIndex;
		this.selectActions.textContent = '';
		this.selectActionsOptions = {};

		var event = this.getSelectedEvent();

		if (event) {
			parent(this.selectActions);
				event.actions.forEach((action, i) => {

					var actionType = this.editor.getActionType(action);
					var listText = this.getActionListText(action, actionType);
					var hintText = this.getActionHintText(action, actionType);
					
					this.selectActionsOptions[i] = add( html('option',
						{
							/*value: action.getNameId(),*/
							class: (listText.bold ? 'bold ' : '') + (listText.italic ? 'italic ' : ''),
							title: hintText.text
						}, null, listText.text) )

				})
				endparent()

			this.selectActions.selectedIndex = Math.min(index, event.actions.length-1);
		}

		this.updateActionsMenu();

	}

	updateActionsMenu() {
		var event = this.getSelectedEvent();
		
		if (this.selectActions.selectedIndex < 0) {
			this.buttonActionEdit.disabled = true;
			this.buttonActionDelete.disabled = true;
			this.buttonActionUp.disabled = true;
			this.buttonActionDown.disabled = true;
		} else {
			this.buttonActionEdit.disabled = false;
			this.buttonActionDelete.disabled = false;
			this.buttonActionUp.disabled = (this.selectActions.selectedIndex == 0);
			this.buttonActionDown.disabled = (this.selectActions.selectedIndex == event.actions.length-1);
		}

	}

	getSelectedEvent() {
		return this.paramEvents.find(event => this.selectEvents.value == event.getNameId());
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

	deleteActionWindow(w) {
		var index = this.htmlActionWindows.findIndex(x => x == w);
		if (index>=0) {
			w.close();
			this.htmlActionWindows.splice(index, 1);
		}
	}

	close() {
		super.close();
		this.htmlActionWindows.forEach(w => {
			w.close();
		})
	}

	remove() {
		super.remove();
		this.selectSprite.remove();
		if (this.selectCollisionObject) {
			this.selectCollisionObject.remove();
		}
	}
}