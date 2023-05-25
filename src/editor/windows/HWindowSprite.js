import {parent, endparent, add, HElement, HButton, HTextInput, HNumberInput, HImage, HCheckBoxInput} from "~/common/h";
import ImageWrapper from "~/common/ImageWrapper.js";
import {openFile, setOnFileDrop} from "~/common/tools.js";
import HWindow from "~/editor/HWindow.js";

import HWindowSpriteImages from "./HWindowSpriteImages.js";

export default class HWindowSprite extends HWindow {
	constructor(editor, id, sprite) {
		super(editor, id);

		this.sprite = sprite;

		this.updateTitle();

		parent(this.client);
			parent( add( new HElement("div", {class: "panel-container window-sprite"}) ) );
				parent( add( new HElement("div", {class: "properties"}) ) );

					const paramName = sprite.name;
					this.paramImages = sprite.images;
					const paramOriginX = sprite.originx;
					const paramOriginY = sprite.originy;

					const inputName = add( new HTextInput("Name:", paramName) );

					parent( add( new HElement("div") ) );
						this.buttonLoadSprite = add( new HButton("Load Sprite", async () => {
							const files = await openFile("image/*", true);
							this.setImagesFromFiles(files);
						}) );
						endparent();

					parent( add( new HElement("div") ) );
						const editSpriteWindowId = {spriteWindow: this};
						add( new HButton("Edit Sprite", () => {
							this.openAsChild(HWindowSpriteImages, editSpriteWindowId);
						}) );
						endparent();

					parent( add( new HElement("div", {}, "Width: ")) );
						this.divWidth = add( new HElement("span") );
						endparent();

					parent( add( new HElement("div", {}, "Height: ")) );
						this.divHeight = add( new HElement("span") );
						endparent();

					parent( add( new HElement("div", {}, "Number of subimages: ")) );
						this.divSubimages = add( new HElement("span") );
						endparent();

					this.showSubimage = 0;

					parent( add( new HElement("div", {}, "Show: ")) );

						this.buttonShowSubimageLeft = add( new HButton("◀", () => {
							this.showSubimage -= 1;
							this.updateShow();
						}) );
						this.divShowSubimage = add( new HElement("span") );
						this.buttonShowSubimageRight = add( new HButton("▶", () => {
							this.showSubimage += 1;
							this.updateShow();
						}) );

						endparent();

					parent( add( new HElement("fieldset") ) );

						add( new HElement("legend", {}, "Origin") );

						parent( add( new HElement("div", {class: "origin-x-y"})) );
							const inputOriginX = add( new HNumberInput("X:", paramOriginX, 1, 0) );
							const inputOriginY = add( new HNumberInput("Y:", paramOriginY, 1, 0) );
							endparent();

						add( new HButton("Center", () => {
							let w=16, h=16;
							if (this.paramImages.length > 0) {
								w = Math.floor(this.paramImages[0].width / 2);
								h = Math.floor(this.paramImages[0].height / 2);
							}
							inputOriginX.setValue(w);
							inputOriginY.setValue(h);
						}) );

						endparent();

					endparent();

				parent( add( new HElement("div", {class: "mask"}) ) );
					parent( add( new HElement("fieldset") ) );
						add( new HElement("legend", {}, "Collision Checking") );

						const inputPreciseCollisionChecking = add( new HCheckBoxInput("Precise collision checking", (sprite.shape == "precise")) );
						const inputSeparateCollisionMasks = add( new HCheckBoxInput("Separate collision masks", sprite.separateCollisionMasks) );

						endparent();
					endparent();

				parent( add( new HElement("div", {class: "preview"}) ) );
					this.imgSprite = add( new HImage() );
					endparent();

				this.updateImageInfo();

				endparent();

			this.makeApplyOkButtons(
				() => {
					this.editor.project.changeResourceName(sprite, inputName.getValue());
					this.editor.project.changeSpriteImages(sprite, this.paramImages);
					this.editor.project.changeSpriteOrigin(sprite, parseInt(inputOriginX.getValue()), parseInt(inputOriginY.getValue()));

					sprite.shape = inputPreciseCollisionChecking.getChecked() ? "precise" : "rectangle";
					sprite.separateCollisionMasks = inputSeparateCollisionMasks.getChecked();

					sprite.alphaTolerance = 0;
					sprite.boundingBox = "automatic";
					sprite.bbLeft = 0;
					sprite.bbTop = 0;
					sprite.bbRight = 0;
					sprite.bbBottom = 0;
					if (this.paramImages.length > 0) {
						sprite.bbRight = this.paramImages[0].width - 1;
						sprite.bbBottom = this.paramImages[0].height - 1;
					}

					this.updateTitle();
				},
				() => this.close(),
			);

			endparent();

		// Open file if dropped in the window body
		setOnFileDrop(this.html, files => this.setImagesFromFiles(files), true);
	}

	updateTitle() {
		this.title.html.textContent = "Sprite Properties: "+this.sprite.name;
	}

	loadImagesFromFiles(files) {
		const images = [];

		for (const file of files) {
			images.push(new ImageWrapper(file));
		}

		return Promise.all(images.map(x => x.promise));
	}

	setImagesFromFiles(files) {
		for (const child of this.windowChildren) {
			child.close();
		}

		this.buttonLoadSprite.setDisabled(true);

		this.loadImagesFromFiles(files)
		.then(images => {
			this.paramImages = images;
			this.updateImageInfo();
		})
		.catch(() => {
			// this.updateImageInfo();
			alert("Error when opening image");
		})
		.finally(() => {
			this.buttonLoadSprite.setDisabled(false);
		});
	}

	updateImageInfo() {
		this.showSubimage = 0;

		if (this.paramImages.length > 0) {
			this.paramImages[0].promise.then(() => {
				this.divWidth.html.textContent = this.paramImages[0].width;
				this.divHeight.html.textContent = this.paramImages[0].height;
			});
		} else {
			this.imgSprite.setSrc(null);
			this.divWidth.html.textContent = "32";
			this.divHeight.html.textContent = "32";
		}

		this.divSubimages.html.textContent = this.paramImages.length.toString();

		this.updateShow();
	}

	updateShow() {
		if (this.paramImages.length > 0) {
			this.imgSprite.setSrc(this.paramImages[this.showSubimage].src);
		}

		this.divShowSubimage.html.textContent = this.showSubimage.toString();
		this.buttonShowSubimageLeft.setDisabled(this.showSubimage == 0);
		this.buttonShowSubimageRight.setDisabled(this.showSubimage >= this.paramImages.length - 1);
	}
}