class HTMLWindowPath extends HTMLWindow {

	constructor(...args) {
		super(...args);
	}

	makeClient(path) {
		this.htmlTitle.textContent = 'Edit Path '+path.name;

		parent(this.htmlClient)
			parent( add( newElem('grid-resource resource-path', 'div') ) )
				parent( add( newElem(null, 'div') ) )


					
					endparent()
				endparent()

			this.makeApplyOkButtons(
				() => {
					// changes here
				},
				() => this.editor.deleteWindow(this)
			);
			endparent();
	}
}