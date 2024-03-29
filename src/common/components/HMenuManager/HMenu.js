import {HElement, parent, endparent, add} from "~/common/h";

export default class HMenu extends HElement {
	constructor(manager, items, options) {
		/*
		items: [
			text,
			onClick,
			enable: true,
		],
		options: {
			x, y,
			fromElement,
		}
		*/
		parent( super("div", {class: "h-menu"}) );

			this.manager = manager;
			this.items = items;

			this.promise = new Promise(resolve => {
				this.promiseResolveFn = resolve;
			});

			this.isOpen = true;
			this.closeOnBlur = true;

			let x = options.x;
			let y = options.y;

			if (options.fromElement) {
				const rect = options.fromElement.html.getBoundingClientRect();
				x = rect.left + document.documentElement.scrollLeft;
				y = rect.bottom + document.documentElement.scrollTop;
			}

			const managerRect = manager.html.getBoundingClientRect();
			x -= managerRect.left;
			y -= managerRect.top;

			this.x = x;
			this.y = y;

			this.selectedIndex = null;
			this.focusedBefore = document.activeElement;

			this.html.tabIndex = 0;

			this.html.addEventListener("blur", () => {
				if (this.closeOnBlur) {
					this.closeWithoutFocusBefore(null);
				}
			});

			this.html.addEventListener("keydown", e => {
				if (e.code == "Escape") {
					this.close(null);
				} else if (e.code == "Enter") {
					e.preventDefault();
					if (this.selectedIndex != null) {
						if (items[this.selectedIndex].enabled !== false) {
							items[this.selectedIndex].onClick?.(this);
						}
						this.close(this.selectedIndex);
					} else {
						this.close(null);
					}
				} else if (e.code == "ArrowDown") {
					e.preventDefault();
					items[this.selectedIndex]?.menuItemElement.html.classList.remove("selected");

					if (this.selectedIndex != null && this.selectedIndex != items.length - 1) {
						this.selectedIndex += 1;
					} else {
						this.selectedIndex = 0;
					}

					items[this.selectedIndex].menuItemElement.html.classList.add("selected");
				} else if (e.code == "ArrowUp") {
					e.preventDefault();
					items[this.selectedIndex]?.menuItemElement.html.classList.remove("selected");

					if (this.selectedIndex != null && this.selectedIndex != 0) {
						this.selectedIndex -= 1;
					} else {
						this.selectedIndex = items.length - 1;
					}

					items[this.selectedIndex].menuItemElement.html.classList.add("selected");
				}
			});

			this.html.addEventListener("contextmenu", e => {
				e.preventDefault();
			});

			for (const [index, item] of items.entries()) {
				let text = item.text;
				if (typeof text == "function") {
					text = text();
				}

				const menuItem = add( new HElement("div", {class: "h-menu-item"}, text) );

				let enabled = item.enabled;
				if (typeof enabled == "function") {
					enabled = enabled();
				}
				if (enabled === false) {
					menuItem.html.classList.add("disabled");
				}

				menuItem.html.addEventListener("click", () => {
					if (item.enabled !== false) {
						item.onClick?.(this);
					}
					this.close(index);
				});

				menuItem.html.addEventListener("mouseleave", () => {
					items[this.selectedIndex]?.menuItemElement.html.classList.remove("selected");
					this.selectedIndex = null;
					menuItem.html.classList.remove("selected");
				});

				menuItem.html.addEventListener("mousemove", () => {
					items[this.selectedIndex]?.menuItemElement.html.classList.remove("selected");
					this.selectedIndex = index;
					menuItem.html.classList.add("selected");
				});

				item.menuItemElement = menuItem;
			}

			this.html.style.left = x.toString() + "px";
			this.html.style.top = y.toString() + "px";

			endparent();
	}

	onAdd() {
		const rect = this.html.getBoundingClientRect();
		const managerRect = this.manager.html.getBoundingClientRect();

		if (this.x + rect.width > managerRect.width) {
			this.x = Math.max(0, managerRect.width - rect.width);
		}
		if (this.y + rect.height > managerRect.height) {
			this.y = Math.max(0, managerRect.height - rect.height);
		}

		this.html.style.left = this.x.toString() + "px";
		this.html.style.top = this.y.toString() + "px";

		this.html.focus({preventScroll: true});
	}

	close(resolveValue) {
		if (this.isOpen) {
			this.closeWithoutFocusBefore(resolveValue);

			if (this.focusedBefore && this.focusedBefore.isConnected) {
				this.focusedBefore.focus({preventScroll: true});
			}
		}
	}

	closeWithoutFocusBefore(resolveValue=null) {
		if (this.isOpen) {
			this.isOpen = false;
			this.remove();

			if (resolveValue != null && this.items[resolveValue].enabled === false) {
				resolveValue = null;
			}

			this.promiseResolveFn(resolveValue);
		}
	}
}