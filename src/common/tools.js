// Bunch of random functions that make my life easier

import {HElement} from "./h";

export function sortValues(array, ascending, fnGetValue) {
	array.sort((a, b) => {
		if (fnGetValue) {
			a = fnGetValue(a);
			b = fnGetValue(b);
		}

		if (typeof a == "number" && typeof b == "number") {
			return ascending ? (a - b) : (b - a);
		} else if (typeof a == "string" && typeof b == "string") {
			return ascending ? a.localeCompare(b) : b.localeCompare(a);
		} else if (typeof a == "number" && typeof b == "string") {
			return ascending ? -1 : 1;
		} else if (typeof a == "string" && typeof b == "number") {
			return ascending ? 1 : -1;
		}

		return 0;
	});
}

export function shuffle(array) {
	for (let i = array.length-1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}

export function shuffle2d(array) {
	for (let i = array.length-1; i > 0; i--) {
		for (let j = array[i].length-1; j > 0; j--) {
			const k = Math.floor(Math.random() * (i + 1));
			const l = Math.floor(Math.random() * (j + 1));

			[array[i][j], array[k][l]] = [array[k][l], array[i][j]];
		}
	}
}

// Open and save files

export function openFile(accept, multiple=false) {
	return new Promise((resolve) => {
		const f = new HElement("input");
		f.html.accept = accept;
		f.html.type = "file";
		if (multiple) {
			f.html.multiple = true;
		}
		f.html.addEventListener("change", () => {
			if (multiple) {
				resolve(f.html.files);
			} else {
				resolve(f.html.files[0]);
			}
		});
		f.html.click();
	});
}

export function saveFile(blob, name) {
	const a = new HElement("a");
	a.html.href = URL.createObjectURL(blob);
	a.html.download = name;
	a.html.click();
}

// Dates

export function toGMDate(jsDate) {
	return (jsDate - Date.UTC(1899, 11, 30)) / 1000 / 60 / 60 / 24;
}

export function toJSDate(gmDate) {
	return new Date((gmDate * 24 * 60 * 60 * 1000) + Date.UTC(1899, 11, 30));
}

// Colors

// decimal -> rgb
export function decimalToRGB(color) {
	return {
		r: color % 256,
		g: Math.floor(color % (256*256) / 256),
		b: Math.floor(color % (256*256*256) / (256*256)),
	};
}

// rgb -> decimal
export function rgbToDecimal(rgb) {
	return rgb.r + rgb.g * 256 + rgb.b * 256*256;
}

// decimal -> hex
export function decimalToHex(color) {
	const {r, g, b} = decimalToRGB(color);
	const hr = r.toString(16).padStart(2, "0");
	const hg = g.toString(16).padStart(2, "0");
	const hb = b.toString(16).padStart(2, "0");
	return "#" + hr + hg + hb;
}

// hex -> decimal
export function hexToDecimal(hex) {
	const r = parseInt(hex.substr(1+2*0, 2), 16);
	const g = parseInt(hex.substr(1+2*1, 2), 16);
	const b = parseInt(hex.substr(1+2*2, 2), 16);
	return rgbToDecimal({r, g, b});
}

// decimal, alpha -> hexalpha
export function decimalToHexAlpha(color, alpha) {
	return decimalToHex(color) + Math.round(alpha * 255).toString(16).padStart(2, "0");
}

// hexalpha -> decimal, alpha
export function hexAlphaToDecimal(hex) {
	return {
		color: hexToDecimal(hex),
		alpha: (parseInt(hex.substr(1+2*3, 2), 16) / 255),
	};
}

// decimal -> hsv
export function decimalToHSV(color) {
	return rgbToHSV(decimalToRGB(color));
}

// hsv -> decimal
export function hsvToDecimal(hsv) {
	return rgbToDecimal(hsvToRGB(hsv));
}

// rgb -> hsv
export function rgbToHSV({r, g, b}) {
	r /= 255;
	g /= 255;
	b /= 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const d = max - min;

	let h;
	if (max == min) {
		h = 0;
	} else {
		switch (max) {
			case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			case g: h = (b - r) / d + 2; break;
			case b: h = (r - g) / d + 4; break;
		}

		h /= 6;
	}

	const s = (max == 0) ? 0 : (d / max);
	const v = max;

	return {
		h: Math.floor(h * 255),
		s: Math.floor(s * 255),
		v: Math.floor(v * 255),
	};
}

// hsv -> rgb
export function hsvToRGB({h, s, v}) {
	h /= 255;
	s /= 255;
	v /= 255;

	const i = Math.floor(h * 6);
	const f = h * 6 - i;
	const p = v * (1 - s);
	const q = v * (1 - f * s);
	const t = v * (1 - (1 - f) * s);

	let r, g, b;
	switch (i % 6) {
		case 0: r = v; g = t; b = p; break;
		case 1: r = q; g = v; b = p; break;
		case 2: r = p; g = v; b = t; break;
		case 3: r = p; g = q; b = v; break;
		case 4: r = t; g = p; b = v; break;
		case 5: r = v; g = p; b = q; break;
	}

	return {
		r: Math.floor(r * 255),
		g: Math.floor(g * 255),
		b: Math.floor(b * 255),
	};
}

// CSS font string

export function makeCSSFont(family, size, bold, italic) {
	return `${bold ? "bold " : ""}${italic ? "italic " : ""}${size}pt "${family}"`;
}

// Arrow strings

export function parseArrowString(string) {
	const values = [];

	for (let i = 0; i < 9; ++i) {
		if (string[i] != "0") {
			values.push(true);
		} else {
			values.push(false);
		}
	}

	return values;
}

export function stringifyArrowValues(values) {
	let string = "";

	for (let i = 0; i < 9; ++i) {
		if (values[i]) {
			string += "1";
		} else {
			string += "0";
		}
	}

	return string;
}

// Value type conversion

export function asString(value) {
	if (typeof value != "string") {
		return (value % 1 == 0) ? value.toString() : value.toFixed(2);
	}
	return value;
}

export function forceString(value) {
	if (typeof value != "string") {
		return "";
	}
	return value;
}

export function forceReal(value) {
	if (typeof value != "number") {
		return 0;
	}
	return value;
}

export function forceInteger(value) {
	return toInteger(forceReal(value));
}

export function forceBool(value) {
	return (forceReal(value) > 0.5);
}

export function forceUnit(value) {
	return Math.max(0, Math.min(forceReal(value), 1));
}

export function forceChar(value) {
	const string = forceString(value);
	return string != "" ? string[0] : "\0";
}

export function toInteger(value) {
	if (Math.abs(value % 1) == 0.5) {
		const integer = Math.trunc(value);
		if (integer % 2 == 0) {
			return integer;
		} else {
			return integer + Math.sign(integer);
		}
	} else {
		return Math.round(value);
	}
}

// Text

export function parseNewLineHash(string) {
	// Replace # without backslash before and \r with \n, then replace \# with #.
	return string.replaceAll(/(?<!\\)#|\r/g, "\n").replaceAll("\\#", "#");
}

// Elements

// Add an input event to element and its children if it's an input element.
export function setDeepOnUpdateOnElement(element, fn) {
	if (["INPUT", "TEXTAREA", "SELECT"].includes(element.html.tagName)) {
		element.html.addEventListener("input", () => {
			fn();
		}, {passive: true});
	}
	for (const child of element.children) {
		setDeepOnUpdateOnElement(child, fn);
	}
}

// Make a element be able to receive drops of files from anywhere, but returns a file handle
export function setOnFileDropAsFileHandle(element, type, onSelectFile, multiple=false) {
	return setOnFileDrop(element, type, onSelectFile, multiple, true);
}

// Make a element be able to receive drops of files from anywhere.
export function setOnFileDrop(element, typeFunc, onSelectFile, multiple=false, asFileHandle=false) {
	element.addEventListener("dragover", e => {
		e.stopPropagation();
		e.preventDefault();

		const files = Array.from(e.dataTransfer.items).filter(item => item.kind == "file");
		if (files.length == 0 || (typeFunc && files.some(file => !typeFunc(file.type)))) {
			e.dataTransfer.dropEffect = "none";
		}
	});

	element.addEventListener("drop", async e => {
		e.preventDefault();
		e.stopPropagation();

		const files = Array.from(e.dataTransfer.items).filter(item => item.kind == "file");

		let fileOrFiles;

		if (multiple) {
			if (asFileHandle) {
				fileOrFiles = await Promise.all(files.map(async file => await file.getAsFileSystemHandle()))
				.filter(handle => (handle.kind == "file"));
				if (fileOrFiles == null) return;
			} else {
				fileOrFiles = files.map(file => file.getAsFile());
			}
		} else {
			if (asFileHandle) {
				fileOrFiles = await files[0]?.getAsFileSystemHandle();
				if (fileOrFiles?.kind != "file") return;
			} else {
				fileOrFiles = files[0].getAsFile();
			}
		}

		onSelectFile(fileOrFiles);
	});
}

// Add in functions to make element draggable (doesn't actually move anything).
/* eslint-disable no-trailing-spaces */
/*
setDraggable(this,
	e => { // mousedown
		
	},
	e => { // mousemove
		
	},
);
*/
/* eslint-enable no-trailing-spaces */
export function setDraggable(element, mouseDown, mouseMove) {
	function mouseUp() {
		document.removeEventListener("mousemove", mouseMove);
		document.removeEventListener("mouseup", mouseUp);
	}

	element.setEvent("mousedown", e => {
		if (e.button != 0) return;
		mouseUp();
		if (mouseDown(e) !== false) {
			document.addEventListener("mousemove", mouseMove);
			document.addEventListener("mouseup", mouseUp);
		}
	});
}