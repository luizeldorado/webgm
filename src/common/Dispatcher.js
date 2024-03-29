export default class Dispatcher {
	constructor() {
		this.listeners = {};
	}

	listen(listeners) {
		for (const subject in listeners) {
			if (!this.listeners[subject]) this.listeners[subject] = [];
			this.listeners[subject].push(listeners[subject]);
		}
		return listeners;
	}

	stopListening(listeners) {
		for (const subject in listeners) {
			if (!this.listeners[subject]) {
				console.warn("Dispatcher subject doesn't exist", subject);
				continue;
			}
			const index = this.listeners[subject].findIndex(x => x == listeners[subject]);
			if (index >= 0) {
				this.listeners[subject].splice(index, 1);
			} else {
				console.warn("Dispatcher func doesn't exist", listeners[subject]);
			}
			if (this.listeners[subject].length == 0) {
				delete this.listeners[subject];
			}
		}
	}

	speak(subject, ...words) {
		const responses = [];
		if (this.listeners[subject]) {
			for (const listener of [...this.listeners[subject]]) {
				responses.push(listener(...words));
			}
		}
		return responses;
	}
}